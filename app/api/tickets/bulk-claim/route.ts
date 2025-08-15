import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkClaimSchema = z.object({
  ticketIds: z.array(z.string()).min(1, 'At least one ticket ID is required'),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional().default('IN_PROGRESS')
});

// POST /api/tickets/bulk-claim - Claim multiple tickets at once
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Technicians and Security Analysts only' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketIds, status } = bulkClaimSchema.parse(body);

    // Verify all tickets are available for claiming (not already assigned)
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: ticketIds },
        assignedToId: null // Only unassigned tickets
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true
      }
    });

    if (tickets.length !== ticketIds.length) {
      const foundIds = tickets.map(t => t.id);
      const missingIds = ticketIds.filter(id => !foundIds.includes(id));
      
      return NextResponse.json(
        { 
          error: 'Some tickets are not available for claiming',
          unavailableTickets: missingIds
        },
        { status: 400 }
      );
    }

    // Perform bulk assignment and status update in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const updatedTickets = [];
      
      for (const ticket of tickets) {
        // Assign ticket to technician
        const updatedTicket = await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            assignedToId: session.user.id,
            status: status,
            updatedAt: new Date()
          },
          include: {
            service: {
              select: {
                name: true,
                slaHours: true,
                category: {
                  select: { name: true }
                }
              }
            },
            createdBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            branch: { select: { id: true, name: true, code: true } }
          }
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ASSIGN',
            entity: 'TICKET',
            entityId: ticket.id,
            ticketId: ticket.id,
            newValues: {
              assignedToId: session.user.id,
              status: status,
              action: `Bulk claimed ticket ${ticket.ticketNumber} and set status to ${status}`
            }
          }
        });

        // Add comment about bulk claim
        await tx.ticketComment.create({
          data: {
            ticketId: ticket.id,
            userId: session.user.id,
            content: `Ticket claimed via bulk action and status set to ${status.replace('_', ' ').toLowerCase()}`,
            isInternal: true
          }
        });

        updatedTickets.push(updatedTicket);
      }

      return updatedTickets;
    });

    return NextResponse.json({
      message: `Successfully claimed ${results.length} tickets`,
      claimedTickets: results,
      summary: {
        total: results.length,
        status: status,
        technicianId: session.user.id,
        technicianName: session.user.name
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error in bulk claim:', error);
    return NextResponse.json(
      { error: 'Failed to claim tickets' },
      { status: 500 }
    );
  }
}