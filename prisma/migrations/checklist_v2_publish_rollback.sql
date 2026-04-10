-- ============================================
-- CHECKLIST V2 PRODUCTION MIGRATION - ROLLBACK
-- ============================================
-- Use this script to rollback the V2 migration if needed
-- WARNING: This will restore the deprecated 'unit' columns
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Recreate ChecklistUnit enum
-- ============================================

CREATE TYPE "ChecklistUnit" AS ENUM ('IT_OPERATIONS', 'MONITORING');

-- ============================================
-- STEP 2: Add back unit columns
-- ============================================

ALTER TABLE checklist_templates_v2
ADD COLUMN IF NOT EXISTS unit "ChecklistUnit";

ALTER TABLE daily_checklists_v2
ADD COLUMN IF NOT EXISTS unit "ChecklistUnit";

ALTER TABLE checklist_standby_v2
ADD COLUMN IF NOT EXISTS unit "ChecklistUnit";

-- ============================================
-- STEP 3: Restore unit values from checklistType
-- ============================================

UPDATE checklist_templates_v2
SET unit = CASE
    WHEN "checklistType" = 'IT_INFRASTRUKTUR' THEN 'IT_OPERATIONS'::"ChecklistUnit"
    WHEN "checklistType" = 'KEAMANAN_SIBER' THEN 'MONITORING'::"ChecklistUnit"
    WHEN "checklistType" = 'FRAUD_COMPLIANCE' THEN 'MONITORING'::"ChecklistUnit"
END;

UPDATE daily_checklists_v2
SET unit = CASE
    WHEN "checklistType" = 'IT_INFRASTRUKTUR' THEN 'IT_OPERATIONS'::"ChecklistUnit"
    WHEN "checklistType" = 'KEAMANAN_SIBER' THEN 'MONITORING'::"ChecklistUnit"
    WHEN "checklistType" = 'FRAUD_COMPLIANCE' THEN 'MONITORING'::"ChecklistUnit"
END;

UPDATE checklist_standby_v2
SET unit = CASE
    WHEN "checklistType" = 'IT_INFRASTRUKTUR' THEN 'IT_OPERATIONS'::"ChecklistUnit"
    WHEN "checklistType" = 'KEAMANAN_SIBER' THEN 'MONITORING'::"ChecklistUnit"
    WHEN "checklistType" = 'FRAUD_COMPLIANCE' THEN 'MONITORING'::"ChecklistUnit"
END;

-- ============================================
-- STEP 4: Make checklistType nullable again
-- ============================================

ALTER TABLE checklist_templates_v2
ALTER COLUMN "checklistType" DROP NOT NULL;

ALTER TABLE daily_checklists_v2
ALTER COLUMN "checklistType" DROP NOT NULL;

ALTER TABLE checklist_standby_v2
ALTER COLUMN "checklistType" DROP NOT NULL;

-- ============================================
-- STEP 5: Recreate old indexes
-- ============================================

CREATE INDEX IF NOT EXISTS checklist_templates_v2_unit_shiftType_isActive_idx
ON checklist_templates_v2 (unit, "shiftType", "isActive");

CREATE INDEX IF NOT EXISTS daily_checklists_v2_date_unit_shiftType_idx
ON daily_checklists_v2 (date, unit, "shiftType");

CREATE INDEX IF NOT EXISTS checklist_standby_v2_unit_isActive_idx
ON checklist_standby_v2 (unit, "isActive");

RAISE NOTICE 'Rollback completed. The deprecated unit columns have been restored.';

COMMIT;
