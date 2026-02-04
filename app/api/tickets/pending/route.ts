import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { TicketStatus } from '@prisma/client';

// GET /api/tickets/pending - Get pending tickets for checklist verification
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status'); // comma-separated: PENDING,PENDING_VENDOR,OPEN
    const approvedFrom = searchParams.get('approvedFrom');
    const approvedTo = searchParams.get('approvedTo');

    // Parse status filter
    const statuses: TicketStatus[] = statusParam
      ? (statusParam.split(',') as TicketStatus[])
      : ['PENDING', 'PENDING_VENDOR', 'OPEN'];

    // Build base where clause
    const where: any = {
      status: { in: statuses },
    };

    // If date range provided, filter by approval date
    if (approvedFrom || approvedTo) {
      // Get tickets that have been approved within the date range
      const approvalWhere: any = {
        status: 'APPROVED',
      };

      if (approvedFrom || approvedTo) {
        approvalWhere.updatedAt = {};
        if (approvedFrom) {
          approvalWhere.updatedAt.gte = new Date(approvedFrom);
        }
        if (approvedTo) {
          approvalWhere.updatedAt.lte = new Date(approvedTo);
        }
      }

      // Get ticket IDs that have approved approvals in the date range
      const approvedTicketIds = await prisma.ticketApproval.findMany({
        where: approvalWhere,
        select: { ticketId: true },
        distinct: ['ticketId'],
      });

      if (approvedTicketIds.length > 0) {
        where.id = { in: approvedTicketIds.map((t) => t.ticketId) };
      } else {
        // No tickets approved in the range, return empty
        return NextResponse.json({
          success: true,
          data: [],
          summary: {
            totalTickets: 0,
            fetchedAt: new Date().toISOString(),
            timeRange: { from: approvedFrom, to: approvedTo },
          },
        });
      }
    }

    // Get tickets
    const tickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        priority: true,
        createdAt: true,
        category: true,
        branch: {
          select: {
            name: true,
            code: true,
          },
        },
        approvals: {
          where: { status: 'APPROVED' },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            updatedAt: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 100, // Limit to avoid too many results
    });

    // Transform to checklist-friendly format
    const data = tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt.toISOString(),
      approvedAt: ticket.approvals[0]?.updatedAt?.toISOString() || null,
      category: ticket.category,
      branch: ticket.branch ? `${ticket.branch.name} (${ticket.branch.code})` : null,
    }));

    return NextResponse.json({
      success: true,
      data,
      summary: {
        totalTickets: data.length,
        fetchedAt: new Date().toISOString(),
        timeRange: { from: approvedFrom, to: approvedTo },
      },
    });
  } catch (error) {
    console.error('Error fetching pending tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
