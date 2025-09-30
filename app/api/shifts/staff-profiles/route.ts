import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/shifts/staff-profiles
 * List staff shift profiles for a branch
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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
    const session = await getServerSession(authOptions);

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
      canWorkNightShift,
      canWorkWeekendDay,
      hasServerAccess,
      hasSabbathRestriction,
      preferredShiftType,
      maxNightShiftsPerMonth,
      minDaysBetweenNightShifts,
      isActive,
    } = body;

    if (!userId || !branchId) {
      return NextResponse.json(
        { error: 'userId and branchId are required' },
        { status: 400 }
      );
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
          canWorkNightShift,
          canWorkWeekendDay,
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
          canWorkNightShift: canWorkNightShift ?? false,
          canWorkWeekendDay: canWorkWeekendDay ?? false,
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