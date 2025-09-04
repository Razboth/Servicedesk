import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/business/operational-excellence - Get operational excellence metrics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only managers and admins can access this report
    if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const branchId = searchParams.get('branchId');

    // Get all tickets for the period
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        },
        ...(branchId && { branchId })
      },
      include: {
        service: {
          select: {
            name: true,
            category: {
              select: { name: true }
            }
          }
        },
        branch: {
          select: {
            name: true,
            city: true
          }
        },
        assignedTo: {
          select: {
            name: true,
            role: true
          }
        },
        tasks: {
          select: {
            status: true,
            completedAt: true,
            createdAt: true
          }
        }
      }
    });

    // Get resource utilization data
    const technicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN'
      },
      include: {
        assignedTickets: {
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        },
        completedTasks: {
          where: {
            completedAt: {
              gte: new Date(startDate),
              lte: new Date(endDate)
            }
          }
        }
      }
    });

    // Calculate operational metrics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
    const openTickets = tickets.filter(t => !['RESOLVED', 'CLOSED'].includes(t.status));
    
    // Resolution rate
    const resolutionRate = totalTickets > 0 ? (resolvedTickets.length / totalTickets) * 100 : 0;
    
    // Average resolution time
    const resolutionTimes = resolvedTickets
      .filter(t => t.resolvedAt)
      .map(t => {
        const created = new Date(t.createdAt).getTime();
        const resolved = new Date(t.resolvedAt!).getTime();
        return (resolved - created) / (1000 * 60 * 60); // hours
      });
    
    const avgResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
      : 0;

    // SLA compliance (assuming 24h for normal, 4h for urgent)
    const slaCompliant = resolvedTickets.filter(t => {
      if (!t.resolvedAt) return false;
      const hours = (new Date(t.resolvedAt).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
      const slaTarget = ['HIGH', 'URGENT'].includes(t.priority) ? 4 : 24;
      return hours <= slaTarget;
    }).length;
    
    const slaComplianceRate = resolvedTickets.length > 0 ? (slaCompliant / resolvedTickets.length) * 100 : 0;

    // Resource utilization
    const resourceUtilization = technicians.map(tech => {
      const assignedCount = tech.assignedTickets.length;
      const completedTasks = tech.completedTasks.length;
      const utilizationScore = assignedCount + (completedTasks * 0.5); // Weight completed tasks
      
      return {
        name: tech.name,
        assignedTickets: assignedCount,
        completedTasks,
        utilizationScore: Math.round(utilizationScore * 100) / 100
      };
    });

    // Cost analysis (estimated)
    const avgTicketCost = 150; // Estimated cost per ticket
    const totalOperationalCost = totalTickets * avgTicketCost;
    const costPerResolution = resolvedTickets.length > 0 ? totalOperationalCost / resolvedTickets.length : 0;

    // Efficiency metrics by service category
    const efficiencyByCategory = tickets.reduce((acc, ticket) => {
      const category = ticket.service?.tier1Category?.name || 'General';
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          resolved: 0,
          totalResolutionTime: 0,
          resolvedCount: 0
        };
      }
      
      acc[category].total++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[category].resolved++;
        if (ticket.resolvedAt) {
          const resTime = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
          acc[category].totalResolutionTime += resTime;
          acc[category].resolvedCount++;
        }
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate efficiency scores
    Object.keys(efficiencyByCategory).forEach(category => {
      const data = efficiencyByCategory[category];
      data.resolutionRate = data.total > 0 ? (data.resolved / data.total) * 100 : 0;
      data.avgResolutionTime = data.resolvedCount > 0 ? data.totalResolutionTime / data.resolvedCount : 0;
      data.efficiencyScore = data.resolutionRate * (24 / Math.max(data.avgResolutionTime, 1)); // Higher is better
    });

    // Branch performance comparison
    const branchPerformance = tickets.reduce((acc, ticket) => {
      const branchName = ticket.branch?.name || 'Unknown';
      if (!acc[branchName]) {
        acc[branchName] = {
          total: 0,
          resolved: 0,
          critical: 0,
          avgResolutionTime: 0,
          resolutionTimes: []
        };
      }
      
      acc[branchName].total++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
        acc[branchName].resolved++;
        if (ticket.resolvedAt) {
          const resTime = (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
          acc[branchName].resolutionTimes.push(resTime);
        }
      }
      if (['HIGH', 'URGENT'].includes(ticket.priority)) {
        acc[branchName].critical++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Calculate branch averages
    Object.keys(branchPerformance).forEach(branch => {
      const data = branchPerformance[branch];
      data.resolutionRate = data.total > 0 ? (data.resolved / data.total) * 100 : 0;
      data.avgResolutionTime = data.resolutionTimes.length > 0
        ? data.resolutionTimes.reduce((a: number, b: number) => a + b, 0) / data.resolutionTimes.length
        : 0;
      delete data.resolutionTimes; // Remove raw data
    });

    // Trend analysis
    const dailyMetrics = tickets.reduce((acc, ticket) => {
      const date = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          created: 0,
          resolved: 0,
          critical: 0
        };
      }
      
      acc[date].created++;
      if (['RESOLVED', 'CLOSED'].includes(ticket.status) && ticket.resolvedAt) {
        const resolvedDate = new Date(ticket.resolvedAt).toISOString().split('T')[0];
        if (!acc[resolvedDate]) {
          acc[resolvedDate] = { created: 0, resolved: 0, critical: 0 };
        }
        acc[resolvedDate].resolved++;
      }
      if (['HIGH', 'URGENT'].includes(ticket.priority)) {
        acc[date].critical++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const response = {
      summary: {
        totalTickets,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        resolutionRate: Math.round(resolutionRate),
        avgResolutionHours: Math.round(avgResolutionTime),
        slaComplianceRate: Math.round(slaComplianceRate),
        totalOperationalCost,
        costPerResolution: Math.round(costPerResolution)
      },
      efficiency: {
        byCategory: efficiencyByCategory,
        resourceUtilization: resourceUtilization.sort((a, b) => b.utilizationScore - a.utilizationScore),
        overallEfficiencyScore: Math.round((resolutionRate + slaComplianceRate) / 2)
      },
      performance: {
        byBranch: branchPerformance,
        trends: dailyMetrics
      },
      insights: {
        topPerformingCategories: Object.entries(efficiencyByCategory)
          .sort(([_, a], [__, b]) => (b as any).efficiencyScore - (a as any).efficiencyScore)
          .slice(0, 5)
          .map(([category, data]) => ({ category, ...(data as any) })),
        topPerformingBranches: Object.entries(branchPerformance)
          .sort(([_, a], [__, b]) => (b as any).resolutionRate - (a as any).resolutionRate)
          .slice(0, 5)
          .map(([branch, data]) => ({ branch, ...(data as any) })),
        improvementAreas: Object.entries(efficiencyByCategory)
          .sort(([_, a], [__, b]) => (a as any).efficiencyScore - (b as any).efficiencyScore)
          .slice(0, 3)
          .map(([category, data]) => ({ category, ...(data as any) }))
      },
      recommendations: [
        resolutionRate < 80 ? 'Focus on improving ticket resolution rate' : null,
        avgResolutionTime > 24 ? 'Optimize resolution processes to reduce average resolution time' : null,
        slaComplianceRate < 90 ? 'Implement SLA monitoring and escalation procedures' : null,
        openTickets.length > totalTickets * 0.3 ? 'Address backlog of open tickets' : null
      ].filter(Boolean)
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching operational excellence report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch operational excellence report' },
      { status: 500 }
    );
  }
}