import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
    // Using a base filter that can be combined with AND
    let ticketBaseFilter: any = {};
    let myTicketsWhere: any = {};

    if (isUser && branchId) {
      // Users see their own tickets
      ticketBaseFilter = { createdById: userId };
      myTicketsWhere = { createdById: userId };
    } else if (isManager && branchId) {
      // Managers see tickets from their branch
      ticketBaseFilter = { branchId: branchId };
      myTicketsWhere = { branchId: branchId };
    } else if (isTechnician) {
      // Technicians see tickets assigned to them or their support group
      const supportGroupId = user?.supportGroupId;
      ticketBaseFilter = supportGroupId
        ? { OR: [{ assignedToId: userId }, { supportGroupId: supportGroupId }] }
        : { assignedToId: userId };
      myTicketsWhere = { assignedToId: userId };
    }
    // Admins and IT Managers see all tickets (no additional filtering)

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
      prisma.ticket.count({ where: ticketBaseFilter.OR ? ticketBaseFilter : ticketBaseFilter }),

      // Open tickets count
      prisma.ticket.count({
        where: combineFilters({ status: 'OPEN' })
      }),

      // In Progress tickets count
      prisma.ticket.count({
        where: combineFilters({ status: 'IN_PROGRESS' })
      }),

      // Resolved tickets count
      prisma.ticket.count({
        where: combineFilters({ status: 'RESOLVED' })
      }),

      // Closed tickets count
      prisma.ticket.count({
        where: combineFilters({ status: 'CLOSED' })
      }),

      // Critical/Emergency tickets (open only)
      prisma.ticket.count({
        where: combineFilters({
          priority: { in: ['CRITICAL', 'EMERGENCY'] },
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        })
      }),

      // High priority tickets (open only)
      prisma.ticket.count({
        where: combineFilters({
          priority: 'HIGH',
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        })
      }),

      // This month's tickets
      prisma.ticket.count({
        where: combineFilters({
          createdAt: { gte: thisMonthStart }
        })
      }),

      // Last month's tickets
      prisma.ticket.count({
        where: combineFilters({
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd }
        })
      }),

      // This week's tickets
      prisma.ticket.count({
        where: combineFilters({
          createdAt: { gte: thisWeekStart }
        })
      }),

      // Last week's tickets
      prisma.ticket.count({
        where: combineFilters({
          createdAt: { gte: lastWeekStart, lt: thisWeekStart }
        })
      }),

      // Resolved this month
      prisma.ticket.count({
        where: combineFilters({
          status: { in: ['RESOLVED', 'CLOSED'] },
          resolvedAt: { gte: thisMonthStart }
        })
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
        where: Object.keys(ticketBaseFilter).length > 0 ? ticketBaseFilter : undefined,
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
      const [branchUserCount, branchATMCount, atmAlertCount] = await Promise.all([
        // Count users in the branch
        prisma.user.count({
          where: { branchId: branchId, isActive: true }
        }),
        // Count ATMs in the branch
        prisma.aTM.count({
          where: { branchId: branchId }
        }),
        // Count active ATM alerts
        prisma.aTMAlert.count({
          where: {
            atm: { branchId: branchId },
            resolvedAt: null
          }
        })
      ]);
      branchUsers = branchUserCount;
      branchATMs = branchATMCount;
      atmAlerts = atmAlertCount;
    }

    // Admin/Super Admin specific data
    if (isGlobalRole) {
      const [userCount, branchCount] = await Promise.all([
        prisma.user.count({ where: { isActive: true } }),
        prisma.branch.count({ where: { isActive: true } })
      ]);
      totalUsers = userCount;
      totalBranches = branchCount;
    }

    // IT Manager specific data
    if (isManagerIT || isGlobalRole) {
      const [networkIncidentCount, atmDowntimeCount, infraAlertCount] = await Promise.all([
        // Count active network incidents
        prisma.networkIncident.count({
          where: { resolvedAt: null }
        }),
        // Count ATMs currently down
        prisma.aTM.count({
          where: { status: { in: ['DOWN', 'CRITICAL'] } }
        }),
        // Count unresolved ATM alerts
        prisma.aTMAlert.count({
          where: { resolvedAt: null }
        })
      ]);
      networkIncidents = networkIncidentCount;
      atmDowntime = atmDowntimeCount;
      infrastructureAlerts = infraAlertCount;
    }

    // User-specific data
    if (isUser) {
      const [submitted, pending, resolved] = await Promise.all([
        prisma.ticket.count({
          where: { createdById: userId }
        }),
        prisma.ticket.count({
          where: {
            createdById: userId,
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          }
        }),
        prisma.ticket.count({
          where: {
            createdById: userId,
            status: { in: ['RESOLVED', 'CLOSED'] }
          }
        })
      ]);
      mySubmittedTickets = submitted;
      myPendingTickets = pending;
      myResolvedTickets = resolved;
    }

    // Calculate average resolution time
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
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

    // Calculate SLA compliance using SLATracking relation
    // Count tickets that were resolved/closed and have NO breached SLA tracking
    const totalResolved = resolvedTickets + closedTickets;
    let slaCompliance = 100;

    if (totalResolved > 0) {
      // Count tickets with breached SLA (either response or resolution breached)
      const breachedTickets = await prisma.ticket.count({
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
          systemHealth: 98, // Placeholder for actual system health calculation
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
