import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/shifts/[assignmentId]/report/backup - Update backup checklist items
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { assignmentId } = await params;
    const body = await request.json();

    // Get the shift report
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: true,
      },
    });

    if (!shiftAssignment?.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only update your own shift reports' },
        { status: 403 }
      );
    }

    // Handle "check all" action
    if (body.checkAll !== undefined) {
      await prisma.shiftBackupChecklist.updateMany({
        where: { shiftReportId: shiftAssignment.shiftReport.id },
        data: {
          isChecked: body.checkAll,
          checkedAt: body.checkAll ? new Date() : null,
        },
      });

      const updatedBackup = await prisma.shiftBackupChecklist.findMany({
        where: { shiftReportId: shiftAssignment.shiftReport.id },
        orderBy: { order: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: { backupChecklist: updatedBackup },
      });
    }

    // Handle individual item updates
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        await prisma.shiftBackupChecklist.update({
          where: { id: item.id },
          data: {
            isChecked: item.isChecked !== undefined ? item.isChecked : undefined,
            checkedAt: item.isChecked ? new Date() : item.isChecked === false ? null : undefined,
            notes: item.notes !== undefined ? item.notes : undefined,
          },
        });
      }

      const updatedBackup = await prisma.shiftBackupChecklist.findMany({
        where: { shiftReportId: shiftAssignment.shiftReport.id },
        orderBy: { order: 'asc' },
      });

      return NextResponse.json({
        success: true,
        data: { backupChecklist: updatedBackup },
      });
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating backup checklist:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
