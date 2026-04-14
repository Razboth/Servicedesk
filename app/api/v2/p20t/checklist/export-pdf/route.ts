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

        // Fetch and display detail data for EACH time slot
        const [year, month, day] = dateStr.split('-').map(Number);
        const marginMs = 5 * 60 * 1000; // 5 minute margin

        // Loop through each time slot and show details
        for (const timeSlot of timeSlots) {
          const [hours, minutes] = (timeSlot as string).split(':').map(Number);

          // Handle night shift time slots that span midnight
          let targetDay = day;
          if (shift === 'NIGHT' && hours < 12) {
            // For 00:00, 02:00, 04:00, 06:00, 08:00 - these are next day
            targetDay = day + 1;
          }

          const targetTime = new Date(year, month - 1, targetDay, hours, minutes, 0, 0);
          const marginStart = new Date(targetTime.getTime() - marginMs);
          const marginEnd = new Date(targetTime.getTime() + marginMs);

          // Check if any monitoring item for this time slot has a non-zero value
          const slotItems = sectionItems.filter((item) => item.template.timeSlot === timeSlot);
          const hasIssues = slotItems.some((item) => {
            const val = parseInt(item.value || '0', 10);
            return val > 0;
          });

          // Only show detail section if there are issues at this time slot
          if (!hasIssues) continue;

          // Check if we need a new page
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }

          // Time slot header
          doc.setFillColor(...BSG_GRAY);
          doc.rect(14, yPos - 4, pageWidth - 28, 6, 'F');
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(255, 255, 255);
          doc.text(`Detail Jam ${timeSlot}`, 16, yPos);
          doc.setTextColor(0, 0, 0);
          yPos += 5;

          // Server Metrics Detail for this time slot
          const serverCollection = await prisma.serverMetricCollectionV2.findFirst({
            where: { createdAt: { gte: marginStart, lte: marginEnd } },
            orderBy: { createdAt: 'desc' },
            include: {
              snapshots: {
                where: { status: { in: ['CAUTION', 'WARNING'] } },
                orderBy: [{ status: 'asc' }, { serverName: 'asc' }],
              },
            },
          });

          if (serverCollection && serverCollection.snapshots.length > 0) {
            doc.setFillColor(255, 152, 0); // Orange for server
            doc.rect(14, yPos - 2, pageWidth - 28, 5, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`Server Metrics (${serverCollection.snapshots.length})`, 16, yPos + 2);
            doc.setTextColor(0, 0, 0);
            yPos += 5;

            const serverData = serverCollection.snapshots.map((s, i) => [
              String(i + 1),
              s.serverName,
              s.instance,
              `${s.cpuPercent.toFixed(1)}%`,
              `${s.memoryPercent.toFixed(1)}%`,
              `${s.storagePercent.toFixed(1)}%`,
              s.status,
            ]);

            autoTable(doc, {
              startY: yPos,
              head: [['No', 'Server', 'Instance', 'CPU', 'Memory', 'Storage', 'Status']],
              body: serverData,
              theme: 'grid',
              headStyles: { fillColor: [255, 152, 0], fontSize: 6, fontStyle: 'bold' },
              bodyStyles: { fontSize: 6 },
              alternateRowStyles: { fillColor: [255, 248, 225] },
              columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 32 },
                3: { cellWidth: 16, halign: 'center' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 16, halign: 'center' },
                6: { cellWidth: 16, halign: 'center' },
              },
              margin: { left: 14, right: 14 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 3;
          }

          // Device Status Detail for this time slot
          const deviceCollection = await prisma.deviceStatusCollection.findFirst({
            where: { createdAt: { gte: marginStart, lte: marginEnd } },
            orderBy: { createdAt: 'desc' },
            include: {
              snapshots: {
                where: { status: 'DOWN' },
                orderBy: [{ groupName: 'asc' }, { serviceName: 'asc' }],
              },
            },
          });

          if (deviceCollection && deviceCollection.snapshots.length > 0) {
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFillColor(244, 67, 54); // Red for down devices
            doc.rect(14, yPos - 2, pageWidth - 28, 5, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`Device Down (${deviceCollection.snapshots.length})`, 16, yPos + 2);
            doc.setTextColor(0, 0, 0);
            yPos += 5;

            const deviceData = deviceCollection.snapshots.map((s, i) => [
              String(i + 1),
              s.groupName,
              s.serviceName,
            ]);

            autoTable(doc, {
              startY: yPos,
              head: [['No', 'Group', 'Service']],
              body: deviceData,
              theme: 'grid',
              headStyles: { fillColor: [244, 67, 54], fontSize: 6, fontStyle: 'bold' },
              bodyStyles: { fontSize: 6 },
              alternateRowStyles: { fillColor: [255, 235, 238] },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 90 },
              },
              margin: { left: 14, right: 14 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 3;
          }

          // ATM Alarm Detail for this time slot
          const atmSnapshot = await prisma.atmAlarmSnapshot.findFirst({
            where: { timestamp: { gte: marginStart, lte: marginEnd } },
            orderBy: { timestamp: 'desc' },
            include: {
              alarmHistory: {
                orderBy: [{ deviceId: 'asc' }],
                include: { device: { select: { deviceId: true, location: true } } },
              },
            },
          });

          if (atmSnapshot && atmSnapshot.alarmHistory.length > 0) {
            if (yPos > 250) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFillColor(156, 39, 176); // Purple for ATM
            doc.rect(14, yPos - 2, pageWidth - 28, 5, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text(`ATM Alarm (${atmSnapshot.alarmHistory.length})`, 16, yPos + 2);
            doc.setTextColor(0, 0, 0);
            yPos += 5;

            const atmData = atmSnapshot.alarmHistory.map((a, i) => [
              String(i + 1),
              a.deviceId,
              a.location || a.device?.location || '-',
              a.alarmType,
            ]);

            autoTable(doc, {
              startY: yPos,
              head: [['No', 'Device ID', 'Location', 'Alarm Type']],
              body: atmData,
              theme: 'grid',
              headStyles: { fillColor: [156, 39, 176], fontSize: 6, fontStyle: 'bold' },
              bodyStyles: { fontSize: 6 },
              alternateRowStyles: { fillColor: [243, 229, 245] },
              columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 28 },
                2: { cellWidth: 72 },
                3: { cellWidth: 40 },
              },
              margin: { left: 14, right: 14 },
            });
            yPos = (doc as any).lastAutoTable.finalY + 3;
          }

          yPos += 4;
        }

        yPos += 4;
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
