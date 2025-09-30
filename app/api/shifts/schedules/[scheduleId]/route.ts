import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/schedules/[scheduleId]
 * Get detailed shift schedule with assignments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id: params.scheduleId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        shiftAssignments: {
          include: {
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
          orderBy: { date: 'asc' },
        },
        onCallAssignments: {
          include: {
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
          orderBy: { date: 'asc' },
        },
        holidays: {
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    console.error('Error fetching shift schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift schedule' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shifts/schedules/[scheduleId]
 * Update schedule status or publish
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    const data: any = {};
    if (status) {
      data.status = status;
      if (status === 'PUBLISHED') {
        data.publishedAt = new Date();
        data.publishedBy = session.user.id;
      }
    }
    if (notes !== undefined) data.notes = notes;

    const schedule = await prisma.shiftSchedule.update({
      where: { id: params.scheduleId },
      data,
    });

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error: any) {
    console.error('Error updating shift schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update shift schedule' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shifts/schedules/[scheduleId]
 * Delete a shift schedule (cascade deletes assignments)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    await prisma.shiftSchedule.delete({
      where: { id: params.scheduleId },
    });

    return NextResponse.json({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting shift schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete shift schedule' },
      { status: 500 }
    );
  }
}