import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage, getCurrentTimeWITA } from '@/lib/time-lock';
import { DailyChecklistType, ShiftType } from '@prisma/client';

// Checklist types that require server access
const SERVER_CHECKLIST_TYPES: DailyChecklistType[] = [
  'MONITORING_SIANG',
  'MONITORING_MALAM',
];

// Shift types for OPS_SIANG (auto-assign to day shift staff)
const OPS_SIANG_SHIFTS: ShiftType[] = [
  'STANDBY_BRANCH',
  'DAY_WEEKEND',
];

// Shift types for OPS_MALAM (night shifts without server access)
const OPS_MALAM_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKEND',
];

// Shift types for MONITORING_MALAM (night shifts with server access)
const MONITORING_MALAM_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
];

// Night shift types for checking previous day shifts
const NIGHT_STANDBY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
  'STANDBY_ONCALL',
];

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
        data?: Record<string, unknown>; // JSON data for special input types
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

    // Get today's date in WITA and check shift
    const nowDate = new Date();
    const witaOffset = 8 * 60;
    const utcMinutes = nowDate.getUTCHours() * 60 + nowDate.getUTCMinutes();
    const witaMinutes = utcMinutes + witaOffset;

    let witaYear = nowDate.getUTCFullYear();
    let witaMonth = nowDate.getUTCMonth();
    let witaDay = nowDate.getUTCDate();
    const witaHour = Math.floor((witaMinutes % (24 * 60)) / 60);
    const isEarlyMorning = witaHour >= 0 && witaHour < 8;

    if (witaMinutes >= 24 * 60) {
      const tempDate = new Date(Date.UTC(witaYear, witaMonth, witaDay + 1));
      witaYear = tempDate.getUTCFullYear();
      witaMonth = tempDate.getUTCMonth();
      witaDay = tempDate.getUTCDate();
    }

    const todayUTC = new Date(Date.UTC(witaYear, witaMonth, witaDay, 0, 0, 0, 0));

    // Look for shift assignment - during early morning, check previous day too for night shifts
    let currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayUTC,
      },
    });

    // If no shift found and it's early morning, check previous day (for night shifts)
    if (!currentShift && isEarlyMorning) {
      const yesterdayUTC = new Date(todayUTC);
      yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

      currentShift = await prisma.shiftAssignment.findFirst({
        where: {
          staffProfileId: staffProfile.id,
          date: yesterdayUTC,
          shiftType: { in: NIGHT_STANDBY_SHIFTS },
        },
      });
    }

    // Access control based on checklist type
    if (actualChecklistType) {
      switch (actualChecklistType) {
        case 'OPS_SIANG':
          // OPS_SIANG: Only for STANDBY_BRANCH or DAY_WEEKEND
          if (!currentShift || !OPS_SIANG_SHIFTS.includes(currentShift.shiftType)) {
            return NextResponse.json(
              { error: 'Checklist Ops Siang hanya untuk shift STANDBY_BRANCH atau DAY_WEEKEND' },
              { status: 403 }
            );
          }
          break;

        case 'OPS_MALAM':
          // OPS_MALAM: Only for NIGHT_WEEKEND (without server access)
          if (staffProfile.hasServerAccess) {
            return NextResponse.json(
              { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring Malam' },
              { status: 403 }
            );
          }
          if (!currentShift || !OPS_MALAM_SHIFTS.includes(currentShift.shiftType)) {
            return NextResponse.json(
              { error: 'Checklist Ops Malam hanya untuk shift NIGHT_WEEKEND' },
              { status: 403 }
            );
          }
          break;

        case 'MONITORING_SIANG':
          // MONITORING_SIANG: Requires server access
          if (!staffProfile.hasServerAccess) {
            return NextResponse.json(
              { error: 'Checklist Monitoring Siang memerlukan akses server' },
              { status: 403 }
            );
          }
          break;

        case 'MONITORING_MALAM':
          // MONITORING_MALAM: Only for NIGHT_WEEKDAY or NIGHT_WEEKEND (with server access)
          if (!staffProfile.hasServerAccess) {
            return NextResponse.json(
              { error: 'Checklist Monitoring Malam memerlukan akses server' },
              { status: 403 }
            );
          }
          if (!currentShift || !MONITORING_MALAM_SHIFTS.includes(currentShift.shiftType)) {
            return NextResponse.json(
              { error: 'Checklist Monitoring Malam hanya untuk shift NIGHT_WEEKDAY atau NIGHT_WEEKEND' },
              { status: 403 }
            );
          }
          break;
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

      // Determine if this is a night checklist for time-lock logic
      const isNightChecklist = existingItem.checklist.checklistType === 'OPS_MALAM' ||
                               existingItem.checklist.checklistType === 'MONITORING_MALAM';

      // Check time-lock for completing items
      if (item.status === 'COMPLETED' && !isItemUnlocked(existingItem.unlockTime, now, isNightChecklist)) {
        errors.push({
          id: item.id,
          error: `Item masih terkunci. ${getLockStatusMessage(existingItem.unlockTime, now, isNightChecklist)}`,
        });
        continue;
      }

      // Update the item
      const updatedItem = await prisma.serverAccessChecklistItem.update({
        where: { id: item.id },
        data: {
          status: item.status,
          notes: item.notes,
          data: item.data !== undefined ? item.data : undefined,
          completedAt: item.status === 'COMPLETED' ? now : null,
        },
      });

      updatedItems.push({
        ...updatedItem,
        isLocked: !isItemUnlocked(updatedItem.unlockTime, now, isNightChecklist),
        lockMessage: getLockStatusMessage(updatedItem.unlockTime, now, isNightChecklist),
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
