import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AutoFetchType = 'SERVER_METRICS' | 'DEVICE_STATUS' | 'ATM_ALARM';

// POST /api/v2/p20t/checklist/auto-fetch - Fetch monitoring data for a time slot
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, timeSlot, autoFetchType } = body as {
      date: string;
      timeSlot: string;
      autoFetchType: AutoFetchType;
    };

    if (!date || !timeSlot || !autoFetchType) {
      return NextResponse.json(
        { error: 'Missing required parameters: date, timeSlot, autoFetchType' },
        { status: 400 }
      );
    }

    // Parse date and time slot to create target timestamp
    // timeSlot is in format "HH:mm"
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);

    // Create target time in local timezone (Asia/Makassar = UTC+8)
    const targetTime = new Date(year, month - 1, day, hours, minutes, 0, 0);

    // 5-minute margin for finding nearest record
    const marginMs = 5 * 60 * 1000;
    const marginStart = new Date(targetTime.getTime() - marginMs);
    const marginEnd = new Date(targetTime.getTime() + marginMs);

    let value: number | null = null;
    let fetchedAt: Date | null = null;

    switch (autoFetchType) {
      case 'SERVER_METRICS': {
        // Query ServerMetricCollectionV2 for cautionCount
        const collection = await prisma.serverMetricCollectionV2.findFirst({
          where: {
            createdAt: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { cautionCount: true, createdAt: true },
        });

        if (collection) {
          value = collection.cautionCount;
          fetchedAt = collection.createdAt;
        }
        break;
      }

      case 'DEVICE_STATUS': {
        // Query DeviceStatusCollection for downCount
        const deviceCollection = await prisma.deviceStatusCollection.findFirst({
          where: {
            createdAt: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { createdAt: 'desc' },
          select: { downCount: true, createdAt: true },
        });

        if (deviceCollection) {
          value = deviceCollection.downCount;
          fetchedAt = deviceCollection.createdAt;
        }
        break;
      }

      case 'ATM_ALARM': {
        // Query AtmAlarmSnapshot for alarmCount
        const snapshot = await prisma.atmAlarmSnapshot.findFirst({
          where: {
            timestamp: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { timestamp: 'desc' },
          select: { alarmCount: true, timestamp: true },
        });

        if (snapshot) {
          value = snapshot.alarmCount;
          fetchedAt = snapshot.timestamp;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid autoFetchType: ${autoFetchType}` },
          { status: 400 }
        );
    }

    if (value === null) {
      return NextResponse.json({
        success: false,
        error: `Tidak ada data untuk jam ${timeSlot} (margin 5 menit)`,
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        value,
        fetchedAt: fetchedAt?.toISOString(),
        timeSlot,
        autoFetchType,
      },
    });
  } catch (error) {
    console.error('Error fetching P20T auto-fetch data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
