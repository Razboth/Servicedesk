import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';

interface ExecutiveSummaryData {
  period: { month: number; year: number; label: string };
  summary: {
    totalTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    openTickets: number;
    inProgressTickets: number;
    pendingTickets: number;
    avgResolutionHours: number;
    slaCompliancePercent: number;
    firstResponseAvgHours: number;
  };
  comparison: {
    ticketChange: number;
    slaChange: number;
    resolutionTimeChange: number;
  };
  byStatus: Array<{ status: string; count: number; percentage: number }>;
  byPriority: Array<{ priority: string; count: number; avgHours: number; slaCompliance: number }>;
  byService: Array<{ name: string; count: number; percentage: number }>;
  byCategory: Array<{ category: string; count: number; percentage: number }>;
  dailyTrend: Array<{ date: string; count: number; resolved: number }>;
  topPerformers: Array<{
    name: string;
    totalTickets: number;
    resolvedTickets: number;
    avgResolutionHours: number;
    slaCompliance: number;
  }>;
  topServices: Array<{ name: string; count: number; percentage: number }>;
  highlights: string[];
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Terbuka',
  PENDING_APPROVAL: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  IN_PROGRESS: 'Sedang Dikerjakan',
  PENDING_VENDOR: 'Menunggu Vendor',
  RESOLVED: 'Selesai',
  CLOSED: 'Ditutup',
  CANCELLED: 'Dibatalkan',
  PENDING: 'Tertunda',
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Rendah',
  MEDIUM: 'Sedang',
  HIGH: 'Tinggi',
  CRITICAL: 'Kritis',
  EMERGENCY: 'Darurat',
};

