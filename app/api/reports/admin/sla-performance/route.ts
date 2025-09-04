import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/reports/admin/sla-performance - Get SLA & performance excellence analytics for admin
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can access this report
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Get all SLA tracking data
    const slaData = await prisma.sLATracking.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      include: {
        ticket: {
          include: {
            assignedTo: {
              select: {
                name: true,
                branchId: true,
                branch: {
                  select: { name: true }
                }
              }
            },
            createdBy: {
              select: {
                branchId: true,
                branch: {
                  select: { name: true }
                }
              }
            }
          }
        }
      }
    });

    // Calculate overall SLA metrics
    const totalSlaRecords = slaData.length;
    const responseBreaches = slaData.filter(sla => sla.isResponseBreached).length;
    const resolutionBreaches = slaData.filter(sla => sla.isResolutionBreached).length;
    const compliantTickets = slaData.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached).length;

    const overallCompliance = totalSlaRecords > 0 ? Math.round((compliantTickets / totalSlaRecords) * 100) : 0;
    const responseCompliance = totalSlaRecords > 0 ? Math.round(((totalSlaRecords - responseBreaches) / totalSlaRecords) * 100) : 0;
    const resolutionCompliance = totalSlaRecords > 0 ? Math.round(((totalSlaRecords - resolutionBreaches) / totalSlaRecords) * 100) : 0;

    // Calculate average response and resolution times
    const avgResponseTime = slaData.filter(sla => sla.responseTime).length > 0 ?
      slaData
        .filter(sla => sla.responseTime)
        .reduce((sum, sla) => {
          const responseHours = (sla.responseTime!.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + responseHours;
        }, 0) / slaData.filter(sla => sla.responseTime).length : 0;

    const avgResolutionTime = slaData.filter(sla => sla.resolutionTime).length > 0 ?
      slaData
        .filter(sla => sla.resolutionTime)
        .reduce((sum, sla) => {
          const resolutionHours = (sla.resolutionTime!.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
          return sum + resolutionHours;
        }, 0) / slaData.filter(sla => sla.resolutionTime).length : 0;

    // SLA performance by priority
    const priorityPerformance = await Promise.all(
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(async priority => {
        const prioritySla = slaData.filter(sla => sla.ticket.priority === priority);
        const priorityCompliant = prioritySla.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached);
        
        const avgPriorityResponse = prioritySla.filter(sla => sla.responseTime).length > 0 ?
          prioritySla
            .filter(sla => sla.responseTime)
            .reduce((sum, sla) => {
              const responseHours = (sla.responseTime!.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
              return sum + responseHours;
            }, 0) / prioritySla.filter(sla => sla.responseTime).length : 0;

        return {
          priority,
          totalTickets: prioritySla.length,
          compliantTickets: priorityCompliant.length,
          complianceRate: prioritySla.length > 0 ? Math.round((priorityCompliant.length / prioritySla.length) * 100) : 0,
          avgResponseTime: Math.round(avgPriorityResponse * 10) / 10,
          responseBreaches: prioritySla.filter(sla => sla.isResponseBreached).length,
          resolutionBreaches: prioritySla.filter(sla => sla.isResolutionBreached).length
        };
      })
    );

    // SLA performance by service category
    const categoryPerformance = slaData.reduce((acc, sla) => {
      const category = 'Other'; // Category is not directly on ticket model
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          compliant: 0,
          responseBreaches: 0,
          resolutionBreaches: 0,
          totalResponseTime: 0,
          responseCount: 0
        };
      }
      acc[category].total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) {
        acc[category].compliant++;
      }
      if (sla.isResponseBreached) acc[category].responseBreaches++;
      if (sla.isResolutionBreached) acc[category].resolutionBreaches++;
      
      if (sla.responseTime) {
        const responseHours = (sla.responseTime.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
        acc[category].totalResponseTime += responseHours;
        acc[category].responseCount++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const categoryStats = Object.entries(categoryPerformance).map(([category, stats]) => ({
      category,
      totalTickets: stats.total,
      compliantTickets: stats.compliant,
      complianceRate: stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0,
      responseBreaches: stats.responseBreaches,
      resolutionBreaches: stats.resolutionBreaches,
      avgResponseTime: stats.responseCount > 0 ? Math.round((stats.totalResponseTime / stats.responseCount) * 10) / 10 : 0
    })).sort((a, b) => b.totalTickets - a.totalTickets);

    // SLA performance by branch
    const branchPerformance = slaData.reduce((acc, sla) => {
      const branchName = sla.ticket.assignedTo?.branch?.name || sla.ticket.createdBy?.branch?.name || 'Unknown';
      if (!acc[branchName]) {
        acc[branchName] = {
          total: 0,
          compliant: 0,
          responseBreaches: 0,
          resolutionBreaches: 0
        };
      }
      acc[branchName].total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) {
        acc[branchName].compliant++;
      }
      if (sla.isResponseBreached) acc[branchName].responseBreaches++;
      if (sla.isResolutionBreached) acc[branchName].resolutionBreaches++;
      
      return acc;
    }, {} as Record<string, any>);

    const branchStats = Object.entries(branchPerformance).map(([branch, stats]) => ({
      branch,
      totalTickets: stats.total,
      compliantTickets: stats.compliant,
      complianceRate: stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0,
      responseBreaches: stats.responseBreaches,
      resolutionBreaches: stats.resolutionBreaches
    })).sort((a, b) => b.complianceRate - a.complianceRate);

    // Daily SLA compliance trends
    const dailyTrends = await Promise.all(
      Array.from({ length: 30 }, async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStart = new Date(date);
        dateStart.setHours(0, 0, 0, 0);
        const dateEnd = new Date(date);
        dateEnd.setHours(23, 59, 59, 999);

        const daySlA = await prisma.sLATracking.findMany({
          where: {
            createdAt: {
              gte: dateStart,
              lte: dateEnd
            }
          }
        });

        const dayCompliant = daySlA.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached).length;
        const complianceRate = daySlA.length > 0 ? Math.round((dayCompliant / daySlA.length) * 100) : 0;

        return {
          date: date.toISOString().split('T')[0],
          value: complianceRate,
          total: daySlA.length,
          compliant: dayCompliant,
          label: `${complianceRate}% compliance (${dayCompliant}/${daySlA.length})`
        };
      })
    );

    // Performance excellence metrics
    const excellenceMetrics = {
      // Tickets resolved within 50% of SLA time
      excellentPerformance: slaData.filter(sla => {
        if (!sla.resolutionTime || !sla.ticket.service.resolutionHours) return false;
        const actualTime = (sla.resolutionTime.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
        const targetTime = sla.ticket.service.resolutionHours;
        return actualTime <= (targetTime * 0.5);
      }).length,

      // Tickets meeting SLA exactly
      meetingSLA: compliantTickets,

      // Critical incidents (urgent tickets)
      criticalIncidents: slaData.filter(sla => sla.ticket.priority === 'CRITICAL').length,
      
      // Critical incidents resolved on time
      criticalOnTime: slaData.filter(sla => 
        sla.ticket.priority === 'CRITICAL' && !sla.isResponseBreached && !sla.isResolutionBreached
      ).length
    };

    // Identify top performers (branches/categories with best SLA)
    const topPerformingBranches = branchStats
      .filter(branch => branch.totalTickets >= 10)
      .slice(0, 5);

    const topPerformingCategories = categoryStats
      .filter(cat => cat.totalTickets >= 10)
      .sort((a, b) => b.complianceRate - a.complianceRate)
      .slice(0, 5);

    // Identify areas needing attention
    const improvementAreas = {
      highBreachBranches: branchStats.filter(branch => branch.complianceRate < 80 && branch.totalTickets >= 5),
      problematicCategories: categoryStats.filter(cat => cat.complianceRate < 80 && cat.totalTickets >= 5),
      frequentBreaches: slaData.filter(sla => sla.isResponseBreached && sla.isResolutionBreached).length
    };

    // Response time distribution
    const responseTimeRanges = {
      immediate: 0,    // < 1 hour
      fast: 0,         // 1-4 hours  
      normal: 0,       // 4-24 hours
      slow: 0          // > 24 hours
    };

    slaData.filter(sla => sla.responseTime).forEach(sla => {
      const responseHours = (sla.responseTime!.getTime() - sla.createdAt.getTime()) / (1000 * 60 * 60);
      if (responseHours < 1) responseTimeRanges.immediate++;
      else if (responseHours <= 4) responseTimeRanges.fast++;
      else if (responseHours <= 24) responseTimeRanges.normal++;
      else responseTimeRanges.slow++;
    });

    const responseTimeDistribution = [
      { label: 'Immediate (<1h)', value: responseTimeRanges.immediate },
      { label: 'Fast (1-4h)', value: responseTimeRanges.fast },
      { label: 'Normal (4-24h)', value: responseTimeRanges.normal },
      { label: 'Slow (>24h)', value: responseTimeRanges.slow }
    ];

    // Monthly performance trends
    const monthlyPerformance = await Promise.all(
      Array.from({ length: 6 }, async (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const monthSla = await prisma.sLATracking.findMany({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd
            }
          }
        });

        const monthCompliant = monthSla.filter(sla => !sla.isResponseBreached && !sla.isResolutionBreached).length;
        const complianceRate = monthSla.length > 0 ? Math.round((monthCompliant / monthSla.length) * 100) : 0;

        return {
          date: monthStart.toISOString().substring(0, 7),
          value: complianceRate,
          total: monthSla.length,
          compliant: monthCompliant,
          label: `${complianceRate}% compliance`
        };
      })
    );

    return NextResponse.json({
      summary: {
        totalSlaRecords,
        overallCompliance,
        responseCompliance,
        resolutionCompliance,
        responseBreaches,
        resolutionBreaches,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        avgResolutionTime: Math.round(avgResolutionTime * 10) / 10
      },
      excellence: {
        excellentPerformance: excellenceMetrics.excellentPerformance,
        excellenceRate: totalSlaRecords > 0 ? Math.round((excellenceMetrics.excellentPerformance / totalSlaRecords) * 100) : 0,
        criticalIncidents: excellenceMetrics.criticalIncidents,
        criticalOnTime: excellenceMetrics.criticalOnTime,
        criticalComplianceRate: excellenceMetrics.criticalIncidents > 0 ? 
          Math.round((excellenceMetrics.criticalOnTime / excellenceMetrics.criticalIncidents) * 100) : 0
      },
      performance: {
        byPriority: priorityPerformance,
        byCategory: categoryStats,
        byBranch: branchStats,
        topBranches: topPerformingBranches,
        topCategories: topPerformingCategories
      },
      trends: {
        daily: dailyTrends,
        monthly: monthlyPerformance,
        responseTime: responseTimeDistribution
      },
      improvements: {
        highBreachBranches: improvementAreas.highBreachBranches,
        problematicCategories: improvementAreas.problematicCategories,
        frequentBreaches: improvementAreas.frequentBreaches,
        totalImprovementAreas: improvementAreas.highBreachBranches.length + improvementAreas.problematicCategories.length
      },
      period: {
        startDate,
        endDate
      }
    });

  } catch (error) {
    console.error('Error fetching SLA & performance excellence data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}