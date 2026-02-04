import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ShiftType } from '@prisma/client';

// Night shifts that span midnight (20:00 - 07:59 next day)
const NIGHT_SHIFT_TYPES: ShiftType[] = ['NIGHT_WEEKDAY', 'NIGHT_WEEKEND', 'STANDBY_ONCALL'];

/**
 * GET /api/shifts/my-schedule
 * Get current user's shift schedule for today and upcoming shifts
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // First, get the user's staff profile and branch info
    const staffProfile = await prisma.staffShiftProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        branchId: true,
      },
    });

    // If user doesn't have a staff profile, try to get branchId from user directly
    let branchId: string | null = staffProfile?.branchId || null;

    if (!branchId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { branchId: true },
      });
      branchId = user?.branchId || null;
    }

    // If user doesn't have a staff profile, return empty data with branchId
    if (!staffProfile) {
      return NextResponse.json({
        success: true,
        data: {
          todayShift: null,
          upcomingShifts: [],
          todayOnCall: null,
          branchId,
        },
      });
    }

    // Get current time in WITA (UTC+8)
    const now = new Date();
    const witaOffset = 8 * 60; // WITA is UTC+8 in minutes
    const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    const witaMinutes = utcMinutes + witaOffset;

    // Calculate WITA hour (handling day rollover)
    let witaHour = Math.floor(witaMinutes / 60) % 24;

    // Determine if we're in the early morning hours (00:00 - 07:59) when night shift from yesterday is still active
    const isEarlyMorning = witaHour >= 0 && witaHour < 8;

    // Get today's date in WITA timezone
    let witaYear = now.getUTCFullYear();
    let witaMonth = now.getUTCMonth();
    let witaDay = now.getUTCDate();

    // If WITA time has rolled over to next day
    if (witaMinutes >= 24 * 60) {
      const tempDate = new Date(Date.UTC(witaYear, witaMonth, witaDay + 1));
      witaYear = tempDate.getUTCFullYear();
      witaMonth = tempDate.getUTCMonth();
      witaDay = tempDate.getUTCDate();
    }

    // Create today's date string in YYYY-MM-DD format (WITA timezone)
    const todayStr = `${witaYear}-${String(witaMonth + 1).padStart(2, '0')}-${String(witaDay).padStart(2, '0')}`;

    // Parse today as start of day in UTC (since DB stores dates as UTC midnight)
    const today = new Date(todayStr + 'T00:00:00.000Z');
    const tomorrow = new Date(todayStr + 'T00:00:00.000Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Yesterday for checking ongoing night shifts
    const yesterday = new Date(todayStr + 'T00:00:00.000Z');
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    // Get next 7 days for upcoming shifts
    const nextWeek = new Date(todayStr + 'T00:00:00.000Z');
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

    console.log('Shift lookup - Today:', todayStr, 'WITA Hour:', witaHour, 'Is Early Morning:', isEarlyMorning);

    // Fetch today's shift using staffProfileId
    let todayShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        schedule: {
          select: {
            month: true,
            year: true,
            status: true,
          },
        },
        staffProfile: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // If no shift today and it's early morning (00:00 - 07:59), check for night shift from yesterday
    // Night shifts run from 20:00 to 07:59 next day
    if (!todayShift && isEarlyMorning) {
      const yesterdayNightShift = await prisma.shiftAssignment.findFirst({
        where: {
          staffProfileId: staffProfile.id,
          date: {
            gte: yesterday,
            lt: today,
          },
          shiftType: {
            in: NIGHT_SHIFT_TYPES,
          },
        },
        include: {
          schedule: {
            select: {
              month: true,
              year: true,
              status: true,
            },
          },
          staffProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (yesterdayNightShift) {
        console.log('Found ongoing night shift from yesterday:', yesterdayNightShift.shiftType);
        todayShift = yesterdayNightShift;
      }
    }

    // Fetch upcoming shifts (next 7 days, excluding today)
    const upcomingShifts = await prisma.shiftAssignment.findMany({
      where: {
        staffProfileId: staffProfile.id,
        date: {
          gte: tomorrow,
          lte: nextWeek,
        },
      },
      include: {
        schedule: {
          select: {
            month: true,
            year: true,
            status: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: 10,
    });

    // Get on-call assignment for today using staffProfileId
    const todayOnCall = await prisma.onCallAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        schedule: {
          select: {
            month: true,
            year: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        todayShift,
        upcomingShifts,
        todayOnCall,
        branchId,
      },
    });
  } catch (error: any) {
    console.error('Error fetching my shift schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift schedule' },
      { status: 500 }
    );
  }
}
