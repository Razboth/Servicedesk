import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/monitoring/atm - Get current ATM status for monitoring page
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'ALARM', 'ONLINE', or null for all
    const alarmType = searchParams.get('alarmType');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'lastSeenAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { deviceId: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ];
    }

    // If filtering by alarm type, we need devices with that alarm
    if (alarmType) {
      where.currentAlarms = {
        some: {
          alarmType: { contains: alarmType, mode: 'insensitive' },
        },
      };
    }

    // Get total count
    const totalCount = await prisma.atmMonitorDevice.count({ where });

    // Get devices with current alarms
    const devices = await prisma.atmMonitorDevice.findMany({
      where,
      include: {
        currentAlarms: {
          orderBy: { occurredAt: 'desc' },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get summary statistics
    const [totalDevices, alarmingDevices, onlineDevices] = await Promise.all([
      prisma.atmMonitorDevice.count(),
      prisma.atmMonitorDevice.count({ where: { status: 'ALARM' } }),
      prisma.atmMonitorDevice.count({ where: { status: 'ONLINE' } }),
    ]);

    // Get alarm type breakdown
    const alarmTypeStats = await prisma.atmCurrentAlarm.groupBy({
      by: ['alarmType'],
      _count: {
        alarmType: true,
      },
      orderBy: {
        _count: {
          alarmType: 'desc',
        },
      },
    });

    // Get latest snapshot info
    const latestSnapshot = await prisma.atmAlarmSnapshot.findFirst({
      orderBy: { receivedAt: 'desc' },
      select: {
        id: true,
        timestamp: true,
        receivedAt: true,
        alarmCount: true,
        processedCount: true,
        devicesAlarming: true,
        devicesCleared: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        devices,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        summary: {
          totalDevices,
          alarmingDevices,
          onlineDevices,
          alarmTypeBreakdown: alarmTypeStats.map((stat) => ({
            alarmType: stat.alarmType,
            count: stat._count.alarmType,
          })),
        },
        lastUpdate: latestSnapshot,
      },
    });
  } catch (error) {
    console.error('Error fetching ATM monitoring data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
