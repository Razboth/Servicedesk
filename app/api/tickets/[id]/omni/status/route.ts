import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import {
  updateOmniTicketStatus,
  isOmniEnabled,
  mapBsgStatusToOmni
} from '@/lib/services/omni.service';

/**
 * Validation schema for status sync
 */
const statusSyncSchema = z.object({
  status: z.enum([
    'OPEN',
    'IN_PROGRESS',
    'PENDING',
    'PENDING_APPROVAL',
    'ON_HOLD',
    'PENDING_VENDOR',
    'RESOLVED',
    'CLOSED',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
  ])
});

/**
 * POST /api/tickets/[id]/omni/status
 * Sync ticket status to Omni/Sociomile
 * Only works for tickets that have been sent to Omni
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission (admin, manager, or technician)
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if Omni integration is enabled
    if (!isOmniEnabled()) {
      return NextResponse.json(
        { error: 'Omni integration is not enabled' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { status } = statusSyncSchema.parse(body);

    // Fetch ticket with Sociomile fields
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        sociomileTicketId: true,
        sociomileTicketNumber: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if ticket was sent to Omni
    if (!ticket.sociomileTicketId) {
      return NextResponse.json(
        {
          error: 'Ticket has not been sent to Omni',
          ticketNumber: ticket.ticketNumber
        },
        { status: 400 }
      );
    }

    // Map BSG status to Omni status
    const omniStatus = mapBsgStatusToOmni(status);
    if (!omniStatus) {
      return NextResponse.json(
        {
          error: 'Invalid status for Omni sync',
          bsgStatus: status
        },
        { status: 400 }
      );
    }

    // Send status update to Omni
    const omniResponse = await updateOmniTicketStatus(
      ticket.sociomileTicketId,
      ticket.ticketNumber,
      status
    );

    // Handle 404 gracefully (API not deployed yet)
    if (omniResponse.code === 404) {
      console.warn('[Omni] Status update endpoint not found (API may not be deployed yet)');

      // Log the attempt but don't fail
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'OMNI_STATUS_SYNC_UNAVAILABLE',
          entity: 'TICKET',
          entityId: id,
          ticketId: id,
          newValues: {
            bsgStatus: status,
            omniStatus: omniStatus,
            message: 'Omni API endpoint not available',
            code: 404
          }
        }
      });

      return NextResponse.json({
        success: false,
        warning: 'Omni status update endpoint not available yet',
        message: omniResponse.message,
        ticket: {
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          bsgStatus: status,
          omniStatus: omniStatus
        }
      }, { status: 200 }); // Return 200 to indicate the request was processed
    }

    // Handle other errors
    if (!omniResponse.success) {
      // Log the failure
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'OMNI_STATUS_SYNC_FAILED',
          entity: 'TICKET',
          entityId: id,
          ticketId: id,
          newValues: {
            bsgStatus: status,
            omniStatus: omniStatus,
            error: omniResponse.message,
            code: omniResponse.code
          }
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to sync status to Omni',
          message: omniResponse.message,
          code: omniResponse.code,
          ticket: {
            id: ticket.id,
            ticketNumber: ticket.ticketNumber,
            bsgStatus: status,
            omniStatus: omniStatus
          }
        },
        { status: omniResponse.code >= 500 ? 500 : 400 }
      );
    }

    // Create audit log for successful sync
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'OMNI_STATUS_SYNC',
        entity: 'TICKET',
        entityId: id,
        ticketId: id,
        oldValues: {
          status: ticket.status
        },
        newValues: {
          bsgStatus: status,
          omniStatus: omniStatus,
          syncedBy: session.user.name || session.user.email,
          syncedAt: new Date().toISOString()
        }
      }
    });

    // Add internal comment
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `Status synced to Omni/Sociomile: ${status} → ${omniStatus}`,
        isInternal: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Status successfully synced to Omni',
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        bsgStatus: status,
        omniStatus: omniStatus,
        sociomileTicketId: ticket.sociomileTicketId,
        sociomileTicketNumber: ticket.sociomileTicketNumber
      }
    });

  } catch (error) {
    console.error('Error syncing status to Omni:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync status to Omni' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tickets/[id]/omni/status
 * Get the mapped Omni status for a ticket's current status
 */
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

    // Fetch ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        sociomileTicketId: true,
        sociomileTicketNumber: true
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Map current status to Omni status
    const omniStatus = mapBsgStatusToOmni(ticket.status);

    return NextResponse.json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      bsgStatus: ticket.status,
      omniStatus: omniStatus,
      isSentToOmni: !!ticket.sociomileTicketId,
      sociomileTicketId: ticket.sociomileTicketId,
      sociomileTicketNumber: ticket.sociomileTicketNumber,
      omniEnabled: isOmniEnabled()
    });

  } catch (error) {
    console.error('Error fetching Omni status mapping:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch status mapping' },
      { status: 500 }
    );
  }
}
