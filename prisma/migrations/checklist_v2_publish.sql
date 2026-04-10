-- ============================================
-- CHECKLIST V2 PRODUCTION MIGRATION
-- ============================================
-- This script migrates from the old unit-based system to the new type-based system
-- Run this script AFTER deploying the V2 code changes
--
-- Changes:
-- 1. Migrate existing data from unit to checklistType
-- 2. Update shift types to only SHIFT_SIANG and SHIFT_MALAM
-- 3. Make checklistType non-nullable
-- 4. Remove deprecated unit columns
-- 5. Drop old ChecklistUnit enum
-- 6. Clean up old shift type values from enum
-- ============================================

-- Start transaction
BEGIN;

-- ============================================
-- STEP 1: DATA MIGRATION
-- ============================================

-- 1.1 Migrate ChecklistTemplateV2: unit → checklistType
UPDATE checklist_templates_v2
SET "checklistType" = CASE
    WHEN unit = 'IT_OPERATIONS' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    WHEN unit = 'MONITORING' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    ELSE "checklistType"
END
WHERE "checklistType" IS NULL AND unit IS NOT NULL;

-- 1.2 Migrate DailyChecklistV2: unit → checklistType
UPDATE daily_checklists_v2
SET "checklistType" = CASE
    WHEN unit = 'IT_OPERATIONS' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    WHEN unit = 'MONITORING' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    ELSE "checklistType"
END
WHERE "checklistType" IS NULL AND unit IS NOT NULL;

-- 1.3 Migrate ChecklistStandbyV2: unit → checklistType
UPDATE checklist_standby_v2
SET "checklistType" = CASE
    WHEN unit = 'IT_OPERATIONS' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    WHEN unit = 'MONITORING' THEN 'IT_INFRASTRUKTUR'::"ChecklistType"
    ELSE "checklistType"
END
WHERE "checklistType" IS NULL AND unit IS NOT NULL;

-- ============================================
-- STEP 2: MIGRATE SHIFT TYPES
-- ============================================

-- 2.1 Update old shift types to new simplified types
UPDATE checklist_templates_v2
SET "shiftType" = CASE
    WHEN "shiftType" = 'HARIAN_KANTOR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'STANDBY_LEMBUR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'SHIFT_SIANG_WEEKEND' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    ELSE "shiftType"
END
WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

UPDATE daily_checklists_v2
SET "shiftType" = CASE
    WHEN "shiftType" = 'HARIAN_KANTOR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'STANDBY_LEMBUR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'SHIFT_SIANG_WEEKEND' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    ELSE "shiftType"
END
WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

UPDATE shift_assignments_v2
SET "shiftType" = CASE
    WHEN "shiftType" = 'HARIAN_KANTOR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'STANDBY_LEMBUR' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    WHEN "shiftType" = 'SHIFT_SIANG_WEEKEND' THEN 'SHIFT_SIANG'::"ChecklistShiftType"
    ELSE "shiftType"
END
WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

-- ============================================
-- STEP 3: SET DEFAULT VALUE FOR NULL checklistType
-- ============================================

-- Set IT_INFRASTRUKTUR as default for any remaining null values
UPDATE checklist_templates_v2
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "checklistType" IS NULL;

UPDATE daily_checklists_v2
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "checklistType" IS NULL;

UPDATE checklist_standby_v2
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "checklistType" IS NULL;

-- ============================================
-- STEP 4: DROP OLD INDEXES
-- ============================================

-- Drop indexes that reference the deprecated 'unit' column
DROP INDEX IF EXISTS checklist_templates_v2_unit_shiftType_isActive_idx;
DROP INDEX IF EXISTS daily_checklists_v2_date_unit_shiftType_idx;
DROP INDEX IF EXISTS checklist_standby_v2_unit_isActive_idx;

-- Drop old unique constraint if it exists
ALTER TABLE daily_checklists_v2 DROP CONSTRAINT IF EXISTS daily_checklists_v2_date_unit_shiftType_key;

-- ============================================
-- STEP 5: MAKE checklistType NON-NULLABLE
-- ============================================

-- 5.1 Alter ChecklistTemplateV2
ALTER TABLE checklist_templates_v2
ALTER COLUMN "checklistType" SET NOT NULL;

