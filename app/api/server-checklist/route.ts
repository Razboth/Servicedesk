import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage } from '@/lib/time-lock';

// GET - Get or create today's server access checklist
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has server access
    const staffProfile = await prisma.staffShiftProfile.findFirst({
      where: {
        userId: session.user.id,
        hasServerAccess: true,
      },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: 'Anda tidak memiliki akses server' },
        { status: 403 }
      );
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find existing checklist for today
    let checklist = await prisma.serverAccessDailyChecklist.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { order: 'asc' }],
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // If no checklist exists, create one from templates
    if (!checklist) {
      const templates = await prisma.serverAccessChecklistTemplate.findMany({
        where: { isActive: true },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      });

      checklist = await prisma.serverAccessDailyChecklist.create({
        data: {
          userId: session.user.id,
          date: today,
          status: 'PENDING',
          items: {
            create: templates.map((template) => ({
              title: template.title,
              description: template.description,
              category: template.category,
              order: template.order,
              isRequired: template.isRequired,
              status: 'PENDING',
              unlockTime: template.unlockTime,
            })),
          },
        },
        include: {
          items: {
            orderBy: [{ category: 'asc' }, { order: 'asc' }],
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    }

    // Add lock status to each item
    const now = new Date();
    const itemsWithLockStatus = checklist.items.map((item) => ({
      ...item,
      isLocked: !isItemUnlocked(item.unlockTime, now),
      lockMessage: getLockStatusMessage(item.unlockTime, now),
    }));

    // Calculate stats
    const stats = {
      total: checklist.items.length,
      completed: checklist.items.filter((i) => i.status === 'COMPLETED').length,
      pending: checklist.items.filter((i) => i.status === 'PENDING').length,
      inProgress: checklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
      skipped: checklist.items.filter((i) => i.status === 'SKIPPED').length,
      locked: itemsWithLockStatus.filter((i) => i.isLocked).length,
    };

    return NextResponse.json({
      ...checklist,
      items: itemsWithLockStatus,
      stats,
    });
  } catch (error) {
    console.error('Error fetching server checklist:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil checklist server' },
      { status: 500 }
    );
  }
}
