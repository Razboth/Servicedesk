-- Shift Tables Migration Script
-- Generated: 2026-02-01
-- Purpose: Sync production shift tables with Prisma schema
-- Run with: psql -U postgres -d servicedesk -f shift-tables-migration.sql

-- ============================================
-- SHIFT_REPORTS TABLE - Missing Columns
-- ============================================

-- Add startedAt column (required by API)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'startedAt') THEN
        ALTER TABLE shift_reports ADD COLUMN "startedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
        RAISE NOTICE 'Added column: shift_reports.startedAt';
    ELSE
        RAISE NOTICE 'Column shift_reports.startedAt already exists';
    END IF;
END $$;

-- Add completedAt column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'completedAt') THEN
        ALTER TABLE shift_reports ADD COLUMN "completedAt" TIMESTAMP;
        RAISE NOTICE 'Added column: shift_reports.completedAt';
    ELSE
        RAISE NOTICE 'Column shift_reports.completedAt already exists';
    END IF;
END $$;

-- Add serverMetricsId column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'serverMetricsId') THEN
        ALTER TABLE shift_reports ADD COLUMN "serverMetricsId" TEXT;
        RAISE NOTICE 'Added column: shift_reports.serverMetricsId';
    ELSE
        RAISE NOTICE 'Column shift_reports.serverMetricsId already exists';
    END IF;
END $$;

-- Add issuesEncountered column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'issuesEncountered') THEN
        ALTER TABLE shift_reports ADD COLUMN "issuesEncountered" TEXT;
        RAISE NOTICE 'Added column: shift_reports.issuesEncountered';
    ELSE
        RAISE NOTICE 'Column shift_reports.issuesEncountered already exists';
    END IF;
END $$;

-- Add pendingActions column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'pendingActions') THEN
        ALTER TABLE shift_reports ADD COLUMN "pendingActions" TEXT;
        RAISE NOTICE 'Added column: shift_reports.pendingActions';
    ELSE
        RAISE NOTICE 'Column shift_reports.pendingActions already exists';
    END IF;
END $$;

-- Add notes column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'notes') THEN
        ALTER TABLE shift_reports ADD COLUMN "notes" TEXT;
        RAISE NOTICE 'Added column: shift_reports.notes';
    ELSE
        RAISE NOTICE 'Column shift_reports.notes already exists';
    END IF;
END $$;

-- ============================================
-- SHIFT_REPORTS - Add unique constraint on shiftAssignmentId
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shift_reports_shiftAssignmentId_key'
    ) THEN
        -- Check for duplicates first
        IF EXISTS (
            SELECT "shiftAssignmentId", COUNT(*)
            FROM shift_reports
            GROUP BY "shiftAssignmentId"
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'WARNING: Duplicate shiftAssignmentId values found in shift_reports. Fix before adding unique constraint.';
        ELSE
            ALTER TABLE shift_reports ADD CONSTRAINT "shift_reports_shiftAssignmentId_key" UNIQUE ("shiftAssignmentId");
            RAISE NOTICE 'Added unique constraint: shift_reports_shiftAssignmentId_key';
        END IF;
    ELSE
        RAISE NOTICE 'Unique constraint shift_reports_shiftAssignmentId_key already exists';
    END IF;
END $$;

-- ============================================
-- SHIFT_REPORTS - Add indexes
-- ============================================
CREATE INDEX IF NOT EXISTS "shift_reports_shiftAssignmentId_idx" ON shift_reports ("shiftAssignmentId");
CREATE INDEX IF NOT EXISTS "shift_reports_status_idx" ON shift_reports ("status");

-- ============================================
-- CREATE ShiftReportStatus ENUM if not exists
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftReportStatus') THEN
        CREATE TYPE "ShiftReportStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'SUBMITTED');
        RAISE NOTICE 'Created enum: ShiftReportStatus';
    ELSE
        RAISE NOTICE 'Enum ShiftReportStatus already exists';
    END IF;
END $$;

-- ============================================
-- TICKETS TABLE - Missing firstResponseAt
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'tickets' AND column_name = 'firstResponseAt') THEN
        ALTER TABLE tickets ADD COLUMN "firstResponseAt" TIMESTAMP;
        RAISE NOTICE 'Added column: tickets.firstResponseAt';
    ELSE
        RAISE NOTICE 'Column tickets.firstResponseAt already exists';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "tickets_firstResponseAt_idx" ON tickets ("firstResponseAt");
