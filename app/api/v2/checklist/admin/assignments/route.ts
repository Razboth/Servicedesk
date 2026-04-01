import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistUnit, ChecklistShiftType, ChecklistRole } from '@prisma/client';

/**
 * GET /api/v2/checklist/admin/assignments
 * Get all assignments with filters for admin management
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const unit = searchParams.get('unit') as ChecklistUnit | null;
    const shiftType = searchParams.get('shiftType') as ChecklistShiftType | null;
    const getUsers = searchParams.get('getUsers') === 'true';

    // If requesting available users
    if (getUsers) {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: ['TECHNICIAN', 'MANAGER_IT', 'ADMIN'] },
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ users });
    }

    // Build where clause for checklists
    const whereClause: {
      date?: Date;
      unit?: ChecklistUnit;
      shiftType?: ChecklistShiftType;
    } = {};

    if (date) {
      whereClause.date = new Date(date);
    }
    if (unit) {
      whereClause.unit = unit;
    }
    if (shiftType) {
      whereClause.shiftType = shiftType;
    }

    // Get checklists with assignments
    const checklists = await prisma.dailyChecklistV2.findMany({
      where: whereClause,
      include: {
        assignments: {
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
          orderBy: { assignedAt: 'asc' },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [
        { date: 'desc' },
        { unit: 'asc' },
        { shiftType: 'asc' },
      ],
    });

    // Calculate progress for each checklist
    const checklistsWithProgress = await Promise.all(
      checklists.map(async (checklist) => {
        const itemStats = await prisma.checklistItemV2.groupBy({
          by: ['status'],
          where: { checklistId: checklist.id },
          _count: { status: true },
        });

        const stats = {
          total: checklist._count.items,
          completed: itemStats.find((s) => s.status === 'COMPLETED')?._count.status || 0,
          failed: itemStats.find((s) => s.status === 'FAILED')?._count.status || 0,
          pending: itemStats.find((s) => s.status === 'PENDING')?._count.status || 0,
        };

        return {
          ...checklist,
          stats,
          staffCount: checklist.assignments.filter((a) => a.role === 'STAFF').length,
          hasSupervisor: checklist.assignments.some((a) => a.role === 'SUPERVISOR'),
        };
      })
    );

    return NextResponse.json({
      checklists: checklistsWithProgress,
    });
  } catch (error) {
    console.error('[Admin Assignments] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assignments' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist/admin/assignments
 * Assign user to a checklist (creates checklist if not exists)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { date, unit, shiftType, userId, role } = body as {
      date: string;
      unit: ChecklistUnit;
      shiftType: ChecklistShiftType;
      userId: string;
      role: ChecklistRole;
    };

    if (!date || !unit || !shiftType || !userId || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: date, unit, shiftType, userId, role' },
        { status: 400 }
      );
    }

    // Verify user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, username: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find or create checklist
    let checklist = await prisma.dailyChecklistV2.findUnique({
      where: {
        date_unit_shiftType: {
          date: new Date(date),
          unit,
          shiftType,
        },
      },
      include: {
        assignments: true,
      },
    });

    if (!checklist) {
      // Create checklist with items from templates
      const templates = await prisma.checklistTemplateV2.findMany({
        where: {
          unit,
          shiftType,
          isActive: true,
        },
        orderBy: [
          { section: 'asc' },
          { order: 'asc' },
        ],
      });

      checklist = await prisma.dailyChecklistV2.create({
        data: {
          date: new Date(date),
          unit,
          shiftType,
          status: 'PENDING',
          items: {
            create: templates.map((t) => ({
              templateId: t.id,
              section: t.section,
              sectionTitle: t.sectionTitle,
              itemNumber: t.itemNumber,
              title: t.title,
              description: t.description,
              toolSystem: t.toolSystem,
              timeSlot: t.timeSlot,
              isRequired: t.isRequired,
              order: t.order,
              status: 'PENDING',
            })),
          },
        },
        include: {
          assignments: true,
        },
      });
    }

    // Check if user is already assigned
    const existingAssignment = checklist.assignments.find((a) => a.userId === userId);
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'User is already assigned to this checklist' },
        { status: 409 }
      );
    }

    // Check supervisor limit
    if (role === 'SUPERVISOR') {
      const existingSupervisor = checklist.assignments.find((a) => a.role === 'SUPERVISOR');
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
        checklistId: checklist.id,
        userId,
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
        checklist: {
          select: {
            id: true,
            date: true,
            unit: true,
            shiftType: true,
          },
        },
      },
    });

    return NextResponse.json({
      assignment,
      message: `${targetUser.name} assigned as ${role}`,
    }, { status: 201 });
  } catch (error) {
    console.error('[Admin Assignments] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create assignment' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/admin/assignments
 * Remove an assignment
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || !['MANAGER_IT', 'ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const checklistId = searchParams.get('checklistId');
    const userId = searchParams.get('userId');

    if (!assignmentId && (!checklistId || !userId)) {
      return NextResponse.json(
        { error: 'Missing required parameters: assignmentId or (checklistId + userId)' },
        { status: 400 }
      );
    }

    let assignment;

    if (assignmentId) {
      assignment = await prisma.checklistAssignmentV2.findUnique({
        where: { id: assignmentId },
        include: { user: { select: { name: true } } },
      });
    } else {
      assignment = await prisma.checklistAssignmentV2.findUnique({
        where: {
          checklistId_userId: {
            checklistId: checklistId!,
            userId: userId!,
          },
        },
        include: { user: { select: { name: true } } },
      });
    }

    if (!assignment) {
      return NextResponse.json(
        { error: 'Assignment not found' },
        { status: 404 }
      );
    }

    // Check if user has completed any items
    const completedItems = await prisma.checklistItemV2.count({
      where: {
        checklistId: assignment.checklistId,
        completedById: assignment.userId,
        status: { not: 'PENDING' },
      },
    });

    if (completedItems > 0) {
      return NextResponse.json(
        { error: `Cannot remove assignment - ${assignment.user.name} has completed ${completedItems} items` },
        { status: 400 }
      );
    }

    // Delete assignment
    await prisma.checklistAssignmentV2.delete({
      where: { id: assignment.id },
    });

    return NextResponse.json({
      message: `Assignment removed for ${assignment.user.name}`,
    });
  } catch (error) {
    console.error('[Admin Assignments] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}
