import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/manager/team-performance - Get team performance analytics for manager
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
            name: true,
            code: true
          }
        }
      }
    });

    if (!manager?.branchId) {
      return NextResponse.json({ error: 'Manager must be assigned to a branch' }, { status: 400 });
    }

    // Get all technicians in the manager's branch
    const technicians = await prisma.user.findMany({
      where: {
        branchId: manager.branchId,
        role: 'TECHNICIAN',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        supportGroupId: true,
        supportGroup: {
          select: {
            name: true
          }
        }
      }
    });

    const technicianIds = technicians.map(t => t.id);

    if (technicianIds.length === 0) {
      return NextResponse.json({
        summary: {
          totalTechnicians: 0,
          totalTicketsHandled: 0,
          avgResolutionRate: 0,
          avgResponseTime: 0,
          teamSlaCompliance: 0
        },
        technicians: [],
        workload: [],
        performance: [],
        trends: [],
        branch: manager.branch?.name || 'Unknown Branch'
      });
    }

    // Get ticket statistics for the team
    const [teamTickets, resolvedTickets] = await Promise.all([
      // All tickets assigned to team members
      prisma.ticket.findMany({
        where: {
          assignedToId: {
            in: technicianIds
          },
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        select: {
          id: true,
          assignedToId: true,
          status: true,
          priority: true,
          createdAt: true,
          resolvedAt: true,
          assignedTo: {
            select: {
              name: true
            }
          }
        }
      }),

      // Resolved tickets in the period
      prisma.ticket.count({
        where: {
          assignedToId: {
            in: technicianIds
          },
          status: {
            in: ['RESOLVED', 'CLOSED']
          },
          resolvedAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        }
      })
    ]);

    // Calculate individual technician performance
    const technicianPerformance = await Promise.all(
      technicians.map(async (technician) => {
        const techTickets = teamTickets.filter(t => t.assignedToId === technician.id);
        const techResolved = techTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
        const techOpen = techTickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));

        // Get SLA tracking for this technician
        const slaData = await prisma.sLATracking.findMany({
          where: {
            ticket: {
              assignedToId: technician.id,
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

        // Calculate average response time
        let avgResponseTime = 0;
        if (slaData.length > 0) {
          const responseTimes = slaData
            .filter(sla => sla.responseTime)
            .map(sla => {
              const created = sla.ticket.createdAt;
              const responded = sla.responseTime!;
              return (responded.getTime() - created.getTime()) / (1000 * 60 * 60);
            });

          if (responseTimes.length > 0) {
            avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
          }
        }

        // Calculate SLA compliance
        const compliantTickets = slaData.filter(sla => 
          !sla.isResponseBreached && !sla.isResolutionBreached
        ).length;
        const slaCompliance = slaData.length > 0 ? 
          Math.round((compliantTickets / slaData.length) * 100) : 100;

        const resolutionRate = techTickets.length > 0 ? 
          Math.round((techResolved.length / techTickets.length) * 100) : 0;

        return {
          id: technician.id,
          name: technician.name,
          email: technician.email,
          supportGroup: technician.supportGroup?.name || 'Unassigned',
          totalTickets: techTickets.length,
          resolvedTickets: techResolved.length,
          openTickets: techOpen.length,
          resolutionRate,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
          slaCompliance
        };
      })
    );

    // Calculate team summary
    const totalTicketsHandled = teamTickets.length;
    const avgResolutionRate = technicianPerformance.length > 0 ?
      Math.round(technicianPerformance.reduce((sum, t) => sum + t.resolutionRate, 0) / technicianPerformance.length) : 0;
    const avgResponseTime = technicianPerformance.length > 0 ?
      Math.round((technicianPerformance.reduce((sum, t) => sum + t.avgResponseTime, 0) / technicianPerformance.length) * 10) / 10 : 0;
    const teamSlaCompliance = technicianPerformance.length > 0 ?
      Math.round(technicianPerformance.reduce((sum, t) => sum + t.slaCompliance, 0) / technicianPerformance.length) : 0;

    // Workload distribution
    const workloadDistribution = technicianPerformance.map(tech => ({
      technician: tech.name,
      activeTickets: tech.openTickets,
      totalAssigned: tech.totalTickets,
      utilization: tech.totalTickets > 0 ? Math.round((tech.openTickets / tech.totalTickets) * 100) : 0
    }));

    // Performance comparison (top and bottom performers)
    const sortedByResolution = [...technicianPerformance].sort((a, b) => b.resolutionRate - a.resolutionRate);
    const performanceComparison = sortedByResolution.map(tech => ({
      technician: tech.name,
      resolutionRate: tech.resolutionRate,
      slaCompliance: tech.slaCompliance,
      avgResponseTime: tech.avgResponseTime,
      score: Math.round((tech.resolutionRate + tech.slaCompliance) / 2) // Simple performance score
    }));

    // Weekly trends for the last 4 weeks
    const weeklyTrends = await Promise.all(
      Array.from({ length: 4 }, async (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (3 - i) * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        const weekTickets = await prisma.ticket.count({
          where: {
            assignedToId: {
              in: technicianIds
            },
            createdAt: {
              gte: weekStart,
              lt: weekEnd
            }
          }
        });

        const weekResolved = await prisma.ticket.count({
          where: {
            assignedToId: {
              in: technicianIds
            },
            status: {
              in: ['RESOLVED', 'CLOSED']
            },
            resolvedAt: {
              gte: weekStart,
              lt: weekEnd
            }
          }
        });

        return {
          date: weekStart.toISOString().split('T')[0],
          value: weekTickets,
          resolved: weekResolved,
          label: `Week ${i + 1}: ${weekTickets} assigned, ${weekResolved} resolved`
        };
      })
    );

    // Support group distribution
    const supportGroupStats = technicianPerformance.reduce((acc, tech) => {
      const group = tech.supportGroup;
      if (!acc[group]) {
        acc[group] = {
          technicians: 0,
          totalTickets: 0,
          avgResolutionRate: 0
        };
      }
      acc[group].technicians++;
      acc[group].totalTickets += tech.totalTickets;
      acc[group].avgResolutionRate += tech.resolutionRate;
      return acc;
    }, {} as Record<string, any>);

    const supportGroupDistribution = Object.entries(supportGroupStats).map(([group, stats]) => ({
      label: group,
      value: stats.technicians,
      totalTickets: stats.totalTickets,
      avgResolutionRate: Math.round(stats.avgResolutionRate / stats.technicians)
    }));

    // Training needs identification (technicians with below-average performance)
    const avgTeamResolution = avgResolutionRate;
    const avgTeamSla = teamSlaCompliance;
    
    const trainingNeeds = technicianPerformance
      .filter(tech => 
        tech.resolutionRate < avgTeamResolution * 0.8 || 
        tech.slaCompliance < avgTeamSla * 0.8
      )
      .map(tech => ({
        technician: tech.name,
        areas: [
          ...(tech.resolutionRate < avgTeamResolution * 0.8 ? ['Resolution Efficiency'] : []),
          ...(tech.slaCompliance < avgTeamSla * 0.8 ? ['SLA Compliance'] : []),
          ...(tech.avgResponseTime > avgResponseTime * 1.5 ? ['Response Time'] : [])
        ],
        priority: tech.resolutionRate < avgTeamResolution * 0.6 ? 'HIGH' : 'MEDIUM'
      }));

    return NextResponse.json({
      summary: {
        totalTechnicians: technicians.length,
        totalTicketsHandled,
        avgResolutionRate,
        avgResponseTime,
        teamSlaCompliance,
        branchName: manager.branch?.name || 'Unknown Branch'
      },
      technicians: technicianPerformance,
      workload: workloadDistribution,
      performance: performanceComparison,
      trends: weeklyTrends,
      supportGroups: supportGroupDistribution,
      training: trainingNeeds,
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching team performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}