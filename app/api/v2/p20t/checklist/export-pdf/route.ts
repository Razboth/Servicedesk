import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('P20T Checklist Report', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Pusat Pengendalian Operasional Terpadu', pageWidth / 2, 28, { align: 'center' });

    // Info section
    doc.setFontSize(10);
    let yPos = 40;

    doc.setFont('helvetica', 'bold');
    doc.text('Kategori:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(CATEGORY_LABELS[category], 45, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Tanggal:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(format(date, 'EEEE, dd MMMM yyyy', { locale: idLocale }), 45, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Shift:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(SHIFT_LABELS[shift], 45, yPos);

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Petugas:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(assignment?.user?.name || assignment?.user?.email || '-', 45, yPos);

    // Progress
    const totalItems = checklist.items.length;
    const completedItems = checklist.items.filter(
      (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED' || i.status === 'NA'
    ).length;
    const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Progress:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`${completedItems}/${totalItems} (${progress}%)`, 45, yPos);

    yPos += 12;

    // Tables for each section
    for (const section of sortedSections) {
      const sectionItems = itemsBySection[section];
      const hasTimeSlots = sectionItems.some((item) => item.template.timeSlot);

      // Section header
      const sectionLabels: Record<string, string> = {
        A: 'Section A - Awal Hari',
        B: 'Section B - Monitoring Periodik',
        C: 'Section C - Akhir Hari',
      };
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(sectionLabels[section] || `Section ${section}`, 14, yPos);
      yPos += 4;

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
            serverMetrics?.status === 'COMPLETED' ? 'V' : '',
            deviceStatus?.value || '-',
            deviceStatus?.status === 'COMPLETED' ? 'V' : '',
            atmAlarm?.value || '-',
            atmAlarm?.status === 'COMPLETED' ? 'V' : '',
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [['Jam', 'Server Cautions', 'V', 'Device Down', 'V', 'ATM Alarm', 'V']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 25, halign: 'center' },
            2: { cellWidth: 10, halign: 'center' },
            3: { cellWidth: 25, halign: 'center' },
            4: { cellWidth: 10, halign: 'center' },
            5: { cellWidth: 25, halign: 'center' },
            6: { cellWidth: 10, halign: 'center' },
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        // Regular table for Section A and C
        const tableData = sectionItems.map((item, index) => {
          const statusSymbol = item.status === 'COMPLETED' ? 'V' : item.status === 'SKIPPED' ? 'S' : item.status === 'NA' ? 'N/A' : '';
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
          headStyles: { fillColor: [66, 139, 202], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 40 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 40 },
          },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Check if we need a new page
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
    }

    // Footer with timestamp
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Dicetak pada: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}`,
      14,
      footerY
    );
    doc.text('Bank SulutGo - P20T System', pageWidth - 14, footerY, { align: 'right' });

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
