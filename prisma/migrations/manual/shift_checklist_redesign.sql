-- ============================================
-- Shift & Checklist System Redesign Migration
-- ============================================
-- Run this script on production database
-- Created: 2026-02-04

-- Step 1: Add ShiftCategory enum
DO $$ BEGIN
    CREATE TYPE "ShiftCategory" AS ENUM ('MONITORING', 'OPERATIONAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add ServerChecklistCategory enum
DO $$ BEGIN
    CREATE TYPE "ServerChecklistCategory" AS ENUM (
        'BACKUP_VERIFICATION',
        'SERVER_HEALTH',
        'SECURITY_CHECK',
        'MAINTENANCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 3: Add ServerChecklistStatus enum
DO $$ BEGIN
    CREATE TYPE "ServerChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 4: Add new columns to shift_checklist_templates
ALTER TABLE "shift_checklist_templates"
ADD COLUMN IF NOT EXISTS "shiftCategory" "ShiftCategory",
ADD COLUMN IF NOT EXISTS "unlockTime" VARCHAR(5);

-- Step 5: Add new column to shift_checklist_items
ALTER TABLE "shift_checklist_items"
ADD COLUMN IF NOT EXISTS "unlockTime" VARCHAR(5);

-- Step 6: Update index on shift_checklist_templates
DROP INDEX IF EXISTS "shift_checklist_templates_shiftType_category_isActive_idx";
CREATE INDEX IF NOT EXISTS "shift_checklist_templates_shiftType_shiftCategory_category_isActive_idx"
ON "shift_checklist_templates"("shiftType", "shiftCategory", "category", "isActive");

-- Step 7: Create server_access_checklist_templates table
CREATE TABLE IF NOT EXISTS "server_access_checklist_templates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServerChecklistCategory" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "unlockTime" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- Step 8: Create server_access_daily_checklists table
CREATE TABLE IF NOT EXISTS "server_access_daily_checklists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "ServerChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_daily_checklists_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "server_access_daily_checklists_userId_date_key" UNIQUE ("userId", "date")
);

-- Step 9: Create server_access_checklist_items table
CREATE TABLE IF NOT EXISTS "server_access_checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ServerChecklistCategory" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShiftChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "unlockTime" VARCHAR(5),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "server_access_checklist_items_pkey" PRIMARY KEY ("id")
);

-- Step 10: Add foreign keys
ALTER TABLE "server_access_daily_checklists"
DROP CONSTRAINT IF EXISTS "server_access_daily_checklists_userId_fkey";

ALTER TABLE "server_access_daily_checklists"
ADD CONSTRAINT "server_access_daily_checklists_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "server_access_checklist_items"
DROP CONSTRAINT IF EXISTS "server_access_checklist_items_checklistId_fkey";

ALTER TABLE "server_access_checklist_items"
ADD CONSTRAINT "server_access_checklist_items_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "server_access_daily_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 11: Create indexes
CREATE INDEX IF NOT EXISTS "server_access_checklist_templates_category_isActive_order_idx"
ON "server_access_checklist_templates"("category", "isActive", "order");

CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_userId_date_idx"
ON "server_access_daily_checklists"("userId", "date");

CREATE INDEX IF NOT EXISTS "server_access_daily_checklists_date_status_idx"
ON "server_access_daily_checklists"("date", "status");

CREATE INDEX IF NOT EXISTS "server_access_checklist_items_checklistId_category_idx"
ON "server_access_checklist_items"("checklistId", "category");

CREATE INDEX IF NOT EXISTS "server_access_checklist_items_checklistId_order_idx"
ON "server_access_checklist_items"("checklistId", "order");

-- Step 12: Update existing templates with shiftCategory based on shiftType
UPDATE "shift_checklist_templates"
SET "shiftCategory" = 'MONITORING'
WHERE "shiftType" IN ('NIGHT_WEEKDAY', 'DAY_WEEKEND', 'NIGHT_WEEKEND')
AND "shiftCategory" IS NULL;

UPDATE "shift_checklist_templates"
SET "shiftCategory" = 'OPERATIONAL'
WHERE "shiftType" IN ('STANDBY_ONCALL', 'STANDBY_BRANCH')
AND "shiftCategory" IS NULL;

-- Templates with NULL shiftType remain NULL for shiftCategory (applies to all)

-- Step 13: Seed default server access checklist templates
INSERT INTO "server_access_checklist_templates" ("id", "title", "description", "category", "order", "isRequired", "isActive", "unlockTime", "createdAt", "updatedAt")
VALUES
    -- BACKUP_VERIFICATION
    (gen_random_uuid()::text, 'Verifikasi backup database utama', 'Pastikan backup harian database utama berhasil', 'BACKUP_VERIFICATION', 1, true, true, '22:00', NOW(), NOW()),
    (gen_random_uuid()::text, 'Verifikasi backup incremental', 'Cek backup incremental terakhir', 'BACKUP_VERIFICATION', 2, true, true, '22:30', NOW(), NOW()),
    (gen_random_uuid()::text, 'Cek integritas file backup', 'Verifikasi file backup tidak corrupt', 'BACKUP_VERIFICATION', 3, true, true, NULL, NOW(), NOW()),

    -- SERVER_HEALTH
    (gen_random_uuid()::text, 'Cek CPU dan memory usage', 'Pastikan penggunaan CPU dan memory dalam batas normal', 'SERVER_HEALTH', 1, true, true, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Cek disk space', 'Pastikan ruang disk tersedia cukup (>20%)', 'SERVER_HEALTH', 2, true, true, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Verifikasi service kritis berjalan', 'Cek semua service penting dalam status running', 'SERVER_HEALTH', 3, true, true, NULL, NOW(), NOW()),

    -- SECURITY_CHECK
    (gen_random_uuid()::text, 'Review security logs', 'Tinjau log keamanan untuk aktivitas mencurigakan', 'SECURITY_CHECK', 1, true, true, NULL, NOW(), NOW()),
    (gen_random_uuid()::text, 'Cek failed login attempts', 'Review percobaan login gagal yang mencurigakan', 'SECURITY_CHECK', 2, true, true, NULL, NOW(), NOW()),

    -- MAINTENANCE
    (gen_random_uuid()::text, 'Cek antrian job terjadwal', 'Verifikasi tidak ada job stuck atau gagal', 'MAINTENANCE', 1, true, true, '07:00', NOW(), NOW()),
    (gen_random_uuid()::text, 'Verifikasi scheduled tasks', 'Pastikan scheduled tasks berjalan sesuai jadwal', 'MAINTENANCE', 2, true, true, NULL, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Done!
-- Run: SELECT 'Migration completed successfully' as status;
