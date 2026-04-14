import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { P20TCategory, P20TShift } from '@prisma/client';

// GET /api/v2/p20t/checklist - Get checklist for a date/shift/category
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is in P20T pool
    const isInPool = await prisma.p20TUserPool.findUnique({
      where: { userId: session.user.id },
    });

    // Also allow admins to view
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

    if (!isInPool && !isAdmin) {
      return NextResponse.json({ error: 'Anda tidak memiliki akses ke P20T' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const shift = searchParams.get('shift') as P20TShift | null;
    const category = searchParams.get('category') as P20TCategory | null;

    if (!dateParam || !shift || !category) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Parse date string properly - extract year/month/day and create UTC date
    // This ensures consistent date handling regardless of timezone
    const [year, month, day] = dateParam.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    // Get or create daily checklist
    let checklist = await prisma.p20TDailyChecklist.findUnique({
      where: {
        date_shift_category: { date, shift, category },
      },
      include: {
        items: {
          include: {
            template: true,
            completedBy: {
              select: { id: true, name: true },
            },
          },
          orderBy: {
            template: { orderIndex: 'asc' },
          },
        },
      },
    });

    // If no checklist exists, create one with items from templates
    if (!checklist) {
      const templates = await prisma.p20TChecklistTemplate.findMany({
        where: { category, isActive: true },
        orderBy: [{ section: 'asc' }, { orderIndex: 'asc' }],
      });

      if (templates.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            checklist: null,
            assignment: null,
            canEdit: false,
            message: 'Belum ada template checklist untuk kategori ini',
          },
        });
      }

      checklist = await prisma.p20TDailyChecklist.create({
        data: {
          date,
          shift,
          category,
          items: {
            create: templates.map((t) => ({
              templateId: t.id,
            })),
          },
        },
        include: {
          items: {
            include: {
              template: true,
              completedBy: {
                select: { id: true, name: true },
              },
            },
            orderBy: {
              template: { orderIndex: 'asc' },
            },
          },
        },
      });
    }

    // Get assignment for this date/shift/category
    const assignment = await prisma.p20TAssignment.findUnique({
      where: {
        date_shift_category: { date, shift, category },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Check if current user can edit (is the assigned user)
    const canEdit = assignment?.userId === session.user.id;

    // Group items by section
    const itemsBySection = checklist.items.reduce((acc, item) => {
      const section = item.template.section;
      if (!acc[section]) {
        acc[section] = [];
      }
      acc[section].push(item);
      return acc;
    }, {} as Record<string, typeof checklist.items>);

    return NextResponse.json({
      success: true,
      data: {
        checklist,
        itemsBySection,
        assignment,
        canEdit,
      },
    });
  } catch (error) {
    console.error('Error fetching P20T checklist:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
