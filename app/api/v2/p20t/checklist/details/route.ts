import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type AutoFetchType = 'SERVER_METRICS' | 'DEVICE_STATUS' | 'ATM_ALARM';

// POST /api/v2/p20t/checklist/details - Get detailed data for monitoring items
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, timeSlot, autoFetchType, shift } = body as {
      date: string;
      timeSlot: string;
      autoFetchType: AutoFetchType;
      shift?: 'DAY' | 'NIGHT';
    };

    if (!date || !timeSlot || !autoFetchType) {
      return NextResponse.json(
        { error: 'Missing required parameters: date, timeSlot, autoFetchType' },
        { status: 400 }
      );
    }

    // Parse date and time slot to create target timestamp
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const [year, month, day] = date.split('-').map(Number);

    // Handle night shift time slots that cross midnight
    // For 00:00, 02:00, 04:00, 06:00, 08:00 - these are next day
    let targetDay = day;
    if (shift === 'NIGHT' && hours < 12) {
      targetDay = day + 1;
    }

    // Create target time in local timezone (Asia/Makassar = UTC+8)
    const targetTime = new Date(year, month - 1, targetDay, hours, minutes, 0, 0);

    // 5-minute margin for finding nearest record
    const marginMs = 5 * 60 * 1000;
    const marginStart = new Date(targetTime.getTime() - marginMs);
    const marginEnd = new Date(targetTime.getTime() + marginMs);

    let details: any[] = [];
    let fetchedAt: Date | null = null;
    let title = '';

    switch (autoFetchType) {
      case 'SERVER_METRICS': {
        title = 'Server Metrics - Cautions & Warnings';
        // Query ServerMetricCollectionV2 with its snapshots
        const collection = await prisma.serverMetricCollectionV2.findFirst({
          where: {
            createdAt: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            snapshots: {
              where: {
                status: { in: ['CAUTION', 'WARNING'] },
              },
              orderBy: [
                { status: 'asc' },
                { serverName: 'asc' },
              ],
            },
          },
        });

        if (collection) {
          fetchedAt = collection.createdAt;
          details = collection.snapshots.map((s) => ({
            server: s.serverName,
            instance: s.instance,
            cpu: `${s.cpuPercent.toFixed(1)}%`,
            memory: `${s.memoryPercent.toFixed(1)}%`,
            storage: `${s.storagePercent.toFixed(1)}%`,
            status: s.status,
          }));
        }
        break;
      }

      case 'DEVICE_STATUS': {
        title = 'Device Status - Down';
        // Query DeviceStatusCollection with its snapshots
        const deviceCollection = await prisma.deviceStatusCollection.findFirst({
          where: {
            createdAt: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { createdAt: 'desc' },
          include: {
            snapshots: {
              where: {
                status: 'DOWN',
              },
              orderBy: [
                { groupName: 'asc' },
                { serviceName: 'asc' },
              ],
            },
          },
        });

        if (deviceCollection) {
          fetchedAt = deviceCollection.createdAt;
          details = deviceCollection.snapshots.map((s) => ({
            group: s.groupName,
            service: s.serviceName,
            status: s.status,
          }));
        }
        break;
      }

      case 'ATM_ALARM': {
        title = 'ATM Alarm - Details';
        // Query AtmAlarmSnapshot with alarm history
        const snapshot = await prisma.atmAlarmSnapshot.findFirst({
          where: {
            timestamp: {
              gte: marginStart,
              lte: marginEnd,
            },
          },
          orderBy: { timestamp: 'desc' },
          include: {
            alarmHistory: {
              orderBy: [
                { deviceId: 'asc' },
              ],
              include: {
                device: {
                  select: {
                    deviceId: true,
                    location: true,
                  },
                },
              },
            },
          },
        });

        if (snapshot) {
          fetchedAt = snapshot.timestamp;
          details = snapshot.alarmHistory.map((a) => ({
            deviceId: a.deviceId,
            location: a.location || a.device?.location || '-',
            alarmType: a.alarmType,
            occurredAt: a.occurredAt.toISOString(),
          }));
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: `Invalid autoFetchType: ${autoFetchType}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        title,
        timeSlot,
        autoFetchType,
        fetchedAt: fetchedAt?.toISOString(),
        totalCount: details.length,
        details,
      },
    });
  } catch (error) {
    console.error('Error fetching P20T detail data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
