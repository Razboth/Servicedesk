import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/shifts/schedules/[scheduleId]/holidays
 * Update holidays for a schedule (replace all)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permissions
    if (!['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { scheduleId } = await params;
    const body = await request.json();
    const { holidays } = body;

    // Verify schedule exists
    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Delete existing holidays for this schedule
    await prisma.holiday.deleteMany({
      where: { scheduleId },
    });

    // Create new holidays if provided
    let holidaysCreated = 0;
    if (holidays && Array.isArray(holidays) && holidays.length > 0) {
      const holidayRecords = holidays.map((h: { date: string; name?: string }) => ({
        scheduleId,
        name: h.name || 'Libur',
        date: new Date(h.date),
        holidayType: 'PUBLIC' as const,
        affectsNightShift: true,
        affectsWeekendShift: true,
      }));

      await prisma.holiday.createMany({
        data: holidayRecords,
      });
      holidaysCreated = holidayRecords.length;
    }

    return NextResponse.json({
      success: true,
      data: {
        scheduleId,
        holidaysCreated,
      },
    });
  } catch (error: any) {
    console.error('Error updating holidays:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update holidays' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/shifts/schedules/[scheduleId]/holidays
 * Get holidays for a schedule
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { scheduleId } = await params;

    const holidays = await prisma.holiday.findMany({
      where: { scheduleId },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: holidays,
    });
  } catch (error: any) {
    console.error('Error fetching holidays:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}
