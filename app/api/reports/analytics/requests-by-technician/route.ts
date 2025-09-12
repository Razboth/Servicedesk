import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const isTechnician = session.user.role === 'TECHNICIAN';
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let technicianFilter: any = {
      role: 'TECHNICIAN',
      isActive: true
    };
    
    if (isBranchRole && branchId) {
      technicianFilter.branchId = branchId;
    } else if (isTechnician) {
      technicianFilter.id = session.user.id;
    }

    // Get technicians with their assigned tickets
    const technicians = await prisma.user.findMany({
      where: technicianFilter,
      include: {
        branch: {
          select: { name: true, code: true }
        },
        supportGroup: {
          select: { name: true, code: true }
        },
        assignedTickets: {
          include: {
            service: {
              select: { 
                name: true, 
                category: { select: { name: true } } 
              }
            },
            branch: {
              select: { name: true, code: true }
            },
            createdBy: {
              select: { name: true, email: true }
            }
          }
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Analyze each technician's performance
    const technicianAnalysis = technicians.map(tech => {
      const tickets = tech.assignedTickets;
      
      // Status distribution
      const statusDistribution = tickets.reduce((acc: any, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      // Priority distribution
      const priorityDistribution = tickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Service distribution
      const serviceDistribution = tickets.reduce((acc: any, ticket) => {
        const serviceName = ticket.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Branch distribution (for tickets worked on)
      const branchDistribution = tickets.reduce((acc: any, ticket) => {
        const branchName = ticket.branch?.name || 'Unknown';
        acc[branchName] = (acc[branchName] || 0) + 1;
        return acc;
      }, {});

      // Time-based metrics
      const recentTickets = tickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const weeklyTickets = tickets.filter(t => t.createdAt >= sevenDaysAgo);
      const dailyTickets = tickets.filter(t => t.createdAt >= twentyFourHoursAgo);

      // Resolution metrics
      const resolvedTickets = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      const overdueTickets = tickets.filter(t => 
        ['OPEN', 'IN_PROGRESS'].includes(t.status) && t.createdAt < twentyFourHoursAgo
      );

      // Calculate resolution times
      let totalResolutionTime = 0;
      let totalResponseTime = 0;
      let resolvedCount = 0;
      let responseCount = 0;

      tickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionHours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          totalResolutionTime += resolutionHours;
          resolvedCount++;
        }

        if (ticket.firstResponseAt) {
          const responseHours = (ticket.firstResponseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          totalResponseTime += responseHours;
          responseCount++;
        }
      });

      const avgResolutionHours = resolvedCount > 0 ? totalResolutionTime / resolvedCount : 0;
      const avgResponseHours = responseCount > 0 ? totalResponseTime / responseCount : 0;

      // SLA compliance
      const slaTargets = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
      let slaCompliantCount = 0;
      
      resolvedTickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionHours = (ticket.resolvedAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
          const target = slaTargets[ticket.priority as keyof typeof slaTargets] || 24;
          if (resolutionHours <= target) {
            slaCompliantCount++;
          }
        }
      });

      const slaComplianceRate = resolvedCount > 0 ? (slaCompliantCount / resolvedCount) * 100 : 0;

      // Workload and productivity metrics
      const workloadScore = tickets.length;
      const productivityScore = resolvedCount;
      const efficiencyScore = tickets.length > 0 ? (resolvedCount / tickets.length) * 100 : 0;

      // Recent performance trend
      const recentResolvedTickets = recentTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const recentPerformanceTrend = recentTickets.length > 0 ? 
        (recentResolvedTickets.length / recentTickets.length) * 100 : 0;

      // Daily workload pattern (last 7 days)
      const dailyWorkload = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        
        const dayTickets = tickets.filter(ticket => {
          const ticketDate = new Date(ticket.createdAt);
          return ticketDate >= dayStart && ticketDate < dayEnd;
        });

        const dayResolved = dayTickets.filter(t => 
          t.resolvedAt && new Date(t.resolvedAt) >= dayStart && new Date(t.resolvedAt) < dayEnd
        );

        return {
          date: dayStart.toISOString().split('T')[0],
          assigned: dayTickets.length,
          resolved: dayResolved.length
        };
      });

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        avatar: tech.avatar,
        branch: tech.branch?.name || 'Unknown',
        branchCode: tech.branch?.code || '',
        supportGroup: tech.supportGroup?.name || 'No Group',
        totalTickets: tickets.length,
        recentTickets: recentTickets.length,
        weeklyTickets: weeklyTickets.length,
        dailyTickets: dailyTickets.length,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        avgResponseHours: Math.round(avgResponseHours * 10) / 10,
        resolutionRate: Math.round(efficiencyScore * 10) / 10,
        slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
        workloadScore,
        productivityScore,
        recentPerformanceTrend: Math.round(recentPerformanceTrend * 10) / 10,
        statusDistribution,
        priorityDistribution,
        serviceDistribution: Object.entries(serviceDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .reduce((acc: any, [key, value]) => ({ ...acc, [key]: value }), {}),
        branchDistribution: Object.entries(branchDistribution)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 3)
          .reduce((acc: any, [key, value]) => ({ ...acc, [key]: value }), {}),
        dailyWorkload,
        performanceRating: efficiencyScore >= 80 ? 'Excellent' : 
                          efficiencyScore >= 60 ? 'Good' : 
                          efficiencyScore >= 40 ? 'Average' : 'Needs Improvement'
      };
    });

    // Sort by performance metrics
    const sortedTechnicians = technicianAnalysis.sort((a, b) => b.resolutionRate - a.resolutionRate);

    // Overall statistics
    const totalTickets = technicianAnalysis.reduce((sum, tech) => sum + tech.totalTickets, 0);
    const totalResolved = technicianAnalysis.reduce((sum, tech) => sum + tech.resolvedTickets, 0);
    const avgResolutionRate = technicianAnalysis.length > 0 ?
      technicianAnalysis.reduce((sum, tech) => sum + tech.resolutionRate, 0) / technicianAnalysis.length : 0;
    const avgSlaCompliance = technicianAnalysis.length > 0 ?
      technicianAnalysis.reduce((sum, tech) => sum + tech.slaComplianceRate, 0) / technicianAnalysis.length : 0;

    // Top performers
    const topPerformers = sortedTechnicians.slice(0, 5);
    const bottomPerformers = sortedTechnicians.slice(-5).reverse();

    // Branch performance comparison
    const branchPerformance = technicianAnalysis.reduce((acc: any, tech) => {
      const branch = tech.branch;
      if (!acc[branch]) {
        acc[branch] = {
          branchName: branch,
          branchCode: tech.branchCode,
          technicians: 0,
          totalTickets: 0,
          resolvedTickets: 0,
          avgResolutionRate: 0,
          avgSlaCompliance: 0
        };
      }
      
      acc[branch].technicians++;
      acc[branch].totalTickets += tech.totalTickets;
      acc[branch].resolvedTickets += tech.resolvedTickets;
      acc[branch].avgResolutionRate += tech.resolutionRate;
      acc[branch].avgSlaCompliance += tech.slaComplianceRate;
      
      return acc;
    }, {});

    // Calculate branch averages
    Object.keys(branchPerformance).forEach(branch => {
      const data = branchPerformance[branch];
      data.avgResolutionRate = data.technicians > 0 ? data.avgResolutionRate / data.technicians : 0;
      data.avgSlaCompliance = data.technicians > 0 ? data.avgSlaCompliance / data.technicians : 0;
    });

    const branchPerformanceList = Object.values(branchPerformance);

    const summary = {
      totalTechnicians: technicians.length,
      totalTicketsAssigned: totalTickets,
      totalTicketsResolved: totalResolved,
      avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
      avgSlaCompliance: Math.round(avgSlaCompliance * 10) / 10,
      topPerformerName: topPerformers[0]?.name || 'N/A',
      topPerformerRate: topPerformers[0]?.resolutionRate || 0
    };

    return NextResponse.json({
      summary,
      technicians: sortedTechnicians,
      topPerformers,
      bottomPerformers,
      branchPerformance: branchPerformanceList
    });

  } catch (error) {
    console.error('Error fetching requests by technician data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}