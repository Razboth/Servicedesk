import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfMonth,
  endOfMonth,
  format,
  differenceInHours,
  eachMonthOfInterval,
} from 'date-fns';

// GET /api/reports/quarterly - Get comprehensive quarterly report data
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const quarter = parseInt(searchParams.get('quarter') || (Math.ceil((new Date().getMonth() + 1) / 3)).toString());

    // Calculate quarter date range
    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStart = new Date(year, quarterStartMonth, 1);
    const quarterEnd = endOfQuarter(quarterStart);

    // Previous quarter for comparison
    const prevQuarterStart = startOfQuarter(subQuarters(quarterStart, 1));
    const prevQuarterEnd = endOfQuarter(prevQuarterStart);

    // Build filters based on user role
    const userRole = session.user.role;
    const userBranchId = session.user.branchId;
    let branchFilter: any = {};
    if (userRole === 'MANAGER' && userBranchId) {
      branchFilter = { branchId: userBranchId };
    }

    // Fetch current quarter tickets
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: quarterStart, lte: quarterEnd },
        ...branchFilter,
      },
      include: {
        service: {
          include: {
            tier1Category: { select: { id: true, name: true } },
            serviceCategory: { select: { id: true, name: true } },
          },
        },
        branch: { select: { id: true, name: true, code: true } },
        assignedTo: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Fetch previous quarter tickets for comparison
    const prevTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: prevQuarterStart, lte: prevQuarterEnd },
        ...branchFilter,
      },
      select: { id: true, status: true, resolvedAt: true, createdAt: true },
    });

    // ============ SUMMARY STATS ============
    const totalTickets = tickets.length;
    const prevTotalTickets = prevTickets.length;
    const ticketGrowth = prevTotalTickets > 0
      ? ((totalTickets - prevTotalTickets) / prevTotalTickets) * 100
      : 0;

    const resolvedTickets = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');
    const openTickets = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    const resolutionRate = totalTickets > 0 ? (resolvedTickets.length / totalTickets) * 100 : 0;

    // Average resolution time (in hours)
    const ticketsWithResolution = tickets.filter((t) => t.resolvedAt);
    const avgResolutionHours = ticketsWithResolution.length > 0
      ? ticketsWithResolution.reduce((sum, t) => {
          return sum + differenceInHours(new Date(t.resolvedAt!), new Date(t.createdAt));
        }, 0) / ticketsWithResolution.length
      : 0;

    // ============ STATUS DISTRIBUTION ============
    const statusCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    }
    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count, percentage: (count / totalTickets) * 100 }))
      .sort((a, b) => b.count - a.count);

    // ============ PRIORITY DISTRIBUTION ============
    const priorityCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      priorityCounts[ticket.priority] = (priorityCounts[ticket.priority] || 0) + 1;
    }
    const priorityDistribution = Object.entries(priorityCounts)
      .map(([priority, count]) => ({ priority, count, percentage: (count / totalTickets) * 100 }))
      .sort((a, b) => {
        const order = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        return order.indexOf(a.priority) - order.indexOf(b.priority);
      });

    // ============ CATEGORY BREAKDOWN ============
    const categoryCounts: Record<string, { name: string; count: number }> = {};
    for (const ticket of tickets) {
      const catId = ticket.service?.tier1Category?.id || ticket.service?.serviceCategory?.id || '__UNCATEGORIZED__';
      const catName = ticket.service?.tier1Category?.name || ticket.service?.serviceCategory?.name || 'Uncategorized';
      if (!categoryCounts[catId]) {
        categoryCounts[catId] = { name: catName, count: 0 };
      }
      categoryCounts[catId].count++;
    }
    const categoryBreakdown = Object.entries(categoryCounts)
      .map(([id, data]) => ({
        categoryId: id,
        categoryName: data.name,
        count: data.count,
        percentage: (data.count / totalTickets) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // ============ BRANCH BREAKDOWN ============
    const branchCounts: Record<string, { name: string; code: string; count: number; categories: Record<string, number> }> = {};
    for (const ticket of tickets) {
      const branchId = ticket.branchId || '__NO_BRANCH__';
      const branchName = ticket.branch?.name || 'No Branch';
      const branchCode = ticket.branch?.code || '-';
      const catName = ticket.service?.tier1Category?.name || ticket.service?.serviceCategory?.name || 'Uncategorized';

      if (!branchCounts[branchId]) {
        branchCounts[branchId] = { name: branchName, code: branchCode, count: 0, categories: {} };
      }
      branchCounts[branchId].count++;
      branchCounts[branchId].categories[catName] = (branchCounts[branchId].categories[catName] || 0) + 1;
    }

    const branchBreakdown = Object.entries(branchCounts)
      .map(([id, data]) => ({
        branchId: id,
        branchName: data.name,
        branchCode: data.code,
        totalTickets: data.count,
        percentage: (data.count / totalTickets) * 100,
        categories: Object.entries(data.categories)
          .map(([name, count]) => ({ categoryName: name, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.totalTickets - a.totalTickets);

    // ============ TOP TECHNICIANS ============
    const techCounts: Record<string, { name: string; resolved: number; assigned: number }> = {};
    for (const ticket of tickets) {
      if (ticket.assignedTo) {
        const techId = ticket.assignedTo.id;
        if (!techCounts[techId]) {
          techCounts[techId] = { name: ticket.assignedTo.name || 'Unknown', resolved: 0, assigned: 0 };
        }
        techCounts[techId].assigned++;
        if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
          techCounts[techId].resolved++;
        }
      }
    }
    const topTechnicians = Object.entries(techCounts)
      .map(([id, data]) => ({
        technicianId: id,
        technicianName: data.name,
        assignedTickets: data.assigned,
        resolvedTickets: data.resolved,
        resolutionRate: data.assigned > 0 ? (data.resolved / data.assigned) * 100 : 0,
      }))
      .sort((a, b) => b.resolvedTickets - a.resolvedTickets)
      .slice(0, 10);

    // ============ MONTHLY TREND ============
    const monthsInQuarter = eachMonthOfInterval({ start: quarterStart, end: quarterEnd });
    const monthlyTrend = monthsInQuarter.map((monthDate) => {
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      const monthTickets = tickets.filter((t) => {
        const created = new Date(t.createdAt);
        return created >= monthStart && created <= monthEnd;
      });
      const monthResolved = monthTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED');

      return {
        month: format(monthDate, 'MMM yyyy'),
        monthNum: monthDate.getMonth() + 1,
        total: monthTickets.length,
        resolved: monthResolved.length,
        open: monthTickets.length - monthResolved.length,
      };
    });

    // ============ SLA METRICS ============
    // Assuming SLA is 24 hours for now (can be customized)
    const slaHours = 24;
    const ticketsWithinSLA = ticketsWithResolution.filter((t) => {
      const resolutionHours = differenceInHours(new Date(t.resolvedAt!), new Date(t.createdAt));
      return resolutionHours <= slaHours;
    });
    const slaComplianceRate = ticketsWithResolution.length > 0
      ? (ticketsWithinSLA.length / ticketsWithResolution.length) * 100
      : 0;

    // ============ OVERDUE TICKETS ============
    const overdueTickets = openTickets.filter((t) => {
      const hoursOpen = differenceInHours(new Date(), new Date(t.createdAt));
      return hoursOpen > slaHours;
    });

    return NextResponse.json({
      success: true,
      data: {
        period: {
          year,
          quarter,
          quarterLabel: `Q${quarter} ${year}`,
          startDate: quarterStart.toISOString(),
          endDate: quarterEnd.toISOString(),
        },
        summary: {
          totalTickets,
          resolvedTickets: resolvedTickets.length,
          openTickets: openTickets.length,
          overdueTickets: overdueTickets.length,
          resolutionRate: Math.round(resolutionRate * 10) / 10,
          avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
          slaComplianceRate: Math.round(slaComplianceRate * 10) / 10,
          comparison: {
            prevQuarterTickets: prevTotalTickets,
            ticketGrowth: Math.round(ticketGrowth * 10) / 10,
          },
        },
        statusDistribution,
        priorityDistribution,
        categoryBreakdown,
        branchBreakdown,
        topTechnicians,
        monthlyTrend,
      },
    });
  } catch (error) {
    console.error('Error fetching quarterly report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
