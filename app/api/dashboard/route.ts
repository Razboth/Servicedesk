import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDashboardPrisma } from '@/lib/dashboard-db';

// GET /api/dashboard - Get comprehensive dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get database connection from isolated module
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = getDashboardPrisma() as any;

    // Get user's branch information
    const user = await db.user.findUnique({
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
    let ticketBaseFilter: Record<string, unknown> = {};

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
    const combineFilters = (additionalFilters: Record<string, unknown>) => {
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

    // Execute queries sequentially
    const totalTickets = await db.ticket.count({ where: ticketBaseFilter });
    const openTickets = await db.ticket.count({ where: combineFilters({ status: 'OPEN' }) });
    const inProgressTickets = await db.ticket.count({ where: combineFilters({ status: 'IN_PROGRESS' }) });
    const resolvedTickets = await db.ticket.count({ where: combineFilters({ status: 'RESOLVED' }) });
    const closedTickets = await db.ticket.count({ where: combineFilters({ status: 'CLOSED' }) });

    const urgentTickets = await db.ticket.count({
      where: combineFilters({
        priority: { in: ['CRITICAL', 'EMERGENCY'] },
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      })
    });

    const highPriorityTickets = await db.ticket.count({
      where: combineFilters({
        priority: 'HIGH',
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      })
    });

    const thisMonthTickets = await db.ticket.count({
      where: combineFilters({ createdAt: { gte: thisMonthStart } })
    });

    const lastMonthTickets = await db.ticket.count({
      where: combineFilters({ createdAt: { gte: lastMonthStart, lte: lastMonthEnd } })
    });

    const thisWeekTickets = await db.ticket.count({
      where: combineFilters({ createdAt: { gte: thisWeekStart } })
    });

    const lastWeekTickets = await db.ticket.count({
      where: combineFilters({ createdAt: { gte: lastWeekStart, lt: thisWeekStart } })
    });

    const resolvedThisMonth = await db.ticket.count({
      where: combineFilters({
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { gte: thisMonthStart }
      })
    });

    // Technician-specific data
    let myOpenTickets = 0;
    let myAssignedTickets = 0;

    if (isTechnician) {
      myOpenTickets = await db.ticket.count({
        where: {
          assignedToId: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      });

      myAssignedTickets = await db.ticket.count({
        where: { assignedToId: userId }
      });
    }

    // Manager-specific data
    let pendingApprovals = 0;
    let branchUsers = 0;
    let branchATMs = 0;
    let atmAlerts = 0;

    if (isManager) {
      pendingApprovals = await db.approval.count({
        where: {
          approverId: userId,
          status: 'PENDING'
        }
      });

      if (branchId) {
        branchUsers = await db.user.count({
          where: { branchId: branchId, isActive: true }
        });

        branchATMs = await db.aTM.count({
          where: { branchId: branchId }
        });

        atmAlerts = await db.aTMAlert.count({
          where: {
            atm: { branchId: branchId },
            resolvedAt: null
          }
        });
      }
    }

    // Admin/Super Admin specific data
    let totalUsers = 0;
    let totalBranches = 0;

    if (isGlobalRole) {
      totalUsers = await db.user.count({ where: { isActive: true } });
      totalBranches = await db.branch.count({ where: { isActive: true } });
    }

    // IT Manager specific data
    let networkIncidents = 0;
    let atmDowntime = 0;
    let infrastructureAlerts = 0;

    if (isManagerIT || isGlobalRole) {
      networkIncidents = await db.networkIncident.count({
        where: { resolvedAt: null }
      });

      atmDowntime = await db.aTM.count({
        where: { status: { in: ['DOWN', 'CRITICAL'] } }
      });

      infrastructureAlerts = await db.aTMAlert.count({
        where: { resolvedAt: null }
      });
    }

    // User-specific data
    let mySubmittedTickets = 0;
    let myPendingTickets = 0;
    let myResolvedTickets = 0;

    if (isUser) {
      mySubmittedTickets = await db.ticket.count({
        where: { createdById: userId }
      });

      myPendingTickets = await db.ticket.count({
        where: {
          createdById: userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        }
      });

      myResolvedTickets = await db.ticket.count({
        where: {
          createdById: userId,
          status: { in: ['RESOLVED', 'CLOSED'] }
        }
      });
    }

    // Get recent tickets
    const recentTickets = await db.ticket.findMany({
      where: Object.keys(ticketBaseFilter).length > 0 ? ticketBaseFilter : undefined,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
        branch: { select: { name: true, code: true } }
      }
    });

    // Calculate average resolution time
    const resolvedTicketsWithTime = await db.ticket.findMany({
      where: combineFilters({
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { not: null }
      }),
      select: {
        createdAt: true,
        resolvedAt: true
      },
      take: 100
    });

    let avgResolutionTime = '0h';
    let avgResolutionHours = 0;

    if (resolvedTicketsWithTime.length > 0) {
      const totalHours = resolvedTicketsWithTime.reduce((sum: number, ticket: { createdAt: Date; resolvedAt: Date | null }) => {
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
      const breachedTickets = await db.ticket.count({
        where: combineFilters({
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
      });

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

    const activeUsers = await db.user.count({
      where: {
        createdTickets: {
          some: { createdAt: { gte: thirtyDaysAgo } }
        }
      }
    });

    // Format recent tickets
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formattedRecentTickets = recentTickets.map((ticket: any) => ({
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
