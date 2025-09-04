import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, startOfWeek } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString();
    
    const targetDate = new Date(date);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);
    const yesterday = subDays(dayStart, 1);
    const weekStart = startOfWeek(dayStart);

    // Today's tickets
    const todaysTickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        createdBy: {
          select: {
            name: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: { select: { name: true } },
        service: {
          select: {
            name: true,
            category: { select: { name: true } },
            supportGroup: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Yesterday's comparison
    const yesterdaysCount = await prisma.ticket.count({
      where: {
        createdAt: {
          gte: startOfDay(yesterday),
          lte: endOfDay(yesterday)
        }
      }
    });

    // Open tickets requiring attention
    const openTickets = await prisma.ticket.findMany({
      where: {
        status: 'OPEN',
        priority: { in: ['HIGH', 'CRITICAL', 'EMERGENCY'] }
      },
      include: {
        createdBy: {
          select: {
            name: true,
            branch: { select: { name: true, code: true } }
          }
        },
        service: {
          select: {
            name: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: 20
    });

    // Overdue SLAs
    const overdueTickets = await prisma.ticket.findMany({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        OR: [
          {
            service: {
              slaResponseHours: { gt: 0 }
            },
            firstResponseAt: null,
            createdAt: {
              lt: new Date(Date.now() - 4 * 60 * 60 * 1000) // Default 4 hours if no SLA
            }
          },
          {
            service: {
              slaResolutionHours: { gt: 0 }
            },
            resolvedAt: null,
            createdAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Default 24 hours if no SLA
            }
          }
        ]
      },
      include: {
        createdBy: {
          select: {
            name: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: { select: { name: true } },
        service: {
          select: {
            name: true,
            slaResponseHours: true,
            slaResolutionHours: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: 20
    });

    // Technician workload
    const technicianWorkload = await prisma.user.findMany({
      where: {
        role: { in: ['TECHNICIAN', 'SECURITY_ANALYST'] },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS'] }
          },
          select: { id: true, priority: true, status: true }
        }
      }
    });

    const workloadStats = technicianWorkload.map(tech => ({
      id: tech.id,
      name: tech.name,
      email: tech.email,
      openTickets: tech.assignedTickets.filter(t => t.status === 'OPEN').length,
      inProgressTickets: tech.assignedTickets.filter(t => t.status === 'IN_PROGRESS').length,
      urgentTickets: tech.assignedTickets.filter(t => t.priority === 'CRITICAL').length,
      highTickets: tech.assignedTickets.filter(t => t.priority === 'HIGH').length,
      totalActive: tech.assignedTickets.length
    })).sort((a, b) => b.totalActive - a.totalActive);

    // Critical incidents
    const criticalIncidents = await prisma.ticket.findMany({
      where: {
        priority: 'CRITICAL',
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
      include: {
        createdBy: {
          select: {
            name: true,
            branch: { select: { name: true, code: true } }
          }
        },
        assignedTo: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tickets by status today
    const statusDistribution = await prisma.ticket.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      _count: { status: true }
    });

    // Tickets by priority today
    const priorityDistribution = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        createdAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      _count: { priority: true }
    });

    // Tickets resolved today
    const resolvedToday = await prisma.ticket.findMany({
      where: {
        resolvedAt: {
          gte: dayStart,
          lte: dayEnd
        }
      },
      include: {
        assignedTo: { select: { name: true } },
        service: { select: { name: true } }
      },
      orderBy: { resolvedAt: 'desc' },
      take: 10
    });

    // Week trend
    const weekTrend = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const date = subDays(dayStart, 6 - i);
        return prisma.ticket.count({
          where: {
            createdAt: {
              gte: startOfDay(date),
              lte: endOfDay(date)
            }
          }
        }).then(count => ({
          date: date.toISOString(),
          count
        }));
      })
    );

    // Branch performance today
    const branchPerformance = await prisma.branch.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        users: {
          select: {
            createdTickets: {
              where: {
                createdAt: {
                  gte: dayStart,
                  lte: dayEnd
                }
              },
              select: {
                id: true,
                status: true,
                priority: true
              }
            }
          }
        }
      }
    });

    const branchStats = branchPerformance.map(branch => {
      const tickets = branch.users.flatMap(u => u.createdTickets);
      return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        totalTickets: tickets.length,
        openTickets: tickets.filter(t => t.status === 'OPEN').length,
        urgentTickets: tickets.filter(t => t.priority === 'CRITICAL').length
      };
    }).filter(b => b.totalTickets > 0)
      .sort((a, b) => b.totalTickets - a.totalTickets);

    // Calculate summary statistics
    const summary = {
      todayTotal: todaysTickets.length,
      yesterdayTotal: yesterdaysCount,
      changePercent: yesterdaysCount > 0 
        ? Math.round(((todaysTickets.length - yesterdaysCount) / yesterdaysCount) * 100)
        : 0,
      openUrgent: openTickets.filter(t => t.priority === 'CRITICAL').length,
      openHigh: openTickets.filter(t => t.priority === 'HIGH').length,
      overdueCount: overdueTickets.length,
      criticalCount: criticalIncidents.length,
      resolvedCount: resolvedToday.length,
      averageResolutionTime: resolvedToday.length > 0
        ? Math.round(
            resolvedToday.reduce((acc, t) => {
              if (t.resolvedAt) {
                return acc + (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
              }
              return acc;
            }, 0) / resolvedToday.length
          )
        : 0,
      technicianCount: workloadStats.filter(t => t.totalActive > 0).length,
      availableTechnicians: workloadStats.filter(t => t.totalActive < 5).length
    };

    return NextResponse.json({
      date: targetDate.toISOString(),
      summary,
      todaysTickets: todaysTickets.slice(0, 20), // Latest 20 tickets
      openTickets: openTickets.slice(0, 10),
      overdueTickets: overdueTickets.slice(0, 10),
      criticalIncidents,
      resolvedToday: resolvedToday.slice(0, 10),
      technicianWorkload: workloadStats.slice(0, 15), // Top 15 busiest technicians
      statusDistribution: statusDistribution.map(s => ({
        status: s.status,
        count: s._count.status
      })),
      priorityDistribution: priorityDistribution.map(p => ({
        priority: p.priority,
        count: p._count.priority
      })),
      weekTrend,
      branchStats: branchStats.slice(0, 10) // Top 10 branches
    });

  } catch (error) {
    console.error('Error fetching daily operations report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily operations report' },
      { status: 500 }
    );
  }
}