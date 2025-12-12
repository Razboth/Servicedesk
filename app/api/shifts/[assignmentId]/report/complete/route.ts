import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/shifts/[assignmentId]/report/complete - Complete shift report
export async function POST(
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

    // Verify the shift assignment exists
    const shiftAssignment = await prisma.shiftAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        staffProfile: true,
        shiftReport: {
          include: {
            checklistItems: true,
          },
        },
      },
    });

    if (!shiftAssignment) {
      return NextResponse.json(
        { error: 'Shift assignment not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MANAGER', 'MANAGER_IT'].includes(
      session.user.role
    );
    if (!isAdmin && shiftAssignment.staffProfile.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You can only complete your own shift reports' },
        { status: 403 }
      );
    }

    if (!shiftAssignment.shiftReport) {
      return NextResponse.json(
        { error: 'Shift report not found' },
        { status: 404 }
      );
    }

    // Check if all required items are completed
    const requiredItems = shiftAssignment.shiftReport.checklistItems.filter(
      (item) => item.isRequired
    );
    const incompleteRequired = requiredItems.filter(
      (item) => item.status !== 'COMPLETED' && item.status !== 'SKIPPED'
    );

    if (incompleteRequired.length > 0 && !body.force) {
      return NextResponse.json(
        {
          error: 'Incomplete required items',
          message: 'Beberapa item wajib belum diselesaikan',
          incompleteItems: incompleteRequired.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
          })),
        },
        { status: 400 }
      );
    }

    // Complete the report
    const completedReport = await prisma.shiftReport.update({
      where: { id: shiftAssignment.shiftReport.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        summary: body.summary || shiftAssignment.shiftReport.summary,
        handoverNotes: body.handoverNotes || shiftAssignment.shiftReport.handoverNotes,
        issuesEncountered: body.issuesEncountered || shiftAssignment.shiftReport.issuesEncountered,
        pendingActions: body.pendingActions || shiftAssignment.shiftReport.pendingActions,
      },
      include: {
        checklistItems: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        },
      },
    });

    // Update shift assignment status to COMPLETED if applicable
    if (shiftAssignment.status === 'IN_PROGRESS') {
      await prisma.shiftAssignment.update({
        where: { id: assignmentId },
        data: { status: 'COMPLETED' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Laporan shift berhasil diselesaikan',
      data: completedReport,
    });
  } catch (error) {
    console.error('Error completing shift report:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
