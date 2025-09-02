import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/branch/atm-claims/[id]/collaborate - Get collaboration messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true }
    });

    // Get ticket details
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        branchId: true,
        createdBy: {
          select: { branchId: true }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get all communications for this ticket
    const communications = await prisma.branchCommunication.findMany({
      where: {
        ticketId: id,
        OR: [
          { fromBranchId: user?.branchId || '' },
          { toBranchId: user?.branchId },
          { toBranchId: null } // Broadcast messages
        ]
      },
      include: {
        user: { select: { name: true, email: true } },
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark messages as read
    if (user?.branchId) {
      const unreadMessages = communications.filter(msg => {
        const readBy = msg.readBy as any[] || [];
        return !readBy.some(r => r.userId === session.user.id);
      });

      for (const msg of unreadMessages) {
        const readBy = (msg.readBy as any[]) || [];
        readBy.push({
          userId: session.user.id,
          readAt: new Date()
        });

        await prisma.branchCommunication.update({
          where: { id: msg.id },
          data: { readBy }
        });
      }
    }

    return NextResponse.json({
      communications,
      participants: {
        ownerBranch: ticket.branchId,
        creatorBranch: ticket.createdBy.branchId,
        currentUserBranch: user?.branchId
      }
    });

  } catch (error) {
    console.error('Error fetching collaboration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collaboration messages' },
      { status: 500 }
    );
  }
}

// POST /api/branch/atm-claims/[id]/collaborate - Add collaboration message
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

    const body = await request.json();
    const { message, messageType = 'INFO', toBranchId, attachments } = body;

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true, name: true }
    });

    if (!user?.branchId) {
      return NextResponse.json(
        { error: 'User must be assigned to a branch' },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        ticketNumber: true,
        branchId: true,
        createdBy: { select: { branchId: true } }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create communication
    const communication = await prisma.branchCommunication.create({
      data: {
        ticketId: id,
        fromBranchId: user.branchId,
        toBranchId: toBranchId || null, // null for broadcast
        userId: session.user.id,
        message,
        messageType,
        attachments: attachments || null,
        readBy: [{
          userId: session.user.id,
          readAt: new Date()
        }]
      },
      include: {
        user: { select: { name: true, email: true } },
        fromBranch: { select: { name: true, code: true } },
        toBranch: { select: { name: true, code: true } }
      }
    });

    // Also create a ticket comment for visibility
    await prisma.ticketComment.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        content: `[Inter-branch Communication]\nFrom: ${communication.fromBranch.name}\n${toBranchId ? `To: ${communication.toBranch?.name}` : 'To: All Branches'}\n\n${message}`,
        isInternal: true
      }
    });

    // Create notification for target branch(es)
    if (messageType === 'URGENT' || messageType === 'REQUEST') {
      // This would trigger real-time notifications
      // For now, we'll rely on the polling mechanism
    }

    return NextResponse.json({
      success: true,
      communication,
      message: 'Message sent successfully'
    });

  } catch (error) {
    console.error('Error sending collaboration message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}