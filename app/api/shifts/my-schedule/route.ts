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

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get next 7 days for upcoming shifts
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    // Fetch today's shift
    const todayShift = await prisma.shiftAssignment.findFirst({
      where: {
        userId,
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
        userId,
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

    // Get on-call assignments for today
    const todayOnCall = await prisma.onCallAssignment.findFirst({
      where: {
        userId,
        startDate: {
          lte: today,
        },
        endDate: {
          gte: today,
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
