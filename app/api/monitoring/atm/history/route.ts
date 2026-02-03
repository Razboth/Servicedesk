import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/monitoring/atm/history - Get historical alarm data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const alarmType = searchParams.get('alarmType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cleared = searchParams.get('cleared'); // 'true', 'false', or null for all
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build where clause
    const where: any = {};

    if (deviceId) {
      where.deviceId = deviceId;
    }

    if (alarmType) {
      where.alarmType = { contains: alarmType, mode: 'insensitive' };
    }

    if (startDate) {
      where.occurredAt = {
        ...where.occurredAt,
        gte: new Date(startDate),
      };
    }

    if (endDate) {
      where.occurredAt = {
        ...where.occurredAt,
        lte: new Date(endDate),
      };
    }

    if (cleared === 'true') {
      where.clearedAt = { not: null };
    } else if (cleared === 'false') {
      where.clearedAt = null;
    }

    // Get total count
    const totalCount = await prisma.atmAlarmHistory.count({ where });

    // Get history records
    const history = await prisma.atmAlarmHistory.findMany({
      where,
      include: {
        device: {
          select: {
            location: true,
            status: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get statistics for filtered data
    const stats = await prisma.atmAlarmHistory.aggregate({
      where,
      _count: true,
      _avg: {
        duration: true,
      },
    });

    // Get alarm type distribution
    const alarmTypeDistribution = await prisma.atmAlarmHistory.groupBy({
      by: ['alarmType'],
      where,
      _count: {
        alarmType: true,
      },
      orderBy: {
        _count: {
          alarmType: 'desc',
        },
      },
      take: 10,
    });

    // Get device distribution (top 10 most problematic)
    const deviceDistribution = await prisma.atmAlarmHistory.groupBy({
      by: ['deviceId'],
      where,
      _count: {
        deviceId: true,
      },
      orderBy: {
        _count: {
          deviceId: 'desc',
        },
      },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
        statistics: {
          totalAlarms: stats._count,
          avgDurationSeconds: stats._avg.duration ? Math.round(stats._avg.duration) : null,
          alarmTypeDistribution: alarmTypeDistribution.map((item) => ({
            alarmType: item.alarmType,
            count: item._count.alarmType,
          })),
          deviceDistribution: deviceDistribution.map((item) => ({
            deviceId: item.deviceId,
            count: item._count.deviceId,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching ATM alarm history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
