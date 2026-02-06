-- =====================================================
-- PRODUCTION MIGRATION: SERVER_METRICS Input Type
-- =====================================================
-- Run Date: 2025-02-05
--
-- IMPORTANT: Run in TWO STEPS because ALTER TYPE ADD VALUE
-- cannot run inside a transaction block.
-- =====================================================

-- =====================================================
-- STEP 1: Run this FIRST (separately, outside transaction)
-- =====================================================
ALTER TYPE "ChecklistInputType" ADD VALUE IF NOT EXISTS 'SERVER_METRICS';

-- =====================================================
-- STEP 2: Run this AFTER Step 1 completes successfully
-- =====================================================

-- Update MONITORING_SIANG template
UPDATE "server_access_checklist_templates"
SET "inputType" = 'SERVER_METRICS'
WHERE "title" LIKE '%Check Server Metrics%'
  AND "checklistType" = 'MONITORING_SIANG';

-- Update MONITORING_MALAM template (if exists)
UPDATE "server_access_checklist_templates"
SET "inputType" = 'SERVER_METRICS'
WHERE "title" LIKE '%Check Server Metrics%'
  AND "checklistType" = 'MONITORING_MALAM';

-- Update any existing checklist items created from templates
UPDATE "server_access_checklist_items"
SET "inputType" = 'SERVER_METRICS'
WHERE "title" LIKE '%Check Server Metrics%';

-- =====================================================
-- VERIFICATION: Run these to confirm changes
-- =====================================================

-- Check templates were updated
SELECT id, title, "checklistType", "inputType"
FROM "server_access_checklist_templates"
WHERE "title" LIKE '%Server Metrics%';

-- Check items were updated
SELECT id, title, "inputType"
FROM "server_access_checklist_items"
WHERE "title" LIKE '%Server Metrics%'
LIMIT 10;

-- Check enum values exist
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ChecklistInputType')
ORDER BY enumsortorder;
