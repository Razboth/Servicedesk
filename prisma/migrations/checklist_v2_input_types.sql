-- ============================================
-- Migration: Checklist System v2 - Input Types
-- Date: 2026-02-05
-- Description: Drops v1 checklist data, adds ChecklistInputType enum,
--              inputType columns, and new DailyChecklistType values
-- ============================================

-- ============================================
-- STEP 0: Clean up v1 checklist data
-- ============================================

-- Delete all checklist items first (foreign key dependency)
DELETE FROM "server_access_checklist_items";

-- Delete all daily checklists
DELETE FROM "server_access_daily_checklists";

-- Delete all templates (will be re-seeded with v2 templates)
DELETE FROM "server_access_checklist_templates";

-- ============================================
-- STEP 1: Change category column from enum to text
-- ============================================

-- Change category column type from enum to text for flexible time-based categories
ALTER TABLE "server_access_checklist_templates"
ALTER COLUMN "category" TYPE TEXT;

ALTER TABLE "server_access_checklist_items"
ALTER COLUMN "category" TYPE TEXT;

-- Drop the old enum (optional, can keep for backward compatibility)
-- DROP TYPE IF EXISTS "ServerChecklistCategory";

-- ============================================
-- STEP 2: Add new enum values
-- ============================================

-- 1. Add new values to DailyChecklistType enum
DO $$ BEGIN
    ALTER TYPE "DailyChecklistType" ADD VALUE IF NOT EXISTS 'OPS_SIANG';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "DailyChecklistType" ADD VALUE IF NOT EXISTS 'OPS_MALAM';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "DailyChecklistType" ADD VALUE IF NOT EXISTS 'MONITORING_SIANG';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "DailyChecklistType" ADD VALUE IF NOT EXISTS 'MONITORING_MALAM';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create ChecklistInputType enum
DO $$ BEGIN
    CREATE TYPE "ChecklistInputType" AS ENUM (
        'CHECKBOX',
        'TIMESTAMP',
        'GRAFANA_STATUS',
        'ATM_ALERT',
        'PENDING_TICKETS',
        'APP_STATUS',
        'AVAILABILITY_STATUS',
        'TEXT_INPUT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Add inputType column to ServerAccessChecklistTemplate
ALTER TABLE "server_access_checklist_templates"
ADD COLUMN IF NOT EXISTS "inputType" "ChecklistInputType" NOT NULL DEFAULT 'CHECKBOX';

-- 4. Add inputType column to ServerAccessChecklistItem
ALTER TABLE "server_access_checklist_items"
ADD COLUMN IF NOT EXISTS "inputType" "ChecklistInputType" NOT NULL DEFAULT 'CHECKBOX';

-- 5. Add data column to ServerAccessChecklistItem (for storing Grafana %, ATM list, etc.)
ALTER TABLE "server_access_checklist_items"
ADD COLUMN IF NOT EXISTS "data" JSONB;

-- ============================================
-- Verification queries (run to verify)
-- ============================================
-- Check enum values:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'DailyChecklistType'::regtype;
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ChecklistInputType'::regtype;

-- Check columns exist:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'server_access_checklist_templates' AND column_name = 'inputType';

-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'server_access_checklist_items' AND column_name IN ('inputType', 'data');
