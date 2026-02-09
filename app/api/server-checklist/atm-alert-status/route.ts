import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCurrentTimeWITA } from '@/lib/time-lock';

// POST - Create a snapshot from current ATM alarm data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = getCurrentTimeWITA();

    // Get current alarm statistics
    const [alarmingDevices, totalAlarms] = await Promise.all([
      prisma.atmMonitorDevice.count({ where: { status: 'ALARM' } }),
      prisma.atmCurrentAlarm.count(),
    ]);

    // Create a new snapshot with current data
    const snapshot = await prisma.atmAlarmSnapshot.create({
      data: {
        timestamp: now,
        receivedAt: now,
        alarmCount: totalAlarms,
        processedCount: totalAlarms,
        devicesAlarming: alarmingDevices,
        devicesCleared: 0,
      },
    });

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
        receivedAt: snapshot.receivedAt,
        alarmCount: snapshot.alarmCount,
        devicesAlarming: snapshot.devicesAlarming,
        devicesCleared: snapshot.devicesCleared,
      },
      message: 'Snapshot berhasil dibuat dari data saat ini',
    });
  } catch (error) {
    console.error('Error creating ATM snapshot:', error);
    return NextResponse.json(
      { error: 'Gagal membuat snapshot ATM' },
      { status: 500 }
    );
  }
}

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

    // Define search window: 1 minute before, 1 minute after (prioritize after)
    const marginMs = 1 * 60 * 1000; // 1 minute in milliseconds
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
      orderBy: { receivedAt: 'asc' }, // Ascending to find snapshots closest to/after target
    });

    if (snapshots.length === 0) {
      // No snapshot found in the window, try to find the nearest one
      // Look for the closest snapshot after the target time first (within 5 minutes)
      const extendedAfterEnd = new Date(targetDate.getTime() + 5 * 60 * 1000);
      const extendedBeforeStart = new Date(targetDate.getTime() - 5 * 60 * 1000);

      // First, try to find a snapshot AFTER the target time (prioritize)
      let nearestSnapshot = await prisma.atmAlarmSnapshot.findFirst({
        where: {
          receivedAt: {
            gte: targetDate,
            lte: extendedAfterEnd,
          },
        },
        orderBy: { receivedAt: 'asc' }, // Get the earliest one after target
      });

      // If no snapshot after, look before
      if (!nearestSnapshot) {
        nearestSnapshot = await prisma.atmAlarmSnapshot.findFirst({
          where: {
            receivedAt: {
              gte: extendedBeforeStart,
              lt: targetDate,
            },
          },
          orderBy: { receivedAt: 'desc' }, // Get the latest one before target
        });
      }

      if (!nearestSnapshot) {
        return NextResponse.json({
          found: false,
          targetTime,
          targetDate: targetDate.toISOString(),
          message: 'Tidak ada data snapshot dalam rentang waktu yang diminta',
        });
      }

      const minDiff = Math.abs(new Date(nearestSnapshot.receivedAt).getTime() - targetDate.getTime());
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

    // Find the best snapshot: prioritize ones AFTER the target time
    // First, filter snapshots that are >= targetDate
    const snapshotsAfter = snapshots.filter(
      (s) => new Date(s.receivedAt).getTime() >= targetDate.getTime()
    );
    const snapshotsBefore = snapshots.filter(
      (s) => new Date(s.receivedAt).getTime() < targetDate.getTime()
    );

    // Prioritize: use the earliest snapshot after target time, or the latest before
    let nearestSnapshot = snapshotsAfter.length > 0 ? snapshotsAfter[0] : snapshotsBefore[snapshotsBefore.length - 1];
    const minDiff = Math.abs(new Date(nearestSnapshot.receivedAt).getTime() - targetDate.getTime());
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
