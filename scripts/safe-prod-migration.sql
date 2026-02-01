-- Safe Production Migration Script
-- Generated: 2026-02-01
-- This script only ADDS missing columns/tables without dropping anything
-- Run with: psql -U postgres -d servicedesk -f safe-prod-migration.sql

-- ============================================
-- PRE-MIGRATION CHECKS
-- ============================================

-- Check if HUMAN_ERROR is in use before removing it
DO $$
DECLARE
    human_error_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO human_error_count FROM tickets WHERE category = 'HUMAN_ERROR';
    IF human_error_count > 0 THEN
        RAISE NOTICE 'WARNING: % tickets use HUMAN_ERROR category. DO NOT remove this enum value!', human_error_count;
    ELSE
        RAISE NOTICE 'No tickets use HUMAN_ERROR category. Safe to remove if needed.';
    END IF;
END $$;

-- ============================================
-- TICKETS TABLE - Missing Columns
-- ============================================

-- Add firstResponseAt if missing (used in SLA tracking and technician reports)
-- This column was missing from schema but used in 8+ API routes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'firstResponseAt') THEN
        ALTER TABLE tickets ADD COLUMN "firstResponseAt" TIMESTAMP;
        RAISE NOTICE 'Added column: tickets.firstResponseAt';
    ELSE
        RAISE NOTICE 'Column tickets.firstResponseAt already exists';
    END IF;
END $$;

-- Add index for firstResponseAt queries
CREATE INDEX IF NOT EXISTS "tickets_firstResponseAt_idx" ON tickets ("firstResponseAt");

-- ============================================
-- USERS TABLE - Check for missing columns
-- ============================================

-- Add lastActiveAt if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'lastActiveAt') THEN
        ALTER TABLE users ADD COLUMN "lastActiveAt" TIMESTAMP;
        RAISE NOTICE 'Added column: users.lastActiveAt';
    ELSE
        RAISE NOTICE 'Column users.lastActiveAt already exists';
    END IF;
END $$;

-- ============================================
-- SHIFT TABLES - Unique Constraints
-- ============================================

-- Check for duplicates before adding unique constraint on shift_backup_templates.databaseName
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT "databaseName") INTO duplicate_count
    FROM shift_backup_templates
    WHERE "databaseName" IS NOT NULL;

    IF duplicate_count > 0 THEN
        RAISE NOTICE 'WARNING: % duplicate databaseName values in shift_backup_templates. Fix before adding unique constraint.', duplicate_count;
    ELSE
        -- Safe to add unique constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'shift_backup_templates_databaseName_key'
        ) THEN
            ALTER TABLE shift_backup_templates ADD CONSTRAINT "shift_backup_templates_databaseName_key" UNIQUE ("databaseName");
            RAISE NOTICE 'Added unique constraint on shift_backup_templates.databaseName';
        END IF;
    END IF;
END $$;

-- Check for duplicates before adding unique constraint on shift_reports.shiftAssignmentId
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) - COUNT(DISTINCT "shiftAssignmentId") INTO duplicate_count
    FROM shift_reports
    WHERE "shiftAssignmentId" IS NOT NULL;

    IF duplicate_count > 0 THEN
        RAISE NOTICE 'WARNING: % duplicate shiftAssignmentId values in shift_reports. Fix before adding unique constraint.', duplicate_count;
    ELSE
        -- Safe to add unique constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'shift_reports_shiftAssignmentId_key'
        ) THEN
            ALTER TABLE shift_reports ADD CONSTRAINT "shift_reports_shiftAssignmentId_key" UNIQUE ("shiftAssignmentId");
            RAISE NOTICE 'Added unique constraint on shift_reports.shiftAssignmentId';
        END IF;
    END IF;
END $$;

-- ============================================
-- TYPE FIXES (without data loss)
-- ============================================

-- Fix sociomileTicketNumber type if needed (text -> integer)
-- Only safe if all existing values are numeric or null
DO $$
DECLARE
    non_numeric_count INTEGER;
BEGIN
    -- Check if column exists and has non-numeric data
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'sociomileTicketNumber') THEN
        SELECT COUNT(*) INTO non_numeric_count
        FROM tickets
        WHERE "sociomileTicketNumber" IS NOT NULL
        AND "sociomileTicketNumber" !~ '^\d+$';

        IF non_numeric_count > 0 THEN
            RAISE NOTICE 'WARNING: % non-numeric values in sociomileTicketNumber. Cannot convert to INT.', non_numeric_count;
        ELSE
            RAISE NOTICE 'sociomileTicketNumber can be safely converted to INT if needed';
        END IF;
    END IF;
END $$;

-- ============================================
-- INDEX ADDITIONS (safe, no data loss)
-- ============================================

-- Add any missing indexes
CREATE INDEX IF NOT EXISTS "tickets_claimedAt_idx" ON tickets ("claimedAt");

-- ============================================
-- VERIFICATION
-- ============================================

-- Show current tickets table structure
\echo 'Current tickets table structure:'
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tickets'
ORDER BY ordinal_position;

\echo ''
\echo 'Migration completed. Please verify the changes above.'
