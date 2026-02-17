import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/atms/code/[code]/alarms
 * Fetch alarm history for a specific ATM by code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const limit = parseInt(searchParams.get('limit') || '100');

    // Get ATM to verify it exists
    const atm = await prisma.aTM.findUnique({
      where: { code },
      select: { id: true, code: true, branchId: true, name: true }
    });

    if (!atm) {
      return NextResponse.json(
        { error: 'ATM not found' },
        { status: 404 }
      );
    }

    // Check access for non-admin users
    if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN' && session.user.branchId !== atm.branchId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the ATM monitor device by matching ATM code
    const device = await prisma.atmMonitorDevice.findUnique({
      where: { deviceId: code },
      include: {
        currentAlarms: {
          orderBy: { occurredAt: 'desc' },
        },
      },
    });

    // If no device found, return empty data
    if (!device) {
      return NextResponse.json({
        success: true,
        data: {
          atmCode: code,
          atmName: atm.name,
          device: null,
          currentAlarms: [],
          alarmHistory: [],
          statistics: {
            totalAlarms: 0,
            activeAlarms: 0,
            avgDurationSeconds: null,
            uptimePercentage30Days: 100
          }
        }
      });
    }

    // Get alarm history
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);

    const alarmHistory = await prisma.atmAlarmHistory.findMany({
      where: {
        deviceId: code,
        occurredAt: { gte: daysAgo },
      },
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });

    // Get alarm statistics
    const stats = await prisma.atmAlarmHistory.aggregate({
      where: { deviceId: code },
      _count: true,
      _avg: {
        duration: true,
      },
    });

    // Get alarm type breakdown
    const alarmTypeBreakdown = await prisma.atmAlarmHistory.groupBy({
      by: ['alarmType'],
      where: { deviceId: code },
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalDuration = await prisma.atmAlarmHistory.aggregate({
      where: {
        deviceId: code,
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
        atmCode: code,
        atmName: atm.name,
        device: {
          id: device.id,
          deviceId: device.deviceId,
          location: device.location,
          status: device.status,
          lastSeenAt: device.lastSeenAt,
        },
        currentAlarms: device.currentAlarms.map(alarm => ({
          id: alarm.id,
          alarmType: alarm.alarmType,
          location: alarm.location,
          occurredAt: alarm.occurredAt,
          timeAgo: alarm.timeAgo,
        })),
        alarmHistory: alarmHistory.map(record => ({
          id: record.id,
          alarmType: record.alarmType,
          location: record.location,
          occurredAt: record.occurredAt,
          clearedAt: record.clearedAt,
          duration: record.duration,
          isActive: record.clearedAt === null,
        })),
        statistics: {
          totalAlarms: stats._count,
          activeAlarms: device.currentAlarms.length,
          avgDurationSeconds: stats._avg.duration ? Math.round(stats._avg.duration) : null,
          uptimePercentage30Days: Math.round(uptimePercentage * 100) / 100,
          alarmTypeBreakdown: alarmTypeBreakdown.map(item => ({
            alarmType: item.alarmType,
            count: item._count.alarmType,
          })),
        },
      },
    });

  } catch (error) {
    console.error('Error fetching ATM alarm history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ATM alarm history' },
      { status: 500 }
    );
  }
}
