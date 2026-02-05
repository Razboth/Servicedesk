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

    // Operational shift types (not OFF, LEAVE, HOLIDAY)
    const operationalShiftTypes = ['NIGHT_WEEKDAY', 'NIGHT_WEEKEND', 'DAY_WEEKEND', 'STANDBY_ONCALL', 'STANDBY_BRANCH'];
    const nightShiftTypes = ['NIGHT_WEEKDAY', 'NIGHT_WEEKEND'];

    // Get today's shift assignments
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
      },
      todayDate: todayUTC.toISOString(),
      // Active operational shifts
      operationalShifts: {
        today: todayAssignments.map((a) => ({
          id: a.id,
          shiftType: a.shiftType,
          staffName: a.staffProfile.user.name,
          staffId: a.staffProfile.user.id,
        })),
        // Night shifts from yesterday still active in early morning
        activeNight: activeNightShifts.map((a) => ({
          id: a.id,
          shiftType: a.shiftType,
          staffName: a.staffProfile.user.name,
          staffId: a.staffProfile.user.id,
          fromYesterday: true,
        })),
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
