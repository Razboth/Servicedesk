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

// Shift types that are considered "night/standby" shifts
const NIGHT_STANDBY_SHIFTS: ShiftType[] = [
  'NIGHT_WEEKDAY',
  'NIGHT_WEEKEND',
  'STANDBY_ONCALL',
];

// Shift types that are night-only shifts (cannot access MONITORING_SIANG during day hours)
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

    const currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayUTC,
      },
    });

    // Check if user is on night-only shift (NIGHT_WEEKDAY, NIGHT_WEEKEND)
    const isOnNightOnlyShift = currentShift && NIGHT_ONLY_SHIFTS.includes(currentShift.shiftType);
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);

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

    // === ACCESS CONTROL FOR CLAIM SYSTEM (v3 - only 4 types) ===
    switch (checklistType) {
      // Checklist Ops (for users WITHOUT server access: A, B_2, D_2)
      case 'OPS_SIANG':
        // OPS_SIANG: For STANDBY_BRANCH (A), DAY_WEEKEND without server (B_2)
        // Users WITH server access should use MONITORING_SIANG instead
        if (staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring' },
            { status: 403 }
          );
        }
        break;

      case 'OPS_MALAM':
        // OPS_MALAM 06:00: For NIGHT_WEEKEND without server (D_2)
        // Only has the cleaning coordination item
        if (staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring Malam' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist Ops Malam hanya untuk shift malam' },
            { status: 403 }
          );
        }
        break;

      // NEW: Checklist Monitoring (for users WITH server access: E, B_1, C, D_1)
      case 'MONITORING_SIANG':
        // Requires server access
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        // Night-only shifts can access MONITORING_SIANG during early morning (00:00-08:00)
        // This allows D_1 (NIGHT_WEEKEND with server) to complete 08:00 items when finishing shift
        {
          const witaTime = getCurrentTimeWITA();
          const currentHour = witaTime.getHours();
          const isEarlyMorning = currentHour >= 0 && currentHour < 8;
          if (isOnNightOnlyShift && !isEarlyMorning) {
            return NextResponse.json(
              { error: 'Staff shift malam hanya dapat mengakses Checklist Monitoring Siang saat pagi (00:00-08:00)' },
              { status: 403 }
            );
          }
        }
        break;

      case 'MONITORING_MALAM':
        // Requires server access + night/standby shift
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist Monitoring Malam hanya untuk shift malam/standby' },
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
          currentShiftType: currentShift?.shiftType || null,
        },
      });
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
        const itemsWithLockStatus = otherChecklist.items.map((item) => ({
          ...item,
          isLocked: !isItemUnlocked(item.unlockTime, witaTimeNow),
          lockMessage: getLockStatusMessage(item.unlockTime, witaTimeNow),
        }));

        const stats = {
          total: otherChecklist.items.length,
          completed: otherChecklist.items.filter((i) => i.status === 'COMPLETED').length,
          pending: otherChecklist.items.filter((i) => i.status === 'PENDING').length,
          inProgress: otherChecklist.items.filter((i) => i.status === 'IN_PROGRESS').length,
          skipped: otherChecklist.items.filter((i) => i.status === 'SKIPPED').length,
          locked: itemsWithLockStatus.filter((i) => i.isLocked).length,
        };

        return NextResponse.json({
          ...otherChecklist,
          checklistType,
          items: itemsWithLockStatus,
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
    return NextResponse.json({
      claimed: false,
      claimedByUser: false,
      checklistType,
      date: checklistDate,
      canClaim: true,
      items: [], // Empty items - need to claim first
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

    const currentShift = await prisma.shiftAssignment.findFirst({
      where: {
        staffProfileId: staffProfile.id,
        date: todayUTC,
      },
    });

    const isOnNightOnlyShift = currentShift && NIGHT_ONLY_SHIFTS.includes(currentShift.shiftType);
    const isOnNightShift = currentShift && NIGHT_STANDBY_SHIFTS.includes(currentShift.shiftType);

    // Determine checklist type
    let checklistType: DailyChecklistType;
    if (type && VALID_CHECKLIST_TYPES.includes(type)) {
      checklistType = type;
    } else {
      // Auto-determine based on server access and time
      const witaHour = getCurrentTimeWITA().getHours();
      const isDayTimeNow = witaHour >= 8 && witaHour < 20;

      if (staffProfile.hasServerAccess) {
        checklistType = isDayTimeNow ? 'MONITORING_SIANG' : 'MONITORING_MALAM';
      } else {
        checklistType = isDayTimeNow ? 'OPS_SIANG' : 'OPS_MALAM';
      }
    }

    // Access control (v3 - only 4 types)
    switch (checklistType) {
      case 'OPS_SIANG':
        if (staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring' },
            { status: 403 }
          );
        }
        break;

      case 'OPS_MALAM':
        if (staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'User dengan akses server sebaiknya menggunakan Checklist Monitoring Malam' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist Ops Malam hanya untuk shift malam' },
            { status: 403 }
          );
        }
        break;

      case 'MONITORING_SIANG':
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        // Night-only shifts can access MONITORING_SIANG during early morning (00:00-08:00)
        {
          const witaTime = getCurrentTimeWITA();
          const currentHour = witaTime.getHours();
          const isEarlyMorning = currentHour >= 0 && currentHour < 8;
          if (isOnNightOnlyShift && !isEarlyMorning) {
            return NextResponse.json(
              { error: 'Staff shift malam hanya dapat mengakses Checklist Monitoring Siang saat pagi (00:00-08:00)' },
              { status: 403 }
            );
          }
        }
        break;

      case 'MONITORING_MALAM':
        if (!staffProfile.hasServerAccess) {
          return NextResponse.json(
            { error: 'Checklist Monitoring memerlukan akses server' },
            { status: 403 }
          );
        }
        if (!isOnNightShift) {
          return NextResponse.json(
            { error: 'Checklist Monitoring Malam hanya untuk shift malam/standby' },
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
