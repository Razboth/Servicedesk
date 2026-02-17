import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType } from '@prisma/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as fs from 'fs';
import * as path from 'path';

// Type for getting last autoTable position
interface AutoTableDoc extends jsPDF {
  lastAutoTable?: { finalY: number };
}

// Checklist type labels in Indonesian
const CHECKLIST_TYPE_LABELS: Record<DailyChecklistType, string> = {
  OPS_SIANG: 'CHECKLIST OPS SIANG',
  OPS_MALAM: 'CHECKLIST OPS MALAM',
  MONITORING_SIANG: 'CHECKLIST MONITORING SIANG',
  MONITORING_MALAM: 'CHECKLIST MONITORING MALAM',
  HARIAN: 'CHECKLIST HARIAN',
  AKHIR_HARI: 'CHECKLIST AKHIR HARI',
  SERVER_SIANG: 'CHECKLIST SERVER SIANG',
  SERVER_MALAM: 'CHECKLIST SERVER MALAM',
};

// Full checklist type descriptions
const CHECKLIST_TYPE_DESCRIPTIONS: Record<DailyChecklistType, string> = {
  OPS_SIANG: 'Checklist Operasional Shift Siang (08:00 - 20:00 WITA)',
  OPS_MALAM: 'Checklist Operasional Shift Malam (20:00 - 08:00 WITA)',
  MONITORING_SIANG: 'Checklist Monitoring Server Shift Siang (08:00 - 20:00 WITA)',
  MONITORING_MALAM: 'Checklist Monitoring Server Shift Malam (20:00 - 08:00 WITA)',
  HARIAN: 'Checklist Harian',
  AKHIR_HARI: 'Checklist Akhir Hari',
  SERVER_SIANG: 'Checklist Server Siang',
  SERVER_MALAM: 'Checklist Server Malam',
};

// Status symbols and text
const STATUS_DISPLAY: Record<string, { symbol: string; text: string }> = {
  COMPLETED: { symbol: 'V', text: 'Selesai' },
  SKIPPED: { symbol: '-', text: 'Dilewati' },
  PENDING: { symbol: ' ', text: 'Belum' },
  IN_PROGRESS: { symbol: '~', text: 'Proses' },
};

// Load BSG logo as base64
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
 * Format time to display format (HH:mm)
 */
function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '-';
  // Handle "HH:mm" format
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    return timeStr;
  }
  return timeStr;
}

/**
 * Generate PDF for a single checklist type
 */
