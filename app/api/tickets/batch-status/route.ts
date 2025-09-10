import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { emitTicketStatusChanged } from '@/lib/socket-manager';
import { authenticateApiKey, checkApiPermission, createApiErrorResponse, createApiSuccessResponse } from '@/lib/auth-api';

// Validation schema for batch status updates
const batchStatusUpdateSchema = z.object({
  ticketIds: z.array(z.string()).min(1).max(100),
  status: z.enum(['OPEN', 'PENDING', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED']),
  reason: z.string().optional(),
  resolutionNotes: z.string().optional()
});

// PUT /api/tickets/batch-status - Batch update ticket status with session auth
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = batchStatusUpdateSchema.parse(body);

    // Only allow admins and managers to batch update
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only administrators and managers can perform batch status updates' },
        { status: 403 }
      );
    }

    // Fetch all tickets to update
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: validatedData.ticketIds }
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        assignedToId: true,
        branchId: true,
        createdById: true
      }
    });

    if (tickets.length === 0) {
      return NextResponse.json(
        { error: 'No valid tickets found' },
        { status: 404 }
      );
    }

    // For managers, filter tickets to only their branch
    let ticketsToUpdate = tickets;
    if (session.user.role === 'MANAGER') {
      const userDetails = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { branchId: true }
      });
      
      ticketsToUpdate = tickets.filter(t => t.branchId === userDetails?.branchId);
      
      if (ticketsToUpdate.length === 0) {
        return NextResponse.json(
          { error: 'No tickets from your branch found in the selection' },
          { status: 403 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    // Handle resolution
    if (validatedData.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      if (validatedData.resolutionNotes) {
        updateData.resolutionNotes = validatedData.resolutionNotes;
      }
    }

    // Handle closing
    if (validatedData.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    // Perform batch update
    const updateResult = await prisma.ticket.updateMany({
      where: {
        id: { in: ticketsToUpdate.map(t => t.id) }
      },
      data: updateData
    });

    // Create audit logs for each ticket
    const auditLogs = ticketsToUpdate.map(ticket => ({
      userId: session.user.id,
      action: 'BATCH_STATUS_UPDATE' as const,
      entity: 'TICKET' as const,
      entityId: ticket.id,
      oldValues: { status: ticket.status },
      newValues: { 
        status: validatedData.status,
        reason: validatedData.reason,
        updatedBy: session.user.name || session.user.email 
      },
      createdAt: new Date()
    }));

    await prisma.auditLog.createMany({
      data: auditLogs
    });

    // Add comments if reason provided
    if (validatedData.reason) {
      const comments = ticketsToUpdate.map(ticket => ({
        ticketId: ticket.id,
        userId: session.user.id,
        content: `[Batch Update] Status changed from ${ticket.status} to ${validatedData.status}: ${validatedData.reason}`,
        isInternal: false,
        createdAt: new Date()
      }));

      await prisma.ticketComment.createMany({
        data: comments
      });
    }

    // Emit socket events for each ticket
    ticketsToUpdate.forEach(ticket => {
      emitTicketStatusChanged(
        ticket.id,
        ticket.status,
        validatedData.status,
        session.user.id
      );
    });

    return NextResponse.json({
      success: true,
      updated: updateResult.count,
      requested: validatedData.ticketIds.length,
      skipped: validatedData.ticketIds.length - ticketsToUpdate.length,
      message: `Successfully updated ${updateResult.count} ticket(s) to ${validatedData.status}`
    });

  } catch (error) {
    console.error('Error in batch status update:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update tickets' },
      { status: 500 }
    );
  }
}

// PATCH /api/tickets/batch-status - Batch update with API key auth
export async function PATCH(request: NextRequest) {
  try {
    // Check API key authentication
    const authResult = await authenticateApiKey(request);
    if (!authResult.authenticated) {
      return createApiErrorResponse(authResult.error || 'Unauthorized', 401);
    }

    // Check permission for updating tickets
    if (!checkApiPermission(authResult.apiKey!, 'tickets:write')) {
      return createApiErrorResponse('Insufficient permissions to update tickets', 403);
    }

    const body = await request.json();
    const validatedData = batchStatusUpdateSchema.parse(body);

    // Fetch all tickets to update
    const tickets = await prisma.ticket.findMany({
      where: {
        id: { in: validatedData.ticketIds }
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true
      }
    });

    if (tickets.length === 0) {
      return createApiErrorResponse('No valid tickets found', 404);
    }

    // Prepare update data
    const updateData: any = {
      status: validatedData.status,
      updatedAt: new Date()
    };

    // Handle resolution
    if (validatedData.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
      if (validatedData.resolutionNotes) {
        updateData.resolutionNotes = validatedData.resolutionNotes;
      }
    }

    // Handle closing
    if (validatedData.status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    // Perform batch update
    const updateResult = await prisma.ticket.updateMany({
      where: {
        id: { in: tickets.map(t => t.id) }
      },
      data: updateData
    });

    // Create audit logs
    const auditLogs = tickets.map(ticket => ({
      userId: authResult.apiKey!.userId,
      action: 'BATCH_STATUS_UPDATE_API' as const,
      entity: 'TICKET' as const,
      entityId: ticket.id,
      oldValues: { status: ticket.status },
      newValues: { 
        status: validatedData.status,
        updatedVia: 'API'
      },
      createdAt: new Date()
    }));

    await prisma.auditLog.createMany({
      data: auditLogs
    });

    // Get updated tickets for response
    const updatedTickets = await prisma.ticket.findMany({
      where: {
        id: { in: tickets.map(t => t.id) }
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        updatedAt: true
      }
    });

    return createApiSuccessResponse({
      updated: updateResult.count,
      tickets: updatedTickets,
      message: `Successfully updated ${updateResult.count} ticket(s) to ${validatedData.status}`
    });

  } catch (error) {
    console.error('Error in batch status update via API:', error);
    if (error instanceof z.ZodError) {
      return createApiErrorResponse('Invalid request data', 400);
    }
    return createApiErrorResponse(
      error instanceof Error ? error.message : 'Failed to update tickets',
      500
    );
  }
}