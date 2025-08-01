import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Validation schema for updating tickets
const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  status: z.enum(['OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED']).optional(),
  assignedToId: z.string().nullable().optional(),
  issueClassification: z.enum(['INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'PROBLEM']).optional(),
  rootCause: z.string().optional(),
  resolutionNotes: z.string().optional(),
  estimatedHours: z.number().optional(),
  actualHours: z.number().optional()
});

// GET /api/tickets/[id] - Get specific ticket
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        },
        createdBy: { select: { name: true, email: true, role: true } },
        assignedTo: { select: { name: true, email: true, role: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: true,
        slaTracking: {
          include: {
            slaTemplate: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check access permissions
    const canAccess = 
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER' ||
      ticket.createdById === session.user.id ||
      ticket.assignedToId === session.user.id;

    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id] - Partial update ticket (for status changes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions for updates
    const canUpdate = 
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER' ||
      session.user.role === 'TECHNICIAN' ||
      (session.user.role === 'USER' && existingTicket.createdById === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        },
        createdBy: { select: { name: true, email: true, role: true } },
        assignedTo: { select: { name: true, email: true, role: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        },
        comments: {
          include: {
            user: { select: { name: true, email: true, role: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update ticket' },
      { status: 500 }
    );
  }
}

// PUT /api/tickets/[id] - Update ticket
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateTicketSchema.parse(body);

    // Check if ticket exists and user has permission
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
        status: true
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions for updates
    const canUpdate = 
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER' ||
      session.user.role === 'TECHNICIAN' ||
      (session.user.role === 'USER' && existingTicket.createdById === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Users can only update certain fields
    if (session.user.role === 'USER') {
      const allowedFields = ['title', 'description'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Users can only update title and description' },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData };
    
    // Set resolution timestamp when status changes to RESOLVED
    if (validatedData.status === 'RESOLVED' && existingTicket.status !== 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }
    
    // Set closed timestamp when status changes to CLOSED
    if (validatedData.status === 'CLOSED' && existingTicket.status !== 'CLOSED') {
      updateData.closedAt = new Date();
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true } }
          }
        }
      }
    });

    return NextResponse.json(updatedTicket);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id] - Delete ticket (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete tickets
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    await prisma.ticket.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}