import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage, getCurrentTimeWITA } from '@/lib/time-lock';
import { DailyChecklistType, ShiftType } from '@prisma/client';

// Valid checklist types
const VALID_CHECKLIST_TYPES: DailyChecklistType[] = [
  'HARIAN',
  'SERVER_SIANG',
  'SERVER_MALAM',
  'AKHIR_HARI',
];

// Shift types that are considered "night/standby" shifts
const NIGHT_STANDBY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
  'STANDBY_ONCALL',
];

// Shift types that are considered "operational" shifts
const OPERATIONAL_SHIFTS: ShiftType[] = [
  'DAY_WEEKEND',
  'STANDBY_BRANCH',
];

// Shift types that can access HARIAN checklist
const HARIAN_SHIFTS: ShiftType[] = [
  'STANDBY_BRANCH',
];

/**
 * Determine checklist type based on current WITA time
 * - 08:00-19:59 → SERVER_SIANG (daytime)
 * - 20:00-07:59 → SERVER_MALAM (nighttime)
 */
function getChecklistTypeByTime(): DailyChecklistType {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();

  // 08:00-19:59 = daytime
  if (hour >= 8 && hour < 20) {
    return 'SERVER_SIANG';
  }
  // 20:00-07:59 = nighttime
  return 'SERVER_MALAM';
}

/**
 * Get today's date for checklist (handles midnight crossover for night shift)
 * For SERVER_MALAM items at 00:00-07:59, we need to use the previous day's date
 * since the shift started the day before
 */
function getChecklistDate(checklistType: DailyChecklistType): Date {
  const witaTime = getCurrentTimeWITA();
  const today = new Date(witaTime);
  today.setHours(0, 0, 0, 0);

  // For SERVER_MALAM between 00:00-07:59, use previous day's date
  // because the night shift started the previous evening
  if (checklistType === 'SERVER_MALAM') {
    const hour = witaTime.getHours();
    if (hour < 8) {
      today.setDate(today.getDate() - 1);
    }
  }

  return today;
}

// GET - Get or create today's server access checklist
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') as DailyChecklistType | null;

    // Validate checklist type if provided
    if (typeParam && !VALID_CHECKLIST_TYPES.includes(typeParam)) {
      return NextResponse.json(
        { error: `Tipe checklist tidak valid. Gunakan: ${VALID_CHECKLIST_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Get staff profile with shift info
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

    // Get today's shift assignment to determine shift type (using WITA timezone)
    const witaTime = getCurrentTimeWITA();
    const todayWITA = new Date(witaTime);
    todayWITA.setHours(0, 0, 0, 0);

    const currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayWITA,
      },
    });

    // Debug logging
    console.log('[server-checklist] Staff:', staffProfile.id, 'Date:', todayWITA.toISOString(), 'Shift:', currentShift?.shiftType || 'none');

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (typeParam) {
      checklistType = typeParam;
    } else {
      // Auto-determine based on current time
      checklistType = getChecklistTypeByTime();
    }

    // === ACCESS CONTROL ===
    const hasServerAccess = staffProfile.hasServerAccess;
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);
    const isOnOpsShift = currentShift && OPERATIONAL_SHIFTS.includes(currentShift.shiftType);
    const canAccessHarian = currentShift && HARIAN_SHIFTS.includes(currentShift.shiftType);

    // Check access based on checklist type
    switch (checklistType) {
      case 'HARIAN':
      case 'AKHIR_HARI':
        // Requires STANDBY_BRANCH shift
        if (!canAccessHarian) {
          return NextResponse.json(
            { error: 'Checklist ini hanya untuk shift STANDBY_BRANCH' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_SIANG':
        // Requires server access
        if (!hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_MALAM':
        // Requires server access + night/standby shift
        if (!hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist server malam hanya untuk shift standby' },
            { status: 403 }
          );
        }
        break;
    }

    // Get the appropriate date for this checklist
    const checklistDate = getChecklistDate(checklistType);

    // Try to find existing checklist for today and type
    let checklist = await prisma.serverAccessDailyChecklist.findFirst({
      where: {
        userId: session.user.id,
        date: checklistDate,
        checklistType: checklistType,
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
        where: {
          isActive: true,
          checklistType: checklistType,
        },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      });

      if (templates.length === 0) {
        return NextResponse.json(
          { error: `Tidak ada template untuk checklist ${checklistType}` },
          { status: 404 }
        );
      }

      checklist = await prisma.serverAccessDailyChecklist.create({
        data: {
          userId: session.user.id,
          date: checklistDate,
          checklistType: checklistType,
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
    const now = getCurrentTimeWITA();
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

    // Format current WITA time for display
    const witaTimeStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const witaDateStr = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return NextResponse.json({
      ...checklist,
      checklistType,
      items: itemsWithLockStatus,
      stats,
      // Current server time in WITA for display
      serverTime: {
        wita: `${witaDateStr}, ${witaTimeStr} WITA`,
        witaHour: now.getHours(),
        witaMinute: now.getMinutes(),
        iso: now.toISOString(),
      },
      // Include shift info for UI
      shiftInfo: {
        hasServerAccess,
        isOnNightShift,
        isOnOpsShift,
        canAccessHarian,
        currentShiftType: currentShift?.shiftType || null,
      },
    });
  } catch (error) {
    console.error('Error fetching server checklist:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil checklist server' },
      { status: 500 }
    );
  }
}
