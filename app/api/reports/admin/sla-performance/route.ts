import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getEffectiveElapsedHours, getSlaStartTime } from '@/lib/sla-utils';

// GET /api/reports/admin/sla-performance
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Fetch SLA tracking data with full relations
    const slaData = await prisma.sLATracking.findMany({
      where: {
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        ticket: {
          include: {
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                branchId: true,
                branch: { select: { name: true, code: true } },
                supportGroup: { select: { name: true } },
              },
            },
            createdBy: {
              select: {
                branchId: true,
                branch: { select: { name: true, code: true } },
              },
            },
            service: {
              select: {
                resolutionHours: true,
                responseHours: true,
                businessHoursOnly: true,
                tier1Category: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Helper: get SLA start time (uses claimedAt when available)
    const getSlaStart = (sla: any): Date => {
      return getSlaStartTime({
        claimedAt: sla.ticket?.claimedAt,
        slaStartAt: sla.ticket?.slaStartAt,
        createdAt: sla.createdAt
      });
    };

    // Helper: get pause-aware elapsed business hours
    const getElapsedHours = (sla: any, endTime: Date): number => {
      const start = getSlaStart(sla);
      const pausedTotal = sla.ticket?.slaPausedTotal || 0;
      const pausedAt = sla.ticket?.slaPausedAt ? new Date(sla.ticket.slaPausedAt) : null;
      return getEffectiveElapsedHours(start, endTime, pausedTotal, pausedAt, true);
    };

    // --- Summary Calculations ---
    const totalSlaRecords = slaData.length;
    const responseBreaches = slaData.filter(s => s.isResponseBreached).length;
    const resolutionBreaches = slaData.filter(s => s.isResolutionBreached).length;
    const compliantTickets = slaData.filter(s => !s.isResponseBreached && !s.isResolutionBreached).length;
    const totalEscalated = slaData.filter(s => s.isEscalated).length;
    const activeBreaches = slaData.filter(s =>
      (s.isResponseBreached || s.isResolutionBreached) &&
      !s.resolutionTime
    ).length;
    const pausedTickets = slaData.filter(s => s.ticket?.slaPausedAt != null).length;

    const overallCompliance = totalSlaRecords > 0 ? Math.round((compliantTickets / totalSlaRecords) * 100) : 0;
    const responseCompliance = totalSlaRecords > 0 ? Math.round(((totalSlaRecords - responseBreaches) / totalSlaRecords) * 100) : 0;
    const resolutionCompliance = totalSlaRecords > 0 ? Math.round(((totalSlaRecords - resolutionBreaches) / totalSlaRecords) * 100) : 0;

    // Avg response/resolution hours (pause-aware)
    const slaWithResponse = slaData.filter(s => s.responseTime);
    const avgResponseHours = slaWithResponse.length > 0
      ? slaWithResponse.reduce((sum, s) => sum + getElapsedHours(s, s.responseTime!), 0) / slaWithResponse.length
      : 0;

    const slaWithResolution = slaData.filter(s => s.resolutionTime);
    const avgResolutionHours = slaWithResolution.length > 0
      ? slaWithResolution.reduce((sum, s) => sum + getElapsedHours(s, s.resolutionTime!), 0) / slaWithResolution.length
      : 0;

    // Avg pause duration
    const pausedSlas = slaData.filter(s => (s.ticket?.slaPausedTotal || 0) > 0);
    const avgPauseDurationHours = pausedSlas.length > 0
      ? pausedSlas.reduce((sum, s) => sum + (s.ticket.slaPausedTotal || 0) / (1000 * 60 * 60), 0) / pausedSlas.length
      : 0;

    // --- Technician Performance ---
    const techMap = new Map<string, any>();
    for (const sla of slaData) {
      const tech = sla.ticket?.assignedTo;
      if (!tech?.id) continue;

      if (!techMap.has(tech.id)) {
        techMap.set(tech.id, {
          id: tech.id,
          name: tech.name,
          email: tech.email,
          branch: tech.branch?.name || 'Unknown',
          branchCode: tech.branch?.code || '',
          supportGroups: new Set<string>(),
          totalTickets: 0,
          resolvedTickets: 0,
          openTickets: 0,
          overdueTickets: 0,
          responseBreaches: 0,
          resolutionBreaches: 0,
          totalResponseHours: 0,
          responseCount: 0,
          totalResolutionHours: 0,
          resolutionCount: 0,
          excellenceCount: 0,
        });
      }

      const t = techMap.get(tech.id)!;
      if (tech.supportGroup?.name) t.supportGroups.add(tech.supportGroup.name);
      t.totalTickets++;

      if (sla.resolutionTime) {
        t.resolvedTickets++;
        const hrs = getElapsedHours(sla, sla.resolutionTime);
        t.totalResolutionHours += hrs;
        t.resolutionCount++;
        // Excellence: resolved in < 50% of SLA time
        if (sla.ticket.service?.resolutionHours) {
          if (hrs <= sla.ticket.service.resolutionHours * 0.5) {
            t.excellenceCount++;
          }
        }
      } else {
        t.openTickets++;
        if (sla.isResolutionBreached) t.overdueTickets++;
      }

      if (sla.responseTime) {
        t.totalResponseHours += getElapsedHours(sla, sla.responseTime);
        t.responseCount++;
      }

      if (sla.isResponseBreached) t.responseBreaches++;
      if (sla.isResolutionBreached) t.resolutionBreaches++;
    }

    const technicians = Array.from(techMap.values()).map(t => ({
      id: t.id,
      name: t.name,
      email: t.email,
      branch: t.branch,
      branchCode: t.branchCode,
      supportGroups: Array.from(t.supportGroups) as string[],
      totalTickets: t.totalTickets,
      resolvedTickets: t.resolvedTickets,
      openTickets: t.openTickets,
      overdueTickets: t.overdueTickets,
      responseBreaches: t.responseBreaches,
      resolutionBreaches: t.resolutionBreaches,
      slaCompliance: t.totalTickets > 0
        ? Math.round(((t.totalTickets - t.responseBreaches - t.resolutionBreaches + (Math.min(t.responseBreaches, t.resolutionBreaches))) / t.totalTickets) * 100)
        : 100,
      resolutionRate: t.totalTickets > 0
        ? Math.round((t.resolvedTickets / t.totalTickets) * 100)
        : 0,
      avgResponseHours: t.responseCount > 0 ? Math.round((t.totalResponseHours / t.responseCount) * 10) / 10 : 0,
      avgResolutionHours: t.resolutionCount > 0 ? Math.round((t.totalResolutionHours / t.resolutionCount) * 10) / 10 : 0,
      excellenceCount: t.excellenceCount,
    })).sort((a, b) => b.slaCompliance - a.slaCompliance);

    // --- By Priority ---
    const byPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(priority => {
      const pSla = slaData.filter(s => s.ticket.priority === priority);
      const pCompliant = pSla.filter(s => !s.isResponseBreached && !s.isResolutionBreached);
      const pResp = pSla.filter(s => s.responseTime);
      const avgResp = pResp.length > 0
        ? pResp.reduce((sum, s) => sum + getElapsedHours(s, s.responseTime!), 0) / pResp.length
        : 0;
      return {
        priority,
        total: pSla.length,
        compliant: pCompliant.length,
        complianceRate: pSla.length > 0 ? Math.round((pCompliant.length / pSla.length) * 100) : 0,
        responseBreaches: pSla.filter(s => s.isResponseBreached).length,
        resolutionBreaches: pSla.filter(s => s.isResolutionBreached).length,
        avgResponseHours: Math.round(avgResp * 10) / 10,
      };
    });

    // --- By Category (fixed: use tier1Category.name) ---
    const catMap: Record<string, { total: number; compliant: number; responseBreaches: number; resolutionBreaches: number; totalResponseHours: number; responseCount: number }> = {};
    for (const sla of slaData) {
      const cat = sla.ticket.service?.tier1Category?.name || 'Uncategorized';
      if (!catMap[cat]) {
        catMap[cat] = { total: 0, compliant: 0, responseBreaches: 0, resolutionBreaches: 0, totalResponseHours: 0, responseCount: 0 };
      }
      const c = catMap[cat];
      c.total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) c.compliant++;
      if (sla.isResponseBreached) c.responseBreaches++;
      if (sla.isResolutionBreached) c.resolutionBreaches++;
      if (sla.responseTime) {
        c.totalResponseHours += getElapsedHours(sla, sla.responseTime);
        c.responseCount++;
      }
    }

    const byCategory = Object.entries(catMap)
      .map(([category, s]) => ({
        category,
        total: s.total,
        compliant: s.compliant,
        complianceRate: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
        responseBreaches: s.responseBreaches,
        resolutionBreaches: s.resolutionBreaches,
        avgResponseHours: s.responseCount > 0 ? Math.round((s.totalResponseHours / s.responseCount) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // --- By Branch ---
    const branchMap: Record<string, { total: number; compliant: number; responseBreaches: number; resolutionBreaches: number }> = {};
    for (const sla of slaData) {
      const branch = sla.ticket.assignedTo?.branch?.name || sla.ticket.createdBy?.branch?.name || 'Unknown';
      if (!branchMap[branch]) {
        branchMap[branch] = { total: 0, compliant: 0, responseBreaches: 0, resolutionBreaches: 0 };
      }
      const b = branchMap[branch];
      b.total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) b.compliant++;
      if (sla.isResponseBreached) b.responseBreaches++;
      if (sla.isResolutionBreached) b.resolutionBreaches++;
    }

    const byBranch = Object.entries(branchMap)
      .map(([branch, s]) => ({
        branch,
        total: s.total,
        compliant: s.compliant,
        complianceRate: s.total > 0 ? Math.round((s.compliant / s.total) * 100) : 0,
        responseBreaches: s.responseBreaches,
        resolutionBreaches: s.resolutionBreaches,
      }))
      .sort((a, b) => b.complianceRate - a.complianceRate);

    // --- Trends: Daily (last 30 days) ---
    // Group slaData by date for efficient daily calculation
    const dailyMap: Record<string, { total: number; compliant: number }> = {};
    for (const sla of slaData) {
      const dateKey = new Date(sla.createdAt).toISOString().split('T')[0];
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { total: 0, compliant: 0 };
      dailyMap[dateKey].total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) dailyMap[dateKey].compliant++;
    }

    const dailyTrends: Array<{ date: string; value: number; total: number; compliant: number; label: string }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const entry = dailyMap[dateKey] || { total: 0, compliant: 0 };
      const rate = entry.total > 0 ? Math.round((entry.compliant / entry.total) * 100) : 0;
      dailyTrends.push({
        date: dateKey,
        value: rate,
        total: entry.total,
        compliant: entry.compliant,
        label: `${rate}% compliance (${entry.compliant}/${entry.total})`,
      });
    }

    // --- Trends: Monthly (last 6 months) ---
    const monthlyMap: Record<string, { total: number; compliant: number }> = {};
    for (const sla of slaData) {
      const d = new Date(sla.createdAt);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[monthKey]) monthlyMap[monthKey] = { total: 0, compliant: 0 };
      monthlyMap[monthKey].total++;
      if (!sla.isResponseBreached && !sla.isResolutionBreached) monthlyMap[monthKey].compliant++;
    }

    // Also fetch from DB for months that might be outside our fetched range
    const monthlyTrends: Array<{ date: string; value: number; total: number; compliant: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      let entry = monthlyMap[monthKey];
      if (!entry) {
        // Fetch from DB for this month
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthSla = await prisma.sLATracking.findMany({
          where: { createdAt: { gte: monthStart, lte: monthEnd } },
          select: { isResponseBreached: true, isResolutionBreached: true },
        });
        entry = {
          total: monthSla.length,
          compliant: monthSla.filter(s => !s.isResponseBreached && !s.isResolutionBreached).length,
        };
      }

      const rate = entry.total > 0 ? Math.round((entry.compliant / entry.total) * 100) : 0;
      monthlyTrends.push({
        date: monthKey,
        value: rate,
        total: entry.total,
        compliant: entry.compliant,
        label: `${rate}% compliance`,
      });
    }

    // --- Response Time Distribution ---
    const dist = { immediate: 0, fast: 0, normal: 0, slow: 0 };
    for (const sla of slaWithResponse) {
      const hrs = getElapsedHours(sla, sla.responseTime!);
      if (hrs < 1) dist.immediate++;
      else if (hrs <= 4) dist.fast++;
      else if (hrs <= 24) dist.normal++;
      else dist.slow++;
    }

    const responseDistribution = [
      { label: 'Immediate (<1h)', value: dist.immediate },
      { label: 'Fast (1-4h)', value: dist.fast },
      { label: 'Normal (4-24h)', value: dist.normal },
      { label: 'Slow (>24h)', value: dist.slow },
    ];

    // --- Excellence ---
    const excellenceCount = slaData.filter(sla => {
      if (!sla.resolutionTime || !sla.ticket.service?.resolutionHours) return false;
      const hrs = getElapsedHours(sla, sla.resolutionTime);
      return hrs <= sla.ticket.service.resolutionHours * 0.5;
    }).length;

    const criticalSla = slaData.filter(s => s.ticket.priority === 'CRITICAL');
    const criticalOnTime = criticalSla.filter(s => !s.isResponseBreached && !s.isResolutionBreached).length;

    // --- Improvements ---
    const highBreachBranches = byBranch.filter(b => b.complianceRate < 80 && b.total >= 5);
    const problematicCategories = byCategory.filter(c => c.complianceRate < 80 && c.total >= 5);
    const frequentBreaches = slaData.filter(s => s.isResponseBreached && s.isResolutionBreached).length;

    return NextResponse.json({
      summary: {
        totalSlaRecords,
        overallCompliance,
        responseCompliance,
        resolutionCompliance,
        responseBreaches,
        resolutionBreaches,
        avgResponseHours: Math.round(avgResponseHours * 10) / 10,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        totalEscalated,
        activeBreaches,
        pausedTickets,
        avgPauseDurationHours: Math.round(avgPauseDurationHours * 10) / 10,
      },
      technicians,
      byPriority,
      byCategory,
      byBranch,
      trends: {
        daily: dailyTrends,
        monthly: monthlyTrends,
      },
      responseDistribution,
      excellence: {
        excellenceRate: totalSlaRecords > 0 ? Math.round((excellenceCount / totalSlaRecords) * 100) : 0,
        criticalIncidents: criticalSla.length,
        criticalOnTime,
        criticalComplianceRate: criticalSla.length > 0 ? Math.round((criticalOnTime / criticalSla.length) * 100) : 0,
      },
      improvements: {
        highBreachBranches,
        problematicCategories,
        frequentBreaches,
        totalImprovementAreas: highBreachBranches.length + problematicCategories.length,
      },
      period: { startDate, endDate },
    });
  } catch (error) {
    console.error('Error fetching SLA performance data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
