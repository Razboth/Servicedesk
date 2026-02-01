-- Shift Tables Migration Script
-- Generated: 2026-02-01
-- Purpose: Sync production shift tables with Prisma schema
-- Run with: psql -U postgres -d servicedesk -f shift-tables-migration.sql

-- ============================================
-- ENUMS - Create all shift-related enums
-- ============================================

-- ShiftReportStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftReportStatus') THEN
        CREATE TYPE "ShiftReportStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
        RAISE NOTICE 'Created enum: ShiftReportStatus';
    END IF;
END $$;

-- ShiftChecklistCategory enum (matches Prisma: SYSTEM_MONITORING, TICKET_MANAGEMENT, HANDOVER_TASKS)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftChecklistCategory') THEN
        CREATE TYPE "ShiftChecklistCategory" AS ENUM (
            'SYSTEM_MONITORING',
            'TICKET_MANAGEMENT',
            'HANDOVER_TASKS'
        );
        RAISE NOTICE 'Created enum: ShiftChecklistCategory';
    END IF;
END $$;

-- ShiftChecklistStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftChecklistStatus') THEN
        CREATE TYPE "ShiftChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
        RAISE NOTICE 'Created enum: ShiftChecklistStatus';
    END IF;
END $$;

-- ShiftIssueStatus enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ShiftIssueStatus') THEN
        CREATE TYPE "ShiftIssueStatus" AS ENUM ('ONGOING', 'RESOLVED');
        RAISE NOTICE 'Created enum: ShiftIssueStatus';
    END IF;
END $$;

-- IssuePriority enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IssuePriority') THEN
        CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
        RAISE NOTICE 'Created enum: IssuePriority';
    END IF;
END $$;

-- ============================================
-- SHIFT_REPORTS TABLE - Add missing columns
-- ============================================

-- Add startedAt column
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

-- Add summary column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'summary') THEN
        ALTER TABLE shift_reports ADD COLUMN "summary" TEXT;
        RAISE NOTICE 'Added column: shift_reports.summary';
    ELSE
        RAISE NOTICE 'Column shift_reports.summary already exists';
    END IF;
END $$;

-- Add handoverNotes column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'shift_reports' AND column_name = 'handoverNotes') THEN
        ALTER TABLE shift_reports ADD COLUMN "handoverNotes" TEXT;
        RAISE NOTICE 'Added column: shift_reports.handoverNotes';
    ELSE
        RAISE NOTICE 'Column shift_reports.handoverNotes already exists';
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

-- Add unique constraint on shiftAssignmentId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'shift_reports_shiftAssignmentId_key'
    ) THEN
        IF EXISTS (
            SELECT "shiftAssignmentId", COUNT(*)
            FROM shift_reports
            GROUP BY "shiftAssignmentId"
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'WARNING: Duplicate shiftAssignmentId values found. Fix before adding unique constraint.';
        ELSE
            ALTER TABLE shift_reports ADD CONSTRAINT "shift_reports_shiftAssignmentId_key" UNIQUE ("shiftAssignmentId");
            RAISE NOTICE 'Added unique constraint: shift_reports_shiftAssignmentId_key';
        END IF;
    ELSE
        RAISE NOTICE 'Unique constraint shift_reports_shiftAssignmentId_key already exists';
    END IF;
END $$;

-- Add indexes for shift_reports
CREATE INDEX IF NOT EXISTS "shift_reports_shiftAssignmentId_idx" ON shift_reports ("shiftAssignmentId");
CREATE INDEX IF NOT EXISTS "shift_reports_status_idx" ON shift_reports ("status");

-- ============================================
-- SHIFT_CHECKLIST_ITEMS TABLE
-- ============================================
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
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_checklist_items_pkey" PRIMARY KEY ("id")
);

-- Add foreign key if table was just created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shift_checklist_items_shiftReportId_fkey'
    ) THEN
        ALTER TABLE "shift_checklist_items" ADD CONSTRAINT "shift_checklist_items_shiftReportId_fkey"
            FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: shift_checklist_items_shiftReportId_fkey';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shift_checklist_items_shiftReportId_category_idx" ON shift_checklist_items ("shiftReportId", "category");
