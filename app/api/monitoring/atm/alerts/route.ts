import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET /api/monitoring/atm/alerts - Get ATM alerts for checklist verification
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Get all devices with active alarms
    const devices = await prisma.atmMonitorDevice.findMany({
      where: {
        status: 'ALARM',
        currentAlarms: {
          some: {},
        },
      },
      include: {
        currentAlarms: {
          orderBy: { occurredAt: 'desc' },
        },
      },
      orderBy: { deviceId: 'asc' },
    });

    // Transform to checklist-friendly format
    const alerts = devices.flatMap((device) =>
      device.currentAlarms.map((alarm) => ({
        atmId: device.id,
        terminalId: device.deviceId,
        location: device.location || 'Unknown',
        alarmType: alarm.alarmType,
        alarmDescription: alarm.alarmDescription,
        status: alarm.status,
        timestamp: alarm.occurredAt?.toISOString() || new Date().toISOString(),
      }))
    );

    // Get summary
    const summary = {
      totalDevicesWithAlarms: devices.length,
      totalAlarms: alerts.length,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: alerts,
      summary,
    });
  } catch (error) {
    console.error('Error fetching ATM alerts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
