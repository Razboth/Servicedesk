import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/v2/checklist/shift/takeover
 * Buddy takes over from primary
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { assignmentId, reason } = body as {
      assignmentId: string;
      reason?: string;
    };

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Missing assignment ID' },
        { status: 400 }
      );
    }

    // Get the assignment
    const assignment = await prisma.shiftAssignmentV2.findUnique({
      where: { id: assignmentId },
      include: {
        primaryUser: { select: { id: true, name: true } },
        buddyUser: { select: { id: true, name: true } },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if current user is the buddy
    if (assignment.buddyUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Only the assigned buddy can take over' },
        { status: 403 }
      );
    }

    // Check if already taken over
    if (assignment.takenOver) {
      return NextResponse.json(
        { error: 'Shift has already been taken over' },
        { status: 400 }
      );
    }

    // Update assignment to mark takeover
    const updated = await prisma.shiftAssignmentV2.update({
      where: { id: assignmentId },
      data: {
        takenOver: true,
        takenOverAt: new Date(),
        takenOverReason: reason || 'Buddy takeover',
      },
      include: {
        primaryUser: { select: { id: true, name: true, username: true } },
        buddyUser: { select: { id: true, name: true, username: true } },
      },
    });

    // Also add buddy as STAFF to any checklist for this shift
    // Find checklists for this date/shift
    const checklists = await prisma.dailyChecklistV2.findMany({
      where: {
        date: assignment.date,
        shiftType: assignment.shiftType,
      },
    });

    // Add buddy as STAFF to each checklist (if not already assigned)
    for (const checklist of checklists) {
      await prisma.checklistAssignmentV2.upsert({
        where: {
          checklistId_userId: {
            checklistId: checklist.id,
            userId: session.user.id,
          },
        },
        update: {},
        create: {
          checklistId: checklist.id,
          userId: session.user.id,
          role: 'STAFF',
        },
      });
    }

    return NextResponse.json({
      assignment: updated,
      message: `${updated.buddyUser?.name} has taken over the shift from ${updated.primaryUser?.name}`,
    });
  } catch (error) {
    console.error('[Shift Takeover] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process takeover' },
      { status: 500 }
    );
  }
}
