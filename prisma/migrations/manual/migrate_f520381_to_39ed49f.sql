-- =============================================
-- MIGRATION: f520381 -> 39ed49f
-- From: "feat: Add DOCX export for server metrics matching official template"
-- To: "feat: Use Textarea with Save button for Notes Permasalahan"
-- Date: 2026-04-14
-- =============================================

-- =============================================
-- 1. CREATE NEW ENUMS
-- =============================================

DO $$ BEGIN
    CREATE TYPE "DeviceServiceStatus" AS ENUM ('OK', 'DOWN', 'IDLE', 'NUMERIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "P20TCategory" AS ENUM ('IT', 'KKS', 'ANTI_FRAUD');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "P20TShift" AS ENUM ('DAY', 'NIGHT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "P20TItemStatus" AS ENUM ('PENDING', 'COMPLETED', 'SKIPPED', 'NA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- 2. CREATE DEVICE STATUS TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS "device_status_collections" (
    "id" TEXT NOT NULL,
    "dashboard" TEXT,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAtLocal" TEXT,
    "timeRange" TEXT,
    "totalServices" INTEGER NOT NULL,
    "okCount" INTEGER NOT NULL DEFAULT 0,
    "downCount" INTEGER NOT NULL DEFAULT 0,
    "idleCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_status_collections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "device_status_collections_createdAt_idx" ON "device_status_collections"("createdAt");

CREATE TABLE IF NOT EXISTS "device_status_snapshots" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "status" "DeviceServiceStatus" NOT NULL,
    CONSTRAINT "device_status_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "device_status_snapshots_collectionId_idx" ON "device_status_snapshots"("collectionId");
CREATE INDEX IF NOT EXISTS "device_status_snapshots_groupName_idx" ON "device_status_snapshots"("groupName");

ALTER TABLE "device_status_snapshots"
    DROP CONSTRAINT IF EXISTS "device_status_snapshots_collectionId_fkey";
ALTER TABLE "device_status_snapshots"
    ADD CONSTRAINT "device_status_snapshots_collectionId_fkey"
    FOREIGN KEY ("collectionId") REFERENCES "device_status_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================
-- 3. CREATE P20T TABLES
-- =============================================

-- P20T User Pool
CREATE TABLE IF NOT EXISTS "p20t_user_pool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "p20t_user_pool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "p20t_user_pool_userId_key" ON "p20t_user_pool"("userId");

ALTER TABLE "p20t_user_pool"
    DROP CONSTRAINT IF EXISTS "p20t_user_pool_userId_fkey";
ALTER TABLE "p20t_user_pool"
    ADD CONSTRAINT "p20t_user_pool_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- P20T Assignments
CREATE TABLE IF NOT EXISTS "p20t_assignments" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" "P20TShift" NOT NULL,
    "category" "P20TCategory" NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "p20t_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "p20t_assignments_date_shift_category_key" ON "p20t_assignments"("date", "shift", "category");
CREATE INDEX IF NOT EXISTS "p20t_assignments_date_idx" ON "p20t_assignments"("date");
CREATE INDEX IF NOT EXISTS "p20t_assignments_userId_idx" ON "p20t_assignments"("userId");

ALTER TABLE "p20t_assignments"
    DROP CONSTRAINT IF EXISTS "p20t_assignments_userId_fkey";
ALTER TABLE "p20t_assignments"
    ADD CONSTRAINT "p20t_assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "p20t_assignments"
    DROP CONSTRAINT IF EXISTS "p20t_assignments_createdById_fkey";
ALTER TABLE "p20t_assignments"
    ADD CONSTRAINT "p20t_assignments_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- P20T Checklist Templates
CREATE TABLE IF NOT EXISTS "p20t_checklist_templates" (
    "id" TEXT NOT NULL,
    "category" "P20TCategory" NOT NULL,
    "shift" "P20TShift",
    "section" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "inputType" TEXT NOT NULL DEFAULT 'CHECKBOX',
    "timeSlot" TEXT,
    "autoFetchType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "p20t_checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "p20t_checklist_templates_category_shift_section_idx" ON "p20t_checklist_templates"("category", "shift", "section");
CREATE INDEX IF NOT EXISTS "p20t_checklist_templates_category_shift_orderIndex_idx" ON "p20t_checklist_templates"("category", "shift", "orderIndex");

-- P20T Daily Checklists
CREATE TABLE IF NOT EXISTS "p20t_daily_checklists" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shift" "P20TShift" NOT NULL,
    "category" "P20TCategory" NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "p20t_daily_checklists_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "p20t_daily_checklists_date_shift_category_key" ON "p20t_daily_checklists"("date", "shift", "category");
CREATE INDEX IF NOT EXISTS "p20t_daily_checklists_date_idx" ON "p20t_daily_checklists"("date");

-- P20T Checklist Items
CREATE TABLE IF NOT EXISTS "p20t_checklist_items" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "status" "P20TItemStatus" NOT NULL DEFAULT 'PENDING',
    "value" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    CONSTRAINT "p20t_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "p20t_checklist_items_checklistId_templateId_key" ON "p20t_checklist_items"("checklistId", "templateId");
CREATE INDEX IF NOT EXISTS "p20t_checklist_items_checklistId_idx" ON "p20t_checklist_items"("checklistId");

ALTER TABLE "p20t_checklist_items"
    DROP CONSTRAINT IF EXISTS "p20t_checklist_items_checklistId_fkey";
ALTER TABLE "p20t_checklist_items"
    ADD CONSTRAINT "p20t_checklist_items_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "p20t_daily_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "p20t_checklist_items"
    DROP CONSTRAINT IF EXISTS "p20t_checklist_items_templateId_fkey";
ALTER TABLE "p20t_checklist_items"
    ADD CONSTRAINT "p20t_checklist_items_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "p20t_checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "p20t_checklist_items"
    DROP CONSTRAINT IF EXISTS "p20t_checklist_items_completedById_fkey";
ALTER TABLE "p20t_checklist_items"
    ADD CONSTRAINT "p20t_checklist_items_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================
-- 4. CLEANUP OLD CHECKLIST V2 (OPTIONAL)
-- Uncomment if you want to remove old tables
-- BACKUP DATA FIRST IF NEEDED!
-- =============================================

-- DROP TABLE IF EXISTS "checklist_items_v2" CASCADE;
-- DROP TABLE IF EXISTS "shift_handovers_v2" CASCADE;
-- DROP TABLE IF EXISTS "checklist_assignments_v2" CASCADE;
-- DROP TABLE IF EXISTS "daily_checklists_v2" CASCADE;
-- DROP TABLE IF EXISTS "checklist_standby_v2" CASCADE;
-- DROP TABLE IF EXISTS "shift_assignments_v2" CASCADE;
-- DROP TABLE IF EXISTS "checklist_templates_v2" CASCADE;

-- Remove old columns from users table
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "checklistType";
-- ALTER TABLE "users" DROP COLUMN IF EXISTS "canBeBuddy";

-- Drop old enums
-- DROP TYPE IF EXISTS "ChecklistType" CASCADE;
-- DROP TYPE IF EXISTS "ChecklistShiftType" CASCADE;
-- DROP TYPE IF EXISTS "ChecklistRole" CASCADE;
-- DROP TYPE IF EXISTS "ChecklistItemStatusV2" CASCADE;

-- =============================================
-- 5. VERIFICATION QUERIES
-- =============================================

-- Check new tables exist
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'p20t%' OR table_name LIKE 'device_status%';

-- Check new enums exist
-- SELECT typname FROM pg_type WHERE typname IN ('P20TCategory', 'P20TShift', 'P20TItemStatus', 'DeviceServiceStatus');
