import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

// GET /api/reports/technician/performance - Get technician performance data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only technicians can access their own performance report
    if (session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    const userId = session.user.id;

    // Get basic ticket statistics
    const [
      totalAssignedTickets,
      resolvedTickets,
      openTickets,
      overdueTickets
    ] = await Promise.all([
      // Total assigned tickets in period
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }),

      // Resolved tickets in period
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: {
            in: ['RESOLVED', 'CLOSED']
          },
          resolvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }),

      // Currently open tickets
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      }),

      // Overdue tickets (past SLA deadline)
      prisma.ticket.count({
        where: {
          assignedToId: userId,
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          },
          slaTracking: {
            some: {
              isResolutionBreached: true
            }
          }
        }
      })
    ]);

    // Calculate resolution rate
    const resolutionRate = totalAssignedTickets > 0 ? 
      Math.round((resolvedTickets / totalAssignedTickets) * 100) : 0;

    // Get average response and resolution times
    const slaData = await prisma.sLATracking.findMany({
      where: {
        ticket: {
          assignedToId: userId,
          resolvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      },
      include: {
        ticket: {
          select: {
            createdAt: true,
            resolvedAt: true
          }
        }
      }
    });

    let avgResponseTime = 0;
    let avgResolutionTime = 0;
    let slaCompliance = 0;

    if (slaData.length > 0) {
      // Calculate average response time (in business hours)
      const responseTimes = slaData
        .filter(sla => sla.responseTime)
        .map(sla => {
          return calculateBusinessHours(sla.ticket.createdAt, sla.responseTime!);
        });

      if (responseTimes.length > 0) {
        avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      }

      // Calculate average resolution time (in business hours)
      const resolutionTimes = slaData
        .filter(sla => sla.resolutionTime)
        .map(sla => {
          return calculateBusinessHours(sla.ticket.createdAt, sla.resolutionTime!);
        });

      if (resolutionTimes.length > 0) {
        avgResolutionTime = resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length;
      }

      // Calculate SLA compliance (percentage of tickets resolved within SLA)
      const compliantTickets = slaData.filter(sla => 
        !sla.isResponseBreached && !sla.isResolutionBreached
      ).length;
      slaCompliance = Math.round((compliantTickets / slaData.length) * 100);
    }

    // Get tickets by priority distribution
    const ticketsByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        assignedToId: userId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: {
        id: true
      }
    });

    const priorityDistribution = ticketsByPriority.map(group => ({
      label: group.priority,
      value: group._count.id
    }));

    // Get tickets by status distribution
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        assignedToId: userId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: {
        id: true
      }
    });

    const statusDistribution = ticketsByStatus.map(group => ({
      label: group.status.replace('_', ' '),
      value: group._count.id
    }));

    // Get tickets by category
    const ticketsByCategory = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    const categoryStats = ticketsByCategory.reduce((acc, ticket) => {
      const categoryName = ticket.category?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryDistribution = Object.entries(categoryStats).map(([label, value]) => ({
      label,
      value
    }));

    // Get recent activity (last 7 days of ticket resolution)
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await prisma.ticket.findMany({
      where: {
        assignedToId: userId,
        resolvedAt: {
          gte: last7Days
        }
      },
      select: {
        resolvedAt: true
      },
      orderBy: {
        resolvedAt: 'asc'
      }
    });

    // Group by day for timeline chart
    const activityByDay = recentActivity.reduce((acc, ticket) => {
      if (ticket.resolvedAt) {
        const day = ticket.resolvedAt.toISOString().split('T')[0];
        acc[day] = (acc[day] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const timelineData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      return {
        date: dateStr,
        value: activityByDay[dateStr] || 0,
        label: `${activityByDay[dateStr] || 0} tickets resolved`
      };
    });

    // Get task completion statistics
    const taskStats = await prisma.ticketTask.findMany({
      where: {
        completedById: userId,
        completedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        taskTemplateItem: {
          select: {
            estimatedMinutes: true
          }
        }
      }
    });

    const totalTasks = taskStats.length;
    const avgTaskTime = totalTasks > 0 ? 
      taskStats.reduce((sum, task) => sum + (task.actualMinutes || 0), 0) / totalTasks : 0;
    
    const estimatedVsActual = taskStats.reduce((acc, task) => {
      const estimated = task.taskTemplateItem.estimatedMinutes || 0;
      const actual = task.actualMinutes || 0;
      return {
        totalEstimated: acc.totalEstimated + estimated,
        totalActual: acc.totalActual + actual
      };
    }, { totalEstimated: 0, totalActual: 0 });

    const taskEfficiency = estimatedVsActual.totalEstimated > 0 ?
      Math.round((estimatedVsActual.totalEstimated / estimatedVsActual.totalActual) * 100) : 100;

    return NextResponse.json({
      summary: {
        totalAssignedTickets,
        resolvedTickets,
        openTickets,
        overdueTickets,
        resolutionRate,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        slaCompliance
      },
      distributions: {
        priority: priorityDistribution,
        status: statusDistribution,
        category: categoryDistribution
      },
      timeline: timelineData,
      tasks: {
        totalCompleted: totalTasks,
        avgCompletionTime: Math.round(avgTaskTime),
        efficiency: taskEfficiency
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching technician performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}