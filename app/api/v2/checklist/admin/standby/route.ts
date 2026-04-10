import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ChecklistType } from '@prisma/client';

/**
 * GET /api/v2/checklist/admin/standby
 * Get all standby users or available users to add
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
    const checklistType = searchParams.get('checklistType') as ChecklistType | null;
    const getAvailable = searchParams.get('getAvailable') === 'true';

    // Get users NOT in standby pool (to add)
    if (getAvailable) {
      const standbyUserIds = await prisma.checklistStandbyV2.findMany({
        select: { userId: true },
      });
      const standbyIds = standbyUserIds.map((s) => s.userId);

      const availableUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          id: { notIn: standbyIds },
        },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          checklistType: true,
        },
        orderBy: { name: 'asc' },
      });

      return NextResponse.json({ users: availableUsers });
    }

    // Get standby users
    const whereClause: { checklistType?: ChecklistType; isActive?: boolean } = {};
    if (checklistType) {
      whereClause.checklistType = checklistType;
    }

    const standbyUsers = await prisma.checklistStandbyV2.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            checklistType: true,
          },
        },
        addedBy: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return NextResponse.json({ standbyUsers });
  } catch (error) {
    console.error('[Admin Standby] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standby users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v2/checklist/admin/standby
 * Add user to standby pool
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
    const { userId, checklistType, canBePrimary, canBeBuddy } = body as {
      userId: string;
      checklistType: ChecklistType;
      canBePrimary?: boolean;
      canBeBuddy?: boolean;
    };

    if (!userId || !checklistType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, checklistType' },
        { status: 400 }
      );
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already in standby
    const existing = await prisma.checklistStandbyV2.findUnique({
      where: { userId },
    });

    if (existing) {
      // Update if different
      const updated = await prisma.checklistStandbyV2.update({
        where: { userId },
        data: {
          checklistType,
          canBePrimary: canBePrimary ?? true,
          canBeBuddy: canBeBuddy ?? true,
          isActive: true,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true, checklistType: true },
          },
        },
      });
      return NextResponse.json({
        standbyUser: updated,
        message: `${targetUser.name} updated to ${checklistType}`,
      });
    }

    // Add to standby pool and update user's checklistType
    const [standbyUser] = await prisma.$transaction([
      prisma.checklistStandbyV2.create({
        data: {
          userId,
          checklistType,
          canBePrimary: canBePrimary ?? true,
          canBeBuddy: canBeBuddy ?? true,
          addedById: session.user.id,
        },
        include: {
          user: {
            select: { id: true, name: true, username: true, role: true, checklistType: true },
          },
        },
      }),
      // Also update user's checklistType
      prisma.user.update({
        where: { id: userId },
        data: { checklistType },
      }),
    ]);

    return NextResponse.json(
      {
        standbyUser,
        message: `${targetUser.name} added to standby pool`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Admin Standby] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add to standby pool' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v2/checklist/admin/standby
 * Update standby user settings
 */
export async function PUT(request: NextRequest) {
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
    const { id, checklistType, canBePrimary, canBeBuddy, isActive } = body as {
      id: string;
      checklistType?: ChecklistType;
      canBePrimary?: boolean;
      canBeBuddy?: boolean;
      isActive?: boolean;
    };

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (checklistType !== undefined) updateData.checklistType = checklistType;
    if (canBePrimary !== undefined) updateData.canBePrimary = canBePrimary;
    if (canBeBuddy !== undefined) updateData.canBeBuddy = canBeBuddy;
    if (isActive !== undefined) updateData.isActive = isActive;

    const standbyUser = await prisma.checklistStandbyV2.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, name: true, username: true, role: true },
        },
      },
    });

    return NextResponse.json({
      standbyUser,
      message: 'Standby user updated',
    });
  } catch (error) {
    console.error('[Admin Standby] PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update standby user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v2/checklist/admin/standby
 * Remove user from standby pool
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
    const standbyId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!standbyId && !userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: id or userId' },
        { status: 400 }
      );
    }

    let standby;
    if (standbyId) {
      standby = await prisma.checklistStandbyV2.findUnique({
        where: { id: standbyId },
        include: { user: { select: { name: true } } },
      });
    } else {
      standby = await prisma.checklistStandbyV2.findUnique({
        where: { userId: userId! },
        include: { user: { select: { name: true } } },
      });
    }

    if (!standby) {
      return NextResponse.json(
        { error: 'Standby entry not found' },
        { status: 404 }
      );
    }

    await prisma.checklistStandbyV2.delete({
      where: { id: standby.id },
    });

    return NextResponse.json({
      message: `${standby.user.name} removed from standby pool`,
    });
  } catch (error) {
    console.error('[Admin Standby] DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove from standby pool' },
      { status: 500 }
    );
  }
}
