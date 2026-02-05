import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isItemUnlocked, getLockStatusMessage, getCurrentTimeWITA } from '@/lib/time-lock';
import { DailyChecklistType, ShiftType } from '@prisma/client';

// Valid checklist types (v3 - only 4 types)
const VALID_CHECKLIST_TYPES: DailyChecklistType[] = [
  'OPS_SIANG',
  'OPS_MALAM',
  'MONITORING_SIANG',
  'MONITORING_MALAM',
];

// AUTO-CLAIM TYPES: These are automatically claimed based on schedule
// Only OPS_SIANG requires manual claiming
const AUTO_CLAIM_TYPES: DailyChecklistType[] = [
  'OPS_MALAM',
  'MONITORING_SIANG',
  'MONITORING_MALAM',
];

// Shift types for MONITORING_MALAM (night shifts with server access)
const MONITORING_MALAM_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
];

// Shift types for OPS_MALAM (night shifts without server access)
const OPS_MALAM_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
];

// Shift types that block access to OPS_SIANG (night shifts block it)
const BLOCKED_FROM_OPS_SIANG: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
];

// Shift types that block MONITORING_SIANG access (NIGHT_WEEKDAY blocks it)
const BLOCKED_FROM_MONITORING_SIANG: ShiftType[] = [
  'NIGHT_WEEKDAY',
];

// Night shift types
const NIGHT_STANDBY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
  'STANDBY_ONCALL',
];

const NIGHT_ONLY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
];

/**
 * Determine if current time is daytime (08:00-19:59) or nighttime (20:00-07:59)
 */
function isDayTime(): boolean {
  const witaTime = getCurrentTimeWITA();
  const hour = witaTime.getHours();
  return hour >= 8 && hour < 20;
}

/**
 * Sort items for night checklists (22:00 should come before 00:00)
 * For night checklists: 22:00 → 00:00 → 02:00 → 04:00 → 06:00
 */
function sortNightChecklistItems<T extends { category: string; order: number }>(
  items: T[],
  isNightChecklist: boolean
): T[] {
  if (!isNightChecklist) {
    return items; // Already sorted alphabetically by category, which is correct for day checklists
  }

  return [...items].sort((a, b) => {
    // Parse hours from category (e.g., "22:00" -> 22)
    const aHour = parseInt(a.category.split(':')[0], 10);
    const bHour = parseInt(b.category.split(':')[0], 10);

    // For night checklists, times >= 20 should come first (22:00)
    // Then times < 8 in order (00:00, 02:00, 04:00, 06:00)
    const aAdjusted = aHour < 12 ? aHour + 24 : aHour; // 00:00 -> 24, 02:00 -> 26, etc.
    const bAdjusted = bHour < 12 ? bHour + 24 : bHour;

    if (aAdjusted !== bAdjusted) {
      return aAdjusted - bAdjusted;
    }

    // Same time slot - sort by order
    return a.order - b.order;
  });
}

/**
 * Get today's date for checklist (handles midnight crossover for night shift)
 * For night checklists (OPS_MALAM, MONITORING_MALAM) at 00:00-07:59,
 * we use the previous day's date since the shift started the day before
 */
