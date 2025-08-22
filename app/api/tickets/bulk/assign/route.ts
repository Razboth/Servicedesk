import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkAssignSchema = z.object({
  ticketIds: z.array(z.string().min(1)).min(1, 'At least one ticket ID is required').max(50, 'Cannot assign more than 50 tickets at once'),
  assignedToId: z.string().min(1, 'Assigned user ID is required')
});

interface BulkAssignResult {
  ticketId: string;
  success: boolean;
  error?: string;
  ticketNumber?: string;
}

// POST /api/tickets/bulk/assign - Bulk assign tickets to a technician
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians and security analysts can bulk assign tickets
    if (!session.user.role || !['TECHNICIAN', 'SECURITY_ANALYST'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = bulkAssignSchema.parse(body);

    // Check if the assignee exists and is a technician
    const assignee = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId }
    });

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
    }

    if (!['TECHNICIAN', 'ADMIN', 'SECURITY_ANALYST'].includes(assignee.role)) {
      return NextResponse.json({ error: 'Can only assign tickets to technicians' }, { status: 400 });
    }

    // Get all tickets and validate they can be assigned
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: validatedData.ticketIds },
        assignedToId: null // Only unassigned tickets
      },
      select: {
        id: true,
        ticketNumber: true,
        assignedToId: true,
        status: true,
        service: {
          select: {
            supportGroupId: true
          }
        }
      }
    });

    // Get user's support group for filtering
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        supportGroupId: true
      }
    });

    const results: BulkAssignResult[] = [];
    const successfulTicketIds: string[] = [];
    const commentPromises: Promise<any>[] = [];

    // Process each requested ticket
    for (const ticketId of validatedData.ticketIds) {
      const ticket = tickets.find(t => t.id === ticketId);
      
      if (!ticket) {
        results.push({
          ticketId,
          success: false,
          error: 'Ticket not found or already assigned'
        });
        continue;
      }

      // Check if technician can access this ticket (support group match)
      if (userWithDetails?.supportGroupId && ticket.service?.supportGroupId) {
        if (userWithDetails.supportGroupId !== ticket.service.supportGroupId) {
          results.push({
            ticketId,
            success: false,
            error: 'Ticket not in your support group',
            ticketNumber: ticket.ticketNumber
          });
          continue;
        }
      }

      successfulTicketIds.push(ticketId);
      results.push({
        ticketId,
        success: true,
        ticketNumber: ticket.ticketNumber
      });
    }

    // Bulk update all successful tickets
    if (successfulTicketIds.length > 0) {
      await prisma.ticket.updateMany({
        where: {
          id: { in: successfulTicketIds }
        },
        data: {
          assignedToId: validatedData.assignedToId,
          status: 'IN_PROGRESS', // Set to IN_PROGRESS when claimed
          updatedAt: new Date()
        }
      });

      // Create audit comments for all successfully assigned tickets
      const successfulTickets = tickets.filter(t => successfulTicketIds.includes(t.id));
      for (const ticket of successfulTickets) {
        commentPromises.push(
          prisma.ticketComment.create({
            data: {
              ticketId: ticket.id,
              userId: session.user.id,
              content: `Ticket assigned to ${assignee.name} (bulk assignment)`,
              isInternal: true
            }
          })
        );
      }

      // Execute all comment creations in parallel
      await Promise.all(commentPromises);
    }

    const summary = {
      total: validatedData.ticketIds.length,
      successful: successfulTicketIds.length,
      failed: validatedData.ticketIds.length - successfulTicketIds.length
    };

    return NextResponse.json({
      message: `Bulk assignment completed: ${summary.successful} successful, ${summary.failed} failed`,
      summary,
      results,
      assignedTo: {
        id: assignee.id,
        name: assignee.name,
        email: assignee.email
      }
    });

  } catch (error) {
    console.error('Error in bulk assign:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}