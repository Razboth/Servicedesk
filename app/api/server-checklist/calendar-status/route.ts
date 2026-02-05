import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { DailyChecklistType } from '@prisma/client';

interface DateChecklistInfo {
  types: DailyChecklistType[];
  hasData: boolean;
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

    // Query all checklists for the month
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
      },
    });

    // Group by date
    const datesWithData: Record<string, DateChecklistInfo> = {};

    for (const checklist of checklists) {
      // Format date as YYYY-MM-DD
      const dateStr = checklist.date.toISOString().split('T')[0];

      if (!datesWithData[dateStr]) {
        datesWithData[dateStr] = {
          types: [],
          hasData: true,
        };
      }

      if (!datesWithData[dateStr].types.includes(checklist.checklistType)) {
        datesWithData[dateStr].types.push(checklist.checklistType);
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
