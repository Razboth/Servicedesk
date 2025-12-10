import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get today's date in local timezone (WITA - UTC+8)
    // The shift dates are stored as date-only strings (YYYY-MM-DD) in the database
    // So we need to create date ranges that match the local date, not UTC
    const now = new Date();
    // Create today's date string in YYYY-MM-DD format
    const todayStr = now.toLocaleDateString('en-CA'); // Returns YYYY-MM-DD format

    // Parse today as start of day in UTC (since DB stores dates as UTC midnight)
    const today = new Date(todayStr + 'T00:00:00.000Z');
    const tomorrow = new Date(todayStr + 'T00:00:00.000Z');
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Get next 7 days for upcoming shifts
    const nextWeek = new Date(todayStr + 'T00:00:00.000Z');
    nextWeek.setUTCDate(nextWeek.getUTCDate() + 7);

    console.log('Shift lookup - Today:', todayStr, 'Range:', today.toISOString(), 'to', tomorrow.toISOString());

    // Fetch today's shift using staffProfileId
    const todayShift = await prisma.shiftAssignment.findFirst({
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
      },
    });

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
