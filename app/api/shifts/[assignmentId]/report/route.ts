import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/shifts/[assignmentId]/report - Get or create shift report
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

    // Verify the shift assignment exists and belongs to the user
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: {
          include: {
            user: true,
            branch: true,
          },
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

    // Verify ownership (unless admin)
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only access your own shift reports' },
        { status: 403 }
      );
    }

    let report = shiftAssignment.shiftReport;

    // If no report exists, create one
    if (!report) {
      // Get latest server metrics
      const latestMetrics = await prisma.serverMetrics.findFirst({
        orderBy: { collectedAt: 'desc' },
      });

      // Get checklist templates
      const templates = await prisma.shiftChecklistTemplate.findMany({
        where: {
          isActive: true,
          OR: [
            { shiftType: null },
            { shiftType: shiftAssignment.shiftType },
          ],
        },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      });

      // Get backup templates
      const backupTemplates = await prisma.shiftBackupTemplate.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });

      // Create the report with checklist items and backup checklist
      report = await prisma.shiftReport.create({
        data: {
          shiftAssignmentId: assignmentId,
          serverMetricsId: latestMetrics?.id || null,
          status: 'DRAFT',
          checklistItems: {
            create: templates.map((template) => ({
              category: template.category,
              title: template.title,
              description: template.description,
              order: template.order,
              isRequired: template.isRequired,
              status: 'PENDING',
            })),
          },
          backupChecklist: {
            create: backupTemplates.map((template) => ({
              databaseName: template.databaseName,
              description: template.description,
              order: template.order,
              isChecked: false,
            })),
          },
        },
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
      });
    }

    // Calculate stats
    const stats = {
      total: report.checklistItems.length,
      completed: report.checklistItems.filter((i) => i.status === 'COMPLETED').length,
      pending: report.checklistItems.filter((i) => i.status === 'PENDING').length,
      inProgress: report.checklistItems.filter((i) => i.status === 'IN_PROGRESS').length,
      skipped: report.checklistItems.filter((i) => i.status === 'SKIPPED').length,
      byCategory: {} as Record<string, { total: number; completed: number }>,
    };

    // Group by category
    report.checklistItems.forEach((item) => {
      if (!stats.byCategory[item.category]) {
        stats.byCategory[item.category] = { total: 0, completed: 0 };
      }
      stats.byCategory[item.category].total++;
      if (item.status === 'COMPLETED') {
        stats.byCategory[item.category].completed++;
      }
    });

    // Check metrics availability
    const metricsAvailable = report.serverMetrics !== null;
    const metricsStale = report.serverMetrics
      ? new Date().getTime() - new Date(report.serverMetrics.collectedAt).getTime() > 24 * 60 * 60 * 1000
      : false;

    // Calculate backup stats
    const backupStats = {
      total: report.backupChecklist?.length || 0,
      checked: report.backupChecklist?.filter((b) => b.isChecked).length || 0,
    };

    // Separate issues by status
    const ongoingIssues = report.issues?.filter((i) => i.status === 'ONGOING') || [];
    const resolvedIssues = report.issues?.filter((i) => i.status === 'RESOLVED') || [];

    return NextResponse.json({
      success: true,
      data: {
        report: {
          id: report.id,
          status: report.status,
          startedAt: report.startedAt,
          completedAt: report.completedAt,
          summary: report.summary,
          handoverNotes: report.handoverNotes,
          issuesEncountered: report.issuesEncountered,
          pendingActions: report.pendingActions,
          notes: report.notes,
        },
        checklistItems: report.checklistItems,
        backupChecklist: report.backupChecklist || [],
        issues: report.issues || [],
        ongoingIssues,
        resolvedIssues,
        serverMetrics: report.serverMetrics,
        metricsAvailable,
        metricsStale,
        metricsMessage: !metricsAvailable
          ? 'Laporan metrik tidak tersedia'
          : metricsStale
          ? 'Data metrik sudah tidak aktual'
          : null,
        stats,
        backupStats,
        shiftInfo: {
          date: shiftAssignment.date,
          shiftType: shiftAssignment.shiftType,
          technicianName: shiftAssignment.staffProfile.user.name,
          branchName: shiftAssignment.staffProfile.branch?.name || '-',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// PUT /api/shifts/[assignmentId]/report - Update shift report
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();

    // Verify the shift assignment exists
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
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
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    if (!shiftAssignment.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found. Please create it first.' },
        { status: 404 }
      );
    }

    // Update the report
    const updatedReport = await prisma.shiftReport.update({
      where: { id: shiftAssignment.shiftReport.id },
      data: {
        summary: body.summary !== undefined ? body.summary : undefined,
        handoverNotes: body.handoverNotes !== undefined ? body.handoverNotes : undefined,
        issuesEncountered: body.issuesEncountered !== undefined ? body.issuesEncountered : undefined,
        pendingActions: body.pendingActions !== undefined ? body.pendingActions : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
        status: body.status || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    console.error('Error updating shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
