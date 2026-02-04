import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get checklist history for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 30;

    // Get all checklists for this user, grouped by date
    const checklists = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        date: true,
        checklistType: true,
        status: true,
        completedAt: true,
        items: {
          select: {
            status: true,
          },
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
    });

    // Group by date
    const groupedByDate: Record<string, {
      date: string;
      checklists: {
        id: string;
        type: string;
        status: string;
        completedAt: string | null;
        stats: {
          total: number;
          completed: number;
          pending: number;
        };
      }[];
    }> = {};

    checklists.forEach((checklist) => {
      const dateKey = new Date(checklist.date).toISOString().split('T')[0];

      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = {
          date: dateKey,
          checklists: [],
        };
      }

      groupedByDate[dateKey].checklists.push({
        id: checklist.id,
        type: checklist.checklistType,
        status: checklist.status,
        completedAt: checklist.completedAt?.toISOString() || null,
        stats: {
          total: checklist.items.length,
          completed: checklist.items.filter((i) => i.status === 'COMPLETED' || i.status === 'SKIPPED').length,
          pending: checklist.items.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedByDate),
    });
  } catch (error) {
    console.error('Error fetching checklist history:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil riwayat checklist' },
      { status: 500 }
    );
  }
}
