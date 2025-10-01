import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/shifts/schedules/builder
 * Create a blank shift schedule for manual building
 *
 * Required: MANAGER or ADMIN role
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permissions
    if (!['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Manager, IT Manager, or Admin role required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { branchId, month, year } = body;

    // Validate inputs
    if (!branchId || !month || !year) {
      return NextResponse.json(
        { error: 'branchId, month, and year are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    // Check if branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    // Check if schedule already exists
    const existingSchedule = await prisma.shiftSchedule.findUnique({
      where: {
        branchId_month_year: {
          branchId,
          month,
          year,
        },
      },
    });

    if (existingSchedule) {
      return NextResponse.json(
        { error: 'Schedule already exists for this month. Please delete it first or use update.' },
        { status: 409 }
      );
    }

    // Create blank schedule
    const schedule = await prisma.shiftSchedule.create({
      data: {
        branchId,
        month,
        year,
        status: 'DRAFT',
        createdBy: session.user.id,
        generationRules: {
          targetNightsPerMonth: 5,
          minGapBetweenNights: 3,
          requireOffAfterNight: true,
          weekdayNightCount: 1,
          weekendDayCount: 2,
          weekendNightCount: 0,
          manuallyCreated: true,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        scheduleId: schedule.id,
        branchId,
        month,
        year,
        status: schedule.status,
      },
    });
  } catch (error: any) {
    console.error('Error creating blank schedule:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create blank schedule' },
      { status: 500 }
    );
  }
}
