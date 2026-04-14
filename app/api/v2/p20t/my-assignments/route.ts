import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/v2/p20t/my-assignments - Get current user's P20T assignments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Build where clause
    const where: { userId: string; date?: Date } = {
      userId: session.user.id,
    };

    if (dateParam) {
      // Parse date string properly - extract year/month/day and create UTC date
      const [year, month, day] = dateParam.split('-').map(Number);
      where.date = new Date(Date.UTC(year, month - 1, day));
    }

    const assignments = await prisma.p20TAssignment.findMany({
      where,
      orderBy: [{ date: 'desc' }, { shift: 'asc' }],
    });

    // Check if user is in pool
    const isInPool = await prisma.p20TUserPool.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json({
      success: true,
      data: {
        assignments,
        isInPool: !!isInPool,
      },
    });
  } catch (error) {
    console.error('Error fetching my P20T assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
