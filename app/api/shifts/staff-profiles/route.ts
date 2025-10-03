import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/staff-profiles
 * List staff shift profiles for a branch
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (isActive !== null) where.isActive = isActive === 'true';

    const profiles = await prisma.staffShiftProfile.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            shiftAssignments: true,
            leaveRequests: true,
            onCallAssignments: true,
          },
        },
      },
      orderBy: [{ isActive: 'desc' }, { user: { name: 'asc' } }],
    });

    return NextResponse.json({
      success: true,
      data: profiles,
    });
  } catch (error: any) {
    console.error('Error fetching staff shift profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch staff shift profiles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shifts/staff-profiles
 * Create or update staff shift profile
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      userId,
      branchId,
      canWorkType1, // Type 1: NIGHT_WEEKDAY
      canWorkType2, // Type 2: DAY_WEEKEND
      canWorkType3, // Type 3: NIGHT_WEEKEND
      canWorkType4, // Type 4: STANDBY_ONCALL
      canWorkType5, // Type 5: STANDBY_BRANCH
      hasServerAccess,
      hasSabbathRestriction,
      preferredShiftType,
      maxNightShiftsPerMonth,
      minDaysBetweenNightShifts,
      isActive,
    } = body;

    const canWorkType1Value = canWorkType1 ?? false;
    const canWorkType2Value = canWorkType2 ?? false;
    const canWorkType3Value = canWorkType3 ?? false;
    const canWorkType4Value = canWorkType4 ?? false;
    const canWorkType5Value = canWorkType5 ?? false;

    if (!userId || !branchId) {
      return NextResponse.json(
        { error: 'userId and branchId are required' },
        { status: 400 }
      );
    }

    // SERVER ACCESS VALIDATION
    // Rule: Server staff can ONLY work Types 1, 3, 4
    // Rule: Non-server staff can ONLY work Types 1, 2, 3, 5
    if (hasServerAccess) {
      // Server staff validation
      if (canWorkType2Value) {
        return NextResponse.json(
          { error: 'Server staff cannot work Type 2 (Day Weekend). They can only work Types 1, 3, and 4.' },
          { status: 400 }
        );
      }
      if (canWorkType5Value) {
        return NextResponse.json(
          { error: 'Server staff cannot work Type 5 (Standby Branch). They can only work Types 1, 3, and 4.' },
          { status: 400 }
        );
      }
    } else {
      // Non-server staff validation
      if (canWorkType4Value) {
        return NextResponse.json(
          { error: 'Only server staff can work Type 4 (Standby On-Call). Non-server staff can work Types 1, 2, 3, and 5.' },
          { status: 400 }
        );
      }
    }

    // Check if profile already exists
    const existing = await prisma.staffShiftProfile.findUnique({
      where: { userId },
    });

    let profile;
    if (existing) {
      // Update existing profile
      profile = await prisma.staffShiftProfile.update({
        where: { userId },
        data: {
          branchId,
          canWorkType1: canWorkType1Value,
          canWorkType2: canWorkType2Value,
          canWorkType3: canWorkType3Value,
          canWorkType4: canWorkType4Value,
          canWorkType5: canWorkType5Value,
          hasServerAccess,
          hasSabbathRestriction,
          preferredShiftType,
          maxNightShiftsPerMonth,
          minDaysBetweenNightShifts,
          isActive,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    } else {
      // Create new profile
      profile = await prisma.staffShiftProfile.create({
        data: {
          userId,
          branchId,
          canWorkType1: canWorkType1Value,
          canWorkType2: canWorkType2Value,
          canWorkType3: canWorkType3Value,
          canWorkType4: canWorkType4Value,
          canWorkType5: canWorkType5Value,
          hasServerAccess: hasServerAccess ?? false,
          hasSabbathRestriction: hasSabbathRestriction ?? false,
          preferredShiftType: preferredShiftType ?? null,
          maxNightShiftsPerMonth: maxNightShiftsPerMonth ?? 5,
          minDaysBetweenNightShifts: minDaysBetweenNightShifts ?? 3,
          isActive: isActive ?? true,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: profile,
      message: existing ? 'Profile updated successfully' : 'Profile created successfully',
    });
  } catch (error: any) {
    console.error('Error creating/updating staff shift profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create/update staff shift profile' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shifts/staff-profiles?userId=xxx
 * Delete staff shift profile
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['MANAGER', 'MANAGER_IT', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const profile = await prisma.staffShiftProfile.findUnique({
      where: { userId },
      include: {
        _count: {
          select: {
            shiftAssignments: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: 'Staff profile not found' },
        { status: 404 }
      );
    }

    // Check if profile has any shift assignments
    if (profile._count.shiftAssignments > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete profile with existing shift assignments. Set profile to inactive instead.',
          assignmentCount: profile._count.shiftAssignments
        },
        { status: 400 }
      );
    }

    // Delete the profile
    await prisma.staffShiftProfile.delete({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff profile deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting staff shift profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete staff shift profile' },
      { status: 500 }
    );
  }
}