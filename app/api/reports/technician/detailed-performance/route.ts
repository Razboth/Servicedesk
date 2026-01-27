import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN, MANAGER to view detailed technician reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const branchId = user?.branchId;

    // Build where clause for filtering technicians based on role
    let technicianFilter: any = {
      role: 'TECHNICIAN',
      isActive: true
    };
    
    if (isBranchRole && branchId) {
      technicianFilter.branchId = branchId;
    }

    // Get all technicians based on role permissions
    const technicians = await prisma.user.findMany({
      where: technicianFilter,
      include: {
        branch: {
          select: { name: true, code: true }
        },
        assignedTickets: {
          include: {
            service: {
              select: { name: true, category: { select: { name: true } } }
            }
          }
        },
        supportGroups: {
          include: {
            group: {
              select: { name: true }
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

    // Calculate performance metrics for each technician
    const technicianPerformance = technicians.map(tech => {
      const tickets = tech.assignedTickets;
      const recentTickets = tickets.filter(t => t.createdAt >= thirtyDaysAgo);
      const resolvedTickets = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS'].includes(t.status));
      const overdueTickets = tickets.filter(t => 
        ['OPEN', 'IN_PROGRESS'].includes(t.status) && 
        t.createdAt < twentyFourHoursAgo
      );

      // Calculate resolution times (in business hours)
      let avgResolutionHours = 0;
      let avgFirstResponseHours = 0;
      if (resolvedTickets.length > 0) {
        const totalResolutionHours = resolvedTickets.reduce((sum, ticket) => {
          if (ticket.resolvedAt) {
            return sum + calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
          }
          return sum;
        }, 0);
        avgResolutionHours = totalResolutionHours / resolvedTickets.length;

        const responseTickets = resolvedTickets.filter(t => t.firstResponseAt);
        if (responseTickets.length > 0) {
          const totalResponseHours = responseTickets.reduce((sum, ticket) => {
            if (ticket.firstResponseAt) {
              return sum + calculateBusinessHours(ticket.createdAt, ticket.firstResponseAt);
            }
            return sum;
          }, 0);
          avgFirstResponseHours = totalResponseHours / responseTickets.length;
        }
      }

      // Calculate SLA compliance
      const slaTargets = { CRITICAL: 4, HIGH: 8, MEDIUM: 24, LOW: 72 };
      let slaCompliantCount = 0;
      let totalSlaTickets = 0;

      resolvedTickets.forEach(ticket => {
        if (ticket.resolvedAt) {
          const resolutionHours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
          const target = slaTargets[ticket.priority as keyof typeof slaTargets] || 24;
          totalSlaTickets++;
          if (resolutionHours <= target) {
            slaCompliantCount++;
          }
        }
      });

      const slaCompliance = totalSlaTickets > 0 ? (slaCompliantCount / totalSlaTickets) * 100 : 0;

      // Service distribution
      const serviceDistribution = tickets.reduce((acc: any, ticket) => {
        const serviceName = ticket.service?.name || 'Unknown';
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {});

      // Priority distribution
      const priorityDistribution = tickets.reduce((acc: any, ticket) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      return {
        id: tech.id,
        name: tech.name,
        email: tech.email,
        avatar: tech.avatar,
        branch: tech.branch?.name || 'Unknown',
        branchCode: tech.branch?.code || '',
        supportGroups: tech.supportGroups.map(sg => sg.group.name),
        totalTickets: tickets.length,
        recentTickets: recentTickets.length,
        resolvedTickets: resolvedTickets.length,
        openTickets: openTickets.length,
        overdueTickets: overdueTickets.length,
        resolutionRate: tickets.length > 0 ? (resolvedTickets.length / tickets.length) * 100 : 0,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        avgFirstResponseHours: Math.round(avgFirstResponseHours * 10) / 10,
        slaCompliance: Math.round(slaCompliance * 10) / 10,
        serviceDistribution,
        priorityDistribution,
        performance: {
          last7Days: tickets.filter(t => t.createdAt >= sevenDaysAgo).length,
          last24Hours: tickets.filter(t => t.createdAt >= twentyFourHoursAgo).length
        }
      };
    });

    // Overall statistics
    const totalTechnicians = technicians.length;
    const activeTechnicians = technicianPerformance.filter(t => t.recentTickets > 0).length;
    const avgTicketsPerTechnician = totalTechnicians > 0 ? 
      technicianPerformance.reduce((sum, t) => sum + t.totalTickets, 0) / totalTechnicians : 0;
    const avgResolutionRate = totalTechnicians > 0 ?
      technicianPerformance.reduce((sum, t) => sum + t.resolutionRate, 0) / totalTechnicians : 0;
    const avgSlaCompliance = totalTechnicians > 0 ?
      technicianPerformance.reduce((sum, t) => sum + t.slaCompliance, 0) / totalTechnicians : 0;

    // Top performers
    const topPerformers = technicianPerformance
      .sort((a, b) => b.resolutionRate - a.resolutionRate)
      .slice(0, 5);

    // Branch distribution
    const branchDistribution = technicianPerformance.reduce((acc: any, tech) => {
      const branch = tech.branch;
      if (!acc[branch]) {
        acc[branch] = {
          technicians: 0,
          totalTickets: 0,
          resolvedTickets: 0,
          avgSlaCompliance: 0
        };
      }
      acc[branch].technicians++;
      acc[branch].totalTickets += tech.totalTickets;
      acc[branch].resolvedTickets += tech.resolvedTickets;
      acc[branch].avgSlaCompliance += tech.slaCompliance;
      return acc;
    }, {});

    // Calculate branch averages
    Object.keys(branchDistribution).forEach(branch => {
      const data = branchDistribution[branch];
      data.avgSlaCompliance = data.technicians > 0 ? data.avgSlaCompliance / data.technicians : 0;
      data.resolutionRate = data.totalTickets > 0 ? (data.resolvedTickets / data.totalTickets) * 100 : 0;
    });

    const summary = {
      totalTechnicians,
      activeTechnicians,
      avgTicketsPerTechnician: Math.round(avgTicketsPerTechnician * 10) / 10,
      avgResolutionRate: Math.round(avgResolutionRate * 10) / 10,
      avgSlaCompliance: Math.round(avgSlaCompliance * 10) / 10
    };

    return NextResponse.json({
      summary,
      technicians: technicianPerformance,
      topPerformers,
      branchDistribution
    });

  } catch (error) {
    console.error('Error fetching technician performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}