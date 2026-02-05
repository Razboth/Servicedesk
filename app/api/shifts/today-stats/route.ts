import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeWITA } from '@/lib/time-lock';

// GET - Get today's shift statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current WITA time
    const witaTime = getCurrentTimeWITA();
    const witaHour = witaTime.getHours();

    // Calculate today's date in UTC for database queries
    const todayUTC = new Date(Date.UTC(
      witaTime.getFullYear(),
      witaTime.getMonth(),
      witaTime.getDate(),
      0, 0, 0, 0
    ));

    // For night shifts during early morning (00:00-07:59), also check yesterday
    const isEarlyMorning = witaHour >= 0 && witaHour < 8;
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);

    // Shift types
    const operationalShiftTypes = ['NIGHT_WEEKDAY', 'NIGHT_WEEKEND', 'DAY_WEEKEND', 'STANDBY_ONCALL', 'STANDBY_BRANCH'];
    const nightShiftTypes = ['NIGHT_WEEKDAY', 'NIGHT_WEEKEND'];
    const dayShiftTypes = ['DAY_WEEKEND', 'STANDBY_BRANCH'];

    // Get today's shift assignments with server access info
    const todayAssignments = await prisma.shiftAssignment.findMany({
      where: {
        date: todayUTC,
        shiftType: { in: operationalShiftTypes },
      },
      include: {
        staffProfile: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // If early morning, also get yesterday's night shifts (they're still active)
    let activeNightShifts: typeof todayAssignments = [];
    if (isEarlyMorning) {
      activeNightShifts = await prisma.shiftAssignment.findMany({
        where: {
          date: yesterdayUTC,
          shiftType: { in: nightShiftTypes },
        },
        include: {
          staffProfile: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    }

    // Determine who should fill each checklist based on schedule
    // OPS_SIANG: Day shift operators (DAY_WEEKEND, STANDBY_BRANCH) - 08:00-19:59
    // OPS_MALAM: Night shift operators (NIGHT_WEEKDAY, NIGHT_WEEKEND) - 20:00-07:59
    // MONITORING_SIANG: Staff with server access on day shift
    // MONITORING_MALAM: Staff with server access on night shift

    const isDayTime = witaHour >= 8 && witaHour < 20;
    const isNightTime = !isDayTime;

    // Get staff who should fill OPS checklist
    let opsAssignedStaff: { id: string; name: string; shiftType: string; hasServerAccess: boolean }[] = [];
    if (isDayTime) {
      // Day time: show day shift staff for OPS_SIANG
      opsAssignedStaff = todayAssignments
        .filter(a => dayShiftTypes.includes(a.shiftType))
        .map(a => ({
          id: a.staffProfile.user.id,
          name: a.staffProfile.user.name,
          shiftType: a.shiftType,
          hasServerAccess: a.staffProfile.hasServerAccess,
        }));
    } else {
      // Night time: show night shift staff for OPS_MALAM
      const nightStaff = isEarlyMorning ? activeNightShifts : todayAssignments.filter(a => nightShiftTypes.includes(a.shiftType));
      opsAssignedStaff = nightStaff.map(a => ({
        id: a.staffProfile.user.id,
        name: a.staffProfile.user.name,
        shiftType: a.shiftType,
        hasServerAccess: a.staffProfile.hasServerAccess,
      }));
    }

    // Get staff who should fill MONITORING checklist (those with server access)
    let monitoringAssignedStaff: { id: string; name: string; shiftType: string }[] = [];
    if (isDayTime) {
      // Day time: server access staff on day shift
      monitoringAssignedStaff = todayAssignments
        .filter(a => a.staffProfile.hasServerAccess && dayShiftTypes.includes(a.shiftType))
        .map(a => ({
          id: a.staffProfile.user.id,
          name: a.staffProfile.user.name,
          shiftType: a.shiftType,
        }));
    } else {
      // Night time: server access staff on night shift
      const nightStaff = isEarlyMorning ? activeNightShifts : todayAssignments.filter(a => nightShiftTypes.includes(a.shiftType));
      monitoringAssignedStaff = nightStaff
        .filter(a => a.staffProfile.hasServerAccess)
        .map(a => ({
          id: a.staffProfile.user.id,
          name: a.staffProfile.user.name,
          shiftType: a.shiftType,
        }));
    }

    // Also get staff with server access who don't have a shift today (User E type)
    const serverAccessStaffNoShift = await prisma.staffShiftProfile.findMany({
      where: {
        hasServerAccess: true,
        isActive: true,
        NOT: {
          id: { in: [...todayAssignments, ...activeNightShifts].map(a => a.staffProfile.id) },
        },
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // Determine which checklist date to check based on time
    // For day checklists (SIANG): use today
    // For night checklists (MALAM):
    //   - If evening (20:00+): use today
    //   - If early morning (00:00-07:59): use yesterday
    const siangChecklistDate = todayUTC;
    const malamChecklistDate = isEarlyMorning ? yesterdayUTC : todayUTC;

    // Get checklist claims for OPS and MONITORING types
    const checklistTypes = ['OPS_SIANG', 'OPS_MALAM', 'MONITORING_SIANG', 'MONITORING_MALAM'] as const;

    const checklistClaims = await Promise.all(
      checklistTypes.map(async (type) => {
        const isMalam = type.includes('MALAM');
        const checklistDate = isMalam ? malamChecklistDate : siangChecklistDate;

        const claims = await prisma.serverAccessDailyChecklist.findMany({
          where: {
            checklistType: type,
            date: checklistDate,
          },
          include: {
            user: { select: { id: true, name: true, email: true } },
            items: { select: { status: true } },
          },
        });

        return {
          type,
          date: checklistDate.toISOString(),
          claims: claims.map((c) => {
            const total = c.items.length;
            const completed = c.items.filter((i) => i.status === 'COMPLETED').length;
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

            return {
              userId: c.user.id,
              userName: c.user.name,
              status: c.status,
              progress,
              completedItems: completed,
              totalItems: total,
            };
          }),
        };
      })
    );

    // Format response
    const response = {
      serverTime: {
        wita: witaTime.toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
        witaHour,
        isEarlyMorning,
        isDayTime,
        isNightTime,
      },
      todayDate: todayUTC.toISOString(),
      // Active operational shifts
      operationalShifts: {
        today: todayAssignments.map((a) => ({
          id: a.id,
          shiftType: a.shiftType,
          staffName: a.staffProfile.user.name,
          staffId: a.staffProfile.user.id,
          hasServerAccess: a.staffProfile.hasServerAccess,
        })),
        // Night shifts from yesterday still active in early morning
        activeNight: activeNightShifts.map((a) => ({
          id: a.id,
          shiftType: a.shiftType,
          staffName: a.staffProfile.user.name,
          staffId: a.staffProfile.user.id,
          hasServerAccess: a.staffProfile.hasServerAccess,
          fromYesterday: true,
        })),
      },
      // Who should fill each checklist based on schedule
      assignedFor: {
        ops: {
          type: isDayTime ? 'OPS_SIANG' : 'OPS_MALAM',
          staff: opsAssignedStaff,
        },
        monitoring: {
          type: isDayTime ? 'MONITORING_SIANG' : 'MONITORING_MALAM',
          staff: monitoringAssignedStaff,
          // Additional server access staff without shift (can also fill monitoring)
          additionalServerAccess: serverAccessStaffNoShift.map(s => ({
            id: s.user.id,
            name: s.user.name,
          })),
        },
      },
      // Checklist claims
      checklistStatus: checklistClaims.reduce((acc, item) => {
        acc[item.type] = {
          date: item.date,
          claimed: item.claims.length > 0,
          claims: item.claims,
        };
        return acc;
      }, {} as Record<string, { date: string; claimed: boolean; claims: typeof checklistClaims[0]['claims'] }>),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching today stats:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil statistik hari ini' },
      { status: 500 }
    );
  }
}
