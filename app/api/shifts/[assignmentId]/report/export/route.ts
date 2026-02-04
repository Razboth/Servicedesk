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

// Daily checklist type labels
const checklistTypeLabels: Record<string, string> = {
  HARIAN: 'Checklist Harian',
  SERVER_SIANG: 'Server (Siang)',
  SERVER_MALAM: 'Server (Malam)',
  AKHIR_HARI: 'Akhir Hari',
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
            backupChecklist: {
              orderBy: { order: 'asc' },
            },
            issues: {
              orderBy: { createdAt: 'desc' },
            },
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

    const report = shiftAssignment.shiftReport;
    const metrics = report?.serverMetrics;

    // Fetch daily checklists for this user on this date
    const shiftDate = new Date(shiftAssignment.date);
    const nextDay = new Date(shiftDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const dailyChecklists = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        userId: shiftAssignment.staffProfile.userId,
        date: {
          gte: shiftDate,
          lt: nextDay,
        },
      },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        },
      },
    });

    // If no report and no daily checklists, return error
    if (!report && dailyChecklists.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada laporan atau checklist untuk diekspor' },
        { status: 404 }
      );
    }

    // Build export data
    const exportData = {
      reportInfo: report ? {
        id: report.id,
        status: report.status,
        startedAt: report.startedAt,
        completedAt: report.completedAt,
      } : {
        id: shiftAssignment.id,
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString(),
        completedAt: null,
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
      checklist: report?.checklistItems?.map((item) => ({
        category: categoryLabels[item.category] || item.category,
        title: item.title,
        description: item.description,
        status: statusLabels[item.status] || item.status,
        isRequired: item.isRequired,
        completedAt: item.completedAt,
        notes: item.notes,
      })) || [],
      summary: report ? {
        summary: report.summary,
        handoverNotes: report.handoverNotes,
        issuesEncountered: report.issuesEncountered,
        pendingActions: report.pendingActions,
      } : {
        summary: null,
        handoverNotes: null,
        issuesEncountered: null,
        pendingActions: null,
      },
      notes: report?.notes || null,
      backupChecklist: report?.backupChecklist?.map((item) => ({
        databaseName: item.databaseName,
        description: item.description,
        isChecked: item.isChecked,
        checkedAt: item.checkedAt,
        notes: item.notes,
      })) || [],
      issues: report?.issues?.map((issue) => ({
        title: issue.title,
        description: issue.description,
        status: issue.status,
        priority: issue.priority,
        resolution: issue.resolution,
        resolvedAt: issue.resolvedAt,
      })) || [],
      stats: report ? {
        total: report.checklistItems.length,
        completed: report.checklistItems.filter((i) => i.status === 'COMPLETED').length,
        pending: report.checklistItems.filter((i) => i.status === 'PENDING').length,
        skipped: report.checklistItems.filter((i) => i.status === 'SKIPPED').length,
      } : {
        total: 0,
        completed: 0,
        pending: 0,
        skipped: 0,
      },
      // Daily checklists (HARIAN, SERVER_SIANG, SERVER_MALAM, AKHIR_HARI)
      dailyChecklists: dailyChecklists.map((checklist) => ({
        type: checklist.checklistType,
        typeLabel: checklistTypeLabels[checklist.checklistType] || checklist.checklistType,
        status: checklist.status,
        completedAt: checklist.completedAt,
        items: checklist.items.map((item) => ({
          category: item.category,
          title: item.title,
          description: item.description,
          status: statusLabels[item.status] || item.status,
          isRequired: item.isRequired,
          completedAt: item.completedAt,
          notes: item.notes,
          unlockTime: item.unlockTime,
        })),
        stats: {
          total: checklist.items.length,
          completed: checklist.items.filter((i) => i.status === 'COMPLETED').length,
          pending: checklist.items.filter((i) => i.status === 'PENDING').length,
          skipped: checklist.items.filter((i) => i.status === 'SKIPPED').length,
        },
      })),
    };

    // Return based on format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: exportData,
      });
    }

    // Build excel data sheets
    const excelSheets: { title: string; headers?: string[]; rows: (string | null)[][] }[] = [
      {
        title: 'Informasi Laporan',
        rows: [
          ['ID Laporan', report?.id || shiftAssignment.id],
          ['Status', report?.status || 'IN_PROGRESS'],
          ['Tanggal Shift', new Date(shiftAssignment.date).toLocaleDateString('id-ID')],
          ['Jenis Shift', shiftAssignment.shiftType],
          ['Teknisi', shiftAssignment.staffProfile.user.name],
          ['Cabang', shiftAssignment.staffProfile.branch?.name || 'N/A'],
          ['Waktu Mulai', report?.startedAt ? new Date(report.startedAt).toLocaleString('id-ID') : '-'],
          ['Waktu Selesai', report?.completedAt ? new Date(report.completedAt).toLocaleString('id-ID') : '-'],
        ],
      },
    ];

    // Add server metrics if available
    if (metrics) {
      excelSheets.push({
        title: 'Metrik Server',
        rows: [
          ['CPU Usage', `${metrics.cpuUsagePercent?.toFixed(1) || '-'}%`],
          ['RAM Usage', `${metrics.ramUsagePercent?.toFixed(1) || '-'}%`],
          ['Disk Usage', `${metrics.diskUsagePercent?.toFixed(1) || '-'}%`],
          ['Uptime', metrics.uptimeSeconds ? `${Math.floor(metrics.uptimeSeconds / 86400)} hari` : '-'],
          ['Waktu Pengambilan', new Date(metrics.collectedAt).toLocaleString('id-ID')],
        ],
      });
    }

    // Add shift report checklist if available
    if (report && report.checklistItems.length > 0) {
      excelSheets.push({
        title: 'Daftar Periksa',
        headers: ['Kategori', 'Item', 'Status', 'Wajib', 'Catatan'],
        rows: report.checklistItems.map((item) => [
          categoryLabels[item.category] || item.category,
          item.title,
          statusLabels[item.status] || item.status,
          item.isRequired ? 'Ya' : 'Tidak',
          item.notes || '-',
        ]),
      });

      excelSheets.push({
        title: 'Ringkasan',
        rows: [
          ['Ringkasan', report.summary || '-'],
          ['Catatan Serah Terima', report.handoverNotes || '-'],
          ['Masalah yang Ditemui', report.issuesEncountered || '-'],
          ['Tindakan Tertunda', report.pendingActions || '-'],
        ],
      });
    }

    // Add daily checklists as separate sheets
    dailyChecklists.forEach((checklist) => {
      excelSheets.push({
        title: checklistTypeLabels[checklist.checklistType] || checklist.checklistType,
        headers: ['Waktu', 'Item', 'Status', 'Wajib', 'Catatan'],
        rows: checklist.items.map((item) => [
          item.unlockTime || '-',
          item.title,
          statusLabels[item.status] || item.status,
          item.isRequired ? 'Ya' : 'Tidak',
          item.notes || '-',
        ]),
      });
    });

    // For xlsx/pdf, return data that can be processed by frontend
    return NextResponse.json({
      success: true,
      format,
      data: exportData,
      excelData: excelSheets,
    });
  } catch (error) {
    console.error('Error exporting shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
