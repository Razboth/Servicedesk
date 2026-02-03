-- ATM Monitoring System Tables
-- Run with: sudo -u postgres psql -d servicedesk_database -f atm_monitoring.sql

-- Create AtmMonitorStatus enum
DO $$ BEGIN
    CREATE TYPE "AtmMonitorStatus" AS ENUM ('ONLINE', 'ALARM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create atm_monitor_devices table
CREATE TABLE IF NOT EXISTS "atm_monitor_devices" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "location" TEXT,
    "status" "AtmMonitorStatus" NOT NULL DEFAULT 'ONLINE',
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_monitor_devices_pkey" PRIMARY KEY ("id")
);

-- Create unique index on deviceId
CREATE UNIQUE INDEX IF NOT EXISTS "atm_monitor_devices_deviceId_key" ON "atm_monitor_devices"("deviceId");
CREATE INDEX IF NOT EXISTS "atm_monitor_devices_status_idx" ON "atm_monitor_devices"("status");
CREATE INDEX IF NOT EXISTS "atm_monitor_devices_lastSeenAt_idx" ON "atm_monitor_devices"("lastSeenAt");

-- Create atm_current_alarms table
CREATE TABLE IF NOT EXISTS "atm_current_alarms" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "alarmType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "timeAgo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_current_alarms_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on deviceId + alarmType
CREATE UNIQUE INDEX IF NOT EXISTS "atm_current_alarms_deviceId_alarmType_key" ON "atm_current_alarms"("deviceId", "alarmType");
CREATE INDEX IF NOT EXISTS "atm_current_alarms_alarmType_idx" ON "atm_current_alarms"("alarmType");

-- Add foreign key
ALTER TABLE "atm_current_alarms" DROP CONSTRAINT IF EXISTS "atm_current_alarms_deviceId_fkey";
ALTER TABLE "atm_current_alarms" ADD CONSTRAINT "atm_current_alarms_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "atm_monitor_devices"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create atm_alarm_snapshots table (before history table for FK reference)
CREATE TABLE IF NOT EXISTS "atm_alarm_snapshots" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "alarmCount" INTEGER NOT NULL,
    "processedCount" INTEGER NOT NULL,
    "devicesAlarming" INTEGER NOT NULL,
    "devicesCleared" INTEGER NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_alarm_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "atm_alarm_snapshots_timestamp_idx" ON "atm_alarm_snapshots"("timestamp");
CREATE INDEX IF NOT EXISTS "atm_alarm_snapshots_receivedAt_idx" ON "atm_alarm_snapshots"("receivedAt");

-- Create atm_alarm_history table
CREATE TABLE IF NOT EXISTS "atm_alarm_history" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "alarmType" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "clearedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "snapshotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_alarm_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "atm_alarm_history_deviceId_createdAt_idx" ON "atm_alarm_history"("deviceId", "createdAt");
CREATE INDEX IF NOT EXISTS "atm_alarm_history_alarmType_idx" ON "atm_alarm_history"("alarmType");
CREATE INDEX IF NOT EXISTS "atm_alarm_history_occurredAt_idx" ON "atm_alarm_history"("occurredAt");
CREATE INDEX IF NOT EXISTS "atm_alarm_history_snapshotId_idx" ON "atm_alarm_history"("snapshotId");

-- Add foreign keys for history table
ALTER TABLE "atm_alarm_history" DROP CONSTRAINT IF EXISTS "atm_alarm_history_deviceId_fkey";
ALTER TABLE "atm_alarm_history" ADD CONSTRAINT "atm_alarm_history_deviceId_fkey"
    FOREIGN KEY ("deviceId") REFERENCES "atm_monitor_devices"("deviceId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "atm_alarm_history" DROP CONSTRAINT IF EXISTS "atm_alarm_history_snapshotId_fkey";
ALTER TABLE "atm_alarm_history" ADD CONSTRAINT "atm_alarm_history_snapshotId_fkey"
    FOREIGN KEY ("snapshotId") REFERENCES "atm_alarm_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Verify tables
SELECT 'atm_monitor_devices' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'atm_monitor_devices';

SELECT 'atm_current_alarms' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'atm_current_alarms';

SELECT 'atm_alarm_history' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'atm_alarm_history';

SELECT 'atm_alarm_snapshots' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'atm_alarm_snapshots';
