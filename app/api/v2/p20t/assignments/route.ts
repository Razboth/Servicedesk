import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { P20TCategory, P20TShift } from '@prisma/client';

// GET /api/v2/p20t/assignments - List assignments with optional filters
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const shift = searchParams.get('shift') as P20TShift | null;
    const category = searchParams.get('category') as P20TCategory | null;

    const where: {
      date?: Date | { gte: Date; lte: Date };
      shift?: P20TShift;
      category?: P20TCategory;
    } = {};

    // Support both single date and date range
    // Parse date strings properly - extract year/month/day and create UTC date
    if (startDate && endDate) {
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      where.date = {
        gte: new Date(Date.UTC(startYear, startMonth - 1, startDay)),
        lte: new Date(Date.UTC(endYear, endMonth - 1, endDay)),
      };
    } else if (dateParam) {
      const [year, month, day] = dateParam.split('-').map(Number);
      where.date = new Date(Date.UTC(year, month - 1, day));
    }

    if (shift) {
      where.shift = shift;
    }
    if (category) {
      where.category = category;
    }

    const assignments = await prisma.p20TAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ date: 'asc' }, { shift: 'asc' }, { category: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: assignments,
    });
  } catch (error) {
    console.error('Error fetching P20T assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/v2/p20t/assignments - Create new assignment
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
    const { date, shift, category, userId } = body;

    if (!date || !shift || !category || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Parse date string properly - extract year/month/day and create UTC date
    const [year, month, day] = date.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, day));

    // Check if user already has an assignment for this date (any category)
    const existingUserAssignment = await prisma.p20TAssignment.findFirst({
      where: {
        date: parsedDate,
        shift,
        userId,
      },
    });

    if (existingUserAssignment) {
      return NextResponse.json(
        { error: 'User sudah ditugaskan ke kategori lain pada tanggal dan shift ini' },
        { status: 400 }
      );
    }

    // Check if this slot (date + shift + category) is already assigned
    const existingSlotAssignment = await prisma.p20TAssignment.findUnique({
      where: {
        date_shift_category: {
          date: parsedDate,
          shift,
          category,
        },
      },
    });

    if (existingSlotAssignment) {
      return NextResponse.json(
        { error: 'Slot ini sudah memiliki penugasan' },
        { status: 400 }
      );
    }

    const assignment = await prisma.p20TAssignment.create({
      data: {
        date: parsedDate,
        shift,
        category,
        userId,
        createdById: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    console.error('Error creating P20T assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
