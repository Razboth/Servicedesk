import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeWITA } from '@/lib/time-lock';

/**
 * GET /api/v2/checklist/handover
 * Get handover records for a date/checklist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('checklistId');
    const dateParam = searchParams.get('date');

    // Build where clause
    const whereClause: {
      fromChecklistId?: string;
      date?: Date;
    } = {};

    if (checklistId) {
      whereClause.fromChecklistId = checklistId;
    }

    if (dateParam) {
      whereClause.date = new Date(dateParam);
    }

    const handovers = await prisma.shiftHandoverV2.findMany({
      where: whereClause,
      include: {
        fromChecklist: {
          select: {
            id: true,
            unit: true,
            shiftType: true,
            status: true,
          },
        },
        toChecklist: {
          select: {
            id: true,
            unit: true,
            shiftType: true,
            status: true,
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
      orderBy: { handoverTime: 'desc' },
    });

    return NextResponse.json({ handovers });
  } catch (error) {
    console.error('[Checklist V2] Handover GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch handovers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist/handover
 * Create a handover record
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      fromChecklistId,
      toChecklistId,
      systemStatus,
      openIssues,
      notes,
    } = body;

    if (!fromChecklistId || !systemStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: fromChecklistId, systemStatus' },
        { status: 400 }
      );
    }

    // Verify the outgoing checklist exists and user is assigned
    const fromChecklist = await prisma.dailyChecklistV2.findUnique({
      where: { id: fromChecklistId },
      include: {
        assignments: true,
      },
    });

    if (!fromChecklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    // Check if user is assigned to this checklist
    const userAssignment = fromChecklist.assignments.find(
      a => a.userId === session.user.id
    );

    if (!userAssignment) {
      return NextResponse.json(
        { error: 'You are not assigned to this checklist' },
        { status: 403 }
      );
    }

    // Check if handover already exists for this checklist
    const existingHandover = await prisma.shiftHandoverV2.findFirst({
      where: {
        fromChecklistId,
        outgoingPicId: session.user.id,
      },
    });

    if (existingHandover) {
      return NextResponse.json(
        { error: 'Handover already exists for this checklist' },
        { status: 409 }
      );
    }

    // Create handover
    const handover = await prisma.shiftHandoverV2.create({
      data: {
        date: fromChecklist.date,
        fromChecklistId,
        toChecklistId,
        outgoingPicId: session.user.id,
        systemStatus: JSON.stringify(systemStatus),
        openIssues: openIssues ? JSON.stringify(openIssues) : null,
        notes,
      },
      include: {
        fromChecklist: {
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
      },
    });

    return NextResponse.json({
      handover,
      message: 'Handover created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('[Checklist V2] Handover POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create handover' },
      { status: 500 }
    );
  }
}
