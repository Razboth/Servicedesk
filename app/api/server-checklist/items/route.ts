import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage } from '@/lib/time-lock';

// PUT - Update checklist items
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body as {
      items: Array<{
        id: string;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
        notes?: string;
      }>;
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
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

    const now = new Date();
    const updatedItems = [];
    const errors = [];

    for (const item of items) {
      // Fetch the item with its checklist
      const existingItem = await prisma.serverAccessChecklistItem.findUnique({
        where: { id: item.id },
        include: {
          checklist: true,
        },
      });

      if (!existingItem) {
        errors.push({ id: item.id, error: 'Item tidak ditemukan' });
        continue;
      }

      // Verify ownership
      if (existingItem.checklist.userId !== session.user.id) {
        errors.push({ id: item.id, error: 'Tidak memiliki akses ke item ini' });
        continue;
      }

      // Check time-lock for completing items
      if (item.status === 'COMPLETED' && !isItemUnlocked(existingItem.unlockTime, now)) {
        errors.push({
          id: item.id,
          error: `Item masih terkunci. ${getLockStatusMessage(existingItem.unlockTime, now)}`,
        });
        continue;
      }

      // Update the item
      const updatedItem = await prisma.serverAccessChecklistItem.update({
        where: { id: item.id },
        data: {
          status: item.status,
          notes: item.notes,
          completedAt: item.status === 'COMPLETED' ? now : null,
        },
      });

      updatedItems.push({
        ...updatedItem,
        isLocked: !isItemUnlocked(updatedItem.unlockTime, now),
        lockMessage: getLockStatusMessage(updatedItem.unlockTime, now),
      });
    }

    // Update checklist status if needed
    if (updatedItems.length > 0) {
      const checklistId = (
        await prisma.serverAccessChecklistItem.findUnique({
          where: { id: items[0].id },
          select: { checklistId: true },
        })
      )?.checklistId;

      if (checklistId) {
        const allItems = await prisma.serverAccessChecklistItem.findMany({
          where: { checklistId },
        });

        const allCompleted = allItems.every(
          (i) => i.status === 'COMPLETED' || i.status === 'SKIPPED'
        );
        const anyInProgress = allItems.some(
          (i) => i.status === 'IN_PROGRESS' || i.status === 'COMPLETED'
        );

        await prisma.serverAccessDailyChecklist.update({
          where: { id: checklistId },
          data: {
            status: allCompleted ? 'COMPLETED' : anyInProgress ? 'IN_PROGRESS' : 'PENDING',
            completedAt: allCompleted ? now : null,
          },
        });
      }
    }

    // Calculate stats
    const stats = {
      updated: updatedItems.length,
      errors: errors.length,
    };

    return NextResponse.json({
      items: updatedItems,
      errors: errors.length > 0 ? errors : undefined,
      stats,
    });
  } catch (error) {
    console.error('Error updating server checklist items:', error);
    return NextResponse.json(
      { error: 'Gagal memperbarui checklist' },
      { status: 500 }
    );
  }
}
