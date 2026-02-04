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

// Shift types that CANNOT access SERVER_SIANG (night shifts)
const NIGHT_ONLY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
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

/**
 * Get today's date in WITA for shift lookup
 */
function getTodayUTC(): Date {
  const now = new Date();
  const witaOffset = 8 * 60; // WITA is UTC+8 in minutes
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

  return new Date(Date.UTC(witaYear, witaMonth, witaDay, 0, 0, 0, 0));
}

// GET - Get checklist status (available, claimed by user, or claimed by others)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type') as DailyChecklistType | null;
    const dateParam = searchParams.get('date'); // Optional: YYYY-MM-DD format for historical data

    // Validate checklist type if provided
    if (typeParam && !VALID_CHECKLIST_TYPES.includes(typeParam)) {
      return NextResponse.json(
        { error: `Tipe checklist tidak valid. Gunakan: ${VALID_CHECKLIST_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Check if viewing historical data
    const isHistorical = dateParam && dateParam !== new Date().toISOString().split('T')[0];

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

    const todayUTC = getTodayUTC();

    const currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayUTC,
      },
    });

    // Check if user is on night-only shift (NIGHT_WEEKDAY, NIGHT_WEEKEND)
    const isOnNightOnlyShift = currentShift && NIGHT_ONLY_SHIFTS.includes(currentShift.shiftType);
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);
    const isOnOpsShift = currentShift && OPERATIONAL_SHIFTS.includes(currentShift.shiftType);
    const canAccessHarian = currentShift && HARIAN_SHIFTS.includes(currentShift.shiftType);

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (typeParam) {
      checklistType = typeParam;
    } else {
      // Auto-determine based on shift type and time
      if (canAccessHarian) {
        checklistType = 'HARIAN';
      } else {
        checklistType = getChecklistTypeByTime();
      }
    }

    // === ACCESS CONTROL FOR CLAIM SYSTEM ===
    switch (checklistType) {
      case 'HARIAN':
      case 'AKHIR_HARI':
        // HARIAN and AKHIR_HARI only require STANDBY_BRANCH shift, no server access needed
        if (!canAccessHarian) {
          return NextResponse.json(
            { error: 'Checklist ini hanya untuk shift STANDBY_BRANCH' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_SIANG':
        // Requires server access
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        // Night-only shifts (NIGHT_WEEKDAY, NIGHT_WEEKEND) cannot access SERVER_SIANG
        if (isOnNightOnlyShift) {
          return NextResponse.json(
            { error: 'Staff dengan shift malam tidak dapat mengakses checklist server siang. Gunakan checklist SERVER_MALAM.' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_MALAM':
        // Requires server access + night shift
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist server malam hanya untuk shift standby/malam' },
            { status: 403 }
          );
        }
        break;
    }

    // Determine the date to query
    let checklistDate: Date;
    if (dateParam) {
      // Parse provided date for historical query
      checklistDate = new Date(dateParam + 'T00:00:00.000Z');
    } else {
      checklistDate = getChecklistDate(checklistType);
    }

    // For historical queries, skip access control and just return data (read-only)
    if (isHistorical) {
      const historicalChecklist = await prisma.serverAccessDailyChecklist.findFirst({
        where: {
          userId: session.user.id,
          date: checklistDate,
          ...(typeParam && { checklistType: typeParam }),
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

      if (!historicalChecklist) {
        return NextResponse.json({
          found: false,
          historical: true,
          date: checklistDate,
          message: 'Tidak ada checklist ditemukan untuk tanggal ini',
        });
      }

      // Return historical data without lock status (all unlocked for viewing)
      const itemsForView = historicalChecklist.items.map((item) => ({
        ...item,
        isLocked: false,
        lockMessage: null,
      }));

      const stats = {
        total: historicalChecklist.items.length,
        completed: historicalChecklist.items.filter((i) => i.status === 'COMPLETED').length,
        pending: historicalChecklist.items.filter((i) => i.status === 'PENDING').length,
        inProgress: historicalChecklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
        skipped: historicalChecklist.items.filter((i) => i.status === 'SKIPPED').length,
        locked: 0,
      };

      return NextResponse.json({
        ...historicalChecklist,
        items: itemsForView,
        stats,
        claimed: true,
        claimedByUser: true,
        historical: true,
        readOnly: true,
      });
    }

    // Check if user has already claimed this checklist
    const userChecklist = await prisma.serverAccessDailyChecklist.findFirst({
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

    // Check if anyone else has claimed this checklist
    const otherClaims = await prisma.serverAccessDailyChecklist.findMany({
      where: {
        date: checklistDate,
        checklistType: checklistType,
        userId: { not: session.user.id },
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

    const witaTimeNow = getCurrentTimeWITA();
    const witaTimeStr = witaTimeNow.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const witaDateStr = witaTimeNow.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // If user has claimed, return their checklist
    if (userChecklist) {
      const itemsWithLockStatus = userChecklist.items.map((item) => ({
        ...item,
        isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow),
        lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow),
      }));

      const stats = {
        total: userChecklist.items.length,
        completed: userChecklist.items.filter((i) => i.status === 'COMPLETED').length,
        pending: userChecklist.items.filter((i) => i.status === 'PENDING').length,
        inProgress: userChecklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
        skipped: userChecklist.items.filter((i) => i.status === 'SKIPPED').length,
        locked: itemsWithLockStatus.filter((i) => i.isLocked).length,
      };

      return NextResponse.json({
        ...userChecklist,
        checklistType,
        items: itemsWithLockStatus,
        stats,
        claimed: true,
        claimedByUser: true,
        otherClaims: otherClaims.map((c) => ({
          userId: c.user.id,
          userName: c.user.name,
          status: c.status,
        })),
        serverTime: {
          wita: `${witaDateStr}, ${witaTimeStr} WITA`,
          witaHour: witaTimeNow.getHours(),
          witaMinute: witaTimeNow.getMinutes(),
          iso: witaTimeNow.toISOString(),
        },
        shiftInfo: {
          hasServerAccess: staffProfile.hasServerAccess,
          isOnNightShift,
          isOnOpsShift,
          canAccessHarian,
          currentShiftType: currentShift?.shiftType || null,
        },
      });
    }

    // User hasn't claimed - return available status
    return NextResponse.json({
      claimed: false,
      claimedByUser: false,
      checklistType,
      date: checklistDate,
      canClaim: true,
      otherClaims: otherClaims.map((c) => ({
        userId: c.user.id,
        userName: c.user.name,
        status: c.status,
      })),
      serverTime: {
        wita: `${witaDateStr}, ${witaTimeStr} WITA`,
        witaHour: witaTimeNow.getHours(),
        witaMinute: witaTimeNow.getMinutes(),
        iso: witaTimeNow.toISOString(),
      },
      shiftInfo: {
        hasServerAccess: staffProfile.hasServerAccess,
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

// POST - Claim a checklist
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body as { type?: DailyChecklistType };

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

    const todayUTC = getTodayUTC();

    const currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayUTC,
      },
    });

    const isOnNightOnlyShift = currentShift && NIGHT_ONLY_SHIFTS.includes(currentShift.shiftType);
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);
    const canAccessHarian = currentShift && HARIAN_SHIFTS.includes(currentShift.shiftType);

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (type && VALID_CHECKLIST_TYPES.includes(type)) {
      checklistType = type;
    } else {
      // Auto-determine based on shift type and time
      if (canAccessHarian) {
        checklistType = 'HARIAN';
      } else {
        checklistType = getChecklistTypeByTime();
      }
    }

    // Access control
    switch (checklistType) {
      case 'HARIAN':
      case 'AKHIR_HARI':
        // HARIAN and AKHIR_HARI only require STANDBY_BRANCH shift, no server access needed
        if (!canAccessHarian) {
          return NextResponse.json(
            { error: 'Checklist ini hanya untuk shift STANDBY_BRANCH' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_SIANG':
        // Requires server access
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        if (isOnNightOnlyShift) {
          return NextResponse.json(
            { error: 'Staff dengan shift malam tidak dapat mengklaim checklist server siang' },
            { status: 403 }
          );
        }
        break;

      case 'SERVER_MALAM':
        // Requires server access + night shift
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Anda tidak memiliki akses server' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist server malam hanya untuk shift standby/malam' },
            { status: 403 }
          );
        }
        break;
    }

    const checklistDate = getChecklistDate(checklistType);

    // Check if user already claimed
    const existingClaim = await prisma.serverAccessDailyChecklist.findFirst({
      where: {
        userId: session.user.id,
        date: checklistDate,
        checklistType: checklistType,
      },
    });

    if (existingClaim) {
      return NextResponse.json(
        { error: 'Anda sudah mengklaim checklist ini' },
        { status: 400 }
      );
    }

    // Get templates
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

    // Create the checklist (claim it)
    const checklist = await prisma.serverAccessDailyChecklist.create({
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

    const witaTimeNow = getCurrentTimeWITA();
    const itemsWithLockStatus = checklist.items.map((item) => ({
      ...item,
      isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow),
      lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow),
    }));

    const stats = {
      total: checklist.items.length,
      completed: 0,
      pending: checklist.items.length,
      inProgress: 0,
      skipped: 0,
      locked: itemsWithLockStatus.filter((i) => i.isLocked).length,
    };

    return NextResponse.json({
      success: true,
      message: 'Checklist berhasil diklaim',
      ...checklist,
      checklistType,
      items: itemsWithLockStatus,
      stats,
      claimed: true,
      claimedByUser: true,
    });
  } catch (error) {
    console.error('Error claiming server checklist:', error);
    return NextResponse.json(
      { error: 'Gagal mengklaim checklist' },
      { status: 500 }
    );
  }
}
