import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as dashboardQueries from '@/lib/dashboard-queries';

// GET /api/dashboard - Get comprehensive dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's branch information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true, supportGroup: true }
    });

    const userRole = session.user.role;
    const branchId = user?.branchId;
    const userId = session.user.id;

    // Determine filtering based on user role
    const isGlobalRole = ['ADMIN', 'SUPER_ADMIN'].includes(userRole);
    const isManager = userRole === 'MANAGER';
    const isManagerIT = userRole === 'MANAGER_IT';
    const isTechnician = userRole === 'TECHNICIAN';
    const isUser = userRole === 'USER';

    // Build where clause for ticket statistics based on role
    let ticketBaseFilter: any = {};

    if (isUser && branchId) {
      ticketBaseFilter = { createdById: userId };
    } else if (isManager && branchId) {
      ticketBaseFilter = { branchId: branchId };
    } else if (isTechnician) {
      const supportGroupId = user?.supportGroupId;
      ticketBaseFilter = supportGroupId
        ? { OR: [{ assignedToId: userId }, { supportGroupId: supportGroupId }] }
        : { assignedToId: userId };
    }

    // Helper function to combine base filter with additional conditions
    const combineFilters = (additionalFilters: any) => {
      if (Object.keys(ticketBaseFilter).length === 0) {
        return additionalFilters;
      }
      return { AND: [ticketBaseFilter, additionalFilters] };
    };

    // Date ranges for trends
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Execute all ticket queries - Using wrapped functions to prevent webpack collisions
    const queryResults = await Promise.all([
      dashboardQueries.countTotalTickets(ticketBaseFilter.OR ? ticketBaseFilter : ticketBaseFilter),
      dashboardQueries.countOpenTickets(combineFilters({ status: 'OPEN' })),
      dashboardQueries.countInProgressTickets(combineFilters({ status: 'IN_PROGRESS' })),
      dashboardQueries.countResolvedTickets(combineFilters({ status: 'RESOLVED' })),
      dashboardQueries.countClosedTickets(combineFilters({ status: 'CLOSED' })),
      dashboardQueries.countUrgentTickets(combineFilters({
        priority: { in: ['CRITICAL', 'EMERGENCY'] },
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      })),
      dashboardQueries.countHighPriorityTickets(combineFilters({
        priority: 'HIGH',
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      })),
      dashboardQueries.countThisMonthTickets(combineFilters({
        createdAt: { gte: thisMonthStart }
      })),
      dashboardQueries.countLastMonthTickets(combineFilters({
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
      })),
      dashboardQueries.countThisWeekTickets(combineFilters({
        createdAt: { gte: thisWeekStart }
      })),
      dashboardQueries.countLastWeekTickets(combineFilters({
        createdAt: { gte: lastWeekStart, lt: thisWeekStart }
      })),
      dashboardQueries.countResolvedThisMonth(combineFilters({
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { gte: thisMonthStart }
      })),
      isTechnician ? dashboardQueries.countMyOpenTickets(userId) : Promise.resolve({ data: 0 }),
      isTechnician ? dashboardQueries.countMyAssignedTickets(userId) : Promise.resolve({ data: 0 }),
      isManager ? dashboardQueries.countPendingApprovals(userId) : Promise.resolve({ data: 0 }),
      dashboardQueries.findRecentTickets(ticketBaseFilter, 10)
    ]);

    // Access results via .data property to avoid variable name collisions
    const totalTickets = queryResults[0].data;
    const openTickets = queryResults[1].data;
    const inProgressTickets = queryResults[2].data;
    const resolvedTickets = queryResults[3].data;
    const closedTickets = queryResults[4].data;
    const urgentTickets = queryResults[5].data;
    const highPriorityTickets = queryResults[6].data;
    const thisMonthTickets = queryResults[7].data;
    const lastMonthTickets = queryResults[8].data;
    const thisWeekTickets = queryResults[9].data;
    const lastWeekTickets = queryResults[10].data;
    const resolvedThisMonth = queryResults[11].data;
    const myOpenTickets = queryResults[12].data;
    const myAssignedTickets = queryResults[13].data;
    const pendingApprovals = queryResults[14].data;
    const recentTickets = queryResults[15].data;

    // Get additional role-specific data
    let branchUsers = 0;
    let branchATMs = 0;
    let atmAlerts = 0;
    let totalUsers = 0;
    let totalBranches = 0;
    let networkIncidents = 0;
    let atmDowntime = 0;
    let infrastructureAlerts = 0;
    let mySubmittedTickets = 0;
    let myPendingTickets = 0;
    let myResolvedTickets = 0;

    // Manager-specific data
    if (isManager && branchId) {
      const managerResults = await Promise.all([
        dashboardQueries.countBranchUsers(branchId),
        dashboardQueries.countBranchATMs(branchId),
        dashboardQueries.countATMAlerts(branchId)
      ]);
      branchUsers = managerResults[0].data;
      branchATMs = managerResults[1].data;
      atmAlerts = managerResults[2].data;
    }

    // Admin/Super Admin specific data
    if (isGlobalRole) {
      const adminResults = await Promise.all([
        dashboardQueries.countTotalUsers(),
        dashboardQueries.countTotalBranches()
      ]);
      totalUsers = adminResults[0].data;
      totalBranches = adminResults[1].data;
    }

    // IT Manager specific data
    if (isManagerIT || isGlobalRole) {
      const itManagerResults = await Promise.all([
        dashboardQueries.countNetworkIncidents(),
        dashboardQueries.countATMDowntime(),
        dashboardQueries.countInfrastructureAlerts()
      ]);
      networkIncidents = itManagerResults[0].data;
      atmDowntime = itManagerResults[1].data;
      infrastructureAlerts = itManagerResults[2].data;
    }

    // User-specific data
    if (isUser) {
      const userResults = await Promise.all([
        dashboardQueries.countMySubmittedTickets(userId),
        dashboardQueries.countMyPendingTickets(userId),
        dashboardQueries.countMyResolvedTickets(userId)
      ]);
      mySubmittedTickets = userResults[0].data;
      myPendingTickets = userResults[1].data;
      myResolvedTickets = userResults[2].data;
    }

    // Calculate average resolution time
    const resolvedTicketsResult = await dashboardQueries.findResolvedTicketsWithTime(
      combineFilters({
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { not: null }
      }),
      100
    );
    const resolvedTicketsWithTime = resolvedTicketsResult.data;

    let avgResolutionTime = '0h';
    let avgResolutionHours = 0;
    if (resolvedTicketsWithTime.length > 0) {
      const totalHours = resolvedTicketsWithTime.reduce((sum, ticket) => {
        if (ticket.resolvedAt) {
          const diffMs = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          return sum + diffHours;
        }
        return sum;
      }, 0);

      avgResolutionHours = totalHours / resolvedTicketsWithTime.length;
      if (avgResolutionHours < 1) {
        avgResolutionTime = `${Math.round(avgResolutionHours * 60)}m`;
      } else if (avgResolutionHours < 24) {
        avgResolutionTime = `${avgResolutionHours.toFixed(1)}h`;
      } else {
        avgResolutionTime = `${(avgResolutionHours / 24).toFixed(1)}d`;
      }
    }

    // Calculate SLA compliance
    const totalResolved = resolvedTickets + closedTickets;
    let slaCompliance = 100;

    if (totalResolved > 0) {
      const breachedResult = await dashboardQueries.countBreachedTickets(
        combineFilters({
          status: { in: ['RESOLVED', 'CLOSED'] },
          slaTracking: {
            some: {
              OR: [
                { isResponseBreached: true },
                { isResolutionBreached: true }
              ]
            }
          }
        })
      );
      const breachedTickets = breachedResult.data;

      const slaCompliantTickets = totalResolved - breachedTickets;
      slaCompliance = Math.round((slaCompliantTickets / totalResolved) * 100);
    }

    // Calculate trends
    const ticketTrend = lastMonthTickets > 0
      ? Math.round(((thisMonthTickets - lastMonthTickets) / lastMonthTickets) * 100)
      : thisMonthTickets > 0 ? 100 : 0;

    const weeklyTrend = lastWeekTickets > 0
      ? Math.round(((thisWeekTickets - lastWeekTickets) / lastWeekTickets) * 100)
      : thisWeekTickets > 0 ? 100 : 0;

    // Get active users count
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsersResult = await dashboardQueries.countActiveUsers(thirtyDaysAgo);
    const activeUsers = activeUsersResult.data;

    // Format recent tickets
    const formattedRecentTickets = recentTickets.map(ticket => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      service: ticket.service?.name || 'General',
      assignee: ticket.assignedTo?.name || 'Unassigned',
      creator: ticket.createdBy?.name || 'Unknown',
      branch: ticket.branch?.name || 'N/A',
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString()
    }));

    // Build response based on role
    const stats = {
      // Core stats for all users
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets: resolvedTickets + closedTickets,
      resolvedThisMonth,
      avgResolutionTime,
      slaCompliance,
      activeUsers,

      // Trend data
      trends: {
        ticketTrend,
        weeklyTrend,
        thisMonthTickets,
        lastMonthTickets
      },

      // Priority breakdown
      priority: {
        urgent: urgentTickets,
        high: highPriorityTickets
      },

      // Role-specific stats
      roleSpecific: {
        // For technicians
        ...(isTechnician && {
          myOpenTickets,
          myAssignedTickets,
          myWorkload: myOpenTickets
        }),

        // For managers
        ...(isManager && {
          pendingApprovals,
          branchTickets: totalTickets,
          teamPerformance: slaCompliance,
          branchUsers,
          branchATMs,
          atmAlerts
        }),

        // For IT managers
        ...(isManagerIT && {
          networkIncidents,
          atmDowntime,
          infrastructureAlerts
        }),

        // For admins
        ...(isGlobalRole && {
          systemWideTickets: totalTickets,
          allBranches: true,
          totalUsers,
          totalBranches,
          systemHealth: 98,
          networkIncidents,
          atmDowntime,
          infrastructureAlerts
        }),

        // For regular users
        ...(isUser && {
          mySubmittedTickets,
          myPendingTickets,
          myResolvedTickets
        })
      }
    };

    return NextResponse.json({
      stats,
      recentTickets: formattedRecentTickets,
      user: {
        name: user?.name,
        role: userRole,
        branch: user?.branch?.name,
        supportGroup: user?.supportGroup?.name
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
