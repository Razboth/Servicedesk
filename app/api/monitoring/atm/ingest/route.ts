import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for incoming alarm data
const alarmSchema = z.object({
  deviceId: z.string(),
  alarmType: z.string(),
  timeAgo: z.string(),
  location: z.string(),
  timestamp: z.string(),
});

const ingestSchema = z.object({
  timestamp: z.string(),
  alarmCount: z.number(),
  alarms: z.array(alarmSchema),
});

// Normalize device ID: "00126" -> "0126" (remove first leading zero only)
function normalizeDeviceId(deviceId: string): string {
  if (deviceId.startsWith('0') && deviceId.length > 1) {
    return deviceId.substring(1);
  }
  return deviceId;
}

// Parse timestamp string to Date
function parseTimestamp(timestamp: string): Date {
  // Handle format like "2026-02-03 10:48:46"
  const parsed = new Date(timestamp.replace(' ', 'T'));
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

// POST /api/monitoring/atm/ingest - Receive alarm data from external system
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ingestSchema.parse(body);

    // Filter out empty values
    const validAlarms = validatedData.alarms.filter(
      (alarm) => alarm.deviceId.trim() !== '' && alarm.alarmType.trim() !== ''
    );

    // Normalize device IDs and group alarms by device
    const alarmsByDevice = new Map<string, typeof validAlarms>();
    for (const alarm of validAlarms) {
      const normalizedId = normalizeDeviceId(alarm.deviceId);
      if (!alarmsByDevice.has(normalizedId)) {
        alarmsByDevice.set(normalizedId, []);
      }
      alarmsByDevice.get(normalizedId)!.push({
        ...alarm,
        deviceId: normalizedId,
      });
    }

    // Get all currently alarming devices
    const currentlyAlarmingDevices = await prisma.atmMonitorDevice.findMany({
      where: { status: 'ALARM' },
      select: { deviceId: true },
    });

    const currentDeviceIds = new Set(currentlyAlarmingDevices.map((d) => d.deviceId));
    const newDeviceIds = new Set(alarmsByDevice.keys());

    // Devices to clear (were alarming but not in new data)
    const devicesToClear = [...currentDeviceIds].filter((id) => !newDeviceIds.has(id));

    // Create snapshot record
    const snapshot = await prisma.atmAlarmSnapshot.create({
      data: {
        timestamp: parseTimestamp(validatedData.timestamp),
        alarmCount: validatedData.alarmCount,
        processedCount: validAlarms.length,
        devicesAlarming: alarmsByDevice.size,
        devicesCleared: devicesToClear.length,
      },
    });

    // Process each device with alarms
    for (const [deviceId, alarms] of alarmsByDevice) {
      // Get the most recent location for this device
      const latestAlarm = alarms[0];
      const location = latestAlarm.location;

      // Upsert device
      await prisma.atmMonitorDevice.upsert({
        where: { deviceId },
        create: {
          deviceId,
          location,
          status: 'ALARM',
          lastSeenAt: new Date(),
        },
        update: {
          location,
          status: 'ALARM',
          lastSeenAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Get existing current alarms for this device
      const existingAlarms = await prisma.atmCurrentAlarm.findMany({
        where: { deviceId },
        select: { alarmType: true },
      });
      const existingAlarmTypes = new Set(existingAlarms.map((a) => a.alarmType));

      // Process each alarm for this device
      for (const alarm of alarms) {
        const occurredAt = parseTimestamp(alarm.timestamp);

        // Upsert current alarm
        await prisma.atmCurrentAlarm.upsert({
          where: {
            deviceId_alarmType: {
              deviceId,
              alarmType: alarm.alarmType,
            },
          },
          create: {
            deviceId,
            alarmType: alarm.alarmType,
            location: alarm.location,
            occurredAt,
            timeAgo: alarm.timeAgo,
          },
          update: {
            location: alarm.location,
            occurredAt,
            timeAgo: alarm.timeAgo,
          },
        });

        // Add to history (only if it's a new alarm or alarm type changed)
        if (!existingAlarmTypes.has(alarm.alarmType)) {
          await prisma.atmAlarmHistory.create({
            data: {
              deviceId,
              alarmType: alarm.alarmType,
              location: alarm.location,
              occurredAt,
              snapshotId: snapshot.id,
            },
          });
        }
      }

      // Clear alarm types that are no longer present for this device
      const newAlarmTypes = new Set(alarms.map((a) => a.alarmType));
      const alarmTypesToClear = [...existingAlarmTypes].filter((t) => !newAlarmTypes.has(t));

      if (alarmTypesToClear.length > 0) {
        // Mark as cleared in history
        const now = new Date();
        for (const alarmType of alarmTypesToClear) {
          await prisma.atmAlarmHistory.updateMany({
            where: {
              deviceId,
              alarmType,
              clearedAt: null,
            },
            data: {
              clearedAt: now,
            },
          });
        }

        // Delete from current alarms
        await prisma.atmCurrentAlarm.deleteMany({
          where: {
            deviceId,
            alarmType: { in: alarmTypesToClear },
          },
        });
      }
    }

    // Clear devices that are no longer alarming
    const now = new Date();
    for (const deviceId of devicesToClear) {
      // Update device status to ONLINE
      await prisma.atmMonitorDevice.update({
        where: { deviceId },
        data: {
          status: 'ONLINE',
          lastSeenAt: now,
          updatedAt: now,
        },
      });

      // Mark all their alarms as cleared in history
      await prisma.atmAlarmHistory.updateMany({
        where: {
          deviceId,
          clearedAt: null,
        },
        data: {
          clearedAt: now,
        },
      });

      // Delete their current alarms
      await prisma.atmCurrentAlarm.deleteMany({
        where: { deviceId },
      });
    }

    // Calculate duration for cleared alarms
    await prisma.$executeRaw`
      UPDATE atm_alarm_history
      SET duration = EXTRACT(EPOCH FROM ("clearedAt" - "occurredAt"))::integer
      WHERE "clearedAt" IS NOT NULL AND duration IS NULL
    `;

    return NextResponse.json({
      success: true,
      data: {
        snapshotId: snapshot.id,
        timestamp: snapshot.timestamp,
        originalCount: validatedData.alarmCount,
        processedCount: validAlarms.length,
        devicesAlarming: alarmsByDevice.size,
        devicesCleared: devicesToClear.length,
        clearedDevices: devicesToClear,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error ingesting ATM alarms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
