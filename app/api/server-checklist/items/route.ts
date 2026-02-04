import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage, getCurrentTimeWITA } from '@/lib/time-lock';
import { DailyChecklistType, ShiftType } from '@prisma/client';

// Checklist types that require server access
const SERVER_CHECKLIST_TYPES: DailyChecklistType[] = ['SERVER_SIANG', 'SERVER_MALAM'];

// Checklist types for operational shift (STANDBY_BRANCH)
const OPS_CHECKLIST_TYPES: DailyChecklistType[] = ['HARIAN', 'AKHIR_HARI'];

// Shifts that can access HARIAN/AKHIR_HARI
const HARIAN_SHIFTS: ShiftType[] = ['STANDBY_BRANCH'];

// PUT - Update checklist items
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { items, checklistType } = body as {
      items: Array<{
        id: string;
        status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
        notes?: string;
      }>;
      checklistType?: DailyChecklistType;
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Get staff profile
    const staffProfile = await prisma.staffShiftProfile.findFirst({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    if (!staffProfile) {
      return NextResponse.json(
        { error: 'Profil staff tidak ditemukan' },
        { status: 403 }
      );
    }

    // Determine checklist type from the first item if not provided
    let actualChecklistType = checklistType;
    if (!actualChecklistType && items.length > 0) {
      const firstItem = await prisma.serverAccessChecklistItem.findUnique({
        where: { id: items[0].id },
        include: { checklist: true },
      });
      actualChecklistType = firstItem?.checklist?.checklistType;
    }

    // Access control based on checklist type
    if (actualChecklistType && SERVER_CHECKLIST_TYPES.includes(actualChecklistType)) {
      // Server checklists require server access
      if (!staffProfile.hasServerAccess) {
        return NextResponse.json(
          { error: 'Anda tidak memiliki akses server' },
          { status: 403 }
        );
      }
    } else if (actualChecklistType && OPS_CHECKLIST_TYPES.includes(actualChecklistType)) {
      // HARIAN/AKHIR_HARI require STANDBY_BRANCH shift
      // Get today's date in WITA
      const now = new Date();
      const witaOffset = 8 * 60;
      const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
      const witaMinutes = utcMinutes + witaOffset;

      let witaYear = now.getUTCFullYear();
      let witaMonth = now.getUTCMonth();
      let witaDay = now.getUTCDate();

      if (witaMinutes >= 24 * 60) {
        const tempDate = new Date(Date.UTC(witaYear, witaMonth, witaDay + 1));
        witaYear = tempDate.getUTCFullYear();
        witaMonth = tempDate.getUTCMonth();
        witaDay = tempDate.getUTCDate();
      }

      const todayUTC = new Date(Date.UTC(witaYear, witaMonth, witaDay, 0, 0, 0, 0));

      const currentShift = await prisma.shiftAssignment.findFirst({
        where: {
          staffProfileId: staffProfile.id,
          date: todayUTC,
        },
      });

      if (!currentShift || !HARIAN_SHIFTS.includes(currentShift.shiftType)) {
        return NextResponse.json(
          { error: 'Checklist ini hanya untuk shift STANDBY_BRANCH' },
          { status: 403 }
        );
      }
    }

    const now = getCurrentTimeWITA();
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
