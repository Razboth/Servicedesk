import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is MANAGER_IT
    if (session.user.role !== 'MANAGER_IT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { scheduleId } = params;
    const body = await request.json();
    const { assignmentId, newStaffProfileId } = body;

    if (!assignmentId || !newStaffProfileId) {
      return NextResponse.json(
        { error: 'Assignment ID and new staff profile ID are required' },
        { status: 400 }
      );
    }

    // Verify the schedule exists and belongs to the manager's branch
    const schedule = await prisma.shiftSchedule.findUnique({
      where: { id: scheduleId },
      select: { branchId: true, status: true },
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    // Get user's branch
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { branchId: true },
    });

    if (!user?.branchId || user.branchId !== schedule.branchId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Don't allow editing published schedules
    if (schedule.status === 'PUBLISHED') {
      return NextResponse.json(
        { error: 'Cannot edit published schedules' },
        { status: 400 }
      );
    }

    // Get the assignment
    const assignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      select: {
        scheduleId: true,
        date: true,
        shiftType: true,
      },
    });

    if (!assignment || assignment.scheduleId !== scheduleId) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    // Verify the new staff profile exists and belongs to the same branch
    const newStaffProfile = await prisma.staffShiftProfile.findUnique({
      where: { id: newStaffProfileId },
      select: {
        branchId: true,
        canWorkNightShift: true,
        canWorkWeekendDay: true,
      },
    });

    if (!newStaffProfile || newStaffProfile.branchId !== schedule.branchId) {
      return NextResponse.json(
        { error: 'Invalid staff profile' },
        { status: 400 }
      );
    }

    // Validate staff can work this shift type
    const assignmentDate = new Date(assignment.date);
    const dayOfWeek = assignmentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (assignment.shiftType === 'NIGHT' && !newStaffProfile.canWorkNightShift) {
      return NextResponse.json(
        { error: 'Staff cannot work night shifts' },
        { status: 400 }
      );
    }

    if (
      (assignment.shiftType === 'SATURDAY_DAY' || assignment.shiftType === 'SUNDAY_DAY') &&
      !newStaffProfile.canWorkWeekendDay
    ) {
      return NextResponse.json(
        { error: 'Staff cannot work weekend day shifts' },
        { status: 400 }
      );
    }

    // Check for conflicts (staff already assigned on this date)
    // If they have a different shift type, delete it (swap will handle it)
    const existingAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        scheduleId,
        staffProfileId: newStaffProfileId,
        date: assignment.date,
        id: { not: assignmentId },
      },
      select: { id: true, shiftType: true },
    });

    if (existingAssignment) {
      // If same shift type, it's an error
      if (existingAssignment.shiftType === assignment.shiftType) {
        return NextResponse.json(
          { error: 'Staff already has a ' + assignment.shiftType + ' assignment on this date' },
          { status: 400 }
        );
      }
      // Different shift types - delete the existing one to allow the swap
      // (e.g., staff has OFF, we're assigning them NIGHT - delete the OFF first)
      await prisma.shiftAssignment.delete({
        where: { id: existingAssignment.id },
      });
    }

    // Update the assignment
    const updatedAssignment = await prisma.shiftAssignment.update({
      where: { id: assignmentId },
      data: { staffProfileId: newStaffProfileId },
      include: {
        staffProfile: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedAssignment,
    });
  } catch (error) {
    console.error('Error updating shift assignment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
