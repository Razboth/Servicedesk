import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const assignTicketSchema = z.object({
  assignedToId: z.string().min(1, 'Assigned user ID is required')
});

// POST /api/tickets/[id]/assign - Assign ticket to a technician
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians, managers, and admins can assign tickets
    if (!session.user.role || !['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = assignTicketSchema.parse(body);
    const ticketId = params.id;

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: true,
        createdBy: true
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if the user being assigned exists and is a technician
    const assignee = await prisma.user.findUnique({
      where: { id: validatedData.assignedToId }
    });

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 });
    }

    if (!['TECHNICIAN', 'ADMIN'].includes(assignee.role)) {
      return NextResponse.json({ error: 'Can only assign tickets to technicians' }, { status: 400 });
    }

    // Update ticket assignment
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: validatedData.assignedToId,
        status: existingTicket.status === 'OPEN' ? 'OPEN' : existingTicket.status, // Keep current status
        updatedAt: new Date()
      },
      include: {
        service: {
          select: {
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    // Create a comment to log the assignment
    await prisma.ticketComment.create({
      data: {
        ticketId: ticketId,
        userId: session.user.id,
        content: `Ticket assigned to ${assignee.name}`,
        isInternal: true
      }
    });

    return NextResponse.json({
      message: 'Ticket assigned successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error assigning ticket:', error);
    
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

// DELETE /api/tickets/[id]/assign - Unassign ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians, managers, and admins can unassign tickets
    if (!session.user.role || !['TECHNICIAN', 'MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ticketId = params.id;

    // Check if ticket exists
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: true
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Update ticket to remove assignment
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: null,
        updatedAt: new Date()
      },
      include: {
        service: {
          select: {
            name: true,
            category: {
              select: {
                name: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    // Create a comment to log the unassignment
    await prisma.ticketComment.create({
      data: {
        ticketId: ticketId,
        userId: session.user.id,
        content: `Ticket unassigned from ${existingTicket.assignedTo?.name || 'unknown user'}`,
        isInternal: true
      }
    });

    return NextResponse.json({
      message: 'Ticket unassigned successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error unassigning ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}