-- 5.2 Alter DailyChecklistV2
ALTER TABLE daily_checklists_v2
ALTER COLUMN "checklistType" SET NOT NULL;

-- 5.3 Alter ChecklistStandbyV2
ALTER TABLE checklist_standby_v2
ALTER COLUMN "checklistType" SET NOT NULL;

-- ============================================
-- STEP 6: DROP DEPRECATED UNIT COLUMNS
-- ============================================

ALTER TABLE checklist_templates_v2 DROP COLUMN IF EXISTS unit;
ALTER TABLE daily_checklists_v2 DROP COLUMN IF EXISTS unit;
ALTER TABLE checklist_standby_v2 DROP COLUMN IF EXISTS unit;

-- ============================================
-- STEP 7: DROP OLD ENUM (ChecklistUnit)
-- ============================================

DROP TYPE IF EXISTS "ChecklistUnit";

-- ============================================
-- STEP 8: UPDATE ChecklistShiftType ENUM
-- ============================================
-- Note: PostgreSQL doesn't support removing values from enums directly.
-- The deprecated values will remain in the enum but won't be used.
-- They can be cleaned up in a future migration after all references are confirmed removed.

-- Add a comment to mark deprecated values
COMMENT ON TYPE "ChecklistShiftType" IS 'Simplified to 2 shifts: SHIFT_SIANG (08:00-20:00), SHIFT_MALAM (20:00-08:00). Values HARIAN_KANTOR, STANDBY_LEMBUR, SHIFT_SIANG_WEEKEND are deprecated.';

-- ============================================
-- STEP 9: VERIFY DATA INTEGRITY
-- ============================================

-- Verify no null checklistType values remain
DO $$
DECLARE
    null_templates INTEGER;
    null_checklists INTEGER;
    null_standby INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_templates FROM checklist_templates_v2 WHERE "checklistType" IS NULL;
    SELECT COUNT(*) INTO null_checklists FROM daily_checklists_v2 WHERE "checklistType" IS NULL;
    SELECT COUNT(*) INTO null_standby FROM checklist_standby_v2 WHERE "checklistType" IS NULL;

    IF null_templates > 0 OR null_checklists > 0 OR null_standby > 0 THEN
        RAISE EXCEPTION 'Data integrity check failed: Found NULL checklistType values (templates: %, checklists: %, standby: %)',
            null_templates, null_checklists, null_standby;
    END IF;

    RAISE NOTICE 'Data integrity check passed!';
END $$;

-- Verify no old shift types remain
DO $$
DECLARE
    old_shifts_templates INTEGER;
    old_shifts_checklists INTEGER;
    old_shifts_assignments INTEGER;
BEGIN
    SELECT COUNT(*) INTO old_shifts_templates
    FROM checklist_templates_v2
    WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

    SELECT COUNT(*) INTO old_shifts_checklists
    FROM daily_checklists_v2
    WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

    SELECT COUNT(*) INTO old_shifts_assignments
    FROM shift_assignments_v2
    WHERE "shiftType" IN ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_SIANG_WEEKEND');

    IF old_shifts_templates > 0 OR old_shifts_checklists > 0 OR old_shifts_assignments > 0 THEN
        RAISE EXCEPTION 'Shift migration check failed: Found old shift types (templates: %, checklists: %, assignments: %)',
            old_shifts_templates, old_shifts_checklists, old_shifts_assignments;
    END IF;

    RAISE NOTICE 'Shift type migration check passed!';
END $$;

-- ============================================
-- STEP 10: SHOW MIGRATION SUMMARY
-- ============================================

DO $$
DECLARE
    template_count INTEGER;
    checklist_count INTEGER;
    standby_count INTEGER;
    assignment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO template_count FROM checklist_templates_v2;
    SELECT COUNT(*) INTO checklist_count FROM daily_checklists_v2;
    SELECT COUNT(*) INTO standby_count FROM checklist_standby_v2;
    SELECT COUNT(*) INTO assignment_count FROM shift_assignments_v2;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Templates:    %', template_count;
    RAISE NOTICE 'Checklists:   %', checklist_count;
    RAISE NOTICE 'Standby Pool: %', standby_count;
    RAISE NOTICE 'Assignments:  %', assignment_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '';
END $$;

-- Commit transaction
COMMIT;
