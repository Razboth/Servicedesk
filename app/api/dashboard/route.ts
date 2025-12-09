import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const isTechnician = userRole === 'TECHNICIAN';
    const isUser = userRole === 'USER';

    // Build where clause for ticket statistics based on role
    let ticketStatsWhere: any = {};
    let myTicketsWhere: any = {};

    if (isUser && branchId) {
      // Users see their own tickets
      ticketStatsWhere = { createdById: userId };
      myTicketsWhere = { createdById: userId };
    } else if (isManager && branchId) {
      // Managers see tickets from their branch
      ticketStatsWhere = { branchId: branchId };
      myTicketsWhere = { branchId: branchId };
    } else if (isTechnician) {
      // Technicians see tickets assigned to them or their support group
      const supportGroupId = user?.supportGroupId;
      ticketStatsWhere = supportGroupId
        ? { OR: [{ assignedToId: userId }, { supportGroupId }] }
        : { assignedToId: userId };
      myTicketsWhere = { assignedToId: userId };
    }
    // Admins see all tickets (no additional filtering)

    // Date ranges for trends
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Get comprehensive ticket statistics
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      urgentTickets,
      highPriorityTickets,
      thisMonthTickets,
      lastMonthTickets,
      thisWeekTickets,
      lastWeekTickets,
      resolvedThisMonth,
      myOpenTickets,
      myAssignedTickets,
      pendingApprovals,
      recentTickets
    ] = await Promise.all([
      // Total tickets count
      prisma.ticket.count({ where: ticketStatsWhere }),

      // Open tickets count
      prisma.ticket.count({
        where: { ...ticketStatsWhere, status: 'OPEN' }
      }),

      // In Progress tickets count
      prisma.ticket.count({
        where: { ...ticketStatsWhere, status: 'IN_PROGRESS' }
      }),

      // Resolved tickets count
      prisma.ticket.count({
        where: { ...ticketStatsWhere, status: 'RESOLVED' }
      }),

      // Closed tickets count
      prisma.ticket.count({
        where: { ...ticketStatsWhere, status: 'CLOSED' }
      }),

      // Urgent tickets (open only)
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          priority: 'URGENT',
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),

      // High priority tickets (open only)
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          priority: 'HIGH',
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }),

      // This month's tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: { gte: thisMonthStart }
        }
      }),

      // Last month's tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        }
      }),

      // This week's tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: { gte: thisWeekStart }
        }
      }),

      // Last week's tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: { gte: lastWeekStart, lt: thisWeekStart }
        }
      }),

      // Resolved this month
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: thisMonthStart }
        }
      }),

      // My open tickets (for technicians)
      isTechnician ? prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      }) : Promise.resolve(0),

      // My assigned tickets (for technicians)
      isTechnician ? prisma.ticket.count({
        where: { assignedToId: userId }
      }) : Promise.resolve(0),

      // Pending approvals (for managers)
      isManager ? prisma.approval.count({
        where: {
          approverId: userId,
          status: 'PENDING'
        }
      }) : Promise.resolve(0),

      // Recent tickets (last 10)
      prisma.ticket.findMany({
        where: ticketStatsWhere,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          service: { select: { name: true } },
          createdBy: { select: { name: true, email: true } },
          assignedTo: { select: { name: true, email: true } },
          branch: { select: { name: true, code: true } }
        }
      })
    ]);

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        ...ticketStatsWhere,
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { not: null }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      },
      take: 100
    });

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
    const slaCompliantTickets = await prisma.ticket.count({
      where: {
        ...ticketStatsWhere,
        status: { in: ['RESOLVED', 'CLOSED'] },
        slaBreached: false
      }
    });

    const totalResolved = resolvedTickets + closedTickets;
    const slaCompliance = totalResolved > 0
      ? Math.round((slaCompliantTickets / totalResolved) * 100)
      : 100;

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

    const activeUsers = await prisma.user.count({
      where: {
        createdTickets: {
          some: { createdAt: { gte: thirtyDaysAgo } }
        }
      }
    });

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
          teamPerformance: slaCompliance
        }),

        // For admins
        ...(isGlobalRole && {
          systemWideTickets: totalTickets,
          allBranches: true
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
