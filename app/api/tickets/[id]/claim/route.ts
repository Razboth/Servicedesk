import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendTicketNotification } from '@/lib/services/email.service';
import { emitTicketAssigned } from '@/lib/services/socket.service';

// POST /api/tickets/[id]/claim - Claim an unassigned ticket
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians, admins, and MANAGER_IT can claim tickets
    if (!session.user.role || !['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Only technicians can claim tickets' }, { status: 403 });
    }

    const ticketId = id;

    // Check if ticket exists and get its details including approval status
    const existingTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        assignedTo: true,
        createdBy: true,
        approvals: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            approver: true
          }
        },
        service: {
          select: {
            requiresApproval: true,
            supportGroupId: true
          }
        }
      }
    });

    if (!existingTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // For technicians and security analysts, check support group match
    // MANAGER_IT can claim any ticket regardless of support group
    if (session.user.role === 'TECHNICIAN' || session.user.role === 'SECURITY_ANALYST') {
      // Get user's support group
      const userWithSupportGroup = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          supportGroupId: true,
          supportGroup: {
            select: { code: true }
          }
        }
      });

      // Check for Transaction Claims Support group members
      if (userWithSupportGroup?.supportGroup?.code === 'TRANSACTION_CLAIMS_SUPPORT') {
        return NextResponse.json({
          error: 'Transaction Claims Support members cannot claim tickets'
        }, { status: 403 });
      }

      // If ticket has a support group, technician must be in the same group
      if (existingTicket.service?.supportGroupId) {
        if (!userWithSupportGroup?.supportGroupId ||
            userWithSupportGroup.supportGroupId !== existingTicket.service.supportGroupId) {
          return NextResponse.json({
            error: 'You can only claim tickets assigned to your support group'
          }, { status: 403 });
        }
      }
    }

    // Check if ticket is in a claimable status
    if (existingTicket.status !== 'OPEN') {
      return NextResponse.json({ 
        error: 'Only open tickets can be claimed' 
      }, { status: 400 });
    }

    // Check if ticket is already assigned
    if (existingTicket.assignedToId) {
      if (existingTicket.assignedToId === session.user.id) {
        return NextResponse.json({ error: 'You have already claimed this ticket' }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: `Ticket is already assigned to ${existingTicket.assignedTo?.name}` 
        }, { status: 400 });
      }
    }

    // Check if ticket requires approval and is approved
    if (existingTicket.service?.requiresApproval) {
      const latestApproval = existingTicket.approvals[0];
      
      if (!latestApproval) {
        return NextResponse.json({ 
          error: 'This ticket requires manager approval before it can be claimed' 
        }, { status: 403 });
      }
      
      if (latestApproval.status !== 'APPROVED') {
        return NextResponse.json({ 
          error: `Ticket ${latestApproval.status === 'REJECTED' ? 'was rejected' : 'is pending approval'} and cannot be claimed` 
        }, { status: 403 });
      }
    }

    // Claim the ticket by assigning it to the current user
    const newStatus = existingTicket.status === 'OPEN' ? 'IN_PROGRESS' : existingTicket.status;
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: session.user.id,
        status: newStatus,
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
            email: true,
            role: true
          }
        },
        approvals: {
          include: {
            approver: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    // Create a comment to log the claim
    await prisma.ticketComment.create({
      data: {
        ticketId: ticketId,
        userId: session.user.id,
        content: `Ticket claimed by ${session.user.name}`,
        isInternal: false
      }
    });

    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'CLAIMED',
        entity: 'TICKET',
        entityId: ticketId,
        userId: session.user.id,
        oldValues: { assignedToId: null, status: existingTicket.status },
        newValues: { assignedToId: session.user.id, status: newStatus, claimedBy: session.user.name }
      }
    });

    // Send email notifications (fire-and-forget for better performance)
    // 1. Send assignment notification to all parties
    sendTicketNotification(ticketId, 'ticket_assigned').catch(err =>
      console.error('Failed to send assignment email:', err)
    );

    // 2. Send technician action notification specifically for the technician
    sendTicketNotification(ticketId, 'technician_action', {
      technician: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email
      },
      action: 'Claimed the ticket',
      notes: `Ticket has been claimed and is now being worked on`
    }).catch(err =>
      console.error('Failed to send technician action email:', err)
    );

    // Emit socket event for real-time updates
    emitTicketAssigned(updatedTicket, updatedTicket.assignedTo).catch(err =>
      console.error('Failed to emit assignment event:', err)
    );

    return NextResponse.json({
      message: 'Ticket claimed successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error claiming ticket:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tickets/[id]/claim - Unclaim/release a ticket
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticketId = id;

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

    // Only technicians, security analysts, managers, and admins can release tickets
    if (!session.user.role || !['TECHNICIAN', 'ADMIN', 'SUPER_ADMIN', 'SECURITY_ANALYST', 'MANAGER_IT'].includes(session.user.role)) {
      return NextResponse.json({ error: 'You do not have permission to release tickets' }, { status: 403 });
    }

    // Check if the current user is the one who claimed it
    if (existingTicket.assignedToId !== session.user.id) {
      // Allow admins to unclaim any ticket
      if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
        return NextResponse.json({
          error: 'You can only unclaim tickets that you have claimed'
        }, { status: 403 });
      }
    }

    // Prevent releasing tickets in terminal statuses
    const terminalStatuses = ['RESOLVED', 'CLOSED', 'CANCELLED'];
    if (terminalStatuses.includes(existingTicket.status)) {
      return NextResponse.json({
        error: `Cannot release a ticket with status ${existingTicket.status}. The assignee must remain for accountability.`
      }, { status: 400 });
    }

    // Unclaim the ticket
    const newStatus = existingTicket.status === 'IN_PROGRESS' ? 'OPEN' : existingTicket.status;
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedToId: null,
        status: newStatus,
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

    // Create a comment to log the unclaim
    await prisma.ticketComment.create({
      data: {
        ticketId: ticketId,
        userId: session.user.id,
        content: `Ticket released by ${session.user.name}`,
        isInternal: false
      }
    });

    // Create an audit log entry
    await prisma.auditLog.create({
      data: {
        action: 'UNCLAIMED',
        entity: 'TICKET',
        entityId: ticketId,
        userId: session.user.id,
        oldValues: { assignedToId: existingTicket.assignedToId, status: existingTicket.status },
        newValues: { assignedToId: null, status: newStatus, unclaimedBy: session.user.name }
      }
    });

    return NextResponse.json({
      message: 'Ticket released successfully',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error unclaiming ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}