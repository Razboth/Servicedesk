import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { emitTicketStatusChanged } from '@/lib/socket-manager';
import { createTicketNotifications, createNotification } from '@/lib/notifications';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';

// Validation schema for status updates
const statusUpdateSchema = z.object({
  status: z.enum(['OPEN', 'PENDING', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED']),
  reason: z.string().optional(),
  resolutionNotes: z.string().optional()
});

// PUT /api/tickets/[id]/status - Update ticket status with session auth
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
    const validatedData = statusUpdateSchema.parse(body);

    // Fetch existing ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        createdById: true,
        assignedToId: true,
        branchId: true,
        resolvedAt: true,
        closedAt: true,
        service: {
          select: {
            name: true,
            requiresApproval: true,
            supportGroupId: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check permissions based on role
    let canUpdateStatus = false;
    
    if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      // Admins can update any ticket status
      canUpdateStatus = true;
    } else if (session.user.role === 'MANAGER') {
      // Managers can update tickets in their branch
      const userDetails = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      canUpdateStatus = userDetails?.branchId === existingTicket.branchId;
    } else if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Technicians can update tickets assigned to them
      canUpdateStatus = existingTicket.assignedToId === session.user.id;
    } else if (session.user.role === 'USER' || session.user.role === 'AGENT') {
      // Users/Agents can only cancel their own tickets
      canUpdateStatus = existingTicket.createdById === session.user.id && 
                       validatedData.status === 'CANCELLED';
    }

    if (!canUpdateStatus) {
      return NextResponse.json(
        { error: 'You do not have permission to update this ticket status' },
        { status: 403 }
      );
    }

    // Validate status transitions
    const invalidTransitions: Record<string, string[]> = {
      'CLOSED': ['OPEN', 'IN_PROGRESS'], // Can't reopen closed tickets directly
      'RESOLVED': ['PENDING_APPROVAL'], // Can't go back to approval after resolution
      'CANCELLED': ['OPEN', 'IN_PROGRESS', 'RESOLVED'] // Can't reactivate cancelled tickets
    };

    if (invalidTransitions[existingTicket.status]?.includes(validatedData.status)) {
      return NextResponse.json(
        { error: `Cannot change status from ${existingTicket.status} to ${validatedData.status}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    // Handle resolution
    if (validatedData.status === 'RESOLVED' && !existingTicket.resolvedAt) {
      updateData.resolvedAt = new Date();
      if (validatedData.resolutionNotes) {
        updateData.resolutionNotes = validatedData.resolutionNotes;
      }
    }

    // Handle closing
    if (validatedData.status === 'CLOSED' && !existingTicket.closedAt) {
      updateData.closedAt = new Date();
    }

    // Handle reopening
    if (existingTicket.status === 'CLOSED' && validatedData.status !== 'CLOSED') {
      updateData.closedAt = null;
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        branch: { select: { name: true, code: true } }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'STATUS_UPDATE',
        entity: 'TICKET',
        entityId: id,
        oldValues: { status: existingTicket.status },
        newValues: { 
          status: validatedData.status,
          reason: validatedData.reason,
          updatedBy: session.user.name || session.user.email 
        }
      }
    });

    // Add comment if reason provided
    if (validatedData.reason) {
      await prisma.ticketComment.create({
        data: {
          ticketId: id,
          userId: session.user.id,
          content: `Status changed from ${existingTicket.status} to ${validatedData.status}: ${validatedData.reason}`,
          isInternal: false
        }
      });
    }

    // Emit socket event for real-time update
    emitTicketStatusChanged(
      id,
      existingTicket.status,
      validatedData.status,
      session.user.id
    );

    // Create notifications
    let notificationType: 'TICKET_UPDATED' | 'TICKET_RESOLVED' | 'TICKET_CLOSED' = 'TICKET_UPDATED';
    if (validatedData.status === 'RESOLVED') {
      notificationType = 'TICKET_RESOLVED';
    } else if (validatedData.status === 'CLOSED') {
      notificationType = 'TICKET_CLOSED';
    }

    await createTicketNotifications(id, notificationType, session.user.id)
      .catch(err => console.error('Failed to create notifications:', err));

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket status updated to ${validatedData.status}`
    });

  } catch (error) {
    console.error('Error updating ticket status:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update ticket status' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/[id]/status - Update ticket status with API key auth
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Check API key authentication
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission for updating tickets
    if (!checkApiPermission(authResult.apiKey!, 'tickets:write')) {
      return createApiErrorResponse('Insufficient permissions to update ticket status', 403);
    }

    const body = await request.json();
    const validatedData = statusUpdateSchema.parse(body);

    // Fetch existing ticket
    const existingTicket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        resolvedAt: true,
        closedAt: true
      }
    });

    if (!existingTicket) {
      return createApiErrorResponse('Ticket not found', 404);
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    // Handle resolution
    if (validatedData.status === 'RESOLVED' && !existingTicket.resolvedAt) {
      updateData.resolvedAt = new Date();
      if (validatedData.resolutionNotes) {
        updateData.resolutionNotes = validatedData.resolutionNotes;
      }
    }

    // Handle closing
    if (validatedData.status === 'CLOSED' && !existingTicket.closedAt) {
      updateData.closedAt = new Date();
    }

    // Handle reopening
    if (existingTicket.status === 'CLOSED' && validatedData.status !== 'CLOSED') {
      updateData.closedAt = null;
    }

    // Update the ticket
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: authResult.apiKey!.userId,
        action: 'STATUS_UPDATE_API',
        entity: 'TICKET',
        entityId: id,
        oldValues: { status: existingTicket.status },
        newValues: { 
          status: validatedData.status,
          reason: validatedData.reason,
          updatedVia: 'API'
        }
      }
    });

    // Add system comment if reason provided
    if (validatedData.reason) {
      await prisma.ticketComment.create({
        data: {
          ticketId: id,
          userId: authResult.apiKey!.userId,
          content: `[API Update] Status changed from ${existingTicket.status} to ${validatedData.status}: ${validatedData.reason}`,
          isInternal: true
        }
      });
    }

    return createApiSuccessResponse({
      ticket: updatedTicket,
      previousStatus: existingTicket.status,
      newStatus: validatedData.status,
      message: `Ticket status successfully updated to ${validatedData.status}`
    });

  } catch (error) {
    console.error('Error updating ticket status via API:', error);
    if (error instanceof z.ZodError) {
      return createApiErrorResponse('Invalid request data', 400);
    }
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to update ticket status',
      500
    );
  }
}