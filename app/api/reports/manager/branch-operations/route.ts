import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/manager/branch-operations - Get branch operations analytics for manager
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers can access this report
    if (session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get manager's branch information
    const manager = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true
          }
        }
      }
    });

    if (!manager?.branchId) {
      return NextResponse.json({ error: 'Manager must be assigned to a branch' }, { status: 400 });
    }

    const branchId = manager.branchId;

    // Get branch team composition
    const [technicians, agents, totalUsers] = await Promise.all([
      // Technicians in branch
      prisma.user.count({
        where: {
          branchId,
          role: 'TECHNICIAN',
          isActive: true
        }
      }),

      // Agents in branch
      prisma.user.count({
        where: {
          branchId,
          role: 'AGENT',
          isActive: true
        }
      }),

      // Total active users in branch
      prisma.user.count({
        where: {
          branchId,
          isActive: true,
          role: {
            in: ['TECHNICIAN', 'AGENT', 'MANAGER']
          }
        }
      })
    ]);

    // Get branch ticket statistics
    const [
      totalTickets,
      resolvedTickets,
      openTickets,
      overdueTickets,
      avgResolutionTime
    ] = await Promise.all([
      // Total tickets created in branch
      prisma.ticket.count({
        where: {
          createdBy: {
            branchId
          },
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }),

      // Resolved tickets in branch
      prisma.ticket.count({
        where: {
          createdBy: {
            branchId
          },
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
          createdBy: {
            branchId
          },
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      }),

      // Overdue tickets
      prisma.ticket.count({
        where: {
          createdBy: {
            branchId
          },
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          },
          slaTracking: {
            some: {
              isResolutionBreached: true
            }
          }
        }
      }),

      // Average resolution time
      prisma.ticket.aggregate({
        where: {
          createdBy: {
            branchId
          },
          status: {
            in: ['RESOLVED', 'CLOSED']
          },
          resolvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          },
          actualHours: {
            not: null
          }
        },
        _avg: {
          actualHours: true
        }
      })
    ]);

    // Get service delivery performance by category
    const servicePerformance = await prisma.ticket.findMany({
      where: {
        createdBy: {
          branchId
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        service: {
          include: {
            tier1Category: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Analyze service categories
    const categoryStats = servicePerformance.reduce((acc, ticket) => {
      const category = ticket.service.tier1Category?.name || 'Other';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          resolved: 0,
          avgHours: 0,
          totalHours: 0
        };
      }
      acc[category].total++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[category].resolved++;
        acc[category].totalHours += ticket.actualHours || 0;
      }
      return acc;
    }, {} as Record<string, any>);

    const serviceDeliveryStats = Object.entries(categoryStats).map(([category, stats]) => ({
      category,
      totalTickets: stats.total,
      resolvedTickets: stats.resolved,
      resolutionRate: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0,
      avgResolutionTime: stats.resolved > 0 ? Math.round((stats.totalHours / stats.resolved) * 10) / 10 : 0
    })).sort((a, b) => b.totalTickets - a.totalTickets);

    // Get workload distribution among technicians
    const technicianWorkload = await prisma.user.findMany({
      where: {
        branchId,
        role: 'TECHNICIAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        assignedTickets: {
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS']
            }
          },
          select: {
            id: true,
            priority: true
          }
        },
        _count: {
          select: {
            assignedTickets: {
              where: {
                createdAt: {
                  gte: new Date(startDate),
                  lte: new Date(endDate)
                }
              }
            }
          }
        }
      }
    });

    const workloadDistribution = technicianWorkload.map(tech => {
      const urgentCount = tech.assignedTickets.filter(t => t.priority === 'URGENT').length;
      const highCount = tech.assignedTickets.filter(t => t.priority === 'HIGH').length;
      
      return {
        technician: tech.name,
        activeTickets: tech.assignedTickets.length,
        totalAssigned: tech._count.assignedTickets,
        urgentTickets: urgentCount,
        highPriorityTickets: highCount,
        workloadScore: urgentCount * 3 + highCount * 2 + tech.assignedTickets.length
      };
    }).sort((a, b) => b.workloadScore - a.workloadScore);

    // Get ticket volume trends (daily for last 30 days)
    const dailyVolume = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const count = await prisma.ticket.count({
          where: {
            createdBy: {
              branchId
            },
            createdAt: {
              gte: dateStart,
              lte: dateEnd
            }
          }
        });

        return {
          date: date.toISOString().split('T')[0],
          value: count,
          label: `${count} tickets created`
        };
      })
    );

    // Get priority distribution
    const priorityStats = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        createdBy: {
          branchId
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      _count: {
        id: true
      }
    });

    const priorityDistribution = priorityStats.map(stat => ({
      label: stat.priority,
      value: stat._count.id
    }));

    // Get SLA compliance metrics
    const slaMetrics = await prisma.sLATracking.findMany({
      where: {
        ticket: {
          createdBy: {
            branchId
          },
          resolvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      }
    });

    const slaCompliance = slaMetrics.length > 0 ? 
      Math.round((slaMetrics.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached).length / slaMetrics.length) * 100) : 0;

    const avgResponseTime = slaMetrics.length > 0 ?
      slaMetrics
        .filter(sla => sla.responseTime)
        .reduce((sum, sla, _, arr) => {
          const responseHours = (sla.responseTime!.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + responseHours / arr.length;
        }, 0) : 0;

    // Get resource utilization (tickets handled per person)
    const resourceUtilization = {
      ticketsPerTechnician: technicians > 0 ? Math.round((totalTickets / technicians) * 10) / 10 : 0,
      ticketsPerAgent: agents > 0 ? Math.round((totalTickets / agents) * 10) / 10 : 0,
      teamEfficiency: totalUsers > 0 ? Math.round((resolvedTickets / totalUsers) * 10) / 10 : 0
    };

    // Identify peak hours/days patterns
    const hourlyPattern = await prisma.ticket.findMany({
      where: {
        createdBy: {
          branchId
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      select: {
        createdAt: true
      }
    });

    const hourlyStats = hourlyPattern.reduce((acc, ticket) => {
      const hour = ticket.createdAt.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const peakHours = Object.entries(hourlyStats)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        label: `${hour.padStart(2, '0')}:00 - ${String(parseInt(hour) + 1).padStart(2, '0')}:00`
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Calculate operational efficiency metrics
    const resolutionRate = totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0;
    const overdueRate = totalTickets > 0 ? Math.round((overdueTickets / totalTickets) * 100) : 0;

    // Get ATM-related metrics if applicable
    const atmTickets = await prisma.ticket.count({
      where: {
        createdBy: {
          branchId
        },
        service: {
          name: {
            contains: 'ATM',
            mode: 'insensitive'
          }
        },
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });

    const atmResolved = await prisma.ticket.count({
      where: {
        createdBy: {
          branchId
        },
        service: {
          name: {
            contains: 'ATM',
            mode: 'insensitive'
          }
        },
        status: {
          in: ['RESOLVED', 'CLOSED']
        },
        resolvedAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      }
    });

    return NextResponse.json({
      branch: {
        name: manager.branch?.name || 'Unknown Branch',
        code: manager.branch?.code || 'N/A',
        city: manager.branch?.city || 'Unknown'
      },
      summary: {
        totalTickets,
        resolvedTickets,
        openTickets,
        overdueTickets,
        resolutionRate,
        overdueRate,
        avgResolutionTime: Math.round((avgResolutionTime._avg.actualHours || 0) * 10) / 10,
        slaCompliance,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10
      },
      team: {
        totalUsers,
        technicians,
        agents,
        workloadBalance: workloadDistribution.length > 0 ? 
          Math.round((Math.min(...workloadDistribution.map(w => w.workloadScore)) / 
                     Math.max(...workloadDistribution.map(w => w.workloadScore))) * 100) : 100
      },
      serviceDelivery: serviceDeliveryStats,
      workload: workloadDistribution,
      trends: {
        daily: dailyVolume,
        priority: priorityDistribution,
        peakHours: peakHours
      },
      utilization: resourceUtilization,
      specialServices: {
        atmTickets,
        atmResolved,
        atmResolutionRate: atmTickets > 0 ? Math.round((atmResolved / atmTickets) * 100) : 0
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching branch operations data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}