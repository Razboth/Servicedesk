import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Category labels in Indonesian
const categoryLabels: Record<string, string> = {
  SYSTEM_MONITORING: 'Pemantauan Sistem',
  TICKET_MANAGEMENT: 'Manajemen Tiket',
  HANDOVER_TASKS: 'Serah Terima',
};

// Status labels in Indonesian
const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu',
  IN_PROGRESS: 'Sedang Dikerjakan',
  COMPLETED: 'Selesai',
  SKIPPED: 'Dilewati',
};

// GET /api/shifts/[assignmentId]/report/export - Export shift report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';

    // Verify the shift assignment exists
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: {
          include: { user: true, branch: true },
        },
        schedule: true,
        shiftReport: {
          include: {
            checklistItems: {
              orderBy: [{ category: 'asc' }, { order: 'asc' }],
            },
            serverMetrics: true,
          },
        },
      },
    });

    if (!shiftAssignment) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only export your own shift reports' },
        { status: 403 }
      );
    }

    if (!shiftAssignment.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    const report = shiftAssignment.shiftReport;
    const metrics = report.serverMetrics;

    // Build export data
    const exportData = {
      reportInfo: {
        id: report.id,
        status: report.status,
        startedAt: report.startedAt,
        completedAt: report.completedAt,
      },
      shiftInfo: {
        date: shiftAssignment.date,
        shiftType: shiftAssignment.shiftType,
        technician: shiftAssignment.staffProfile.user.name,
        branch: shiftAssignment.staffProfile.branch?.name || 'N/A',
      },
      serverMetrics: metrics
        ? {
            cpu: {
              usagePercent: metrics.cpuUsagePercent,
              cores: metrics.cpuCores,
              loadAvg: [metrics.cpuLoadAvg1m, metrics.cpuLoadAvg5m, metrics.cpuLoadAvg15m],
            },
            ram: {
              totalGB: metrics.ramTotalGB,
              usedGB: metrics.ramUsedGB,
              usagePercent: metrics.ramUsagePercent,
            },
            disk: {
              totalGB: metrics.diskTotalGB,
              usedGB: metrics.diskUsedGB,
              usagePercent: metrics.diskUsagePercent,
            },
            network: {
              inBytesPerSec: metrics.networkInBytesPerSec,
              outBytesPerSec: metrics.networkOutBytesPerSec,
            },
            uptime: {
              seconds: metrics.uptimeSeconds,
              days: metrics.uptimeSeconds ? Math.floor(metrics.uptimeSeconds / 86400) : null,
            },
            collectedAt: metrics.collectedAt,
          }
        : null,
      checklist: report.checklistItems.map((item) => ({
        category: categoryLabels[item.category] || item.category,
        title: item.title,
        description: item.description,
        status: statusLabels[item.status] || item.status,
        isRequired: item.isRequired,
        completedAt: item.completedAt,
        notes: item.notes,
      })),
      summary: {
        summary: report.summary,
        handoverNotes: report.handoverNotes,
        issuesEncountered: report.issuesEncountered,
        pendingActions: report.pendingActions,
      },
      stats: {
        total: report.checklistItems.length,
        completed: report.checklistItems.filter((i) => i.status === 'COMPLETED').length,
        pending: report.checklistItems.filter((i) => i.status === 'PENDING').length,
        skipped: report.checklistItems.filter((i) => i.status === 'SKIPPED').length,
      },
    };

    // Return based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
      });
    }

    // For xlsx/pdf, return data that can be processed by frontend
    return NextResponse.json({
      success: true,
      format,
      data: exportData,
      // Flattened data for Excel export
      excelData: [
        {
          title: 'Informasi Laporan',
          rows: [
            ['ID Laporan', report.id],
            ['Status', report.status],
            ['Tanggal Shift', new Date(shiftAssignment.date).toLocaleDateString('id-ID')],
            ['Jenis Shift', shiftAssignment.shiftType],
            ['Teknisi', shiftAssignment.staffProfile.user.name],
            ['Cabang', shiftAssignment.staffProfile.branch?.name || 'N/A'],
            ['Waktu Mulai', new Date(report.startedAt).toLocaleString('id-ID')],
            ['Waktu Selesai', report.completedAt ? new Date(report.completedAt).toLocaleString('id-ID') : '-'],
          ],
        },
        {
          title: 'Metrik Server',
          rows: metrics
            ? [
                ['CPU Usage', `${metrics.cpuUsagePercent?.toFixed(1) || '-'}%`],
                ['RAM Usage', `${metrics.ramUsagePercent?.toFixed(1) || '-'}%`],
                ['Disk Usage', `${metrics.diskUsagePercent?.toFixed(1) || '-'}%`],
                ['Uptime', metrics.uptimeSeconds ? `${Math.floor(metrics.uptimeSeconds / 86400)} hari` : '-'],
                ['Waktu Pengambilan', new Date(metrics.collectedAt).toLocaleString('id-ID')],
              ]
            : [['Status', 'Laporan metrik tidak tersedia']],
        },
        {
          title: 'Daftar Periksa',
          headers: ['Kategori', 'Item', 'Status', 'Wajib', 'Catatan'],
          rows: report.checklistItems.map((item) => [
            categoryLabels[item.category] || item.category,
            item.title,
            statusLabels[item.status] || item.status,
            item.isRequired ? 'Ya' : 'Tidak',
            item.notes || '-',
          ]),
        },
        {
          title: 'Ringkasan',
          rows: [
            ['Ringkasan', report.summary || '-'],
            ['Catatan Serah Terima', report.handoverNotes || '-'],
            ['Masalah yang Ditemui', report.issuesEncountered || '-'],
            ['Tindakan Tertunda', report.pendingActions || '-'],
          ],
        },
      ],
    });
  } catch (error) {
    console.error('Error exporting shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
