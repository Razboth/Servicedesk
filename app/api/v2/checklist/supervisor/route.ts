import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistUnit, ChecklistShiftType } from '@prisma/client';
import { getCurrentTimeWITA } from '@/lib/time-lock';

/**
 * GET /api/v2/checklist/supervisor
 * Get supervisor view of all checklists for the day
 * Shows all Staff checklists and their progress
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unit = searchParams.get('unit') as ChecklistUnit | null;
    const dateParam = searchParams.get('date');

    // Parse date or use today
    const checklistDate = dateParam
      ? new Date(dateParam)
      : (() => {
          const today = getCurrentTimeWITA();
          today.setHours(0, 0, 0, 0);
          return today;
        })();

    // Build where clause
    const whereClause: {
      date: Date;
      unit?: ChecklistUnit;
    } = {
      date: checklistDate,
    };

    if (unit) {
      whereClause.unit = unit;
    }

    // Check if user is a supervisor for any checklist today
    const supervisorAssignments = await prisma.checklistAssignmentV2.findMany({
      where: {
        userId: session.user.id,
        role: 'SUPERVISOR',
        checklist: whereClause,
      },
      include: {
        checklist: true,
      },
    });

    // Also check user role - managers can view all
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isManager = user?.role === 'MANAGER_IT' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    // If not a supervisor or manager, deny access
    if (supervisorAssignments.length === 0 && !isManager) {
      return NextResponse.json(
        { error: 'You are not a supervisor for any checklist today' },
        { status: 403 }
      );
    }

    // Get all checklists for the date (filtered by supervisor's units if not manager)
    const supervisedUnits = isManager
      ? undefined
      : supervisorAssignments.map(a => a.checklist.unit);

    const checklists = await prisma.dailyChecklistV2.findMany({
      where: {
        date: checklistDate,
        ...(supervisedUnits && { unit: { in: supervisedUnits } }),
      },
      include: {
        items: {
          orderBy: [
            { section: 'asc' },
            { order: 'asc' },
          ],
          include: {
            completedBy: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: [
        { unit: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    // Calculate progress for each checklist
    const checklistsWithProgress = checklists.map(checklist => {
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        i => i.status === 'COMPLETED' || i.status === 'NOT_APPLICABLE'
      ).length;
      const failedItems = checklist.items.filter(i => i.status === 'FAILED').length;
      const needsAttentionItems = checklist.items.filter(i => i.status === 'NEEDS_ATTENTION').length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      // Group items by section
      const sections = checklist.items.reduce((acc, item) => {
        if (!acc[item.section]) {
          acc[item.section] = {
            section: item.section,
            sectionTitle: item.sectionTitle,
            totalItems: 0,
            completedItems: 0,
            items: [],
          };
        }
        acc[item.section].totalItems++;
        if (item.status === 'COMPLETED' || item.status === 'NOT_APPLICABLE') {
          acc[item.section].completedItems++;
        }
        acc[item.section].items.push(item);
        return acc;
      }, {} as Record<string, { section: string; sectionTitle: string; totalItems: number; completedItems: number; items: typeof checklist.items }>);

      // Get staff members
      const staff = checklist.assignments.filter(a => a.role === 'STAFF').map(a => a.user);
      const supervisor = checklist.assignments.find(a => a.role === 'SUPERVISOR')?.user;

      return {
        id: checklist.id,
        date: checklist.date,
        unit: checklist.unit,
        shiftType: checklist.shiftType,
        status: checklist.status,
        completedAt: checklist.completedAt,
        progress,
        totalItems,
        completedItems,
        failedItems,
        needsAttentionItems,
        sections: Object.values(sections),
        staff,
        supervisor,
        hasIssues: failedItems > 0 || needsAttentionItems > 0,
      };
    });

    // Summary statistics
    const summary = {
      totalChecklists: checklists.length,
      completedChecklists: checklists.filter(c => c.status === 'COMPLETED').length,
      inProgressChecklists: checklists.filter(c => c.status === 'IN_PROGRESS').length,
      pendingChecklists: checklists.filter(c => c.status === 'PENDING').length,
      checklistsWithIssues: checklistsWithProgress.filter(c => c.hasIssues).length,
    };

    return NextResponse.json({
      date: checklistDate.toISOString().split('T')[0],
      isManager,
      supervisedUnits: supervisedUnits || ['ALL'],
      summary,
      checklists: checklistsWithProgress,
    });
  } catch (error) {
    console.error('[Checklist V2] Supervisor GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supervisor view' },
      { status: 500 }
    );
  }
}
