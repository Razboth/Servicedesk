import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

type P20TShift = 'DAY' | 'NIGHT';
type P20TCategory = 'IT' | 'KKS' | 'ANTI_FRAUD';

const CATEGORY_LABELS: Record<P20TCategory, string> = {
  IT: 'IT',
  KKS: 'KKS',
  ANTI_FRAUD: 'Anti Fraud',
};

const SHIFT_LABELS: Record<P20TShift, string> = {
  DAY: 'Shift Siang (08:00 - 20:00)',
  NIGHT: 'Shift Malam (20:00 - 08:00)',
};

// BSG Brand Colors
const BSG_RED: [number, number, number] = [229, 57, 53]; // #E53935
const BSG_DARK_RED: [number, number, number] = [183, 28, 28]; // #B71C1C
const BSG_GRAY: [number, number, number] = [97, 97, 97]; // #616161

// GET /api/v2/p20t/checklist/export-pdf - Export checklist to PDF
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const shift = searchParams.get('shift') as P20TShift | null;
    const category = searchParams.get('category') as P20TCategory | null;

    if (!dateStr || !shift || !category) {
      return NextResponse.json(
        { error: 'Missing required parameters: date, shift, category' },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);

    // Get assignment
    const assignment = await prisma.p20TAssignment.findUnique({
      where: {
        date_shift_category: { date, shift, category },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Get checklist with items
    const checklist = await prisma.p20TDailyChecklist.findUnique({
      where: {
        date_shift_category: { date, shift, category },
      },
      include: {
        items: {
          include: {
            template: true,
            completedBy: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    // Group items by section
    const itemsBySection: Record<string, typeof checklist.items> = {};
    for (const item of checklist.items) {
      const section = item.template.section;
      if (!itemsBySection[section]) {
        itemsBySection[section] = [];
      }
      itemsBySection[section].push(item);
    }

    // Sort sections and items within each section
    const sortedSections = Object.keys(itemsBySection).sort();
    for (const section of sortedSections) {
      itemsBySection[section].sort((a, b) => a.template.orderIndex - b.template.orderIndex);
    }

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Load BSG Logo
    let logoBase64: string | null = null;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'BSG Logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = 'data:image/png;base64,' + logoBuffer.toString('base64');
    } catch (e) {
      console.warn('Could not load BSG logo:', e);
    }

    // ============ HEADER ============
    // Red header bar
    doc.setFillColor(...BSG_RED);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', 10, 5, 25, 25);
    }

    // Bank name and title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('PT BANK SULUTGO', 40, 14);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Pusat Pengendalian Operasional Terpadu (P20T)', 40, 22);

    doc.setFontSize(10);
    doc.text(`Checklist ${CATEGORY_LABELS[category]} - ${shift === 'DAY' ? 'Shift Siang' : 'Shift Malam'}`, 40, 29);

    // Reset text color
    doc.setTextColor(0, 0, 0);

    // ============ INFO BOX ============
    let yPos = 45;

    // Info box with border
    doc.setDrawColor(...BSG_RED);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, yPos - 5, pageWidth - 28, 32, 2, 2, 'S');

    // Left column
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BSG_DARK_RED);
    doc.text('Tanggal', 18, yPos + 2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(format(date, 'EEEE, dd MMMM yyyy', { locale: idLocale }), 18, yPos + 8);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BSG_DARK_RED);
    doc.text('Shift', 18, yPos + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(SHIFT_LABELS[shift], 18, yPos + 22);

    // Right column
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BSG_DARK_RED);
    doc.text('Petugas', 110, yPos + 2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(assignment?.user?.name || assignment?.user?.email || '-', 110, yPos + 8);

    // Progress
    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter(
      (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED' || i.status === 'NA'
    ).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BSG_DARK_RED);
    doc.text('Progress', 110, yPos + 16);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${completedItems}/${totalItems} item (${progress}%)`, 110, yPos + 22);

    yPos += 38;

    // ============ TABLES ============
    for (const section of sortedSections) {
      const sectionItems = itemsBySection[section];
      const hasTimeSlots = sectionItems.some((item) => item.template.timeSlot);

      // Section header with BSG color
      const sectionLabels: Record<string, string> = {
        A: 'Section A - Awal Hari',
        B: 'Section B - Monitoring Periodik',
        C: 'Section C - Akhir Hari',
      };

      doc.setFillColor(...BSG_RED);
      doc.rect(14, yPos - 4, pageWidth - 28, 7, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(sectionLabels[section] || `Section ${section}`, 16, yPos + 1);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      if (hasTimeSlots) {
        // Periodic monitoring table (Section B)
        const timeSlots = [...new Set(sectionItems.map((item) => item.template.timeSlot))].sort();
        const tableData = timeSlots.map((timeSlot) => {
          const slotItems = sectionItems.filter((item) => item.template.timeSlot === timeSlot);
          const serverMetrics = slotItems.find((item) => item.template.autoFetchType === 'SERVER_METRICS');
          const deviceStatus = slotItems.find((item) => item.template.autoFetchType === 'DEVICE_STATUS');
          const atmAlarm = slotItems.find((item) => item.template.autoFetchType === 'ATM_ALARM');

          return [
            timeSlot,
            serverMetrics?.value || '-',
            serverMetrics?.status === 'COMPLETED' ? '\u2713' : '',
            deviceStatus?.value || '-',
            deviceStatus?.status === 'COMPLETED' ? '\u2713' : '',
            atmAlarm?.value || '-',
            atmAlarm?.status === 'COMPLETED' ? '\u2713' : '',
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Jam', 'Server', '\u2713', 'Device', '\u2713', 'ATM', '\u2713']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: BSG_DARK_RED,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center',
          },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [255, 245, 245] },
          columnStyles: {
            0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 12, halign: 'center', textColor: [46, 125, 50] },
            3: { cellWidth: 22, halign: 'center' },
            4: { cellWidth: 12, halign: 'center', textColor: [46, 125, 50] },
            5: { cellWidth: 22, halign: 'center' },
            6: { cellWidth: 12, halign: 'center', textColor: [46, 125, 50] },
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      } else {
        // Regular table for Section A and C
        const tableData = sectionItems.map((item, index) => {
          const statusSymbol = item.status === 'COMPLETED' ? '\u2713' : item.status === 'SKIPPED' ? 'S' : item.status === 'NA' ? 'N/A' : '';
          const value = item.template.inputType === 'CHECKBOX' ? '' : (item.value || '-');
          const completedInfo = item.completedAt && item.completedBy
            ? `${item.completedBy.name} (${format(new Date(item.completedAt), 'HH:mm')})`
            : '';

          return [
            String(index + 1),
            item.template.title,
            value,
            statusSymbol,
            completedInfo,
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['No', 'Item', 'Nilai', 'Status', 'Diisi Oleh']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: BSG_DARK_RED,
            fontSize: 8,
            fontStyle: 'bold',
          },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [255, 245, 245] },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 55 },
            2: { cellWidth: 45 },
            3: { cellWidth: 15, halign: 'center', textColor: [46, 125, 50] },
            4: { cellWidth: 40 },
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 8;
      }

      // Check if we need a new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
    }

    // ============ FOOTER ============
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      // Footer line
      doc.setDrawColor(...BSG_RED);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);

      // Footer text
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...BSG_GRAY);
      doc.text(
        `Dicetak: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
        14,
        pageHeight - 10
      );
      doc.text(
        `Halaman ${i} dari ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...BSG_RED);
      doc.text('PT Bank SulutGo', pageWidth - 14, pageHeight - 10, { align: 'right' });
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    const filename = `P20T-${category}-${shift}-${dateStr}.pdf`;

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting P20T checklist to PDF:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
