import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistRole } from '@prisma/client';

/**
 * POST /api/v2/checklist/assign
 * Assign a user to a checklist as Staff or Supervisor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { checklistId, userId, role } = body as {
      checklistId: string;
      userId?: string;
      role: ChecklistRole;
    };

    if (!checklistId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: checklistId, role' },
        { status: 400 }
      );
    }

    // Default to current user if userId not specified
    const targetUserId = userId || session.user.id;

    // Verify checklist exists
    const checklist = await prisma.dailyChecklistV2.findUnique({
      where: { id: checklistId },
      include: {
        assignments: true,
      },
    });

    if (!checklist) {
      return NextResponse.json(
        { error: 'Checklist not found' },
        { status: 404 }
      );
    }

    // Check if user is already assigned
    const existingAssignment = checklist.assignments.find(a => a.userId === targetUserId);
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this checklist' },
        { status: 409 }
      );
    }

    // Check supervisor limit (only 1 supervisor allowed)
    if (role === 'SUPERVISOR') {
      const existingSupervisor = checklist.assignments.find(a => a.role === 'SUPERVISOR');
      if (existingSupervisor) {
        return NextResponse.json(
          { error: 'A supervisor is already assigned to this checklist' },
          { status: 409 }
        );
      }
    }

    // Create assignment
    const assignment = await prisma.checklistAssignmentV2.create({
      data: {
        checklistId,
        userId: targetUserId,
        role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Update checklist status to IN_PROGRESS if it was PENDING
    if (checklist.status === 'PENDING') {
      await prisma.dailyChecklistV2.update({
        where: { id: checklistId },
        data: { status: 'IN_PROGRESS' },
      });
    }

    return NextResponse.json({
      assignment,
      message: `User assigned as ${role}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[Checklist V2] Assign POST error:', error);
    return NextResponse.json(
      { error: 'Failed to assign user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/assign
 * Remove a user's assignment from a checklist
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('checklistId');
    const userId = searchParams.get('userId') || session.user.id;

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Missing required parameter: checklistId' },
        { status: 400 }
      );
    }

    // Find the assignment
    const assignment = await prisma.checklistAssignmentV2.findUnique({
      where: {
        checklistId_userId: {
          checklistId,
          userId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if any items are completed by this user
    const completedItems = await prisma.checklistItemV2.count({
      where: {
        checklistId,
        completedById: userId,
        status: { not: 'PENDING' },
      },
    });

    if (completedItems > 0) {
      return NextResponse.json(
        { error: 'Cannot remove assignment - user has completed items' },
        { status: 400 }
      );
    }

    // Delete the assignment
    await prisma.checklistAssignmentV2.delete({
      where: {
        checklistId_userId: {
          checklistId,
          userId,
        },
      },
    });

    return NextResponse.json({
      message: 'Assignment removed successfully',
    });
  } catch (error) {
    console.error('[Checklist V2] Assign DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v2/checklist/assign
 * Get assignments for a checklist
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('checklistId');

    if (!checklistId) {
      return NextResponse.json(
        { error: 'Missing required parameter: checklistId' },
        { status: 400 }
      );
    }

    const assignments = await prisma.checklistAssignmentV2.findMany({
      where: { checklistId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' }, // STAFF comes before SUPERVISOR alphabetically, but we want SUPERVISOR first
        { assignedAt: 'asc' },
      ],
    });

    // Sort with SUPERVISOR first
    const sortedAssignments = [
      ...assignments.filter(a => a.role === 'SUPERVISOR'),
      ...assignments.filter(a => a.role === 'STAFF'),
    ];

    const staffCount = assignments.filter(a => a.role === 'STAFF').length;
    const hasSupervisor = assignments.some(a => a.role === 'SUPERVISOR');

    return NextResponse.json({
      assignments: sortedAssignments,
      staffCount,
      hasSupervisor,
    });
  } catch (error) {
    console.error('[Checklist V2] Assign GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}
