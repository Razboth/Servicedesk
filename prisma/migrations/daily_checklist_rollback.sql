-- ============================================
-- Rollback: Revert DailyChecklistType changes
-- Date: 2026-02-04
-- WARNING: This will remove the checklistType column and revert to single-type system
-- ============================================

-- 1. Delete templates with new checklist types (keep only SERVER_SIANG as it was the default)
DELETE FROM "server_access_checklist_templates"
WHERE "checklistType" IN ('HARIAN', 'SERVER_MALAM', 'AKHIR_HARI');

-- 2. Drop new indexes
DROP INDEX IF EXISTS "server_access_checklist_templates_checklistType_category_idx";
DROP INDEX IF EXISTS "server_access_daily_checklists_userId_date_checklistType_idx";
DROP INDEX IF EXISTS "server_access_daily_checklists_date_status_checklistType_idx";

-- 3. Drop new unique constraint
ALTER TABLE "server_access_daily_checklists"
DROP CONSTRAINT IF EXISTS "server_access_daily_checklists_userId_date_checklistType_key";

-- 4. Restore old unique constraint
ALTER TABLE "server_access_daily_checklists"
ADD CONSTRAINT "server_access_daily_checklists_userId_date_key"
UNIQUE ("userId", "date");

-- 5. Remove checklistType columns
ALTER TABLE "server_access_daily_checklists"
DROP COLUMN IF EXISTS "checklistType";

ALTER TABLE "server_access_checklist_templates"
DROP COLUMN IF EXISTS "checklistType";

-- 6. Drop the enum type
DROP TYPE IF EXISTS "DailyChecklistType";

-- ============================================
-- Verification
-- ============================================
-- SELECT COUNT(*) FROM "server_access_checklist_templates";
-- \d "server_access_daily_checklists"