CREATE INDEX IF NOT EXISTS "shift_checklist_items_shiftReportId_order_idx" ON shift_checklist_items ("shiftReportId", "order");

-- ============================================
-- SHIFT_CHECKLIST_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "shift_checklist_templates" (
    "id" TEXT NOT NULL,
    "shiftType" "ShiftType",
    "category" "ShiftChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- Add missing columns to shift_checklist_templates if table exists with old schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'title') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added column: shift_checklist_templates.title';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'description') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "description" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'order') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'isRequired') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'isActive') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'shiftType') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "shiftType" "ShiftType";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'category') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "category" "ShiftChecklistCategory";
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'createdAt') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shift_checklist_templates' AND column_name = 'updatedAt') THEN
        ALTER TABLE shift_checklist_templates ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shift_checklist_templates_shiftType_category_isActive_idx"
    ON shift_checklist_templates ("shiftType", "category", "isActive");

-- ============================================
-- SHIFT_BACKUP_CHECKLIST TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "shift_backup_checklist" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "description" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_backup_checklist_pkey" PRIMARY KEY ("id")
);

-- Add foreign key if table was just created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shift_backup_checklist_shiftReportId_fkey'
    ) THEN
        ALTER TABLE "shift_backup_checklist" ADD CONSTRAINT "shift_backup_checklist_shiftReportId_fkey"
            FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: shift_backup_checklist_shiftReportId_fkey';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shift_backup_checklist_shiftReportId_idx" ON shift_backup_checklist ("shiftReportId");

-- ============================================
-- SHIFT_BACKUP_TEMPLATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "shift_backup_templates" (
    "id" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_backup_templates_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on databaseName
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

CREATE INDEX IF NOT EXISTS "shift_backup_templates_isActive_order_idx" ON shift_backup_templates ("isActive", "order");

-- ============================================
-- SHIFT_ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS "shift_issues" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ShiftIssueStatus" NOT NULL DEFAULT 'ONGOING',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP,
    "resolution" TEXT,
    "ticketId" TEXT,
    "ticketNumber" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_issues_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shift_issues_shiftReportId_fkey'
    ) THEN
        ALTER TABLE "shift_issues" ADD CONSTRAINT "shift_issues_shiftReportId_fkey"
            FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: shift_issues_shiftReportId_fkey';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'shift_issues_ticketId_fkey'
    ) THEN
        ALTER TABLE "shift_issues" ADD CONSTRAINT "shift_issues_ticketId_fkey"
            FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added foreign key: shift_issues_ticketId_fkey';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "shift_issues_shiftReportId_status_idx" ON shift_issues ("shiftReportId", "status");
CREATE INDEX IF NOT EXISTS "shift_issues_ticketId_idx" ON shift_issues ("ticketId");

-- ============================================
-- SERVER_METRICS TABLE (matches Prisma schema)
-- ============================================
CREATE TABLE IF NOT EXISTS "server_metrics" (
    "id" TEXT NOT NULL,
    "serverId" TEXT,
    "serverName" TEXT,

    -- CPU metrics
    "cpuUsagePercent" DOUBLE PRECISION,
    "cpuCores" INTEGER,
    "cpuLoadAvg1m" DOUBLE PRECISION,
    "cpuLoadAvg5m" DOUBLE PRECISION,
    "cpuLoadAvg15m" DOUBLE PRECISION,

    -- RAM metrics
    "ramTotalGB" DOUBLE PRECISION,
    "ramUsedGB" DOUBLE PRECISION,
    "ramUsagePercent" DOUBLE PRECISION,

    -- Disk metrics
    "diskTotalGB" DOUBLE PRECISION,
    "diskUsedGB" DOUBLE PRECISION,
    "diskUsagePercent" DOUBLE PRECISION,

    -- Network metrics
    "networkInBytesPerSec" DOUBLE PRECISION,
    "networkOutBytesPerSec" DOUBLE PRECISION,

    -- Uptime metrics
    "uptimeSeconds" INTEGER,
    "lastBootTime" TIMESTAMP,

    -- Additional flexible metrics
    "additionalMetrics" JSONB,

    -- Metadata
    "collectedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceIp" TEXT,

    CONSTRAINT "server_metrics_pkey" PRIMARY KEY ("id")
);

