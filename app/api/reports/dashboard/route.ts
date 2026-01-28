import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

// GET /api/reports/dashboard - Get comprehensive reports dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's branch information
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    // Determine filtering based on user role
    const isGlobalRole = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role);
    const isBranchRole = ['MANAGER', 'USER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for ticket statistics based on role
    let ticketStatsWhere: any = {};
    if (isBranchRole && branchId) {
      ticketStatsWhere = { branchId: branchId };
    }

    // Date ranges for comparative analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get comprehensive ticket statistics
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedTickets,
      closedTickets,
      overdueTickets,
      criticalTickets,
      recentTickets30Days,
      recentTickets7Days,
      recentTickets24Hours
    ] = await Promise.all([
      // Total tickets
      prisma.ticket.count({
        where: ticketStatsWhere
      }),

      // Open tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: 'OPEN'
        }
      }),

      // In progress tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: 'IN_PROGRESS'
        }
      }),

      // Resolved tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: 'RESOLVED'
        }
      }),

      // Closed tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: 'CLOSED'
        }
      }),

      // Overdue tickets (approximate - tickets open > 24 hours without assignment)
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          },
          createdAt: {
            lt: twentyFourHoursAgo
          }
        }
      }),

      // Critical priority tickets
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          priority: {
            in: ['CRITICAL', 'HIGH']
          },
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      }),

      // Recent tickets - 30 days
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: {
            gte: thirtyDaysAgo
          }
        }
      }),

      // Recent tickets - 7 days
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: {
            gte: sevenDaysAgo
          }
        }
      }),

      // Recent tickets - 24 hours
      prisma.ticket.count({
        where: {
          ...ticketStatsWhere,
          createdAt: {
            gte: twentyFourHoursAgo
          }
        }
      })
    ]);

    // Calculate detailed resolution statistics
    const resolvedTicketsWithTime = await prisma.ticket.findMany({
      where: {
        ...ticketStatsWhere,
        status: {
          in: ['RESOLVED', 'CLOSED']
        },
        resolvedAt: {
          not: null
        }
      },
      select: {
        createdAt: true,
        resolvedAt: true,
        priority: true,
        updatedAt: true,
        status: true
      },
      take: 500 // Increased sample for better accuracy
    });

    // Calculate various averages
    let avgResolutionHours = 0;
    let avgFirstResponseHours = 0;
    let avgAssignmentHours = 0;
    let resolutionStats = {
      byPriority: {
        CRITICAL: { count: 0, avgHours: 0 },
        HIGH: { count: 0, avgHours: 0 },
        MEDIUM: { count: 0, avgHours: 0 },
        LOW: { count: 0, avgHours: 0 }
      }
    };

    if (resolvedTicketsWithTime.length > 0) {
      let totalResolutionHours = 0;

      // Reset priority counters
      Object.keys(resolutionStats.byPriority).forEach(priority => {
        resolutionStats.byPriority[priority as keyof typeof resolutionStats.byPriority] = { count: 0, avgHours: 0 };
      });

      resolvedTicketsWithTime.forEach(ticket => {
        if (ticket.resolvedAt) {
          // Resolution time (business hours)
          const resolutionHours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
          totalResolutionHours += resolutionHours;

          // Track by priority
          const priority = ticket.priority as keyof typeof resolutionStats.byPriority;
          if (resolutionStats.byPriority[priority]) {
            resolutionStats.byPriority[priority].count++;
            resolutionStats.byPriority[priority].avgHours += resolutionHours;
          }

          // Note: firstResponseAt and assignedAt fields don't exist in current schema
          // These metrics would need to be tracked via audit logs or separate tracking
        }
      });

      avgResolutionHours = totalResolutionHours / resolvedTicketsWithTime.length;
      // These metrics are not available without tracking fields
      avgFirstResponseHours = 0;
      avgAssignmentHours = 0;

      // Calculate average by priority
      Object.keys(resolutionStats.byPriority).forEach(priority => {
        const priorityData = resolutionStats.byPriority[priority as keyof typeof resolutionStats.byPriority];
        if (priorityData.count > 0) {
          priorityData.avgHours = priorityData.avgHours / priorityData.count;
        }
      });
    }

    // Calculate SLA compliance rates
    const slaTargets = {
      CRITICAL: 4, // 4 hours
      HIGH: 8,     // 8 hours  
      MEDIUM: 24,  // 24 hours
      LOW: 72      // 72 hours
    };

    let slaCompliantCount = 0;
    let totalSlaTickets = 0;

    resolvedTicketsWithTime.forEach(ticket => {
      if (ticket.resolvedAt) {
        const resolutionHours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
        const target = slaTargets[ticket.priority as keyof typeof slaTargets] || 24;
        
        totalSlaTickets++;
        if (resolutionHours <= target) {
          slaCompliantCount++;
        }
      }
    });

    const overallSlaCompliance = totalSlaTickets > 0 ? (slaCompliantCount / totalSlaTickets) * 100 : 0;

    // Get ticket trend data (last 30 days) - grouped by date in SQL for performance
    const trendQuery = branchId && isBranchRole
      ? prisma.$queryRaw<{ date: Date; count: bigint }[]>`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "tickets"
          WHERE "createdAt" >= ${thirtyDaysAgo} AND "branchId" = ${branchId}
          GROUP BY DATE("createdAt")
          ORDER BY date`
      : prisma.$queryRaw<{ date: Date; count: bigint }[]>`
          SELECT DATE("createdAt") as date, COUNT(*)::int as count
          FROM "tickets"
          WHERE "createdAt" >= ${thirtyDaysAgo}
          GROUP BY DATE("createdAt")
          ORDER BY date`;

    const trendData = await trendQuery;
    const trendMap = new Map<string, number>();
    for (const row of trendData) {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      trendMap.set(dateStr, Number(row.count));
    }

    // Format trend data by day
    const dailyTicketTrend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000);
      const dateStr = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().split('T')[0];
      return {
        date: dateStr,
        count: trendMap.get(dateStr) || 0
      };
    });

    // Get technician performance data (if user has access)
    let technicianStats = null;
    if (['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      const techStats = await prisma.user.findMany({
        where: {
          role: 'TECHNICIAN',
          isActive: true,
          ...(branchId && isBranchRole ? { branchId } : {})
        },
        select: {
          id: true,
          name: true,
          assignedTickets: {
            where: {
              createdAt: { gte: thirtyDaysAgo }
            },
            select: {
              id: true,
              status: true,
              createdAt: true,
              resolvedAt: true
            },
            take: 200
          }
        }
      });

      technicianStats = techStats.map(tech => {
        const tickets = tech.assignedTickets;
        const resolved = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));

        let avgResolution = 0;
        if (resolved.length > 0) {
          const totalHours = resolved.reduce((sum, ticket) => {
            if (ticket.resolvedAt) {
              return sum + calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
            }
            return sum;
          }, 0);
          avgResolution = totalHours / resolved.length;
        }

        return {
          name: tech.name,
          totalTickets: tickets.length,
          resolvedTickets: resolved.length,
          avgResolutionHours: avgResolution
        };
      }).sort((a, b) => b.resolvedTickets - a.resolvedTickets);
    }

    const stats = {
      overview: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        overdueTickets,
        criticalTickets
      },
      trends: {
        last24Hours: recentTickets24Hours,
        last7Days: recentTickets7Days,
        last30Days: recentTickets30Days,
        dailyTrend: dailyTicketTrend
      },
      performance: {
        avgResolutionTime: `${avgResolutionHours.toFixed(1)} hours`,
        avgFirstResponseTime: `${avgFirstResponseHours.toFixed(1)} hours`,
        avgAssignmentTime: `${avgAssignmentHours.toFixed(1)} hours`,
        slaCompliance: Math.round(overallSlaCompliance * 10) / 10,
        resolutionByPriority: Object.entries(resolutionStats.byPriority).map(([priority, data]) => ({
          priority,
          count: data.count,
          avgHours: Math.round(data.avgHours * 10) / 10
        }))
      },
      technicians: technicianStats
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching reports dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}