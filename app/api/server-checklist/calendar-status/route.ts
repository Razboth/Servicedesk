import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType } from '@prisma/client';

interface ChecklistTypeInfo {
  type: DailyChecklistType;
  isComplete: boolean;
}

interface DateChecklistInfo {
  types: DailyChecklistType[];
  typeDetails: ChecklistTypeInfo[];
  hasData: boolean;
  hasDayChecklist: boolean;
  hasNightChecklist: boolean;
  dayChecklistComplete: boolean;
  nightChecklistComplete: boolean;
}

/**
 * GET /api/server-checklist/calendar-status
 *
 * Fetches which days in a month have checklist data for calendar display.
 *
 * Query params:
 * - year: number (required)
 * - month: number (1-12, required)
 *
 * Returns:
 * - datesWithData: Record<string, DateChecklistInfo>
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    if (!yearParam || !monthParam) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      );
    }

    const year = parseInt(yearParam);
    const month = parseInt(monthParam);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month' },
        { status: 400 }
      );
    }

    // Calculate date range for the month (in UTC)
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Valid checklist types
    const validTypes: DailyChecklistType[] = [
      'OPS_SIANG',
      'OPS_MALAM',
      'MONITORING_SIANG',
      'MONITORING_MALAM',
    ];

    // Day checklist types (08:00-20:00)
    const dayChecklistTypes: DailyChecklistType[] = ['OPS_SIANG', 'MONITORING_SIANG'];
    // Night checklist types (20:00-08:00 next day)
    const nightChecklistTypes: DailyChecklistType[] = ['OPS_MALAM', 'MONITORING_MALAM'];

    // Query all checklists for the month with item counts
    const checklists = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        checklistType: {
          in: validTypes,
        },
      },
      select: {
        date: true,
        checklistType: true,
        status: true,
        userId: true,
        user: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            status: true,
          },
        },
      },
    });

    // Group by date
    const datesWithData: Record<string, DateChecklistInfo> = {};

    for (const checklist of checklists) {
      // Format date as YYYY-MM-DD
      const dateStr = checklist.date.toISOString().split('T')[0];

      // Check if checklist is complete (all items COMPLETED or SKIPPED)
      const totalItems = checklist.items.length;
      const completedItems = checklist.items.filter(
        (item) => item.status === 'COMPLETED' || item.status === 'SKIPPED'
      ).length;
      const isComplete = totalItems > 0 && completedItems === totalItems;

      const isDayChecklist = dayChecklistTypes.includes(checklist.checklistType);
      const isNightChecklist = nightChecklistTypes.includes(checklist.checklistType);

      if (!datesWithData[dateStr]) {
        datesWithData[dateStr] = {
          types: [],
          typeDetails: [],
          hasData: true,
          hasDayChecklist: false,
          hasNightChecklist: false,
          dayChecklistComplete: false,
          nightChecklistComplete: false,
        };
      }

      if (!datesWithData[dateStr].types.includes(checklist.checklistType)) {
        datesWithData[dateStr].types.push(checklist.checklistType);
        datesWithData[dateStr].typeDetails.push({
          type: checklist.checklistType,
          isComplete,
        });
      }

      if (isDayChecklist) {
        datesWithData[dateStr].hasDayChecklist = true;
        if (isComplete) {
          datesWithData[dateStr].dayChecklistComplete = true;
        }
      }

      if (isNightChecklist) {
        datesWithData[dateStr].hasNightChecklist = true;
        if (isComplete) {
          datesWithData[dateStr].nightChecklistComplete = true;
        }
      }
    }

    return NextResponse.json({
      year,
      month,
      datesWithData,
    });
  } catch (error) {
    console.error('Error fetching calendar status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar status' },
      { status: 500 }
    );
  }
}
