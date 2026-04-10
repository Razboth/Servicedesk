-- Checklist V2 Redesign Migration - Part 1
-- Add new enum values first (must be committed before use)

-- Step 1: Create new ChecklistType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ChecklistType') THEN
    CREATE TYPE "ChecklistType" AS ENUM ('IT_INFRASTRUKTUR', 'KEAMANAN_SIBER', 'FRAUD_COMPLIANCE');
  END IF;
END
$$;

-- Step 2: Add new shift value SHIFT_SIANG if not exists
ALTER TYPE "ChecklistShiftType" ADD VALUE IF NOT EXISTS 'SHIFT_SIANG';

-- Step 3: Add columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "checklistType" "ChecklistType";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "canBeBuddy" BOOLEAN DEFAULT false;

-- Step 4: Add checklistType to checklist_templates_v2
ALTER TABLE "checklist_templates_v2" ADD COLUMN IF NOT EXISTS "checklistType" "ChecklistType";

-- Step 5: Add checklistType to daily_checklists_v2
ALTER TABLE "daily_checklists_v2" ADD COLUMN IF NOT EXISTS "checklistType" "ChecklistType";

-- Step 6: Add new columns to checklist_standby_v2
ALTER TABLE "checklist_standby_v2" ADD COLUMN IF NOT EXISTS "checklistType" "ChecklistType";
ALTER TABLE "checklist_standby_v2" ADD COLUMN IF NOT EXISTS "canBePrimary" BOOLEAN DEFAULT true;
ALTER TABLE "checklist_standby_v2" ADD COLUMN IF NOT EXISTS "canBeBuddy" BOOLEAN DEFAULT true;

-- Step 7: Create shift_assignments_v2 table
CREATE TABLE IF NOT EXISTS "shift_assignments_v2" (
  "id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "shiftType" "ChecklistShiftType" NOT NULL,
  "primaryUserId" TEXT NOT NULL,
  "primaryType" "ChecklistType" NOT NULL,
  "buddyUserId" TEXT,
  "buddyType" "ChecklistType",
  "takenOver" BOOLEAN NOT NULL DEFAULT false,
  "takenOverAt" TIMESTAMP(3),
  "takenOverReason" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdById" TEXT NOT NULL,

  CONSTRAINT "shift_assignments_v2_pkey" PRIMARY KEY ("id")
);

-- Step 8: Create unique index for shift_assignments_v2
CREATE UNIQUE INDEX IF NOT EXISTS "shift_assignments_v2_date_shiftType_key"
  ON "shift_assignments_v2"("date", "shiftType");

-- Step 9: Create indexes for shift_assignments_v2
CREATE INDEX IF NOT EXISTS "shift_assignments_v2_date_idx" ON "shift_assignments_v2"("date");
CREATE INDEX IF NOT EXISTS "shift_assignments_v2_primaryUserId_idx" ON "shift_assignments_v2"("primaryUserId");
CREATE INDEX IF NOT EXISTS "shift_assignments_v2_buddyUserId_idx" ON "shift_assignments_v2"("buddyUserId");

-- Step 10: Add foreign key constraints for shift_assignments_v2
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shift_assignments_v2_primaryUserId_fkey'
  ) THEN
    ALTER TABLE "shift_assignments_v2"
      ADD CONSTRAINT "shift_assignments_v2_primaryUserId_fkey"
      FOREIGN KEY ("primaryUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shift_assignments_v2_buddyUserId_fkey'
  ) THEN
    ALTER TABLE "shift_assignments_v2"
      ADD CONSTRAINT "shift_assignments_v2_buddyUserId_fkey"
      FOREIGN KEY ("buddyUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shift_assignments_v2_createdById_fkey'
  ) THEN
    ALTER TABLE "shift_assignments_v2"
      ADD CONSTRAINT "shift_assignments_v2_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS "checklist_templates_v2_checklistType_shiftType_isActive_idx"
  ON "checklist_templates_v2"("checklistType", "shiftType", "isActive");

CREATE INDEX IF NOT EXISTS "checklist_standby_v2_checklistType_isActive_idx"
  ON "checklist_standby_v2"("checklistType", "isActive");

-- Step 12: Migrate existing data from old units to new checklistType
UPDATE "checklist_templates_v2"
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "unit" IS NOT NULL AND "checklistType" IS NULL;

UPDATE "daily_checklists_v2"
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "unit" IS NOT NULL AND "checklistType" IS NULL;

UPDATE "checklist_standby_v2"
SET "checklistType" = 'IT_INFRASTRUKTUR'::"ChecklistType"
WHERE "unit" IS NOT NULL AND "checklistType" IS NULL;
