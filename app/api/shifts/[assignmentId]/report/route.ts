import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getShiftCategory } from '@/lib/shift-category';
import { isItemUnlocked, getLockStatusMessage } from '@/lib/time-lock';

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
              include: {
                ticket: {
                  select: {
                    id: true,
                    ticketNumber: true,
                    title: true,
                    status: true,
                    priority: true,
                    service: { select: { name: true } },
                    assignedTo: { select: { name: true } },
                    createdAt: true,
                  },
                },
              },
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

    // Check if user is owner or admin
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    const isOwner = shiftAssignment.staffProfile.userId === session.user.id;
    const isTechnician = session.user.role === 'TECHNICIAN';

    // Allow admins, owners, and technicians (read-only for non-owners)
    const canView = isAdmin || isOwner || isTechnician;

    if (!canView) {
      return NextResponse.json(
        { error: 'You do not have permission to view this shift report' },
        { status: 403 }
      );
    }

    let report = shiftAssignment.shiftReport;

    // If no report exists, only owner can create one
    if (!report) {
      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { error: 'Shift report not found', message: 'Laporan shift belum dibuat oleh pemilik' },
          { status: 404 }
        );
      }
      // Get latest server metrics
      const latestMetrics = await prisma.serverMetrics.findFirst({
        orderBy: { collectedAt: 'desc' },
      });

      // Get shift category for this shift type
      const shiftCategory = getShiftCategory(shiftAssignment.shiftType);

      // Get checklist templates - filter by both shiftType and shiftCategory
      const templates = await prisma.shiftChecklistTemplate.findMany({
        where: {
          isActive: true,
          AND: [
            // Match shiftType (null = all, or specific type)
            {
              OR: [
                { shiftType: null },
                { shiftType: shiftAssignment.shiftType },
              ],
            },
            // Match shiftCategory (null = all, or specific category)
            {
              OR: [
                { shiftCategory: null },
                { shiftCategory: shiftCategory },
              ],
            },
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
              unlockTime: template.unlockTime, // Copy time-lock from template
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
            include: {
              ticket: {
                select: {
                  id: true,
                  ticketNumber: true,
                  title: true,
                  status: true,
                  priority: true,
                  service: { select: { name: true } },
                  assignedTo: { select: { name: true } },
                  createdAt: true,
                },
              },
            },
          },
        },
      });
    }

    // Add lock status to checklist items
    const now = new Date();
    // Check if this is a night shift (NIGHT_WEEKDAY or NIGHT_WEEKEND)
    const isNightShift = shiftAssignment.shiftType === 'NIGHT_WEEKDAY' ||
                         shiftAssignment.shiftType === 'NIGHT_WEEKEND';
    const checklistItemsWithLockStatus = report.checklistItems.map((item) => ({
      ...item,
      isLocked: !isItemUnlocked(item.unlockTime, now, isNightShift),
      lockMessage: getLockStatusMessage(item.unlockTime, now, isNightShift),
    }));

    // Calculate stats
    const stats = {
      total: report.checklistItems.length,
      completed: report.checklistItems.filter((i) => i.status === 'COMPLETED').length,
      pending: report.checklistItems.filter((i) => i.status === 'PENDING').length,
      inProgress: report.checklistItems.filter((i) => i.status === 'IN_PROGRESS').length,
      skipped: report.checklistItems.filter((i) => i.status === 'SKIPPED').length,
      locked: checklistItemsWithLockStatus.filter((i) => i.isLocked).length,
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

    // Check metrics availability (old single-server metrics)
    const metricsAvailable = report.serverMetrics !== null;
    const metricsStale = report.serverMetrics
      ? new Date().getTime() - new Date(report.serverMetrics.collectedAt).getTime() > 24 * 60 * 60 * 1000
      : false;

    // Fetch new multi-server metrics summary
    const latestCollection = await prisma.metricCollection.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        snapshots: {
          include: {
            server: {
              select: {
                id: true,
                ipAddress: true,
                serverName: true,
              },
            },
          },
        },
      },
    });

    // Calculate multi-server metrics summary
    let multiServerMetrics = null;
    if (latestCollection) {
      const snapshots = latestCollection.snapshots;
      let totalCpu = 0;
      let totalMemory = 0;
      let cpuCount = 0;
      let memoryCount = 0;
      let healthyCount = 0;
      let warningCount = 0;
      let criticalCount = 0;

      const topCpuServers: { ipAddress: string; serverName: string | null; cpuPercent: number }[] = [];
      const topMemoryServers: { ipAddress: string; serverName: string | null; memoryPercent: number }[] = [];
      const storageAlerts: { ipAddress: string; serverName: string | null; partition: string; usagePercent: number }[] = [];

      for (const snapshot of snapshots) {
        if (snapshot.cpuPercent !== null) {
          totalCpu += snapshot.cpuPercent;
          cpuCount++;
          topCpuServers.push({
            ipAddress: snapshot.server.ipAddress,
            serverName: snapshot.server.serverName,
            cpuPercent: snapshot.cpuPercent,
          });
        }
        if (snapshot.memoryPercent !== null) {
          totalMemory += snapshot.memoryPercent;
          memoryCount++;
          topMemoryServers.push({
            ipAddress: snapshot.server.ipAddress,
            serverName: snapshot.server.serverName,
            memoryPercent: snapshot.memoryPercent,
          });
        }

        // Calculate status
        let maxStorageUsage = 0;
        if (snapshot.storage && Array.isArray(snapshot.storage)) {
          for (const item of snapshot.storage as { partition: string; usagePercent: number }[]) {
            if (item.usagePercent > maxStorageUsage) {
              maxStorageUsage = item.usagePercent;
            }
            if (item.usagePercent >= 80) {
              storageAlerts.push({
                ipAddress: snapshot.server.ipAddress,
                serverName: snapshot.server.serverName,
                partition: item.partition,
                usagePercent: item.usagePercent,
              });
            }
          }
        }

        const isCritical = (snapshot.cpuPercent && snapshot.cpuPercent >= 90) ||
          (snapshot.memoryPercent && snapshot.memoryPercent >= 90) ||
          maxStorageUsage >= 90;
        const isWarning = (snapshot.cpuPercent && snapshot.cpuPercent >= 75) ||
          (snapshot.memoryPercent && snapshot.memoryPercent >= 75) ||
          maxStorageUsage >= 75;

        if (isCritical) criticalCount++;
        else if (isWarning) warningCount++;
        else healthyCount++;
      }

      // Sort and limit
      topCpuServers.sort((a, b) => b.cpuPercent - a.cpuPercent);
      topMemoryServers.sort((a, b) => b.memoryPercent - a.memoryPercent);
      storageAlerts.sort((a, b) => b.usagePercent - a.usagePercent);

      multiServerMetrics = {
        collectionId: latestCollection.id,
        fetchedAt: latestCollection.fetchedAt,
        reportTimestamp: latestCollection.reportTimestamp,
        totalServers: snapshots.length,
        avgCpu: cpuCount > 0 ? totalCpu / cpuCount : null,
        avgMemory: memoryCount > 0 ? totalMemory / memoryCount : null,
        healthyCount,
        warningCount,
        criticalCount,
        topCpuServers: topCpuServers.slice(0, 5),
        topMemoryServers: topMemoryServers.slice(0, 5),
        storageAlertsCount: storageAlerts.length,
        storageAlerts: storageAlerts.slice(0, 5),
      };
    }

    // Calculate backup stats
    const backupStats = {
      total: report.backupChecklist?.length || 0,
      checked: report.backupChecklist?.filter((b) => b.isChecked).length || 0,
    };

    // Separate issues by status
    const ongoingIssues = report.issues?.filter((i) => i.status === 'ONGOING') || [];
    const resolvedIssues = report.issues?.filter((i) => i.status === 'RESOLVED') || [];

    // Check if user has server access
    const staffProfile = await prisma.staffShiftProfile.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        hasServerAccess: true,
      },
    });
    const hasServerAccess = staffProfile?.hasServerAccess ?? false;

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
        checklistItems: checklistItemsWithLockStatus,
        backupChecklist: report.backupChecklist || [],
        issues: report.issues || [],
        ongoingIssues,
        resolvedIssues,
        serverMetrics: report.serverMetrics,
        multiServerMetrics,
        metricsAvailable: metricsAvailable || multiServerMetrics !== null,
        metricsStale,
        metricsMessage: !metricsAvailable && !multiServerMetrics
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
        // Access control flags
        isOwner,
        isReadOnly: !isOwner && !isAdmin,
        canEdit: isOwner || isAdmin,
        // Server access flag for daily checklist
        hasServerAccess,
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

// DELETE /api/shifts/[assignmentId]/report - Delete shift report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;

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

    // Verify ownership - only owner can delete
    if (shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Anda hanya dapat menghapus laporan shift milik Anda sendiri' },
        { status: 403 }
      );
    }

    if (!shiftAssignment.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Delete the report (cascade will delete checklist items, backup checklist, and issues)
    await prisma.shiftReport.delete({
      where: { id: shiftAssignment.shiftReport.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Laporan shift berhasil dihapus',
    });
  } catch (error) {
    console.error('Error deleting shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
