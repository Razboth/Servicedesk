import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  createOmniTicket,
  mapTicketToOmniPayload,
  isTransactionClaimService,
  isOmniEnabled,
  OmniTicketData
} from '@/lib/services/omni.service';

/**
 * GET /api/tickets/[id]/omni
 * Get Omni/Sociomile integration status for a ticket
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

    // Fetch ticket with Omni fields
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        sociomileTicketId: true,
        sociomileTicketNumber: true,
        service: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            tier1CategoryId: true
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if this is a Transaction Claims ticket
    const isTransactionClaim = isTransactionClaimService(
      ticket.service?.categoryId,
      ticket.service?.tier1CategoryId
    );

    return NextResponse.json({
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      isTransactionClaimTicket: isTransactionClaim,
      omniEnabled: isOmniEnabled(),
      sociomileTicketId: ticket.sociomileTicketId,
      sociomileTicketNumber: ticket.sociomileTicketNumber,
      isSentToOmni: !!ticket.sociomileTicketId,
      serviceName: ticket.service?.name
    });

  } catch (error) {
    console.error('Error fetching Omni status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Omni status' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tickets/[id]/omni
 * Manually send a ticket to Omni/Sociomile
 * Only works for Transaction Claims tickets
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

    // Fetch complete ticket data
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            categoryId: true,
            tier1CategoryId: true
          }
        },
        branch: {
          select: {
            code: true,
            name: true
          }
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        fieldValues: {
          include: {
            field: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check if this is a Transaction Claims ticket
    const isTransactionClaim = isTransactionClaimService(
      ticket.service?.categoryId,
      ticket.service?.tier1CategoryId
    );

    if (!isTransactionClaim) {
      return NextResponse.json(
        {
          error: 'This ticket is not a Transaction Claims ticket',
          serviceName: ticket.service?.name,
          categoryId: ticket.service?.categoryId
        },
        { status: 400 }
      );
    }

    // Check if ticket was already sent to Omni (allow resend with explicit parameter)
    const body = await request.json().catch(() => ({}));
    const allowResend = body.resend === true;

    if (ticket.sociomileTicketId && !allowResend) {
      return NextResponse.json(
        {
          error: 'Ticket already sent to Omni. Use resend=true to send again.',
          sociomileTicketId: ticket.sociomileTicketId,
          sociomileTicketNumber: ticket.sociomileTicketNumber
        },
        { status: 400 }
      );
    }

    // Map ticket data to Omni format
    const ticketData: OmniTicketData = {
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description || '',
      createdAt: ticket.createdAt,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerPhone: ticket.customerPhone,
      serviceName: ticket.service?.name,
      branch: ticket.branch ? {
        code: ticket.branch.code,
        name: ticket.branch.name
      } : undefined,
      createdBy: ticket.createdBy ? {
        name: ticket.createdBy.name,
        email: ticket.createdBy.email
      } : undefined,
      fieldValues: ticket.fieldValues.map(fv => ({
        field: { name: fv.field.name },
        value: fv.value
      }))
    };

    // Map and send to Omni
    const payload = mapTicketToOmniPayload(ticketData);
    const omniResponse = await createOmniTicket(payload);

    if (!omniResponse.success) {
      // Log the failure
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'OMNI_SEND_FAILED',
          entity: 'TICKET',
          entityId: id,
          newValues: {
            error: omniResponse.message,
            code: omniResponse.code
          }
        }
      });

      return NextResponse.json(
        {
          error: 'Failed to send ticket to Omni',
          message: omniResponse.message,
          code: omniResponse.code
        },
        { status: omniResponse.code >= 500 ? 500 : 400 }
      );
    }

    // Update ticket with Sociomile IDs
    const updatedTicket = await prisma.ticket.update({
      where: { id },
      data: {
        sociomileTicketId: omniResponse.data?.ticketId,
        sociomileTicketNumber: omniResponse.data?.ticket_number,
        updatedAt: new Date()
      },
      select: {
        id: true,
        ticketNumber: true,
        sociomileTicketId: true,
        sociomileTicketNumber: true
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'OMNI_SEND',
        entity: 'TICKET',
        entityId: id,
        ticketId: id,
        newValues: {
          sociomileTicketId: omniResponse.data?.ticketId,
          sociomileTicketNumber: omniResponse.data?.ticket_number,
          sentBy: session.user.name || session.user.email,
          sentAt: new Date().toISOString()
        }
      }
    });

    // Add comment
    const commentAction = ticket.sociomileTicketId ? 'resent' : 'manually sent';
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `Ticket ${commentAction} to Omni/Sociomile. Omni Ticket ID: ${omniResponse.data?.ticketId}, Ticket Number: ${omniResponse.data?.ticket_number}`,
        isInternal: true
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket successfully sent to Omni',
      ticket: updatedTicket,
      omni: {
        ticketId: omniResponse.data?.ticketId,
        ticketNumber: omniResponse.data?.ticket_number
      }
    });

  } catch (error) {
    console.error('Error sending ticket to Omni:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send ticket to Omni' },
      { status: 500 }
    );
  }
}
