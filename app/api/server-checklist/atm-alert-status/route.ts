import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeWITA } from '@/lib/time-lock';

// GET - Get ATM alert status for a specific time slot
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetTime = searchParams.get('time'); // Format: "HH:mm" e.g., "12:00"
    const dateStr = searchParams.get('date'); // Optional: "YYYY-MM-DD", defaults to today

    if (!targetTime || !/^\d{2}:\d{2}$/.test(targetTime)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:mm' },
        { status: 400 }
      );
    }

    // Parse target time
    const [hours, minutes] = targetTime.split(':').map(Number);

    // Determine the target date
    let targetDate: Date;
    if (dateStr) {
      targetDate = new Date(dateStr);
    } else {
      targetDate = getCurrentTimeWITA();
    }

    // Set the target datetime
    targetDate.setHours(hours, minutes, 0, 0);

    // Define search window: 5 minutes before and after
    const marginMs = 5 * 60 * 1000; // 5 minutes in milliseconds
    const windowStart = new Date(targetDate.getTime() - marginMs);
    const windowEnd = new Date(targetDate.getTime() + marginMs);

    // Find snapshots within the time window
    const snapshots = await prisma.atmAlarmSnapshot.findMany({
      where: {
        receivedAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      orderBy: { receivedAt: 'desc' },
    });

    if (snapshots.length === 0) {
      // No snapshot found in the window, try to find the nearest one
      // Look for the closest snapshot before or after the target time within 30 minutes
      const extendedWindowStart = new Date(targetDate.getTime() - 30 * 60 * 1000);
      const extendedWindowEnd = new Date(targetDate.getTime() + 30 * 60 * 1000);

      const nearestSnapshots = await prisma.atmAlarmSnapshot.findMany({
        where: {
          receivedAt: {
            gte: extendedWindowStart,
            lte: extendedWindowEnd,
          },
        },
        orderBy: { receivedAt: 'desc' },
      });

      if (nearestSnapshots.length === 0) {
        return NextResponse.json({
          found: false,
          targetTime,
          targetDate: targetDate.toISOString(),
          message: 'Tidak ada data snapshot dalam rentang waktu yang diminta',
        });
      }

      // Find the nearest snapshot to target time
      let nearestSnapshot = nearestSnapshots[0];
      let minDiff = Math.abs(new Date(nearestSnapshot.receivedAt).getTime() - targetDate.getTime());

      for (const snapshot of nearestSnapshots) {
        const diff = Math.abs(new Date(snapshot.receivedAt).getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          nearestSnapshot = snapshot;
        }
      }

      const diffMinutes = Math.round(minDiff / 60000);

      return NextResponse.json({
        found: true,
        exact: false,
        diffMinutes,
        targetTime,
        targetDate: targetDate.toISOString(),
        snapshot: {
          id: nearestSnapshot.id,
          timestamp: nearestSnapshot.timestamp,
          receivedAt: nearestSnapshot.receivedAt,
          alarmCount: nearestSnapshot.alarmCount,
          devicesAlarming: nearestSnapshot.devicesAlarming,
          devicesCleared: nearestSnapshot.devicesCleared,
        },
      });
    }

    // Find the nearest snapshot to target time from the window
    let nearestSnapshot = snapshots[0];
    let minDiff = Math.abs(new Date(nearestSnapshot.receivedAt).getTime() - targetDate.getTime());

    for (const snapshot of snapshots) {
      const diff = Math.abs(new Date(snapshot.receivedAt).getTime() - targetDate.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        nearestSnapshot = snapshot;
      }
    }

    const diffMinutes = Math.round(minDiff / 60000);

    return NextResponse.json({
      found: true,
      exact: diffMinutes <= 1,
      diffMinutes,
      targetTime,
      targetDate: targetDate.toISOString(),
      snapshot: {
        id: nearestSnapshot.id,
        timestamp: nearestSnapshot.timestamp,
        receivedAt: nearestSnapshot.receivedAt,
        alarmCount: nearestSnapshot.alarmCount,
        devicesAlarming: nearestSnapshot.devicesAlarming,
        devicesCleared: nearestSnapshot.devicesCleared,
      },
    });
  } catch (error) {
    console.error('Error fetching ATM alert status:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data status ATM' },
      { status: 500 }
    );
  }
}
