import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/today-reports
 * Get all shift reports for today (viewable by all technicians)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get today's date range
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    const today = new Date(todayStr + 'T00:00:00.000Z');
    const tomorrow = new Date(todayStr + 'T00:00:00.000Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Fetch all shift assignments for today that have reports
    const todayShifts = await prisma.shiftAssignment.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
        shiftType: {
          notIn: ['OFF', 'LEAVE', 'HOLIDAY'],
        },
        shiftReport: {
          isNot: null,
        },
      },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            branch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        shiftReport: {
          include: {
            checklistItems: true,
            backupChecklist: true,
            issues: true,
            serverMetrics: true,
          },
        },
      },
      orderBy: {
        staffProfile: {
          user: {
            name: 'asc',
          },
        },
      },
    });

    // Transform and add ownership info
    const reports = todayShifts.map((shift) => {
      const report = shift.shiftReport!;
      const isOwner = shift.staffProfile.userId === userId;

      // Calculate stats
      const checklistStats = {
        total: report.checklistItems.length,
        completed: report.checklistItems.filter((i) => i.status === 'COMPLETED').length,
        skipped: report.checklistItems.filter((i) => i.status === 'SKIPPED').length,
      };

      const backupStats = {
        total: report.backupChecklist.length,
        checked: report.backupChecklist.filter((b) => b.isChecked).length,
      };

      const issueStats = {
        total: report.issues.length,
        ongoing: report.issues.filter((i) => i.status === 'ONGOING').length,
        resolved: report.issues.filter((i) => i.status === 'RESOLVED').length,
      };

      return {
        shiftAssignmentId: shift.id,
        reportId: report.id,
        status: report.status,
        startedAt: report.startedAt,
        completedAt: report.completedAt,
        notes: report.notes,
        shiftType: shift.shiftType,
        date: shift.date,
        technician: {
          id: shift.staffProfile.user.id,
          name: shift.staffProfile.user.name,
          email: shift.staffProfile.user.email,
          avatar: shift.staffProfile.user.avatar,
        },
        branch: shift.staffProfile.branch,
        isOwner,
        canEdit: isOwner,
        canDelete: isOwner,
        stats: {
          checklist: checklistStats,
          backup: backupStats,
          issues: issueStats,
        },
        // Include full data only for owner, summary for others
        serverMetrics: report.serverMetrics,
        checklistItems: isOwner ? report.checklistItems : undefined,
        backupChecklist: isOwner ? report.backupChecklist : undefined,
        issues: report.issues, // Issues visible to all for awareness
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        reports,
        currentUserId: userId,
        date: todayStr,
      },
    });
  } catch (error: any) {
    console.error('Error fetching today reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today reports' },
      { status: 500 }
    );
  }
}
