import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistType, ChecklistShiftType } from '@prisma/client';
import { getCurrentTimeWITA } from '@/lib/time-lock';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

/**
 * GET /api/v2/checklist/shift
 * Get shift assignments for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const shiftType = searchParams.get('shiftType') as ChecklistShiftType | null;

    // Get WITA date
    const witaTime = getCurrentTimeWITA();
    const checklistDate = dateParam ? new Date(dateParam) : new Date(witaTime);
    checklistDate.setHours(0, 0, 0, 0);

    const whereClause: any = {
      date: checklistDate,
      isActive: true,
    };

    if (shiftType) {
      whereClause.shiftType = shiftType;
    }

    const assignments = await prisma.shiftAssignmentV2.findMany({
      where: whereClause,
      include: {
        primaryUser: {
          select: {
            id: true,
            name: true,
            username: true,
            checklistType: true,
          },
        },
        buddyUser: {
          select: {
            id: true,
            name: true,
            username: true,
            checklistType: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
      orderBy: {
        shiftType: 'asc',
      },
    });

    return NextResponse.json({
      assignments,
      date: checklistDate.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('[Shift Assignment] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shift assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist/shift
 * Create or update shift assignment (primary + buddy)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/manager permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER_IT'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { date, shiftType, primaryUserId, primaryType, buddyUserId, buddyType } = body as {
      date: string;
      shiftType: ChecklistShiftType;
      primaryUserId: string;
      primaryType: ChecklistType;
      buddyUserId?: string;
      buddyType?: ChecklistType;
    };

    if (!date || !shiftType || !primaryUserId || !primaryType) {
      return NextResponse.json(
        { error: 'Missing required fields: date, shiftType, primaryUserId, primaryType' },
        { status: 400 }
      );
    }

    const checklistDate = new Date(date);
    checklistDate.setHours(0, 0, 0, 0);

    // Check if assignment already exists
    const existing = await prisma.shiftAssignmentV2.findFirst({
      where: {
        date: checklistDate,
        shiftType,
      },
    });

    let assignment;

    if (existing) {
      // Update existing assignment
      assignment = await prisma.shiftAssignmentV2.update({
        where: { id: existing.id },
        data: {
          primaryUserId,
          primaryType,
          buddyUserId: buddyUserId || null,
          buddyType: buddyType || null,
          updatedAt: new Date(),
        },
        include: {
          primaryUser: {
            select: { id: true, name: true, username: true, checklistType: true },
          },
          buddyUser: {
            select: { id: true, name: true, username: true, checklistType: true },
          },
        },
      });
    } else {
      // Create new assignment
      assignment = await prisma.shiftAssignmentV2.create({
        data: {
          date: checklistDate,
          shiftType,
          primaryUserId,
          primaryType,
          buddyUserId: buddyUserId || null,
          buddyType: buddyType || null,
          createdById: session.user.id,
        },
        include: {
          primaryUser: {
            select: { id: true, name: true, username: true, checklistType: true },
          },
          buddyUser: {
            select: { id: true, name: true, username: true, checklistType: true },
          },
        },
      });
    }

    return NextResponse.json({
      assignment,
      message: existing ? 'Shift assignment updated' : 'Shift assignment created',
    }, { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('[Shift Assignment] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create shift assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/shift
 * Delete a shift assignment
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/manager permissions
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN', 'MANAGER_IT'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing assignment ID' }, { status: 400 });
    }

    await prisma.shiftAssignmentV2.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Shift assignment deleted' });
  } catch (error) {
    console.error('[Shift Assignment] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete shift assignment' },
      { status: 500 }
    );
  }
}
