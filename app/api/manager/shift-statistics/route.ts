import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType } from '@prisma/client';

// Checklist type labels
const CHECKLIST_TYPE_LABELS: Record<DailyChecklistType, string> = {
  OPS_SIANG: 'Ops Siang',
  OPS_MALAM: 'Ops Malam',
  MONITORING_SIANG: 'Monitoring Siang',
  MONITORING_MALAM: 'Monitoring Malam',
  HARIAN: 'Harian',
  AKHIR_HARI: 'Akhir Hari',
  SERVER_SIANG: 'Server Siang',
  SERVER_MALAM: 'Server Malam',
};

// Valid operational checklist types
const VALID_CHECKLIST_TYPES: DailyChecklistType[] = [
  'OPS_SIANG',
  'OPS_MALAM',
  'MONITORING_SIANG',
  'MONITORING_MALAM',
];

/**
 * GET /api/manager/shift-statistics
 *
 * Get shift statistics for Manager IT
 *
 * Query params:
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - branchId: string (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only MANAGER_IT, ADMIN, and SUPER_ADMIN can access
    if (!session.user.role || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Only Manager IT can access shift statistics' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam + 'T00:00:00.000Z');
    const endDate = new Date(endDateParam + 'T23:59:59.999Z');

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Get all checklists in date range
    const checklists = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        checklistType: {
          in: VALID_CHECKLIST_TYPES,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        items: {
          select: {
            status: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { checklistType: 'asc' },
      ],
    });

    // Process checklists by date
    const checklistsByDate: Record<string, {
      date: string;
      checklists: {
        type: DailyChecklistType;
        typeLabel: string;
        status: string;
        isComplete: boolean;
        progress: number;
        totalItems: number;
        completedItems: number;
        user: {
          id: string;
          name: string | null;
          email: string;
          branch: { id: string; name: string } | null;
        };
      }[];
    }> = {};

    // Track expected vs actual checklists
    const dateChecklistTracker: Record<string, Set<DailyChecklistType>> = {};

    for (const checklist of checklists) {
      const dateStr = checklist.date.toISOString().split('T')[0];

      if (!checklistsByDate[dateStr]) {
        checklistsByDate[dateStr] = {
          date: dateStr,
          checklists: [],
        };
        dateChecklistTracker[dateStr] = new Set();
      }

      dateChecklistTracker[dateStr].add(checklist.checklistType);

      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.status === 'COMPLETED' || item.status === 'SKIPPED'
      ).length;
      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      const isComplete = totalItems > 0 && completedItems === totalItems;

      checklistsByDate[dateStr].checklists.push({
        type: checklist.checklistType,
        typeLabel: CHECKLIST_TYPE_LABELS[checklist.checklistType],
        status: checklist.status,
        isComplete,
        progress,
        totalItems,
        completedItems,
        user: {
          id: checklist.user.id,
          name: checklist.user.name,
          email: checklist.user.email,
          branch: checklist.user.branch,
        },
      });
    }

    // Get shift assignments for the date range to identify who should have done checklists
    const shiftAssignments = await prisma.shiftAssignment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        shiftType: {
          in: ['STANDBY_BRANCH', 'DAY_WEEKEND', 'NIGHT_WEEKDAY', 'NIGHT_WEEKEND'],
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
                staffProfile: {
                  select: {
                    hasServerAccess: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    // Build expected checklists by date
    const expectedChecklistsByDate: Record<string, {
      OPS_SIANG: string[]; // User IDs expected to complete OPS_SIANG
      OPS_MALAM: string[];
      MONITORING_SIANG: string[];
      MONITORING_MALAM: string[];
    }> = {};

    for (const assignment of shiftAssignments) {
      const dateStr = assignment.date.toISOString().split('T')[0];

      if (!expectedChecklistsByDate[dateStr]) {
        expectedChecklistsByDate[dateStr] = {
          OPS_SIANG: [],
          OPS_MALAM: [],
          MONITORING_SIANG: [],
          MONITORING_MALAM: [],
        };
      }

      const userId = assignment.staffProfile.user.id;
      const hasServerAccess = assignment.staffProfile.user.staffProfile?.hasServerAccess || false;

      // OPS_SIANG: STANDBY_BRANCH, DAY_WEEKEND
      if (['STANDBY_BRANCH', 'DAY_WEEKEND'].includes(assignment.shiftType)) {
        if (!expectedChecklistsByDate[dateStr].OPS_SIANG.includes(userId)) {
          expectedChecklistsByDate[dateStr].OPS_SIANG.push(userId);
        }
      }

      // OPS_MALAM: NIGHT_WEEKEND only
      if (assignment.shiftType === 'NIGHT_WEEKEND') {
        if (!expectedChecklistsByDate[dateStr].OPS_MALAM.includes(userId)) {
          expectedChecklistsByDate[dateStr].OPS_MALAM.push(userId);
        }
      }

      // MONITORING_SIANG: Any staff with server access can claim
      if (['STANDBY_BRANCH', 'DAY_WEEKEND'].includes(assignment.shiftType) && hasServerAccess) {
        if (!expectedChecklistsByDate[dateStr].MONITORING_SIANG.includes(userId)) {
          expectedChecklistsByDate[dateStr].MONITORING_SIANG.push(userId);
        }
      }

      // MONITORING_MALAM: NIGHT_WEEKDAY, NIGHT_WEEKEND with server access
      if (['NIGHT_WEEKDAY', 'NIGHT_WEEKEND'].includes(assignment.shiftType) && hasServerAccess) {
        if (!expectedChecklistsByDate[dateStr].MONITORING_MALAM.includes(userId)) {
          expectedChecklistsByDate[dateStr].MONITORING_MALAM.push(userId);
        }
      }
    }

    // Calculate missing checklists
    const missingChecklists: {
      date: string;
      type: DailyChecklistType;
      typeLabel: string;
      expectedUsers: { id: string; name: string | null }[];
    }[] = [];

    for (const [dateStr, expected] of Object.entries(expectedChecklistsByDate)) {
      const existingTypes = dateChecklistTracker[dateStr] || new Set();

      for (const type of VALID_CHECKLIST_TYPES) {
        const expectedUsers = expected[type];
        if (expectedUsers.length > 0 && !existingTypes.has(type)) {
          // Get user details
          const users = await prisma.user.findMany({
            where: { id: { in: expectedUsers } },
            select: { id: true, name: true },
          });

          missingChecklists.push({
            date: dateStr,
            type,
            typeLabel: CHECKLIST_TYPE_LABELS[type],
            expectedUsers: users,
          });
        }
      }
    }

    // Calculate summary statistics
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalChecklists = checklists.length;
    const completedChecklists = checklists.filter(
      (c) => c.status === 'COMPLETED' ||
        c.items.filter((i) => i.status === 'COMPLETED' || i.status === 'SKIPPED').length === c.items.length
    ).length;
    const incompleteChecklists = totalChecklists - completedChecklists;

    // Completion rate by type
    const completionByType: Record<string, { total: number; completed: number; rate: number }> = {};
    for (const type of VALID_CHECKLIST_TYPES) {
      const typeChecklists = checklists.filter((c) => c.checklistType === type);
      const typeCompleted = typeChecklists.filter(
        (c) => c.status === 'COMPLETED' ||
          c.items.filter((i) => i.status === 'COMPLETED' || i.status === 'SKIPPED').length === c.items.length
      ).length;
      completionByType[type] = {
        total: typeChecklists.length,
        completed: typeCompleted,
        rate: typeChecklists.length > 0 ? Math.round((typeCompleted / typeChecklists.length) * 100) : 0,
      };
    }

    // Organize by date for calendar view
    const checklistDates = Object.values(checklistsByDate).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json({
      summary: {
        totalDays,
        totalChecklists,
        completedChecklists,
        incompleteChecklists,
        completionRate: totalChecklists > 0
          ? Math.round((completedChecklists / totalChecklists) * 100)
          : 0,
        completionByType,
        missingChecklistsCount: missingChecklists.length,
      },
      checklistsByDate: checklistDates,
      missingChecklists: missingChecklists.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    });
  } catch (error) {
    console.error('Error fetching shift statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift statistics' },
      { status: 500 }
    );
  }
}
