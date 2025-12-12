import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/manager/reports/summary
 * Get summary statistics for manager's branch reports page
 * Only accessible by MANAGER role
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'MANAGER') {
      return NextResponse.json(
        { error: 'Forbidden - Only managers can access this endpoint' },
        { status: 403 }
      );
    }

    // Get manager's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        branch: true
      }
    });

    if (!user?.branchId || !user.branch) {
      return NextResponse.json(
        { error: 'Manager not associated with any branch' },
        { status: 400 }
      );
    }

    const branchId = user.branchId;

    // Date ranges
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get ticket statistics for this month
    const [
      totalTickets,
      openTickets,
      resolvedTickets,
      lastMonthTickets,
      pendingApprovals,
      teamSize,
      atmCount,
      slaBreachedTickets
    ] = await Promise.all([
      // Total tickets this month from branch
      prisma.ticket.count({
        where: {
          branchId,
          createdAt: { gte: thisMonthStart }
        }
      }),
      // Open tickets
      prisma.ticket.count({
        where: {
          branchId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          createdAt: { gte: thisMonthStart }
        }
      }),
      // Resolved tickets this month
      prisma.ticket.count({
        where: {
          branchId,
          status: { in: ['RESOLVED', 'CLOSED'] },
          createdAt: { gte: thisMonthStart }
        }
      }),
      // Last month tickets for trend calculation
      prisma.ticket.count({
        where: {
          branchId,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        }
      }),
      // Pending approvals for this manager
      prisma.ticketApproval.count({
        where: {
          approverId: session.user.id,
          status: 'PENDING'
        }
      }),
      // Team size (users in this branch)
      prisma.user.count({
        where: {
          branchId,
          isActive: true
        }
      }),
      // ATM count
      prisma.aTM.count({
        where: {
          branchId,
          isActive: true
        }
      }),
      // SLA breached tickets this month
      prisma.ticket.count({
        where: {
          branchId,
          createdAt: { gte: thisMonthStart },
          slaTracking: {
            some: {
              OR: [
                { isResponseBreached: true },
                { isResolutionBreached: true }
              ]
            }
          }
        }
      })
    ]);

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        branchId,
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { not: null },
        createdAt: { gte: thisMonthStart }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      },
      take: 100
    });

    let avgResolutionTime = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalHours = resolvedTicketsWithTime.reduce((sum, ticket) => {
        if (ticket.resolvedAt) {
          const diffMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          return sum + diffMs / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgResolutionTime = Math.round((totalHours / resolvedTicketsWithTime.length) * 10) / 10;
    }

    // Calculate SLA compliance
    const totalResolvedForSla = resolvedTickets;
    const slaCompliance = totalResolvedForSla > 0
      ? Math.round(((totalResolvedForSla - slaBreachedTickets) / totalResolvedForSla) * 100)
      : 100;

    // Calculate trends
    const ticketTrend = lastMonthTickets > 0
      ? Math.round(((totalTickets - lastMonthTickets) / lastMonthTickets) * 100)
      : totalTickets > 0 ? 100 : 0;

    return NextResponse.json({
      branch: {
        id: user.branch.id,
        name: user.branch.name,
        code: user.branch.code,
        city: user.branch.city || 'N/A'
      },
      stats: {
        totalTickets,
        openTickets,
        resolvedTickets,
        slaCompliance,
        avgResolutionTime,
        pendingApprovals,
        teamSize,
        atmCount
      },
      trends: {
        ticketTrend,
        resolutionTrend: 0 // Can be calculated if needed
      }
    });
  } catch (error) {
    console.error('Error fetching manager reports summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
