import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeWITA } from '@/lib/time-lock';

// GET - Get pending tickets from H-1 (yesterday)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate H-1 date in WITA timezone
    const witaTime = getCurrentTimeWITA();
    const yesterday = new Date(witaTime);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Find tickets that:
    // 1. Have status PENDING, PENDING_VENDOR, or OPEN
    // 2. Were approved on H-1 (check TicketApproval or slaStartAt)
    const pendingTickets = await prisma.ticket.findMany({
      where: {
        status: {
          in: ['PENDING', 'PENDING_VENDOR', 'OPEN'],
        },
        OR: [
          // Tickets approved on H-1 via TicketApproval
          {
            approvals: {
              some: {
                status: 'APPROVED',
                updatedAt: {
                  gte: yesterday,
                  lte: yesterdayEnd,
                },
              },
            },
          },
          // Tickets with SLA starting on H-1 (for non-approval tickets)
          {
            slaStartAt: {
              gte: yesterday,
              lte: yesterdayEnd,
            },
          },
          // Tickets created on H-1 that don't require approval
          {
            createdAt: {
              gte: yesterday,
              lte: yesterdayEnd,
            },
            service: {
              requiresApproval: false,
            },
          },
        ],
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Group by status for summary
    const summary = {
      PENDING: pendingTickets.filter(t => t.status === 'PENDING').length,
      PENDING_VENDOR: pendingTickets.filter(t => t.status === 'PENDING_VENDOR').length,
      OPEN: pendingTickets.filter(t => t.status === 'OPEN').length,
      total: pendingTickets.length,
    };

    // Format date for display
    const h1DateStr = yesterday.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return NextResponse.json({
      date: h1DateStr,
      summary,
      tickets: pendingTickets.map(ticket => ({
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        service: ticket.service?.name,
        branch: ticket.branch ? `${ticket.branch.code} - ${ticket.branch.name}` : null,
        assignedTo: ticket.assignedTo?.name,
        createdBy: ticket.createdBy?.name,
        createdAt: ticket.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching pending tickets:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data ticket pending' },
      { status: 500 }
    );
  }
}
