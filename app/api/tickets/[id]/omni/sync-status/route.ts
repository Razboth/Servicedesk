import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  updateOmniTicketStatus,
  isOmniEnabled,
  mapBsgStatusToOmni
} from '@/lib/services/omni.service';

/**
 * POST /api/tickets/[id]/omni/sync-status
 * Manually sync ticket status to Omni/Sociomile
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

    // Fetch ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        sociomileTicketId: true,
        sociomileTicketNumber: true,
        assignedTo: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Only assigned technician can sync (unless admin)
    if (session.user.role === 'TECHNICIAN' && ticket.assignedTo?.email !== session.user.email) {
      return NextResponse.json(
        { error: 'Hanya teknisi yang ditugaskan yang dapat sinkronisasi status' },
        { status: 403 }
      );
    }

    // Check if ticket was sent to Omni
    if (!ticket.sociomileTicketId) {
      return NextResponse.json(
        { error: 'Ticket belum dikirim ke Omni. Kirim ticket terlebih dahulu.' },
        { status: 400 }
      );
    }

    // Get status from request body or use current ticket status
    const body = await request.json().catch(() => ({}));
    const statusToSync = body.status || ticket.status;

    // Check if status can be mapped to Omni
    const omniStatus = mapBsgStatusToOmni(statusToSync);
    if (!omniStatus) {
      return NextResponse.json(
        { error: `Status "${statusToSync}" tidak dapat disinkronkan ke Omni` },
        { status: 400 }
      );
    }

    // Sync status to Omni
    const result = await updateOmniTicketStatus(
      ticket.sociomileTicketId,
      ticket.ticketNumber,
      statusToSync
    );

    if (!result.success) {
      // Log the failure
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'OMNI_SYNC_STATUS_FAILED',
          entity: 'TICKET',
          entityId: id,
          newValues: {
            error: result.message,
            code: result.code,
            status: statusToSync
          }
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to sync status to Omni',
          message: result.message,
          code: result.code
        },
        { status: result.code >= 500 ? 500 : 400 }
      );
    }

    // Create audit log for successful sync
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'OMNI_SYNC_STATUS',
        entity: 'TICKET',
        entityId: id,
        ticketId: id,
        newValues: {
          sociomileTicketId: ticket.sociomileTicketId,
          bsgStatus: statusToSync,
          omniStatus: omniStatus,
          syncedBy: session.user.name || session.user.email,
          syncedAt: new Date().toISOString()
        }
      }
    });

    // Add internal comment about sync
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `Status "${statusToSync}" berhasil disinkronkan ke Omni/Sociomile (Omni Status: ${omniStatus})`,
        isInternal: true
      }
    });

    return NextResponse.json({
      success: true,
      message: `Status berhasil disinkronkan ke Omni`,
      data: {
        ticketNumber: ticket.ticketNumber,
        bsgStatus: statusToSync,
        omniStatus: omniStatus,
        sociomileTicketId: ticket.sociomileTicketId
      }
    });

  } catch (error) {
    console.error('Error syncing status to Omni:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync status' },
      { status: 500 }
    );
  }
}