const SLA_TARGETS: Record<string, number> = {
  CRITICAL: 4,
  EMERGENCY: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1));
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()));

    // Calculate date ranges
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = new Date(prevYear, prevMonth - 1, 1);
    const prevEndDate = new Date(prevYear, prevMonth, 0, 23, 59, 59, 999);

    // Get all tickets for the month
    const tickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        service: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
        slaTracking: true,
      },
    });

    // Get previous month tickets for comparison
    const prevMonthTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: prevStartDate, lte: prevEndDate },
      },
      select: {
        id: true,
        status: true,
        priority: true,
        createdAt: true,
        resolvedAt: true,
        slaTracking: true,
      },
    });

    // Calculate current month stats
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
    const pendingTickets = tickets.filter(t =>
      ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'].includes(t.status)
    ).length;

    // Calculate resolution time and SLA compliance
    let totalResolutionHours = 0;
    let resolvedWithTimeCount = 0;
    let slaCompliantCount = 0;
    let totalFirstResponseHours = 0;
    let firstResponseCount = 0;

    for (const ticket of tickets) {
      if (ticket.resolvedAt) {
        const hours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
        totalResolutionHours += hours;
        resolvedWithTimeCount++;

        const slaTarget = SLA_TARGETS[ticket.priority] || 24;
        if (hours <= slaTarget) {
          slaCompliantCount++;
        }
      }

      // First response tracking
      if (ticket.firstResponseAt) {
        const responseHours = calculateBusinessHours(ticket.createdAt, ticket.firstResponseAt);
        totalFirstResponseHours += responseHours;
        firstResponseCount++;
      }
    }

    const avgResolutionHours = resolvedWithTimeCount > 0 ? totalResolutionHours / resolvedWithTimeCount : 0;
    const slaCompliancePercent = resolvedWithTimeCount > 0 ? (slaCompliantCount / resolvedWithTimeCount) * 100 : 0;
    const firstResponseAvgHours = firstResponseCount > 0 ? totalFirstResponseHours / firstResponseCount : 0;

    // Previous month stats for comparison
    let prevTotalTickets = prevMonthTickets.length;
    let prevResolvedWithTime = 0;
    let prevSlaCompliant = 0;
    let prevTotalResolutionHours = 0;

    for (const ticket of prevMonthTickets) {
      if (ticket.resolvedAt) {
        const hours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
        prevTotalResolutionHours += hours;
        prevResolvedWithTime++;

        const slaTarget = SLA_TARGETS[ticket.priority] || 24;
        if (hours <= slaTarget) {
          prevSlaCompliant++;
        }
      }
    }

    const prevSlaCompliance = prevResolvedWithTime > 0 ? (prevSlaCompliant / prevResolvedWithTime) * 100 : 0;
    const prevAvgResolution = prevResolvedWithTime > 0 ? prevTotalResolutionHours / prevResolvedWithTime : 0;

    // Comparison calculations
    const ticketChange = prevTotalTickets > 0 ? ((totalTickets - prevTotalTickets) / prevTotalTickets) * 100 : 0;
    const slaChange = prevSlaCompliance > 0 ? slaCompliancePercent - prevSlaCompliance : 0;
    const resolutionTimeChange = prevAvgResolution > 0 ? ((avgResolutionHours - prevAvgResolution) / prevAvgResolution) * 100 : 0;

    // By Status
    const statusCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    }
    const byStatus = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status: STATUS_LABELS[status] || status,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By Priority with SLA compliance
    const priorityStats: Record<string, { count: number; totalHours: number; resolvedCount: number; slaCompliant: number }> = {};
    for (const ticket of tickets) {
      if (!priorityStats[ticket.priority]) {
        priorityStats[ticket.priority] = { count: 0, totalHours: 0, resolvedCount: 0, slaCompliant: 0 };
      }
      priorityStats[ticket.priority].count++;

      if (ticket.resolvedAt) {
        const hours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
        priorityStats[ticket.priority].totalHours += hours;
        priorityStats[ticket.priority].resolvedCount++;

        const slaTarget = SLA_TARGETS[ticket.priority] || 24;
        if (hours <= slaTarget) {
          priorityStats[ticket.priority].slaCompliant++;
        }
      }
    }

    const byPriority = Object.entries(priorityStats)
      .map(([priority, stats]) => ({
        priority: PRIORITY_LABELS[priority] || priority,
        count: stats.count,
        avgHours: stats.resolvedCount > 0 ? Math.round((stats.totalHours / stats.resolvedCount) * 10) / 10 : 0,
        slaCompliance: stats.resolvedCount > 0 ? Math.round((stats.slaCompliant / stats.resolvedCount) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // By Service
    const serviceCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      const serviceName = ticket.service?.name || 'Tidak Dikategorikan';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    }
    const byService = Object.entries(serviceCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Get tier1 categories for breakdown
    const categoryTickets = await prisma.ticket.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        service: {
          include: {
            tier1Category: { select: { name: true } },
          },
        },
      },
    });

    const categoryCounts: Record<string, number> = {};
    for (const ticket of categoryTickets) {
      const categoryName = ticket.service?.tier1Category?.name || 'Tidak Dikategorikan';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    }
    const byCategory = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily Trend
    const dailyTrend: Array<{ date: string; count: number; resolved: number }> = [];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month - 1, day);
      const dayStr = dayDate.toISOString().split('T')[0];

      const dayTickets = tickets.filter(t => {
        const ticketDate = new Date(t.createdAt);
        return ticketDate.getDate() === day;
      });

      const dayResolved = tickets.filter(t => {
        if (!t.resolvedAt) return false;
        const resolvedDate = new Date(t.resolvedAt);
        return resolvedDate.getFullYear() === year &&
               resolvedDate.getMonth() === month - 1 &&
               resolvedDate.getDate() === day;
      });

      dailyTrend.push({
        date: dayStr,
        count: dayTickets.length,
        resolved: dayResolved.length,
      });
    }

    // Top Performers (Technicians)
    const technicianStats: Record<string, {
      name: string;
      totalTickets: number;
      resolvedTickets: number;
      totalHours: number;
      slaCompliant: number
    }> = {};

    for (const ticket of tickets) {
      if (ticket.assignedTo) {
        const techId = ticket.assignedTo.id;
        if (!technicianStats[techId]) {
          technicianStats[techId] = {
            name: ticket.assignedTo.name,
            totalTickets: 0,
            resolvedTickets: 0,
            totalHours: 0,
            slaCompliant: 0,
          };
        }
        technicianStats[techId].totalTickets++;

        if (ticket.resolvedAt) {
          technicianStats[techId].resolvedTickets++;
          const hours = calculateBusinessHours(ticket.createdAt, ticket.resolvedAt);
          technicianStats[techId].totalHours += hours;

          const slaTarget = SLA_TARGETS[ticket.priority] || 24;
          if (hours <= slaTarget) {
            technicianStats[techId].slaCompliant++;
          }
        }
      }
    }

    const topPerformers = Object.values(technicianStats)
      .map(tech => ({
        name: tech.name,
        totalTickets: tech.totalTickets,
        resolvedTickets: tech.resolvedTickets,
        avgResolutionHours: tech.resolvedTickets > 0
          ? Math.round((tech.totalHours / tech.resolvedTickets) * 10) / 10
          : 0,
        slaCompliance: tech.resolvedTickets > 0
          ? Math.round((tech.slaCompliant / tech.resolvedTickets) * 1000) / 10
          : 0,
      }))
      .sort((a, b) => b.resolvedTickets - a.resolvedTickets)
      .slice(0, 10);

    // Top Services
    const topServices = byService.slice(0, 10);

    // Generate Highlights
    const highlights: string[] = [];

    // Ticket volume change
    if (ticketChange > 0) {
      highlights.push(`Peningkatan tiket ${Math.abs(ticketChange).toFixed(1)}% dibanding bulan lalu (${prevTotalTickets} → ${totalTickets})`);
    } else if (ticketChange < 0) {
      highlights.push(`Penurunan tiket ${Math.abs(ticketChange).toFixed(1)}% dibanding bulan lalu (${prevTotalTickets} → ${totalTickets})`);
    }

    // SLA compliance
    if (slaCompliancePercent >= 90) {
      highlights.push(`SLA compliance sangat baik: ${slaCompliancePercent.toFixed(1)}%`);
    } else if (slaCompliancePercent >= 75) {
      highlights.push(`SLA compliance baik: ${slaCompliancePercent.toFixed(1)}%`);
    } else if (slaCompliancePercent < 75) {
      highlights.push(`Perhatian: SLA compliance ${slaCompliancePercent.toFixed(1)}% perlu ditingkatkan`);
    }

    // SLA change
    if (slaChange > 0) {
      highlights.push(`SLA compliance meningkat ${slaChange.toFixed(1)}% dari bulan lalu`);
    } else if (slaChange < -5) {
      highlights.push(`Perhatian: SLA compliance menurun ${Math.abs(slaChange).toFixed(1)}% dari bulan lalu`);
    }

    // Top service issue
    if (topServices.length > 0 && topServices[0].percentage > 20) {
      highlights.push(`Layanan paling banyak: ${topServices[0].name} (${topServices[0].percentage}%)`);
    }

    // Resolution time
    if (avgResolutionHours > 0) {
      highlights.push(`Rata-rata waktu penyelesaian: ${avgResolutionHours.toFixed(1)} jam`);
    }

    // Top performer
    if (topPerformers.length > 0) {
      highlights.push(`Top performer: ${topPerformers[0].name} dengan ${topPerformers[0].resolvedTickets} tiket selesai`);
    }

    // Critical tickets
    const criticalTickets = tickets.filter(t => ['CRITICAL', 'EMERGENCY'].includes(t.priority));
    if (criticalTickets.length > 0) {
      const criticalResolved = criticalTickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      highlights.push(`Tiket kritis/darurat: ${criticalTickets.length} (${criticalResolved.length} selesai)`);
    }

    const data: ExecutiveSummaryData = {
      period: {
        month,
        year,
        label: `${MONTH_NAMES[month - 1]} ${year}`,
      },
      summary: {
        totalTickets,
        resolvedTickets,
        closedTickets,
        openTickets,
        inProgressTickets,
        pendingTickets,
        avgResolutionHours: Math.round(avgResolutionHours * 10) / 10,
        slaCompliancePercent: Math.round(slaCompliancePercent * 10) / 10,
        firstResponseAvgHours: Math.round(firstResponseAvgHours * 10) / 10,
      },
      comparison: {
        ticketChange: Math.round(ticketChange * 10) / 10,
        slaChange: Math.round(slaChange * 10) / 10,
        resolutionTimeChange: Math.round(resolutionTimeChange * 10) / 10,
      },
      byStatus,
      byPriority,
      byService,
      byCategory,
      dailyTrend,
      topPerformers,
      topServices,
      highlights,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching executive summary:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to fetch executive summary' },
      { status: 500 }
    );
  }
}
