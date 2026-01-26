import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only allow ADMIN, SUPER_ADMIN, MANAGER, TECHNICIAN to view SLA reports
    if (!['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { branch: true }
    });

    const isBranchRole = ['MANAGER'].includes(session.user.role);
    const isTechnician = session.user.role === 'TECHNICIAN';
    const branchId = user?.branchId;

    // Build where clause for filtering based on role
    let ticketFilter: any = {};

    if (isTechnician) {
      // Technicians see their assigned tickets
      ticketFilter.assignedToId = session.user.id;
    } else if (isBranchRole && branchId) {
      // Managers see tickets from their branch
      ticketFilter.branchId = branchId;
    }
    // Admins see all tickets (no additional filter)

    // Get all tickets with SLA tracking
    const tickets = await prisma.ticket.findMany({
      where: {
        ...ticketFilter,
        slaTracking: {
          some: {}
        }
      },
      include: {
        service: {
          select: {
            name: true,
            slaHours: true,
            responseHours: true,
            resolutionHours: true,
            businessHoursOnly: true,
            category: { select: { name: true } }
          }
        },
        slaTracking: true,
        createdBy: {
          select: { name: true, email: true }
        },
        assignedTo: {
          select: { name: true, email: true }
        },
        branch: {
          select: { name: true, code: true }
        }
      }
    });

    // Also get tickets without SLA tracking for comparison
    const allTickets = await prisma.ticket.findMany({
      where: ticketFilter,
      include: {
        service: {
          select: {
            name: true,
            slaHours: true,
            responseHours: true,
            resolutionHours: true,
            businessHoursOnly: true,
            category: { select: { name: true } }
          }
        },
        createdBy: {
          select: { name: true, email: true }
        },
        assignedTo: {
          select: { name: true, email: true }
        },
        branch: {
          select: { name: true, code: true }
        }
      }
    });

    // Date ranges for analysis
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // SLA target definitions based on priority
    const slaTargets = {
      CRITICAL: { response: 1, resolution: 4 },
      HIGH: { response: 2, resolution: 8 },
      MEDIUM: { response: 4, resolution: 24 },
      LOW: { response: 8, resolution: 72 }
    };

    // Calculate SLA metrics for each ticket
    const slaAnalysis = allTickets.map(ticket => {
      const serviceSla = ticket.service?.slaHours || 24;
      const serviceResponseSla = ticket.service?.responseHours || 4;
      const serviceResolutionSla = ticket.service?.resolutionHours || 24;
      
      // Use priority-based SLA if service doesn't specify
      const priorityTargets = slaTargets[ticket.priority as keyof typeof slaTargets] || slaTargets.MEDIUM;
      const responseSlaHours = serviceResponseSla || priorityTargets.response;
      const resolutionSlaHours = serviceResolutionSla || priorityTargets.resolution;

      // Calculate actual times - use slaStartAt (approval time) or createdAt
      const slaStart = ticket.slaStartAt ? new Date(ticket.slaStartAt) : new Date(ticket.createdAt);
      const slaPausedTotal = (ticket as any).slaPausedTotal || 0;
      const slaPausedAt = (ticket as any).slaPausedAt ? new Date((ticket as any).slaPausedAt) : null;
      const firstResponseAt = (ticket as any).firstResponseAt ? new Date((ticket as any).firstResponseAt) : null;
      const resolvedAt = ticket.resolvedAt ? new Date(ticket.resolvedAt) : null;
      const assignedAt = (ticket as any).assignedAt ? new Date((ticket as any).assignedAt) : null;

      // Helper to get effective elapsed hours accounting for pause time
      const getElapsed = (endTime: Date): number => {
        let elapsedMs = endTime.getTime() - slaStart.getTime() - slaPausedTotal;
        if (slaPausedAt && endTime >= slaPausedAt) {
          elapsedMs -= (endTime.getTime() - slaPausedAt.getTime());
        }
        return Math.max(0, elapsedMs / (1000 * 60 * 60));
      };

      // Calculate response time
      let actualResponseHours = 0;
      let responseBreached = false;
      if (firstResponseAt) {
        actualResponseHours = getElapsed(firstResponseAt);
        responseBreached = actualResponseHours > responseSlaHours;
      } else if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
        actualResponseHours = getElapsed(now);
        responseBreached = actualResponseHours > responseSlaHours;
      }

      // Calculate resolution time
      let actualResolutionHours = 0;
      let resolutionBreached = false;
      if (resolvedAt) {
        actualResolutionHours = getElapsed(resolvedAt);
        resolutionBreached = actualResolutionHours > resolutionSlaHours;
      } else if (ticket.status !== 'CLOSED' && ticket.status !== 'RESOLVED') {
        actualResolutionHours = getElapsed(now);
        resolutionBreached = actualResolutionHours > resolutionSlaHours;
      }

      // Calculate assignment time
      let actualAssignmentHours = 0;
      if (assignedAt) {
        actualAssignmentHours = getElapsed(assignedAt);
      }

      // Get SLA tracking data if available
      const slaTracking = ticket.slaTracking?.[0];
      const slaStatus = slaTracking?.status || 'NOT_TRACKED';

      return {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
        priority: ticket.priority,
        status: ticket.status,
        serviceName: ticket.service?.name || 'Unknown',
        categoryName: ticket.service?.category?.name || 'Unknown',
        createdBy: ticket.createdBy.name,
        assignedTo: ticket.assignedTo?.name || 'Unassigned',
        branchName: ticket.branch?.name || 'Unknown',
        branchCode: ticket.branch?.code || '',
        createdAt: ticket.createdAt,
        firstResponseAt: ticket.firstResponseAt,
        resolvedAt: ticket.resolvedAt,
        assignedAt: ticket.assignedAt,
        responseSlaHours,
        resolutionSlaHours,
        actualResponseHours: Math.round(actualResponseHours * 100) / 100,
        actualResolutionHours: Math.round(actualResolutionHours * 100) / 100,
        actualAssignmentHours: Math.round(actualAssignmentHours * 100) / 100,
        responseBreached,
        resolutionBreached,
        slaStatus,
        businessHoursOnly: ticket.service?.businessHoursOnly || false,
        breachSeverity: resolutionBreached ? 
          (actualResolutionHours > resolutionSlaHours * 2 ? 'SEVERE' : 'MODERATE') : 
          (responseBreached ? 'MINOR' : 'NONE'),
        daysSinceCreated: Math.floor((now.getTime() - slaStart.getTime()) / (24 * 60 * 60 * 1000))
      };
    });

    // Filter for recent tickets
    const recentSlaAnalysis = slaAnalysis.filter(t => 
      new Date(t.createdAt) >= thirtyDaysAgo
    );

    // Overall SLA statistics
    const totalTickets = slaAnalysis.length;
    const responseBreaches = slaAnalysis.filter(t => t.responseBreached).length;
    const resolutionBreaches = slaAnalysis.filter(t => t.resolutionBreached).length;
    const totalBreaches = slaAnalysis.filter(t => t.responseBreached || t.resolutionBreached).length;

    // Recent SLA statistics
    const recentTotalTickets = recentSlaAnalysis.length;
    const recentResponseBreaches = recentSlaAnalysis.filter(t => t.responseBreached).length;
    const recentResolutionBreaches = recentSlaAnalysis.filter(t => t.resolutionBreached).length;
    const recentTotalBreaches = recentSlaAnalysis.filter(t => t.responseBreached || t.resolutionBreached).length;

    // Compliance rates
    const responseComplianceRate = totalTickets > 0 ? ((totalTickets - responseBreaches) / totalTickets) * 100 : 100;
    const resolutionComplianceRate = totalTickets > 0 ? ((totalTickets - resolutionBreaches) / totalTickets) * 100 : 100;
    const overallComplianceRate = totalTickets > 0 ? ((totalTickets - totalBreaches) / totalTickets) * 100 : 100;

    // Breach analysis by service
    const serviceBreachAnalysis = slaAnalysis.reduce((acc: any, ticket) => {
      const serviceName = ticket.serviceName;
      if (!acc[serviceName]) {
        acc[serviceName] = {
          serviceName,
          categoryName: ticket.categoryName,
          totalTickets: 0,
          responseBreaches: 0,
          resolutionBreaches: 0,
          totalBreaches: 0,
          avgResponseHours: 0,
          avgResolutionHours: 0,
          responseSum: 0,
          resolutionSum: 0,
          responseCount: 0,
          resolutionCount: 0
        };
      }

      acc[serviceName].totalTickets++;
      if (ticket.responseBreached) acc[serviceName].responseBreaches++;
      if (ticket.resolutionBreached) acc[serviceName].resolutionBreaches++;
      if (ticket.responseBreached || ticket.resolutionBreached) acc[serviceName].totalBreaches++;

      if (ticket.actualResponseHours > 0) {
        acc[serviceName].responseSum += ticket.actualResponseHours;
        acc[serviceName].responseCount++;
      }
      if (ticket.actualResolutionHours > 0) {
        acc[serviceName].resolutionSum += ticket.actualResolutionHours;
        acc[serviceName].resolutionCount++;
      }

      return acc;
    }, {});

    // Calculate service averages
    Object.keys(serviceBreachAnalysis).forEach(serviceName => {
      const service = serviceBreachAnalysis[serviceName];
      service.avgResponseHours = service.responseCount > 0 ? service.responseSum / service.responseCount : 0;
      service.avgResolutionHours = service.resolutionCount > 0 ? service.resolutionSum / service.resolutionCount : 0;
      service.responseComplianceRate = service.totalTickets > 0 ? 
        ((service.totalTickets - service.responseBreaches) / service.totalTickets) * 100 : 100;
      service.resolutionComplianceRate = service.totalTickets > 0 ? 
        ((service.totalTickets - service.resolutionBreaches) / service.totalTickets) * 100 : 100;
      service.overallComplianceRate = service.totalTickets > 0 ? 
        ((service.totalTickets - service.totalBreaches) / service.totalTickets) * 100 : 100;
    });

    const serviceBreachList = Object.values(serviceBreachAnalysis)
      .sort((a: any, b: any) => b.totalBreaches - a.totalBreaches);

    // Breach analysis by priority
    const priorityBreachAnalysis = slaAnalysis.reduce((acc: any, ticket) => {
      const priority = ticket.priority;
      if (!acc[priority]) {
        acc[priority] = {
          priority,
          totalTickets: 0,
          responseBreaches: 0,
          resolutionBreaches: 0,
          totalBreaches: 0,
          avgResponseHours: 0,
          avgResolutionHours: 0
        };
      }

      acc[priority].totalTickets++;
      if (ticket.responseBreached) acc[priority].responseBreaches++;
      if (ticket.resolutionBreached) acc[priority].resolutionBreaches++;
      if (ticket.responseBreached || ticket.resolutionBreached) acc[priority].totalBreaches++;

      return acc;
    }, {});

    // Branch analysis
    const branchBreachAnalysis = slaAnalysis.reduce((acc: any, ticket) => {
      const branchName = ticket.branchName;
      if (!acc[branchName]) {
        acc[branchName] = {
          branchName,
          branchCode: ticket.branchCode,
          totalTickets: 0,
          responseBreaches: 0,
          resolutionBreaches: 0,
          totalBreaches: 0
        };
      }

      acc[branchName].totalTickets++;
      if (ticket.responseBreached) acc[branchName].responseBreaches++;
      if (ticket.resolutionBreached) acc[branchName].resolutionBreaches++;
      if (ticket.responseBreached || ticket.resolutionBreached) acc[branchName].totalBreaches++;

      return acc;
    }, {});

    Object.keys(branchBreachAnalysis).forEach(branchName => {
      const branch = branchBreachAnalysis[branchName];
      branch.complianceRate = branch.totalTickets > 0 ? 
        ((branch.totalTickets - branch.totalBreaches) / branch.totalTickets) * 100 : 100;
    });

    const branchBreachList = Object.values(branchBreachAnalysis)
      .sort((a: any, b: any) => b.totalBreaches - a.totalBreaches);

    // Current breached tickets (active breaches)
    const currentBreaches = slaAnalysis.filter(t => 
      (t.responseBreached || t.resolutionBreached) && 
      !['RESOLVED', 'CLOSED'].includes(t.status)
    ).sort((a, b) => b.daysSinceCreated - a.daysSinceCreated);

    // Monthly trend
    const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - i));
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const monthTickets = slaAnalysis.filter(ticket => {
        const ticketDate = new Date(ticket.createdAt);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      const monthBreaches = monthTickets.filter(t => t.responseBreached || t.resolutionBreached);

      return {
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        totalTickets: monthTickets.length,
        breaches: monthBreaches.length,
        complianceRate: monthTickets.length > 0 ? 
          ((monthTickets.length - monthBreaches.length) / monthTickets.length) * 100 : 100
      };
    });

    const summary = {
      totalTickets,
      responseBreaches,
      resolutionBreaches,
      totalBreaches,
      responseComplianceRate: Math.round(responseComplianceRate * 10) / 10,
      resolutionComplianceRate: Math.round(resolutionComplianceRate * 10) / 10,
      overallComplianceRate: Math.round(overallComplianceRate * 10) / 10,
      avgResponseTime: slaAnalysis.length > 0 ? 
        Math.round((slaAnalysis.reduce((sum, t) => sum + t.actualResponseHours, 0) / slaAnalysis.length) * 10) / 10 : 0,
      avgResolutionTime: slaAnalysis.length > 0 ? 
        Math.round((slaAnalysis.reduce((sum, t) => sum + t.actualResolutionHours, 0) / slaAnalysis.length) * 10) / 10 : 0,
      currentActiveBreaches: currentBreaches.length,
      recentTotalTickets,
      recentTotalBreaches
    };

    return NextResponse.json({
      summary,
      serviceBreaches: serviceBreachList,
      priorityBreaches: Object.values(priorityBreachAnalysis),
      branchBreaches: branchBreachList,
      currentBreaches: currentBreaches.slice(0, 20),
      monthlyTrend,
      slaTargets
    });

  } catch (error) {
    console.error('Error fetching SLA breach analysis data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}