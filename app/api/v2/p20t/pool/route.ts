import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v2/p20t/pool - Get all users in the P20T pool
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const poolUsers = await prisma.p20TUserPool.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: poolUsers,
    });
  } catch (error) {
    console.error('Error fetching P20T pool:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v2/p20t/pool - Update the P20T pool (replace all)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds must be an array' }, { status: 400 });
    }

    // Delete all existing pool entries and create new ones
    await prisma.$transaction([
      prisma.p20TUserPool.deleteMany({}),
      prisma.p20TUserPool.createMany({
        data: userIds.map((userId: string) => ({ userId })),
      }),
    ]);

    // Fetch the updated pool
    const poolUsers = await prisma.p20TUserPool.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        user: {
          name: 'asc',
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: poolUsers,
    });
  } catch (error) {
    console.error('Error updating P20T pool:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