-- Add missing columns if table exists with old schema
DO $$
BEGIN
    -- CPU metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'cpuUsagePercent') THEN
        ALTER TABLE server_metrics ADD COLUMN "cpuUsagePercent" DOUBLE PRECISION;
        RAISE NOTICE 'Added column: server_metrics.cpuUsagePercent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'cpuCores') THEN
        ALTER TABLE server_metrics ADD COLUMN "cpuCores" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'cpuLoadAvg1m') THEN
        ALTER TABLE server_metrics ADD COLUMN "cpuLoadAvg1m" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'cpuLoadAvg5m') THEN
        ALTER TABLE server_metrics ADD COLUMN "cpuLoadAvg5m" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'cpuLoadAvg15m') THEN
        ALTER TABLE server_metrics ADD COLUMN "cpuLoadAvg15m" DOUBLE PRECISION;
    END IF;

    -- RAM metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'ramTotalGB') THEN
        ALTER TABLE server_metrics ADD COLUMN "ramTotalGB" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'ramUsedGB') THEN
        ALTER TABLE server_metrics ADD COLUMN "ramUsedGB" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'ramUsagePercent') THEN
        ALTER TABLE server_metrics ADD COLUMN "ramUsagePercent" DOUBLE PRECISION;
    END IF;

    -- Disk metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'diskTotalGB') THEN
        ALTER TABLE server_metrics ADD COLUMN "diskTotalGB" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'diskUsedGB') THEN
        ALTER TABLE server_metrics ADD COLUMN "diskUsedGB" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'diskUsagePercent') THEN
        ALTER TABLE server_metrics ADD COLUMN "diskUsagePercent" DOUBLE PRECISION;
    END IF;

    -- Network metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'networkInBytesPerSec') THEN
        ALTER TABLE server_metrics ADD COLUMN "networkInBytesPerSec" DOUBLE PRECISION;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'networkOutBytesPerSec') THEN
        ALTER TABLE server_metrics ADD COLUMN "networkOutBytesPerSec" DOUBLE PRECISION;
    END IF;

    -- Uptime metrics
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'uptimeSeconds') THEN
        ALTER TABLE server_metrics ADD COLUMN "uptimeSeconds" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'lastBootTime') THEN
        ALTER TABLE server_metrics ADD COLUMN "lastBootTime" TIMESTAMP;
    END IF;

    -- Additional
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'additionalMetrics') THEN
        ALTER TABLE server_metrics ADD COLUMN "additionalMetrics" JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'serverName') THEN
        ALTER TABLE server_metrics ADD COLUMN "serverName" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'sourceIp') THEN
        ALTER TABLE server_metrics ADD COLUMN "sourceIp" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'collectedAt') THEN
        ALTER TABLE server_metrics ADD COLUMN "collectedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'server_metrics' AND column_name = 'serverId') THEN
        ALTER TABLE server_metrics ADD COLUMN "serverId" TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "server_metrics_collectedAt_idx" ON server_metrics ("collectedAt");

-- ============================================
-- TICKETS TABLE - Add firstResponseAt if missing
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

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
\echo ''
\echo '=== SHIFT TABLES VERIFICATION ==='

\echo ''
\echo '--- shift_reports columns ---'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'shift_reports'
ORDER BY ordinal_position;

\echo ''
\echo '--- shift_checklist_items exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_checklist_items') AS "shift_checklist_items_exists";

\echo ''
\echo '--- shift_checklist_templates exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_checklist_templates') AS "shift_checklist_templates_exists";

\echo ''
\echo '--- shift_backup_checklist exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_backup_checklist') AS "shift_backup_checklist_exists";

\echo ''
\echo '--- shift_backup_templates exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_backup_templates') AS "shift_backup_templates_exists";

\echo ''
\echo '--- shift_issues exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shift_issues') AS "shift_issues_exists";

\echo ''
\echo '--- server_metrics exists ---'
SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'server_metrics') AS "server_metrics_exists";

\echo ''
\echo '=== Migration completed ==='