function generateSingleChecklistPDF(
  checklist: {
    checklistType: DailyChecklistType;
    date: Date;
    status: string;
    user: { name: string | null; email: string };
    items: Array<{
      title: string;
      category: string | null;
      status: string;
      notes: string | null;
      completedAt: Date | null;
      order: number;
    }>;
  },
  logoBase64: string | null
): jsPDF {
  // A4 dimensions: 210mm x 297mm
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primaryColor: [number, number, number] = [200, 30, 30]; // BSG Red
  const darkGray: [number, number, number] = [50, 50, 50];
  const lightGray: [number, number, number] = [128, 128, 128];
  const headerBg: [number, number, number] = [240, 240, 240];

  let yPos = margin;

  // Helper function to add header on each page
  const addHeader = () => {
    // Logo (if available)
    if (logoBase64) {
      try {
        pdf.addImage(logoBase64, 'PNG', margin, 10, 40, 16);
      } catch {
        // If logo fails, continue without it
      }
    }

    // Company name and document title on right
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...lightGray);
    pdf.text('PT Bank SulutGo', pageWidth - margin, 15, { align: 'right' });
    pdf.text('ServiceDesk Operations', pageWidth - margin, 20, { align: 'right' });

    // Horizontal line under header
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 30, pageWidth - margin, 30);

    return 35;
  };

  // Add header and get starting Y position
  yPos = addHeader();

  // Document Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkGray);
  const title = CHECKLIST_TYPE_LABELS[checklist.checklistType] || checklist.checklistType;
  pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
  yPos += 8;

  // Description
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  const description = CHECKLIST_TYPE_DESCRIPTIONS[checklist.checklistType] || '';
  pdf.text(description, pageWidth / 2, yPos, { align: 'center' });
  yPos += 12;

  // Date
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkGray);
  pdf.text(formatDateIndonesian(checklist.date), pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  // Info Box
  pdf.setFillColor(...headerBg);
  pdf.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'F');

  // PIC Information
  yPos += 6;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('Penanggung Jawab (PIC):', margin + 5, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkGray);
  pdf.setFontSize(11);
  pdf.text(checklist.user.name || checklist.user.email, margin + 5, yPos + 5);

  // Progress stats
  const totalItems = checklist.items.length;
  const completedItems = checklist.items.filter(
    (item) => item.status === 'COMPLETED' || item.status === 'SKIPPED'
  ).length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('Progress:', pageWidth - margin - 45, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...darkGray);
  pdf.setFontSize(11);
  pdf.text(`${completedItems}/${totalItems} (${progress}%)`, pageWidth - margin - 45, yPos + 5);

  // Status
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...lightGray);
  pdf.text('Status:', pageWidth - margin - 45, yPos + 11);
  const statusText = checklist.status === 'COMPLETED' ? 'SELESAI' :
                     checklist.status === 'IN_PROGRESS' ? 'DALAM PROSES' : 'PENDING';
  const statusColor: [number, number, number] = checklist.status === 'COMPLETED' ? [34, 139, 34] :
                                                checklist.status === 'IN_PROGRESS' ? [255, 165, 0] : lightGray;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...statusColor);
  pdf.text(statusText, pageWidth - margin - 45, yPos + 16);

  yPos += 30;

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

  // Build table data
  const tableData: (string | number)[][] = [];

  for (const category of sortedCategories) {
    const items = itemsByCategory[category];
    for (const item of items) {
      const statusInfo = STATUS_DISPLAY[item.status] || STATUS_DISPLAY.PENDING;
      const notes = item.notes || '-';
      tableData.push([
        formatTimeDisplay(category),
        item.title,
        statusInfo.symbol,
        notes.length > 60 ? notes.substring(0, 60) + '...' : notes,
      ]);
    }
  }

  // Render items table
  pdf.setTextColor(0);
  autoTable(pdf, {
    startY: yPos,
    head: [['Waktu', 'Item Checklist', 'Status', 'Catatan']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 75 },
      2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 72 },
    },
    margin: { left: margin, right: margin, top: 35, bottom: 25 },
    didDrawPage: () => {
      // Add header on new pages
      addHeader();
    },
  });

  // Footer on all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Footer line
    pdf.setDrawColor(...lightGray);
    pdf.setLineWidth(0.3);
    pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    // Footer text
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...lightGray);
    pdf.text('Bank SulutGo ServiceDesk - Laporan Checklist Operasional', margin, pageHeight - 15);
    pdf.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
    pdf.text(`Dicetak: ${formatDateTimeWITA(new Date())}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
  }

  return pdf;
}

/**
 * GET /api/server-checklist/export
 *
 * Generates PDF for checklists on a specific date.
 *
 * Query params:
 * - date: string (YYYY-MM-DD, required)
 * - type: string (OPS_SIANG, OPS_MALAM, MONITORING_SIANG, MONITORING_MALAM, optional - if not provided, returns all)
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
    const typeParam = searchParams.get('type') as DailyChecklistType | null;

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

    // Validate type parameter if provided
    if (typeParam && !validTypes.includes(typeParam)) {
      return NextResponse.json(
        { error: 'Invalid checklist type. Valid types: OPS_SIANG, OPS_MALAM, MONITORING_SIANG, MONITORING_MALAM' },
        { status: 400 }
      );
    }

    // Fetch checklists based on type parameter
    const whereClause = typeParam
      ? { date: targetDate, checklistType: typeParam }
      : { date: targetDate, checklistType: { in: validTypes } };

    const checklists = await prisma.serverAccessDailyChecklist.findMany({
      where: whereClause,
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
      const errorMessage = typeParam
        ? `No ${typeParam} checklist data found for this date`
        : 'No checklist data found for this date';
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // Load BSG logo
    const logoBase64 = getLogoBase64();

    let pdf: jsPDF;
    let filename: string;

    if (typeParam) {
      // Single checklist type - generate single PDF
      const checklist = checklists[0];
      pdf = generateSingleChecklistPDF(checklist, logoBase64);
      const typeLabel = CHECKLIST_TYPE_LABELS[typeParam].replace(/\s+/g, '_');
      filename = `${typeLabel}_${dateParam}.pdf`;
    } else {
      // Multiple checklist types - generate combined PDF
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let isFirstChecklist = true;

      for (const checklist of checklists) {
        if (!isFirstChecklist) {
          pdf.addPage();
        }
        isFirstChecklist = false;

        // Generate single checklist content on current page
        const singlePdf = generateSingleChecklistPDF(checklist, logoBase64);

        // For combined PDF, we need to manually add content
        // This is a simplified approach - copy each page from single PDF
        const singlePageCount = singlePdf.getNumberOfPages();
        for (let p = 1; p <= singlePageCount; p++) {
          if (p > 1) {
            pdf.addPage();
          }
          // Copy the page content by re-rendering
          // Note: jsPDF doesn't support direct page copying, so we regenerate
        }
      }

      // Since direct page copying is complex, regenerate the combined PDF properly
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;

      // Colors
      const primaryColor: [number, number, number] = [200, 30, 30];
      const darkGray: [number, number, number] = [50, 50, 50];
      const lightGray: [number, number, number] = [128, 128, 128];

      let totalPages = 0;
      const pagesPerChecklist: number[] = [];

      // First pass: count pages needed for each checklist
      for (const checklist of checklists) {
        const itemCount = checklist.items.length;
        const estimatedPages = Math.ceil((itemCount * 8 + 100) / (pageHeight - 60));
        pagesPerChecklist.push(Math.max(1, estimatedPages));
        totalPages += Math.max(1, estimatedPages);
      }

      // Generate each checklist
      let currentPage = 0;
      for (let c = 0; c < checklists.length; c++) {
        const checklist = checklists[c];

        if (c > 0) {
          pdf.addPage();
        }

        // Use the single checklist generator
        const tempPdf = generateSingleChecklistPDF(checklist, logoBase64);
        const tempPageCount = tempPdf.getNumberOfPages();

        // For now, just regenerate in the main PDF
        // This is simplified - in production, consider a more sophisticated approach

        currentPage++;
      }

      // Actually, let's just use the single generator for each and handle page breaks
      // Recreate PDF properly
      pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let c = 0; c < checklists.length; c++) {
        if (c > 0) {
          pdf.addPage();
        }

        const checklist = checklists[c];
        const contentWidth = pageWidth - margin * 2;
        const headerBg: [number, number, number] = [240, 240, 240];

        let yPos = margin;

        // Header
        if (logoBase64) {
          try {
            pdf.addImage(logoBase64, 'PNG', margin, 10, 40, 16);
          } catch {
            // Continue without logo
          }
        }

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        pdf.text('PT Bank SulutGo', pageWidth - margin, 15, { align: 'right' });
        pdf.text('ServiceDesk Operations', pageWidth - margin, 20, { align: 'right' });

        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.line(margin, 30, pageWidth - margin, 30);

        yPos = 35;

        // Title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...darkGray);
        const title = CHECKLIST_TYPE_LABELS[checklist.checklistType] || checklist.checklistType;
        pdf.text(title, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        // Description
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        const description = CHECKLIST_TYPE_DESCRIPTIONS[checklist.checklistType] || '';
        pdf.text(description, pageWidth / 2, yPos, { align: 'center' });
        yPos += 12;

        // Date
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...darkGray);
        pdf.text(formatDateIndonesian(checklist.date), pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Info Box
        pdf.setFillColor(...headerBg);
        pdf.roundedRect(margin, yPos, contentWidth, 25, 2, 2, 'F');

        yPos += 6;
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        pdf.text('Penanggung Jawab (PIC):', margin + 5, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(11);
        pdf.text(checklist.user.name || checklist.user.email, margin + 5, yPos + 5);

        const totalItems = checklist.items.length;
        const completedItems = checklist.items.filter(
          (item) => item.status === 'COMPLETED' || item.status === 'SKIPPED'
        ).length;
        const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        pdf.text('Progress:', pageWidth - margin - 45, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(11);
        pdf.text(`${completedItems}/${totalItems} (${progress}%)`, pageWidth - margin - 45, yPos + 5);

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        pdf.text('Status:', pageWidth - margin - 45, yPos + 11);
        const statusText = checklist.status === 'COMPLETED' ? 'SELESAI' :
                          checklist.status === 'IN_PROGRESS' ? 'DALAM PROSES' : 'PENDING';
        const statusColor: [number, number, number] = checklist.status === 'COMPLETED' ? [34, 139, 34] :
                                                      checklist.status === 'IN_PROGRESS' ? [255, 165, 0] : lightGray;
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...statusColor);
        pdf.text(statusText, pageWidth - margin - 45, yPos + 16);

        yPos += 30;

        // Group and sort items
        const itemsByCategory: Record<string, typeof checklist.items> = {};
        for (const item of checklist.items) {
          const category = item.category || 'Umum';
          if (!itemsByCategory[category]) {
            itemsByCategory[category] = [];
          }
          itemsByCategory[category].push(item);
        }

        const sortedCategories = Object.keys(itemsByCategory).sort((a, b) => {
          const aHour = parseInt(a.split(':')[0]) || 0;
          const bHour = parseInt(b.split(':')[0]) || 0;

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

        const tableData: (string | number)[][] = [];

        for (const category of sortedCategories) {
          const items = itemsByCategory[category];
          for (const item of items) {
            const statusInfo = STATUS_DISPLAY[item.status] || STATUS_DISPLAY.PENDING;
            const notes = item.notes || '-';
            tableData.push([
              formatTimeDisplay(category),
              item.title,
              statusInfo.symbol,
              notes.length > 60 ? notes.substring(0, 60) + '...' : notes,
            ]);
          }
        }

        pdf.setTextColor(0);
        autoTable(pdf, {
          startY: yPos,
          head: [['Waktu', 'Item Checklist', 'Status', 'Catatan']],
          body: tableData,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 3,
            lineColor: [200, 200, 200],
            lineWidth: 0.1,
          },
          headStyles: {
            fillColor: primaryColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center' },
            1: { cellWidth: 75 },
            2: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: 72 },
          },
          margin: { left: margin, right: margin, top: 35, bottom: 25 },
        });
      }

      // Add footer to all pages
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);

        pdf.setDrawColor(...lightGray);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...lightGray);
        pdf.text('Bank SulutGo ServiceDesk - Laporan Checklist Operasional', margin, pageHeight - 15);
        pdf.text(`Halaman ${i} dari ${pageCount}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
        pdf.text(`Dicetak: ${formatDateTimeWITA(new Date())}`, pageWidth - margin, pageHeight - 15, { align: 'right' });
      }

      filename = `Checklist_All_${dateParam}.pdf`;
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
