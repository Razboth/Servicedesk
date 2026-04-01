import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PUT /api/v2/checklist/handover/[id]/acknowledge
 * Acknowledge a handover as the incoming PIC
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Find the handover
    const handover = await prisma.shiftHandoverV2.findUnique({
      where: { id },
      include: {
        toChecklist: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!handover) {
      return NextResponse.json(
        { error: 'Handover not found' },
        { status: 404 }
      );
    }

    // Check if already acknowledged
    if (handover.acknowledgedAt) {
      return NextResponse.json(
        { error: 'Handover already acknowledged' },
        { status: 400 }
      );
    }

    // If there's a target checklist, verify user is assigned to it
    if (handover.toChecklist) {
      const userAssignment = handover.toChecklist.assignments.find(
        a => a.userId === session.user.id
      );

      if (!userAssignment) {
        return NextResponse.json(
          { error: 'You are not assigned to the incoming checklist' },
          { status: 403 }
        );
      }
    }

    // Update handover with acknowledgment
    const updatedHandover = await prisma.shiftHandoverV2.update({
      where: { id },
      data: {
        incomingPicId: session.user.id,
        acknowledgedAt: new Date(),
      },
      include: {
        fromChecklist: {
          select: {
            id: true,
            unit: true,
            shiftType: true,
          },
        },
        toChecklist: {
          select: {
            id: true,
            unit: true,
            shiftType: true,
          },
        },
        outgoingPic: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        incomingPic: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      handover: updatedHandover,
      message: 'Handover acknowledged successfully',
    });
  } catch (error) {
    console.error('[Checklist V2] Handover acknowledge error:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge handover' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v2/checklist/handover/[id]/acknowledge
 * Get handover details for acknowledgment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const handover = await prisma.shiftHandoverV2.findUnique({
      where: { id },
      include: {
        fromChecklist: {
          include: {
            items: {
              where: {
                OR: [
                  { status: 'FAILED' },
                  { status: 'NEEDS_ATTENTION' },
                ],
              },
              orderBy: [
                { section: 'asc' },
                { order: 'asc' },
              ],
            },
          },
        },
        toChecklist: {
          select: {
            id: true,
            unit: true,
            shiftType: true,
          },
        },
        outgoingPic: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        incomingPic: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!handover) {
      return NextResponse.json(
        { error: 'Handover not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields
    const systemStatus = handover.systemStatus
      ? JSON.parse(handover.systemStatus)
      : null;
    const openIssues = handover.openIssues
      ? JSON.parse(handover.openIssues)
      : [];

    return NextResponse.json({
      handover: {
        ...handover,
        systemStatus,
        openIssues,
      },
      isAcknowledged: !!handover.acknowledgedAt,
      canAcknowledge: !handover.acknowledgedAt,
    });
  } catch (error) {
    console.error('[Checklist V2] Handover GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch handover' },
      { status: 500 }
    );
  }
}
