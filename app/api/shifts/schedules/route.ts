import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/schedules
 * List shift schedules for a branch
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year');
    const status = searchParams.get('status');

    if (!branchId) {
      return NextResponse.json(
        { error: 'branchId is required' },
        { status: 400 }
      );
    }

    const where: any = { branchId };
    if (year) where.year = parseInt(year);
    if (status) where.status = status;

    const schedules = await prisma.shiftSchedule.findMany({
      where,
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            shiftAssignments: true,
            onCallAssignments: true,
            holidays: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (error: any) {
    console.error('Error fetching shift schedules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift schedules' },
      { status: 500 }
    );
  }
}