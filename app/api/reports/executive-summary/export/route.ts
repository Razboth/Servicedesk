import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateBusinessHours } from '@/lib/sla-utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as fs from 'fs';
import * as path from 'path';

interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY: number };
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

function getLogoBase64(): string | null {
  try {
    const logoPath = path.join(process.cwd(), 'public', 'logo-bsg.png');
    const logoBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error loading BSG logo:', error);
    return null;
  }
}

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
        service: {
          include: { tier1Category: { select: { name: true } } },
        },
        assignedTo: { select: { id: true, name: true } },
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
      },
    });

    // Calculate statistics
    const totalTickets = tickets.length;
    const resolvedTickets = tickets.filter(t => t.status === 'RESOLVED').length;
    const closedTickets = tickets.filter(t => t.status === 'CLOSED').length;
    const openTickets = tickets.filter(t => t.status === 'OPEN').length;
    const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;

    // Calculate resolution time and SLA compliance
    let totalResolutionHours = 0;
    let resolvedWithTimeCount = 0;
    let slaCompliantCount = 0;

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
    }

    const avgResolutionHours = resolvedWithTimeCount > 0 ? totalResolutionHours / resolvedWithTimeCount : 0;
    const slaCompliancePercent = resolvedWithTimeCount > 0 ? (slaCompliantCount / resolvedWithTimeCount) * 100 : 0;

    // Previous month stats
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
    const slaChange = slaCompliancePercent - prevSlaCompliance;

    // By Status
    const statusCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      statusCounts[ticket.status] = (statusCounts[ticket.status] || 0) + 1;
    }

    // By Priority
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

    // By Service
    const serviceCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      const serviceName = ticket.service?.name || 'Tidak Dikategorikan';
      serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
    }
    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalTickets > 0 ? Math.round((count / totalTickets) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // By Category
    const categoryCounts: Record<string, number> = {};
    for (const ticket of tickets) {
      const categoryName = ticket.service?.tier1Category?.name || 'Tidak Dikategorikan';
      categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
    }

    // Top Performers
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

    // Generate highlights
    const highlights: string[] = [];
    if (ticketChange > 0) {
      highlights.push(`Peningkatan tiket ${Math.abs(ticketChange).toFixed(1)}% dibanding bulan lalu`);
    } else if (ticketChange < 0) {
      highlights.push(`Penurunan tiket ${Math.abs(ticketChange).toFixed(1)}% dibanding bulan lalu`);
    }
    if (slaCompliancePercent >= 90) {
      highlights.push(`SLA compliance sangat baik: ${slaCompliancePercent.toFixed(1)}%`);
    } else if (slaCompliancePercent < 75) {
      highlights.push(`Perhatian: SLA compliance ${slaCompliancePercent.toFixed(1)}% perlu ditingkatkan`);
    }
    if (slaChange > 0) {
      highlights.push(`SLA compliance meningkat ${slaChange.toFixed(1)}% dari bulan lalu`);
    }
    if (topServices.length > 0 && topServices[0].percentage > 20) {
      highlights.push(`Layanan paling banyak: ${topServices[0].name} (${topServices[0].percentage}%)`);
    }
    if (avgResolutionHours > 0) {
      highlights.push(`Rata-rata waktu penyelesaian: ${avgResolutionHours.toFixed(1)} jam`);
    }
    if (topPerformers.length > 0) {
      highlights.push(`Top performer: ${topPerformers[0].name} dengan ${topPerformers[0].resolvedTickets} tiket selesai`);
    }

    // Generate PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    }) as AutoTableDoc;

    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const primaryColor: [number, number, number] = [200, 30, 30]; // BSG Red
    const darkGray: [number, number, number] = [50, 50, 50];
    const lightGray: [number, number, number] = [128, 128, 128];

    let yPos = margin;

    // Load logo
    const logoBase64 = getLogoBase64();

    // Helper to add header
    const addHeader = (isFirstPage = false) => {
      if (logoBase64) {
        try {
          pdf.addImage(logoBase64, 'PNG', margin, 10, 35, 14);
        } catch {
          // Continue without logo
        }
      }

      // Title
      pdf.setFontSize(16);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text('EXECUTIVE SUMMARY REPORT', pageWidth / 2, 18, { align: 'center' });

      pdf.setFontSize(10);
      pdf.setTextColor(...darkGray);
      pdf.setFont('helvetica', 'normal');
      pdf.text('IT Service Desk', pageWidth / 2, 24, { align: 'center' });

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Periode: ${MONTH_NAMES[month - 1]} ${year}`, pageWidth / 2, 30, { align: 'center' });

      // Horizontal line
      pdf.setDrawColor(...primaryColor);
      pdf.setLineWidth(0.5);
      pdf.line(margin, 35, pageWidth - margin, 35);

      return 42;
    };

    // Helper to add footer
    const addFooter = (pageNum: number) => {
      const footerY = 285;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

      pdf.setFontSize(8);
      pdf.setTextColor(...lightGray);
      pdf.text('Bank SulutGo IT Service Desk', margin, footerY);
      pdf.text(`Halaman ${pageNum}`, pageWidth / 2, footerY, { align: 'center' });
      pdf.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`, pageWidth - margin, footerY, { align: 'right' });
    };

    // First page header
    yPos = addHeader(true);

    // KPI Summary Section
    pdf.setFontSize(12);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RINGKASAN KINERJA', margin, yPos);
    yPos += 6;

    // KPI boxes
    const kpiBoxWidth = (contentWidth - 15) / 4;
    const kpiBoxHeight = 20;
    const kpiData = [
      { label: 'Total Tiket', value: String(totalTickets), change: ticketChange },
      { label: 'Tiket Selesai', value: String(resolvedTickets + closedTickets), change: null },
      { label: 'SLA Compliance', value: `${slaCompliancePercent.toFixed(1)}%`, change: slaChange },
      { label: 'Avg Resolusi', value: `${avgResolutionHours.toFixed(1)} jam`, change: null },
    ];

    kpiData.forEach((kpi, index) => {
      const xPos = margin + index * (kpiBoxWidth + 5);

      // Box
      pdf.setDrawColor(220, 220, 220);
      pdf.setFillColor(250, 250, 250);
      pdf.roundedRect(xPos, yPos, kpiBoxWidth, kpiBoxHeight, 2, 2, 'FD');

      // Label
      pdf.setFontSize(8);
      pdf.setTextColor(...lightGray);
      pdf.setFont('helvetica', 'normal');
      pdf.text(kpi.label, xPos + kpiBoxWidth / 2, yPos + 6, { align: 'center' });

      // Value
      pdf.setFontSize(14);
      pdf.setTextColor(...darkGray);
      pdf.setFont('helvetica', 'bold');
      pdf.text(kpi.value, xPos + kpiBoxWidth / 2, yPos + 14, { align: 'center' });

      // Change indicator
      if (kpi.change !== null) {
        const changeText = kpi.change >= 0 ? `+${kpi.change.toFixed(1)}%` : `${kpi.change.toFixed(1)}%`;
        pdf.setFontSize(7);
        pdf.setTextColor(kpi.change >= 0 ? 34 : 239, kpi.change >= 0 ? 197 : 68, kpi.change >= 0 ? 94 : 68);
        pdf.text(changeText, xPos + kpiBoxWidth / 2, yPos + 18, { align: 'center' });
      }
    });

    yPos += kpiBoxHeight + 10;

    // Status Distribution Table
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DISTRIBUSI STATUS', margin, yPos);
    yPos += 4;

    const statusData = Object.entries(statusCounts)
      .map(([status, count]) => [
        STATUS_LABELS[status] || status,
        count.toString(),
        totalTickets > 0 ? `${((count / totalTickets) * 100).toFixed(1)}%` : '0%',
      ])
      .sort((a, b) => parseInt(b[1]) - parseInt(a[1]));

    autoTable(pdf, {
      startY: yPos,
      head: [['Status', 'Jumlah', 'Persentase']],
      body: statusData,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 40, halign: 'center' },
      },
      theme: 'striped',
    });

    yPos = (pdf as AutoTableDoc).lastAutoTable?.finalY || yPos + 30;
    yPos += 8;

    // Priority Distribution
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIKET PER PRIORITAS', margin, yPos);
    yPos += 4;

    const priorityData = Object.entries(priorityStats)
      .map(([priority, stats]) => [
        PRIORITY_LABELS[priority] || priority,
        stats.count.toString(),
        stats.resolvedCount > 0 ? `${(stats.totalHours / stats.resolvedCount).toFixed(1)} jam` : '-',
        stats.resolvedCount > 0 ? `${((stats.slaCompliant / stats.resolvedCount) * 100).toFixed(1)}%` : '-',
      ])
      .sort((a, b) => parseInt(b[1]) - parseInt(a[1]));

    autoTable(pdf, {
      startY: yPos,
      head: [['Prioritas', 'Jumlah', 'Avg Resolusi', 'SLA']],
      body: priorityData,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35, halign: 'center' },
        2: { cellWidth: 45, halign: 'center' },
        3: { cellWidth: 35, halign: 'center' },
      },
      theme: 'striped',
    });

    yPos = (pdf as AutoTableDoc).lastAutoTable?.finalY || yPos + 30;
    yPos += 8;

    // Check if we need a new page
    if (yPos > 200) {
      addFooter(1);
      pdf.addPage();
      yPos = addHeader();
    }

    // Top Services
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP 10 LAYANAN', margin, yPos);
    yPos += 4;

    const serviceTableData = topServices.map((s, i) => [
      (i + 1).toString(),
      s.name.length > 40 ? s.name.slice(0, 40) + '...' : s.name,
      s.count.toString(),
      `${s.percentage}%`,
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [['#', 'Layanan', 'Jumlah', '%']],
      body: serviceTableData,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 110 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
      },
      theme: 'striped',
    });

    yPos = (pdf as AutoTableDoc).lastAutoTable?.finalY || yPos + 40;
    yPos += 8;

    // Check if we need a new page
    if (yPos > 200) {
      addFooter(pdf.getNumberOfPages());
      pdf.addPage();
      yPos = addHeader();
    }

    // Top Performers
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOP PERFORMER', margin, yPos);
    yPos += 4;

    const performerTableData = topPerformers.map((p, i) => [
      (i + 1).toString(),
      p.name,
      p.totalTickets.toString(),
      p.resolvedTickets.toString(),
      `${p.avgResolutionHours} jam`,
      `${p.slaCompliance}%`,
    ]);

    autoTable(pdf, {
      startY: yPos,
      head: [['#', 'Nama', 'Tiket', 'Selesai', 'Avg', 'SLA']],
      body: performerTableData,
      margin: { left: margin, right: margin },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 55 },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
      },
      theme: 'striped',
    });

    yPos = (pdf as AutoTableDoc).lastAutoTable?.finalY || yPos + 40;
    yPos += 10;

    // Check if we need a new page for highlights
    if (yPos > 240) {
      addFooter(pdf.getNumberOfPages());
      pdf.addPage();
      yPos = addHeader();
    }

    // Highlights Section
    pdf.setFontSize(11);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('CATATAN & HIGHLIGHTS', margin, yPos);
    yPos += 6;

    // Highlight box
    pdf.setDrawColor(...primaryColor);
    pdf.setFillColor(255, 250, 250);
    const highlightHeight = 8 + highlights.length * 6;
    pdf.roundedRect(margin, yPos, contentWidth, highlightHeight, 2, 2, 'FD');

    pdf.setFontSize(9);
    pdf.setTextColor(...darkGray);
    pdf.setFont('helvetica', 'normal');

    highlights.forEach((highlight, index) => {
      pdf.setTextColor(...primaryColor);
      pdf.text('\u2022', margin + 4, yPos + 6 + index * 6);
      pdf.setTextColor(...darkGray);
      pdf.text(highlight, margin + 10, yPos + 6 + index * 6);
    });

    // Add footer to all pages
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      addFooter(i);
    }

    // Return PDF as buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Executive-Summary-${MONTH_NAMES[month - 1]}-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating executive summary PDF:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
