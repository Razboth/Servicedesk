import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEffectiveElapsedHours, getSlaStartTime } from '@/lib/sla-utils';

// Helper: calculate pause-aware elapsed business hours
function calcElapsedHours(start: Date, end: Date, pausedTotalMs: number, pausedAt: Date | null): number {
  return getEffectiveElapsedHours(start, end, pausedTotalMs, pausedAt, true);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();
    const categoryId = searchParams.get('categoryId');
    const supportGroupId = searchParams.get('supportGroupId');

    // Get all services with SLA settings and tickets
    const services = await prisma.service.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { tier1CategoryId: categoryId } : {}),
        ...(supportGroupId ? { supportGroupId } : {}),
      },
      include: {
        tier1Category: { select: { name: true } },
        tier2Subcategory: { select: { name: true } },
        tier3Item: { select: { name: true } },
        supportGroup: { select: { name: true } },
        tickets: {
          where: {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          include: {
            slaTracking: true,
            assignedTo: {
              select: {
                id: true,
                name: true,
                branch: { select: { name: true } },
                supportGroup: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Technician aggregation map
    const techMap = new Map<string, {
      id: string; name: string; branch: string; supportGroups: Set<string>;
      totalTickets: number; resolvedTickets: number;
      responseBreaches: number; resolutionBreaches: number;
      totalResponseHours: number; responseCount: number;
      totalResolutionHours: number; resolutionCount: number;
    }>();

    // Breach time tracking for hourly/daily analysis
    const breachByHour = new Array(24).fill(0);
    const breachByDayOfWeek = new Array(7).fill(0);

    // Calculate SLA compliance for each service
    const serviceCompliance = services.map(service => {
      const tickets = service.tickets;
      const totalTickets = tickets.length;

      if (totalTickets === 0) {
        return {
          id: service.id,
          name: service.name,
          category: service.tier1Category?.name || 'Uncategorized',
          subcategory: service.tier2Subcategory?.name || '-',
          item: service.tier3Item?.name || '-',
          supportGroup: service.supportGroup?.name || 'Unassigned',
          slaResponseTime: service.slaResponseTime,
          slaResolutionTime: service.slaResolutionTime,
          totalTickets: 0,
          metrics: { responseCompliance: 100, resolutionCompliance: 100, overallCompliance: 100, avgResponseTime: 0, avgResolutionTime: 0 },
          breaches: { response: 0, resolution: 0, both: 0 },
          performance: { status: 'Excellent' as const, color: '#10b981' },
        };
      }

      let responseBreaches = 0;
      let resolutionBreaches = 0;
      let bothBreaches = 0;
      let totalResponseHours = 0;
      let totalResolutionHours = 0;
      let ticketsWithResponse = 0;
      let ticketsWithResolution = 0;

      tickets.forEach(ticket => {
        const sla = ticket.slaTracking[0];
        const slaStart = getSlaStartTime({
          claimedAt: (ticket as any).claimedAt,
          slaStartAt: ticket.slaStartAt,
          createdAt: ticket.createdAt
        }).getTime();
        const pausedTotal = ticket.slaPausedTotal || 0;
        const pausedAt = ticket.slaPausedAt ? new Date(ticket.slaPausedAt) : null;

        // Aggregate technician data
        const tech = ticket.assignedTo;
        if (tech?.id) {
          if (!techMap.has(tech.id)) {
            techMap.set(tech.id, {
              id: tech.id,
              name: tech.name,
              branch: tech.branch?.name || 'Unknown',
              supportGroups: new Set<string>(),
              totalTickets: 0,
              resolvedTickets: 0,
              responseBreaches: 0,
              resolutionBreaches: 0,
              totalResponseHours: 0,
              responseCount: 0,
              totalResolutionHours: 0,
              resolutionCount: 0,
            });
          }
          const td = techMap.get(tech.id)!;
          if (tech.supportGroup?.name) td.supportGroups.add(tech.supportGroup.name);
          td.totalTickets++;

          if (sla) {
            if (sla.isResponseBreached) td.responseBreaches++;
            if (sla.isResolutionBreached) td.resolutionBreaches++;
            if (sla.resolutionTime) {
              td.resolvedTickets++;
              td.totalResolutionHours += calcElapsedHours(new Date(slaStart), sla.resolutionTime, pausedTotal, pausedAt);
              td.resolutionCount++;
            }
            if (sla.responseTime) {
              td.totalResponseHours += calcElapsedHours(new Date(slaStart), sla.responseTime, pausedTotal, pausedAt);
              td.responseCount++;
            }
          } else if (ticket.resolvedAt) {
            td.resolvedTickets++;
            td.totalResolutionHours += calcElapsedHours(new Date(slaStart), new Date(ticket.resolvedAt), pausedTotal, pausedAt);
            td.resolutionCount++;
          }
        }

        if (sla) {
          const isRespBreached = sla.isResponseBreached;
          const isResBreached = sla.isResolutionBreached;

          if (isRespBreached) responseBreaches++;
          if (isResBreached) resolutionBreaches++;
          if (isRespBreached && isResBreached) bothBreaches++;

          // Track breach patterns
          if (isRespBreached || isResBreached) {
            const created = new Date(ticket.createdAt);
            breachByHour[created.getHours()]++;
            breachByDayOfWeek[created.getDay()]++;
          }

          if (sla.responseTime) {
            totalResponseHours += calcElapsedHours(new Date(slaStart), sla.responseTime, pausedTotal, pausedAt);
            ticketsWithResponse++;
          }
          if (sla.resolutionTime) {
            totalResolutionHours += calcElapsedHours(new Date(slaStart), sla.resolutionTime, pausedTotal, pausedAt);
            ticketsWithResolution++;
          }
        } else {
          // Fallback: calculate from ticket timestamps
          if (ticket.resolvedAt) {
            const resHours = calcElapsedHours(new Date(slaStart), new Date(ticket.resolvedAt), pausedTotal, pausedAt);
            totalResolutionHours += resHours;
            ticketsWithResolution++;
            if (service.slaResolutionTime && resHours > service.slaResolutionTime) {
              resolutionBreaches++;
              const created = new Date(ticket.createdAt);
              breachByHour[created.getHours()]++;
              breachByDayOfWeek[created.getDay()]++;
            }
          }
        }
      });

      const responseCompliance = totalTickets > 0 ? ((totalTickets - responseBreaches) / totalTickets) * 100 : 100;
      const resolutionCompliance = totalTickets > 0 ? ((totalTickets - resolutionBreaches) / totalTickets) * 100 : 100;
      const overallCompliance = (responseCompliance + resolutionCompliance) / 2;
      const avgResponseTime = ticketsWithResponse > 0 ? (totalResponseHours / ticketsWithResponse) * 60 : 0; // minutes
      const avgResolutionTime = ticketsWithResolution > 0 ? totalResolutionHours / ticketsWithResolution : 0; // hours

      return {
        id: service.id,
        name: service.name,
        category: service.tier1Category?.name || 'Uncategorized',
        subcategory: service.tier2Subcategory?.name || '-',
        item: service.tier3Item?.name || '-',
        supportGroup: service.supportGroup?.name || 'Unassigned',
        slaResponseTime: service.slaResponseTime,
        slaResolutionTime: service.slaResolutionTime,
        totalTickets,
        metrics: {
          responseCompliance: Math.round(responseCompliance * 10) / 10,
          resolutionCompliance: Math.round(resolutionCompliance * 10) / 10,
          overallCompliance: Math.round(overallCompliance * 10) / 10,
          avgResponseTime: Math.round(avgResponseTime * 10) / 10,
          avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
        },
        breaches: { response: responseBreaches, resolution: resolutionBreaches, both: bothBreaches },
        performance: {
          status: overallCompliance >= 90 ? 'Excellent' : overallCompliance >= 75 ? 'Good' : overallCompliance >= 60 ? 'Fair' : 'Poor',
          color: overallCompliance >= 90 ? '#10b981' : overallCompliance >= 75 ? '#3b82f6' : overallCompliance >= 60 ? '#f59e0b' : '#ef4444',
        },
      };
    });

    // Active services (with tickets)
    const activeServices = serviceCompliance.filter(s => s.totalTickets > 0);

    const needsAttention = [...activeServices]
      .sort((a, b) => a.metrics.overallCompliance - b.metrics.overallCompliance)
      .slice(0, 10);

    const topPerformers = [...activeServices]
      .sort((a, b) => b.metrics.overallCompliance - a.metrics.overallCompliance)
      .slice(0, 10);

    // Category compliance
    const catMap: Record<string, { name: string; serviceCount: number; totalTickets: number; totalBreaches: number; complianceSum: number; activeCount: number }> = {};
    serviceCompliance.forEach(s => {
      const cat = s.category;
      if (!catMap[cat]) catMap[cat] = { name: cat, serviceCount: 0, totalTickets: 0, totalBreaches: 0, complianceSum: 0, activeCount: 0 };
      const c = catMap[cat];
      c.serviceCount++;
      c.totalTickets += s.totalTickets;
      c.totalBreaches += s.breaches.response + s.breaches.resolution;
      if (s.totalTickets > 0) {
        c.complianceSum += s.metrics.overallCompliance;
        c.activeCount++;
      }
    });

    const categoryCompliance = Object.values(catMap).map(c => ({
      name: c.name,
      serviceCount: c.serviceCount,
      totalTickets: c.totalTickets,
      totalBreaches: c.totalBreaches,
      avgCompliance: c.activeCount > 0 ? Math.round((c.complianceSum / c.activeCount) * 10) / 10 : 100,
    }));

    // Support group compliance
    const groupMap: Record<string, { name: string; serviceCount: number; totalTickets: number; complianceSum: number; activeCount: number }> = {};
    serviceCompliance.forEach(s => {
      const group = s.supportGroup;
      if (!groupMap[group]) groupMap[group] = { name: group, serviceCount: 0, totalTickets: 0, complianceSum: 0, activeCount: 0 };
      const g = groupMap[group];
      g.serviceCount++;
      g.totalTickets += s.totalTickets;
      if (s.totalTickets > 0) {
        g.complianceSum += s.metrics.overallCompliance;
        g.activeCount++;
      }
    });

    const supportGroupCompliance = Object.values(groupMap).map(g => ({
      name: g.name,
      serviceCount: g.serviceCount,
      totalTickets: g.totalTickets,
      avgCompliance: g.activeCount > 0 ? Math.round((g.complianceSum / g.activeCount) * 10) / 10 : 100,
    }));

    // Build technicians array
    const technicians = Array.from(techMap.values()).map(t => {
      const compliant = t.totalTickets - Math.max(t.responseBreaches, t.resolutionBreaches);
      return {
        id: t.id,
        name: t.name,
        branch: t.branch,
        supportGroups: Array.from(t.supportGroups) as string[],
        totalTickets: t.totalTickets,
        resolvedTickets: t.resolvedTickets,
        responseBreaches: t.responseBreaches,
        resolutionBreaches: t.resolutionBreaches,
        slaCompliance: t.totalTickets > 0 ? Math.round((Math.max(0, compliant) / t.totalTickets) * 100) : 100,
        avgResponseMinutes: t.responseCount > 0 ? Math.round((t.totalResponseHours / t.responseCount * 60) * 10) / 10 : 0,
        avgResolutionHours: t.resolutionCount > 0 ? Math.round((t.totalResolutionHours / t.resolutionCount) * 10) / 10 : 0,
      };
    }).sort((a, b) => b.slaCompliance - a.slaCompliance);

    // Overall statistics
    const totalTickets = activeServices.reduce((sum, s) => sum + s.totalTickets, 0);
    const totalResponseBreaches = activeServices.reduce((sum, s) => sum + s.breaches.response, 0);
    const totalResolutionBreaches = activeServices.reduce((sum, s) => sum + s.breaches.resolution, 0);
    const overallResponseCompliance = totalTickets > 0 ? ((totalTickets - totalResponseBreaches) / totalTickets) * 100 : 100;
    const overallResolutionCompliance = totalTickets > 0 ? ((totalTickets - totalResolutionBreaches) / totalTickets) * 100 : 100;
    const overallCompliance = (overallResponseCompliance + overallResolutionCompliance) / 2;

    // Breach analysis by priority
    const breachByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      where: {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        slaTracking: { some: { OR: [{ isResponseBreached: true }, { isResolutionBreached: true }] } },
      },
      _count: true,
    });

    // Peak breach hour/day
    const peakHour = breachByHour.indexOf(Math.max(...breachByHour));
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = dayNames[breachByDayOfWeek.indexOf(Math.max(...breachByDayOfWeek))];

    return NextResponse.json({
      services: serviceCompliance,
      topPerformers,
      needsAttention,
      categoryCompliance,
      supportGroupCompliance,
      technicians,
      breachAnalysis: {
        byPriority: breachByPriority.map(item => ({ priority: item.priority, count: item._count })),
        peakBreachHour: peakHour,
        peakBreachDay: peakDay,
        byHour: breachByHour,
        byDayOfWeek: breachByDayOfWeek,
      },
      summary: {
        totalServices: services.length,
        activeServices: activeServices.length,
        totalTickets,
        totalResponseBreaches,
        totalResolutionBreaches,
        overallResponseCompliance: Math.round(overallResponseCompliance * 10) / 10,
        overallResolutionCompliance: Math.round(overallResolutionCompliance * 10) / 10,
        overallCompliance: Math.round(overallCompliance * 10) / 10,
        complianceStatus: overallCompliance >= 90 ? 'Excellent' : overallCompliance >= 75 ? 'Good' : overallCompliance >= 60 ? 'Fair' : 'Poor',
      },
      period: { startDate, endDate },
    });
  } catch (error) {
    console.error('Error fetching service SLA compliance report:', error);
    return NextResponse.json({ error: 'Failed to fetch service SLA compliance report' }, { status: 500 });
  }
}
