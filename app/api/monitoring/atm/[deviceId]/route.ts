import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/monitoring/atm/[deviceId] - Get single device details with alarm history
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceId: string }> }
) {
  try {
    const { deviceId } = await params;

    // Get device with current alarms
    const device = await prisma.atmMonitorDevice.findUnique({
      where: { deviceId },
      include: {
        currentAlarms: {
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      );
    }

    // Get recent alarm history (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentHistory = await prisma.atmAlarmHistory.findMany({
      where: {
        deviceId,
        occurredAt: { gte: thirtyDaysAgo },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });

    // Get alarm statistics for this device
    const stats = await prisma.atmAlarmHistory.aggregate({
      where: { deviceId },
      _count: true,
      _avg: {
        duration: true,
      },
    });

    // Get alarm type breakdown for this device
    const alarmTypeBreakdown = await prisma.atmAlarmHistory.groupBy({
      by: ['alarmType'],
      where: { deviceId },
      _count: {
        alarmType: true,
      },
      orderBy: {
        _count: {
          alarmType: 'desc',
        },
      },
    });

    // Calculate uptime (percentage of time online in last 30 days)
    const totalDuration = await prisma.atmAlarmHistory.aggregate({
      where: {
        deviceId,
        occurredAt: { gte: thirtyDaysAgo },
        clearedAt: { not: null },
      },
      _sum: {
        duration: true,
      },
    });

    const thirtyDaysInSeconds = 30 * 24 * 60 * 60;
    const downtimeSeconds = totalDuration._sum.duration || 0;
    const uptimePercentage = Math.max(0, ((thirtyDaysInSeconds - downtimeSeconds) / thirtyDaysInSeconds) * 100);

    return NextResponse.json({
      success: true,
      data: {
        device,
        recentHistory,
        statistics: {
          totalAlarms: stats._count,
          avgDurationSeconds: stats._avg.duration ? Math.round(stats._avg.duration) : null,
          uptimePercentage30Days: Math.round(uptimePercentage * 100) / 100,
          alarmTypeBreakdown: alarmTypeBreakdown.map((item) => ({
            alarmType: item.alarmType,
            count: item._count.alarmType,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching device details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
