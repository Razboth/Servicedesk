-- ============================================
-- Migration: Add DailyChecklistType enum and update tables
-- Date: 2026-02-04
-- Description: Implements 4-type daily checklist system
-- ============================================

-- 1. Create the DailyChecklistType enum
DO $$ BEGIN
    CREATE TYPE "DailyChecklistType" AS ENUM ('HARIAN', 'SERVER_SIANG', 'SERVER_MALAM', 'AKHIR_HARI');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add checklistType column to ServerAccessChecklistTemplate
ALTER TABLE "server_access_checklist_templates"
ADD COLUMN IF NOT EXISTS "checklistType" "DailyChecklistType" NOT NULL DEFAULT 'SERVER_SIANG';

-- 3. Add checklistType column to ServerAccessDailyChecklist
ALTER TABLE "server_access_daily_checklists"
ADD COLUMN IF NOT EXISTS "checklistType" "DailyChecklistType" NOT NULL DEFAULT 'SERVER_SIANG';

-- 4. Drop old unique constraint if exists
ALTER TABLE "server_access_daily_checklists"
DROP CONSTRAINT IF EXISTS "server_access_daily_checklists_userId_date_key";

-- 5. Create new unique constraint including checklistType
ALTER TABLE "server_access_daily_checklists"
ADD CONSTRAINT "server_access_daily_checklists_userId_date_checklistType_key"
UNIQUE ("userId", "date", "checklistType");

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "server_access_checklist_templates_checklistType_category_idx"
ON "server_access_checklist_templates" ("checklistType", "category", "isActive", "order");

CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_userId_date_checklistType_idx"
ON "server_access_daily_checklists" ("userId", "date", "checklistType");

CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_date_status_checklistType_idx"
ON "server_access_daily_checklists" ("date", "status", "checklistType");

-- ============================================
-- Verification queries (optional - run to verify)
-- ============================================
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'server_access_checklist_templates' AND column_name = 'checklistType';

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'server_access_daily_checklists' AND column_name = 'checklistType';