CREATE INDEX IF NOT EXISTS "tickets_claimedAt_idx" ON tickets ("claimedAt");

-- ============================================
-- SHIFT CHECKLIST TABLES - Create if not exists
-- ============================================

-- ShiftChecklistCategory enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftChecklistCategory') THEN
        CREATE TYPE "ShiftChecklistCategory" AS ENUM (
            'SERVER_HEALTH',
            'NETWORK_STATUS',
            'APPLICATION_STATUS',
            'BACKUP_STATUS',
            'SECURITY_CHECK',
            'DOCUMENTATION',
            'HANDOVER'
        );
        RAISE NOTICE 'Created enum: ShiftChecklistCategory';
    END IF;
END $$;

-- ShiftChecklistStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftChecklistStatus') THEN
        CREATE TYPE "ShiftChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED');
        RAISE NOTICE 'Created enum: ShiftChecklistStatus';
    END IF;
END $$;

-- Create shift_checklist_items table if not exists
CREATE TABLE IF NOT EXISTS "shift_checklist_items" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "category" "ShiftChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShiftChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "shift_checklist_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shift_checklist_items_shiftReportId_fkey"
        FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shift_checklist_items_shiftReportId_idx" ON shift_checklist_items ("shiftReportId");
CREATE INDEX IF NOT EXISTS "shift_checklist_items_status_idx" ON shift_checklist_items ("status");

-- Create shift_backup_checklist table if not exists
CREATE TABLE IF NOT EXISTS "shift_backup_checklist" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "status" "ShiftChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "fileSize" BIGINT,
    "filePath" TEXT,
    "verifiedAt" TIMESTAMP,
    "verifiedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "shift_backup_checklist_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shift_backup_checklist_shiftReportId_fkey"
        FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shift_backup_checklist_shiftReportId_idx" ON shift_backup_checklist ("shiftReportId");

-- Create shift_issues table if not exists
CREATE TABLE IF NOT EXISTS "shift_issues" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "ticketId" TEXT,
    "resolvedAt" TIMESTAMP,
    "resolution" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "shift_issues_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shift_issues_shiftReportId_fkey"
        FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "shift_issues_shiftReportId_idx" ON shift_issues ("shiftReportId");
CREATE INDEX IF NOT EXISTS "shift_issues_status_idx" ON shift_issues ("status");

-- ============================================
-- SHIFT_BACKUP_TEMPLATES TABLE - Create if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS "shift_backup_templates" (
    "id" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "backupType" TEXT NOT NULL DEFAULT 'FULL',
    "expectedSizeMin" BIGINT,
    "expectedSizeMax" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL,

    CONSTRAINT "shift_backup_templates_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on databaseName if no duplicates
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shift_backup_templates_databaseName_key'
    ) THEN
        SELECT COUNT(*) - COUNT(DISTINCT "databaseName") INTO duplicate_count
        FROM shift_backup_templates
        WHERE "databaseName" IS NOT NULL;

        IF duplicate_count > 0 THEN
            RAISE NOTICE 'WARNING: % duplicate databaseName values. Fix before adding unique constraint.', duplicate_count;
        ELSE
            ALTER TABLE shift_backup_templates ADD CONSTRAINT "shift_backup_templates_databaseName_key" UNIQUE ("databaseName");
            RAISE NOTICE 'Added unique constraint on shift_backup_templates.databaseName';
        END IF;
    END IF;
END $$;

-- ============================================
-- SERVER_METRICS TABLE - Create if not exists
-- ============================================
CREATE TABLE IF NOT EXISTS "server_metrics" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "serverName" TEXT NOT NULL,
    "cpuUsage" DOUBLE PRECISION,
    "memoryUsage" DOUBLE PRECISION,
    "diskUsage" DOUBLE PRECISION,
    "networkIn" BIGINT,
    "networkOut" BIGINT,
    "activeConnections" INTEGER,
    "uptime" BIGINT,
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_metrics_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "server_metrics_timestamp_idx" ON server_metrics ("timestamp");
CREATE INDEX IF NOT EXISTS "server_metrics_serverName_idx" ON server_metrics ("serverName");

-- ============================================
-- VERIFICATION
-- ============================================
\echo ''
\echo '=== SHIFT_REPORTS COLUMNS ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'shift_reports'
ORDER BY ordinal_position;

\echo ''
\echo '=== Migration completed ==='