function getChecklistDate(checklistType: DailyChecklistType): Date {
  const witaTime = getCurrentTimeWITA();
  const today = new Date(witaTime);
  today.setHours(0, 0, 0, 0);

  // For night checklists between 00:00-07:59, use previous day's date
  // because the night shift started the previous evening
  const isNightChecklist = checklistType === 'OPS_MALAM' || checklistType === 'MONITORING_MALAM';
  if (isNightChecklist) {
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
    const witaHour = getCurrentTimeWITA().getHours();
    const isEarlyMorning = witaHour >= 0 && witaHour < 8;

    // Look for shift assignment - during early morning, check previous day too
    // because night shifts start the evening before (e.g., shift on Feb 4th at 20:00 continues to Feb 5th 08:00)
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

    // Check if user is on night-only shift (NIGHT_WEEKDAY, NIGHT_WEEKEND)
    const isOnNightOnlyShift = currentShift && NIGHT_ONLY_SHIFTS.includes(currentShift.shiftType);
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);
    const isOnDayOpsShift = currentShift && DAY_OPS_SHIFTS.includes(currentShift.shiftType);

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (typeParam) {
      checklistType = typeParam;
    } else {
      // Auto-determine based on server access and time
      // Users with server access -> MONITORING, without -> OPS
      const witaHour = getCurrentTimeWITA().getHours();
      const isDayTime = witaHour >= 8 && witaHour < 20;

      if (staffProfile.hasServerAccess) {
        checklistType = isDayTime ? 'MONITORING_SIANG' : 'MONITORING_MALAM';
      } else {
        checklistType = isDayTime ? 'OPS_SIANG' : 'OPS_MALAM';
      }
    }

    // Check specific shift conditions
    const isOnOpsMalamShift = currentShift && OPS_MALAM_SHIFTS.includes(currentShift.shiftType);
    const isOnMonitoringMalamShift = currentShift && MONITORING_MALAM_SHIFTS.includes(currentShift.shiftType);
    const isBlockedFromOpsSiang = currentShift && BLOCKED_FROM_OPS_SIANG.includes(currentShift.shiftType);
    const isBlockedFromMonitoringSiang = currentShift && BLOCKED_FROM_MONITORING_SIANG.includes(currentShift.shiftType);

    // === ACCESS CONTROL ===
    switch (checklistType) {
      case 'OPS_SIANG':
        // OPS_SIANG: Manual claim by DBA/TS (server access) who are NOT on night shift
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Ops Siang hanya untuk DBA/TS (staff dengan akses server)' },
            { status: 403 }
          );
        }
        if (isBlockedFromOpsSiang) {
          return NextResponse.json(
            { error: 'Staff yang terjadwal shift malam tidak dapat mengakses Checklist Ops Siang' },
            { status: 403 }
          );
        }
        break;

      case 'OPS_MALAM':
        // OPS_MALAM: Auto-claim for NIGHT_WEEKDAY or NIGHT_WEEKEND (without server access)
        if (staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring Malam' },
            { status: 403 }
          );
        }
        if (!isOnOpsMalamShift) {
          return NextResponse.json(
            { error: 'Checklist Ops Malam hanya untuk shift NIGHT_WEEKDAY atau NIGHT_WEEKEND' },
            { status: 403 }
          );
        }
        break;

      case 'MONITORING_SIANG':
        // MONITORING_SIANG: Auto-claim for server access staff NOT on NIGHT_WEEKDAY
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        if (isBlockedFromMonitoringSiang) {
          return NextResponse.json(
            { error: 'Staff shift NIGHT_WEEKDAY sebaiknya menggunakan Checklist Monitoring Malam' },
            { status: 403 }
          );
        }
        break;

      case 'MONITORING_MALAM':
        // MONITORING_MALAM: Auto-claim for NIGHT_WEEKDAY or NIGHT_WEEKEND (with server access)
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        if (!isOnMonitoringMalamShift) {
          return NextResponse.json(
            { error: 'Checklist Monitoring Malam hanya untuk shift NIGHT_WEEKDAY atau NIGHT_WEEKEND dengan akses server' },
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
      const isNightChecklist = historicalChecklist.checklistType === 'OPS_MALAM' || historicalChecklist.checklistType === 'MONITORING_MALAM';
      const itemsForView = historicalChecklist.items.map((item) => ({
        ...item,
        isLocked: false,
        lockMessage: null,
      }));
      const sortedItems = sortNightChecklistItems(itemsForView, isNightChecklist);

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
        items: sortedItems,
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
      const isNightChecklist = checklistType === 'OPS_MALAM' || checklistType === 'MONITORING_MALAM';
      const itemsWithLockStatus = userChecklist.items.map((item) => ({
        ...item,
        isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow, isNightChecklist),
        lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow, isNightChecklist),
      }));
      const sortedItems = sortNightChecklistItems(itemsWithLockStatus, isNightChecklist);

      const stats = {
        total: userChecklist.items.length,
        completed: userChecklist.items.filter((i) => i.status === 'COMPLETED').length,
        pending: userChecklist.items.filter((i) => i.status === 'PENDING').length,
        inProgress: userChecklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
        skipped: userChecklist.items.filter((i) => i.status === 'SKIPPED').length,
        locked: sortedItems.filter((i) => i.isLocked).length,
      };

      return NextResponse.json({
        ...userChecklist,
        checklistType,
        items: sortedItems,
        stats,
        claimed: true,
        claimedByUser: true,
        autoClaimed: AUTO_CLAIM_TYPES.includes(checklistType), // Flag for auto-claimed types
        canRelease: checklistType === 'OPS_SIANG', // Only OPS_SIANG can be released
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
          currentShiftType: currentShift?.shiftType || null,
        },
      });
    }

    // === AUTO-CLAIM LOGIC for non-OPS_SIANG types ===
    // If it's an auto-claim type and no one has claimed yet, auto-create for this user
    if (!userChecklist && AUTO_CLAIM_TYPES.includes(checklistType) && otherClaims.length === 0) {
      // Get templates for auto-claim
      const templates = await prisma.serverAccessChecklistTemplate.findMany({
        where: {
          isActive: true,
          checklistType: checklistType,
        },
        orderBy: [{ category: 'asc' }, { order: 'asc' }],
      });

      if (templates.length > 0) {
        // Auto-create the checklist
        const autoClaimedChecklist = await prisma.serverAccessDailyChecklist.create({
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
                inputType: template.inputType,
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

        const isNightChecklist = checklistType === 'OPS_MALAM' || checklistType === 'MONITORING_MALAM';
        const itemsWithLockStatus = autoClaimedChecklist.items.map((item) => ({
          ...item,
          isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow, isNightChecklist),
          lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow, isNightChecklist),
        }));
        const sortedItems = sortNightChecklistItems(itemsWithLockStatus, isNightChecklist);

        const stats = {
          total: autoClaimedChecklist.items.length,
          completed: 0,
          pending: autoClaimedChecklist.items.length,
          inProgress: 0,
          skipped: 0,
          locked: sortedItems.filter((i) => i.isLocked).length,
        };

        return NextResponse.json({
          ...autoClaimedChecklist,
          checklistType,
          items: sortedItems,
          stats,
          claimed: true,
          claimedByUser: true,
          autoClaimed: true, // Flag to indicate this was auto-claimed
          canRelease: false, // Auto-claimed checklists cannot be released
          otherClaims: [],
          serverTime: {
            wita: `${witaDateStr}, ${witaTimeStr} WITA`,
            witaHour: witaTimeNow.getHours(),
            witaMinute: witaTimeNow.getMinutes(),
            iso: witaTimeNow.toISOString(),
          },
          shiftInfo: {
            hasServerAccess: staffProfile.hasServerAccess,
            isOnNightShift,
            currentShiftType: currentShift?.shiftType || null,
          },
        });
      }
    }

    // User hasn't claimed - check if others have claimed and return read-only view
    if (otherClaims.length > 0) {
      // Get the first other claim's checklist with items for read-only view
      const otherChecklist = await prisma.serverAccessDailyChecklist.findFirst({
        where: {
          date: checklistDate,
          checklistType: checklistType,
          userId: { not: session.user.id },
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

      if (otherChecklist) {
        // Return other user's checklist in read-only mode
        const isNightChecklist = checklistType === 'OPS_MALAM' || checklistType === 'MONITORING_MALAM';
        const itemsWithLockStatus = otherChecklist.items.map((item) => ({
          ...item,
          isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow, isNightChecklist),
          lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow, isNightChecklist),
        }));
        const sortedItems = sortNightChecklistItems(itemsWithLockStatus, isNightChecklist);

        const stats = {
          total: otherChecklist.items.length,
          completed: otherChecklist.items.filter((i) => i.status === 'COMPLETED').length,
          pending: otherChecklist.items.filter((i) => i.status === 'PENDING').length,
          inProgress: otherChecklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
          skipped: otherChecklist.items.filter((i) => i.status === 'SKIPPED').length,
          locked: sortedItems.filter((i) => i.isLocked).length,
        };

        return NextResponse.json({
          ...otherChecklist,
          checklistType,
          items: sortedItems,
          stats,
          claimed: true,
          claimedByUser: false,
          canClaim: true,
          readOnly: true, // Flag for read-only mode
          viewingOtherUser: true, // Flag to indicate viewing another user's checklist
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
            currentShiftType: currentShift?.shiftType || null,
          },
        });
      }
    }

    // No one has claimed yet - return available status
    // For auto-claim types, this should not happen as they get auto-created above
    // But just in case (e.g., no templates), indicate that manual claim is only for OPS_SIANG
    return NextResponse.json({
      claimed: false,
      claimedByUser: false,
      checklistType,
      date: checklistDate,
      canClaim: checklistType === 'OPS_SIANG', // Only OPS_SIANG requires manual claim
      autoClaim: AUTO_CLAIM_TYPES.includes(checklistType), // Flag to indicate this should auto-claim
      items: [], // Empty items - need to claim first (or auto-claim)
      otherClaims: [],
      serverTime: {
        wita: `${witaDateStr}, ${witaTimeStr} WITA`,
        witaHour: witaTimeNow.getHours(),
        witaMinute: witaTimeNow.getMinutes(),
        iso: witaTimeNow.toISOString(),
      },
      shiftInfo: {
        hasServerAccess: staffProfile.hasServerAccess,
        isOnNightShift,
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
    const witaHour = getCurrentTimeWITA().getHours();
    const isEarlyMorning = witaHour >= 0 && witaHour < 8;

    // Look for shift assignment - during early morning, check previous day too
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

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (type && VALID_CHECKLIST_TYPES.includes(type)) {
      checklistType = type;
    } else {
      // Auto-determine based on server access and time
      const isDayTimeNow = witaHour >= 8 && witaHour < 20;

      if (staffProfile.hasServerAccess) {
        checklistType = isDayTimeNow ? 'MONITORING_SIANG' : 'MONITORING_MALAM';
      } else {
        checklistType = isDayTimeNow ? 'OPS_SIANG' : 'OPS_MALAM';
      }
    }

    // Check specific shift conditions
    const isBlockedFromOpsSiang = currentShift && BLOCKED_FROM_OPS_SIANG.includes(currentShift.shiftType);

    // === MANUAL CLAIM ONLY FOR OPS_SIANG ===
    // Other checklist types are auto-claimed and cannot be manually claimed
    if (AUTO_CLAIM_TYPES.includes(checklistType)) {
      return NextResponse.json(
        { error: `Checklist ${checklistType.replace('_', ' ')} tidak perlu diklaim manual, checklist akan otomatis tersedia sesuai jadwal shift Anda` },
        { status: 400 }
      );
    }

    // OPS_SIANG: Manual claim by DBA/TS (server access) who are NOT on night shift
    if (checklistType === 'OPS_SIANG') {
      if (!staffProfile.hasServerAccess) {
        return NextResponse.json(
          { error: 'Checklist Ops Siang hanya untuk DBA/TS (staff dengan akses server)' },
          { status: 403 }
        );
      }
      if (isBlockedFromOpsSiang) {
        return NextResponse.json(
          { error: 'Staff yang terjadwal shift malam tidak dapat mengklaim Checklist Ops Siang' },
          { status: 403 }
        );
      }
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
            inputType: template.inputType,
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
    const isNightChecklist = checklistType === 'OPS_MALAM' || checklistType === 'MONITORING_MALAM';
    const itemsWithLockStatus = checklist.items.map((item) => ({
      ...item,
      isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow, isNightChecklist),
      lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow, isNightChecklist),
    }));
    const sortedItems = sortNightChecklistItems(itemsWithLockStatus, isNightChecklist);

    const stats = {
      total: checklist.items.length,
      completed: 0,
      pending: checklist.items.length,
      inProgress: 0,
      skipped: 0,
      locked: sortedItems.filter((i) => i.isLocked).length,
    };

    return NextResponse.json({
      success: true,
      message: 'Checklist berhasil diklaim',
      ...checklist,
      checklistType,
      items: sortedItems,
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

// DELETE - Release a claimed checklist
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get('id');
    const type = searchParams.get('type') as DailyChecklistType | null;

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

    // Find the checklist to release
    let checklistToRelease;

    if (checklistId) {
      // Release by specific ID
      checklistToRelease = await prisma.serverAccessDailyChecklist.findFirst({
        where: {
          id: checklistId,
          userId: session.user.id,
        },
        include: { items: true },
      });
    } else if (type && VALID_CHECKLIST_TYPES.includes(type)) {
      // Release by type for today
      const checklistDate = getChecklistDate(type);
      checklistToRelease = await prisma.serverAccessDailyChecklist.findFirst({
        where: {
          userId: session.user.id,
          date: checklistDate,
          checklistType: type,
        },
        include: { items: true },
      });
    } else {
      return NextResponse.json(
        { error: 'ID atau tipe checklist diperlukan' },
        { status: 400 }
      );
    }

    if (!checklistToRelease) {
      return NextResponse.json(
        { error: 'Checklist tidak ditemukan atau bukan milik Anda' },
        { status: 404 }
      );
    }

    // Only OPS_SIANG can be released - other types are auto-claimed and cannot be released
    if (AUTO_CLAIM_TYPES.includes(checklistToRelease.checklistType)) {
      return NextResponse.json(
        { error: `Checklist ${checklistToRelease.checklistType.replace('_', ' ')} tidak dapat dilepaskan karena diklaim otomatis sesuai jadwal` },
        { status: 400 }
      );
    }

    // Check if checklist is already completed - cannot release completed checklists
    if (checklistToRelease.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Tidak dapat melepaskan checklist yang sudah selesai' },
        { status: 400 }
      );
    }

    // Check if any items have been completed
    const completedItems = checklistToRelease.items.filter(
      (item) => item.status === 'COMPLETED'
    );

    if (completedItems.length > 0) {
      return NextResponse.json(
        {
          error: `Tidak dapat melepaskan checklist karena ${completedItems.length} item sudah dikerjakan`,
          completedCount: completedItems.length,
        },
        { status: 400 }
      );
    }

    // Delete the checklist and its items (cascade should handle items)
    await prisma.serverAccessDailyChecklist.delete({
      where: { id: checklistToRelease.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Checklist berhasil dilepaskan',
      releasedId: checklistToRelease.id,
      checklistType: checklistToRelease.checklistType,
    });
  } catch (error) {
    console.error('Error releasing server checklist:', error);
    return NextResponse.json(
      { error: 'Gagal melepaskan checklist' },
      { status: 500 }
    );
  }
}
