import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkStatusUpdateSchema = z.object({
  ticketIds: z.array(z.string()).min(1, 'At least one ticket ID is required'),
  status: z.enum(['OPEN', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'])
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketIds, status } = bulkStatusUpdateSchema.parse(body);

    // Check if user has permission to update these tickets
    // Only allow technicians to update their own tickets or managers/admins to update any
    let tickets;

    if (['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(session.user.role as string)) {
      // Managers and admins can update any ticket
      tickets = await prisma.ticket.findMany({
        where: {
          id: { in: ticketIds }
        }
      });
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can only update tickets assigned to them
      tickets = await prisma.ticket.findMany({
        where: {
          id: { in: ticketIds },
          assignedToId: session.user.id
        }
      });
    } else {
      return NextResponse.json(
        { error: 'You do not have permission to update tickets' },
        { status: 403 }
      );
    }

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'No tickets found or you do not have permission to update them' },
        { status: 404 }
      );
    }

    // Update tickets
    const result = await prisma.ticket.updateMany({
      where: {
        id: { in: tickets.map(t => t.id) }
      },
      data: {
        status,
        updatedAt: new Date()
      }
    });

    // Create audit log entries for each ticket
    await prisma.auditLog.createMany({
      data: tickets.map(ticket => ({
        userId: session.user.id,
        ticketId: ticket.id,
        action: 'TICKET_STATUS_UPDATE',
        entity: 'TICKET',
        entityId: ticket.id,
        oldValues: { status: ticket.status },
        newValues: { status: status, bulkUpdate: true }
      }))
    });

    // Create comments for status change
    await prisma.comment.createMany({
      data: tickets.map(ticket => ({
        ticketId: ticket.id,
        userId: session.user.id,
        content: `Status changed from ${ticket.status} to ${status} (bulk update)`,
        isInternal: true
      }))
    });

    return NextResponse.json({
      success: true,
      successful: result.count,
      message: `Successfully updated ${result.count} ticket${result.count > 1 ? 's' : ''}`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating tickets:', error);
    return NextResponse.json(
      { error: 'Failed to update tickets' },
      { status: 500 }
    );
  }
}