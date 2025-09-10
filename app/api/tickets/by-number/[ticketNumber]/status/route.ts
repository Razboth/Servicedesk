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

// PUT /api/tickets/by-number/[ticketNumber]/status - Update ticket status by ticket number (session auth)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ticketNumber: string }> }
) {
  const { ticketNumber } = await params;
  
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = statusUpdateSchema.parse(body);

    // Fetch existing ticket by ticket number
    const existingTicket = await prisma.ticket.findUnique({
      where: { ticketNumber },
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
      return NextResponse.json({ error: `Ticket ${ticketNumber} not found` }, { status: 404 });
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
      where: { id: existingTicket.id },
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
        entityId: existingTicket.id,
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
          ticketId: existingTicket.id,
          userId: session.user.id,
          content: `Status changed from ${existingTicket.status} to ${validatedData.status}: ${validatedData.reason}`,
          isInternal: false
        }
      });
    }

    // Emit socket event for real-time update
    emitTicketStatusChanged(
      existingTicket.id,
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

    await createTicketNotifications(existingTicket.id, notificationType, session.user.id)
      .catch(err => console.error('Failed to create notifications:', err));

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `Ticket ${ticketNumber} status updated to ${validatedData.status}`
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

// PATCH /api/tickets/by-number/[ticketNumber]/status - Update ticket status by ticket number (API key auth)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketNumber: string }> }
) {
  const { ticketNumber } = await params;
  
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

    // Fetch existing ticket by ticket number
    const existingTicket = await prisma.ticket.findUnique({
      where: { ticketNumber },
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
      return createApiErrorResponse(`Ticket ${ticketNumber} not found`, 404);
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
      where: { id: existingTicket.id },
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

    // Skip audit log and comment for API updates without valid user
    // This is a temporary fix - normally API keys should have associated users
    
    // Only add comment if reason provided and we can trace it somehow
    if (validatedData.reason) {
      // Log the status change without creating a comment since we don't have a valid userId
      console.log(`[API Update] Ticket ${ticketNumber} status changed from ${existingTicket.status} to ${validatedData.status}: ${validatedData.reason}`);
    }

    return createApiSuccessResponse({
      ticket: updatedTicket,
      previousStatus: existingTicket.status,
      newStatus: validatedData.status,
      message: `Ticket ${ticketNumber} status successfully updated to ${validatedData.status}`
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

// GET /api/tickets/by-number/[ticketNumber]/status - Get ticket status by ticket number
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketNumber: string }> }
) {
  const { ticketNumber } = await params;
  
  try {
    // Check if API key is provided (optional for GET)
    const apiKeyHeader = request.headers.get('X-API-Key');
    
    if (apiKeyHeader) {
      // API key authentication
      const authResult = await authenticateApiKey(request);
      if (!authResult.authenticated) {
        return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
      }
      
      if (!checkApiPermission(authResult.apiKey!, 'tickets:read')) {
        return createApiErrorResponse('Insufficient permissions to read ticket status', 403);
      }
    } else {
      // Session authentication
      const session = await auth();
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Fetch ticket by ticket number
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        resolvedAt: true,
        closedAt: true,
        service: {
          select: {
            name: true,
            responseHours: true,
            resolutionHours: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            email: true
          }
        },
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });

    if (!ticket) {
      const response = apiKeyHeader 
        ? createApiErrorResponse(`Ticket ${ticketNumber} not found`, 404)
        : NextResponse.json({ error: `Ticket ${ticketNumber} not found` }, { status: 404 });
      return response;
    }

    // Calculate SLA status
    const now = new Date();
    const createdAt = new Date(ticket.createdAt);
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    const serviceData = ticket.service as any;
    const slaStatus = {
      hoursElapsed: Math.round(hoursElapsed * 100) / 100,
      responseDeadline: serviceData?.responseHours ? 
        new Date(createdAt.getTime() + (serviceData.responseHours * 60 * 60 * 1000)) : null,
      resolutionDeadline: serviceData?.resolutionHours ? 
        new Date(createdAt.getTime() + (serviceData.resolutionHours * 60 * 60 * 1000)) : null,
      isResponseBreached: serviceData?.responseHours ? 
        hoursElapsed > serviceData.responseHours : false,
      isResolutionBreached: serviceData?.resolutionHours ? 
        hoursElapsed > serviceData.resolutionHours && !ticket.resolvedAt : false
    };

    const responseData = {
      ticket: {
        ...ticket,
        slaStatus
      }
    };

    return apiKeyHeader 
      ? createApiSuccessResponse(responseData)
      : NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching ticket status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ticket status';
    
    const apiKeyHeader = request.headers.get('X-API-Key');
    return apiKeyHeader 
      ? createApiErrorResponse(errorMessage, 500)
      : NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}