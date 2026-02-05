import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType } from '@prisma/client';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: string[][];
      body?: (string | number)[][];
      theme?: string;
      styles?: Record<string, unknown>;
      headStyles?: Record<string, unknown>;
      columnStyles?: Record<number, Record<string, unknown>>;
      margin?: { left?: number; right?: number };
    }) => jsPDF;
    lastAutoTable?: { finalY: number };
  }
}

// Checklist type labels in Indonesian
const CHECKLIST_TYPE_LABELS: Record<DailyChecklistType, string> = {
  OPS_SIANG: 'Checklist Ops Siang',
  OPS_MALAM: 'Checklist Ops Malam',
  MONITORING_SIANG: 'Checklist Monitoring Siang',
  MONITORING_MALAM: 'Checklist Monitoring Malam',
  HARIAN: 'Checklist Harian',
  AKHIR_HARI: 'Checklist Akhir Hari',
  SERVER_SIANG: 'Checklist Server Siang',
  SERVER_MALAM: 'Checklist Server Malam',
};

// Status symbols
const STATUS_SYMBOLS: Record<string, string> = {
  COMPLETED: '[v]',
  SKIPPED: '[-]',
  PENDING: '[ ]',
  IN_PROGRESS: '[~]',
};

/**
 * Format date to Indonesian locale
 */
function formatDateIndonesian(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Format datetime to WITA
 */
function formatDateTimeWITA(date: Date): string {
  const witaOffset = 8 * 60; // WITA is UTC+8
  const utcTime = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const witaTime = new Date(utcTime + witaOffset * 60 * 1000);

  return witaTime.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WITA';
}

/**
 * GET /api/server-checklist/export
 *
 * Generates PDF for all checklists on a specific date.
 *
 * Query params:
 * - date: string (YYYY-MM-DD, required)
 *
 * Returns: PDF file blob
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    // Parse date
    const targetDate = new Date(dateParam + 'T00:00:00.000Z');
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Valid checklist types
    const validTypes: DailyChecklistType[] = [
      'OPS_SIANG',
      'OPS_MALAM',
      'MONITORING_SIANG',
      'MONITORING_MALAM',
    ];

    // Fetch all checklists for this date
    const checklists = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        date: targetDate,
        checklistType: {
          in: validTypes,
        },
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: [
            { category: 'asc' },
            { order: 'asc' },
          ],
        },
      },
      orderBy: {
        checklistType: 'asc',
      },
    });

    if (checklists.length === 0) {
      return NextResponse.json(
        { error: 'No checklist data found for this date' },
        { status: 404 }
      );
    }

    // Generate PDF
    const pdf = new jsPDF();
    let yPosition = 20;

    // Header
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LAPORAN CHECKLIST HARIAN', 105, yPosition, { align: 'center' });
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDateIndonesian(targetDate), 105, yPosition, { align: 'center' });
    yPosition += 15;

    // Line separator
    pdf.setDrawColor(200);
    pdf.line(20, yPosition, 190, yPosition);
    yPosition += 10;

    // Process each checklist
    for (const checklist of checklists) {
      // Check if we need a new page
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }

      // Checklist type header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 102, 204);
      pdf.text(CHECKLIST_TYPE_LABELS[checklist.checklistType] || checklist.checklistType, 20, yPosition);
      yPosition += 8;

      // Staff info
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100);
      pdf.text(`Dikerjakan oleh: ${checklist.user.name || checklist.user.email}`, 20, yPosition);
      yPosition += 6;

      // Progress stats
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.status === 'COMPLETED' || item.status === 'SKIPPED'
      ).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      pdf.text(`Progress: ${completedItems}/${totalItems} item (${progress}%)`, 20, yPosition);
      yPosition += 10;

      // Group items by category (time slot)
      const itemsByCategory: Record<string, typeof checklist.items> = {};
      for (const item of checklist.items) {
        const category = item.category || 'Umum';
        if (!itemsByCategory[category]) {
          itemsByCategory[category] = [];
        }
        itemsByCategory[category].push(item);
      }

      // Sort categories (handle night shift ordering)
      const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
        const aHour = parseInt(a.split(':')[0]) || 0;
        const bHour = parseInt(b.split(':')[0]) || 0;

        // For night checklists, 22:00 comes before 00:00
        const isNightChecklist =
          checklist.checklistType === 'OPS_MALAM' ||
          checklist.checklistType === 'MONITORING_MALAM';

        if (isNightChecklist) {
          const aAdjusted = aHour < 12 ? aHour + 24 : aHour;
          const bAdjusted = bHour < 12 ? bHour + 24 : bHour;
          return aAdjusted - bAdjusted;
        }

        return a.localeCompare(b);
      });

      // Render items table
      pdf.setTextColor(0);
      const tableData: (string | number)[][] = [];

      for (const category of sortedCategories) {
        const items = itemsByCategory[category];
        for (const item of items) {
          const status = STATUS_SYMBOLS[item.status] || '[ ]';
          const notes = item.notes || '';
          tableData.push([
            category,
            item.title,
            status,
            notes.substring(0, 50) + (notes.length > 50 ? '...' : ''),
          ]);
        }
      }

      pdf.autoTable({
        startY: yPosition,
        head: [['Waktu', 'Item', 'Status', 'Catatan']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 80 },
          2: { cellWidth: 15 },
          3: { cellWidth: 55 },
        },
        margin: { left: 20, right: 20 },
      });

      yPosition = (pdf.lastAutoTable?.finalY || yPosition) + 15;
    }

    // Footer on last page
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(
        `Halaman ${i} dari ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
      pdf.text(
        `Dicetak: ${formatDateTimeWITA(new Date())}`,
        190,
        290,
        { align: 'right' }
      );
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Checklist_${dateParam}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating checklist export:', error);
    return NextResponse.json(
      { error: 'Failed to generate checklist export' },
      { status: 500 }
    );
  }
}
