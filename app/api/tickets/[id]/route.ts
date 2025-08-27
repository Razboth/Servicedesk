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
            supportGroupId: true,
            category: { select: { name: true } },
            // Include 3-tier category IDs from service
            categoryId: true,
            subcategoryId: true,
            itemId: true
          }
        },
        createdBy: { select: { name: true, email: true, role: true, branchId: true } },
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
        attachments: {
          select: {
            id: true,
            filename: true,
            originalName: true,
            mimeType: true,
            size: true,
            createdAt: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
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

    // Get user's details for access control
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true
      }
    });

    // Check access permissions
    let canAccess = false;
    
    if (session.user.role === 'ADMIN') {
      // Super admin can see all tickets
      canAccess = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can ONLY see tickets created by users from their own branch
      const isFromSameBranch = userWithDetails?.branchId === ticket.branchId;
      const isCreatorFromSameBranch = ticket.createdBy?.branchId === userWithDetails?.branchId;
      canAccess = isFromSameBranch && isCreatorFromSameBranch;
    } else if (session.user.role === 'TECHNICIAN') {
      // Technicians can see tickets they created, are assigned to, or match their support group
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
      canAccess = isCreatorOrAssignee || isSupportGroupMatch;
    } else if (session.user.role === 'SECURITY_ANALYST') {
      // Security Analysts function like technicians but with additional security access
      const isCreatorOrAssignee = ticket.createdById === session.user.id || ticket.assignedToId === session.user.id;
      const isSupportGroupMatch = !!(userWithDetails?.supportGroupId && ticket.service?.supportGroupId === userWithDetails.supportGroupId);
      const isSecurityAnalystTicket = ticket.createdBy?.role === 'SECURITY_ANALYST';
      canAccess = isCreatorOrAssignee || isSupportGroupMatch || isSecurityAnalystTicket;
    } else if (session.user.role === 'USER') {
      // Users can only see their own tickets
      canAccess = ticket.createdById === session.user.id;
    }

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
      session.user.role === 'TECHNICIAN' ||
      session.user.role === 'SECURITY_ANALYST' ||
      (session.user.role === 'USER' && existingTicket.createdById === session.user.id) ||
      (session.user.role === 'MANAGER' && existingTicket.createdById === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Managers can only update certain fields (cannot change status, assign tickets, etc.)
    if (session.user.role === 'MANAGER') {
      const allowedFields = ['title', 'description', 'priority'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Managers cannot update ticket status, assignments, or technical fields' },
          { status: 403 }
        );
      }
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
    
    // Clear closedAt timestamp when reopening a closed ticket
    if (existingTicket.status === 'CLOSED' && validatedData.status && validatedData.status !== 'CLOSED') {
      updateData.closedAt = null;
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
        createdBy: { select: { name: true, email: true, role: true, branchId: true } },
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
      session.user.role === 'TECHNICIAN' ||
      session.user.role === 'SECURITY_ANALYST' ||
      (session.user.role === 'USER' && existingTicket.createdById === session.user.id) ||
      (session.user.role === 'MANAGER' && existingTicket.createdById === session.user.id);

    if (!canUpdate) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user details for additional permission checks
    const userWithDetails = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        branchId: true, 
        role: true, 
        supportGroupId: true
      }
    });

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

    // Managers can only update certain fields (cannot change status, assign tickets, etc.)
    if (session.user.role === 'MANAGER') {
      const allowedFields = ['title', 'description', 'priority'];
      const updateFields = Object.keys(validatedData);
      const hasDisallowedFields = updateFields.some(field => !allowedFields.includes(field));
      
      if (hasDisallowedFields) {
        return NextResponse.json(
          { error: 'Managers cannot update ticket status, assignments, or technical fields' },
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