-- ============================================
-- CHECKLIST V1 TO V2 FULL MIGRATION
-- ============================================
-- Run this on a server that only has the V1 checklist system
-- This creates all V2 tables, enums, and indexes from scratch
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: CREATE NEW ENUMS
-- ============================================

-- Create ChecklistType enum (3 types)
DO $$ BEGIN
    CREATE TYPE "ChecklistType" AS ENUM (
        'IT_INFRASTRUKTUR',
        'KEAMANAN_SIBER',
        'FRAUD_COMPLIANCE'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create ChecklistShiftType enum (2 shifts)
DO $$ BEGIN
    CREATE TYPE "ChecklistShiftType" AS ENUM (
        'SHIFT_SIANG',
        'SHIFT_MALAM'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create ChecklistRole enum
DO $$ BEGIN
    CREATE TYPE "ChecklistRole" AS ENUM (
        'STAFF',
        'SUPERVISOR'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create ChecklistItemStatusV2 enum
DO $$ BEGIN
    CREATE TYPE "ChecklistItemStatusV2" AS ENUM (
        'PENDING',
        'COMPLETED',
        'FAILED',
        'NOT_APPLICABLE',
        'NEEDS_ATTENTION'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 2: CREATE V2 TABLES
-- ============================================

-- 2.1 Checklist Templates V2
CREATE TABLE IF NOT EXISTS "checklist_templates_v2" (
    "id" TEXT NOT NULL,
    "checklistType" "ChecklistType" NOT NULL,
    "shiftType" "ChecklistShiftType" NOT NULL,
    "section" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "toolSystem" TEXT,
    "timeSlot" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_templates_v2_pkey" PRIMARY KEY ("id")
);

-- 2.2 Daily Checklists V2
CREATE TABLE IF NOT EXISTS "daily_checklists_v2" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "checklistType" "ChecklistType" NOT NULL,
    "shiftType" "ChecklistShiftType" NOT NULL,
    "status" "ServerChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "daily_checklists_v2_pkey" PRIMARY KEY ("id")
);

-- 2.3 Checklist Standby V2 (Pool of available users)
CREATE TABLE IF NOT EXISTS "checklist_standby_v2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checklistType" "ChecklistType" NOT NULL,
    "canBePrimary" BOOLEAN NOT NULL DEFAULT true,
    "canBeBuddy" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT NOT NULL,

    CONSTRAINT "checklist_standby_v2_pkey" PRIMARY KEY ("id")
);

-- 2.4 Checklist Assignments V2
CREATE TABLE IF NOT EXISTS "checklist_assignments_v2" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChecklistRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_assignments_v2_pkey" PRIMARY KEY ("id")
);

-- 2.5 Checklist Items V2
CREATE TABLE IF NOT EXISTS "checklist_items_v2" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "templateId" TEXT,
    "section" TEXT NOT NULL,
    "sectionTitle" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "toolSystem" TEXT,
    "timeSlot" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "status" "ChecklistItemStatusV2" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "notes" TEXT,

    CONSTRAINT "checklist_items_v2_pkey" PRIMARY KEY ("id")
);

-- 2.6 Shift Handovers V2
CREATE TABLE IF NOT EXISTS "shift_handovers_v2" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fromChecklistId" TEXT NOT NULL,
    "toChecklistId" TEXT,
    "outgoingPicId" TEXT NOT NULL,
    "incomingPicId" TEXT,
    "systemStatus" TEXT NOT NULL,
    "openIssues" TEXT,
    "notes" TEXT,
    "handoverTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),

    CONSTRAINT "shift_handovers_v2_pkey" PRIMARY KEY ("id")
);

-- 2.7 Shift Assignments V2 (Buddy System)
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

-- ============================================
-- STEP 3: CREATE UNIQUE CONSTRAINTS
-- ============================================

-- Daily checklist: one per date + type + shift
ALTER TABLE "daily_checklists_v2"
DROP CONSTRAINT IF EXISTS "daily_checklists_v2_date_checklistType_shiftType_key";

ALTER TABLE "daily_checklists_v2"
ADD CONSTRAINT "daily_checklists_v2_date_checklistType_shiftType_key"
UNIQUE ("date", "checklistType", "shiftType");

-- Standby: one entry per user
ALTER TABLE "checklist_standby_v2"
DROP CONSTRAINT IF EXISTS "checklist_standby_v2_userId_key";

ALTER TABLE "checklist_standby_v2"
ADD CONSTRAINT "checklist_standby_v2_userId_key"
UNIQUE ("userId");

-- Assignment: one per checklist + user
ALTER TABLE "checklist_assignments_v2"
DROP CONSTRAINT IF EXISTS "checklist_assignments_v2_checklistId_userId_key";

ALTER TABLE "checklist_assignments_v2"
ADD CONSTRAINT "checklist_assignments_v2_checklistId_userId_key"
UNIQUE ("checklistId", "userId");

-- Shift assignment: one per date + shift
ALTER TABLE "shift_assignments_v2"
DROP CONSTRAINT IF EXISTS "shift_assignments_v2_date_shiftType_key";

ALTER TABLE "shift_assignments_v2"
ADD CONSTRAINT "shift_assignments_v2_date_shiftType_key"
UNIQUE ("date", "shiftType");

-- ============================================
-- STEP 4: CREATE FOREIGN KEYS
-- ============================================

-- Checklist Standby V2
ALTER TABLE "checklist_standby_v2"
DROP CONSTRAINT IF EXISTS "checklist_standby_v2_userId_fkey";

ALTER TABLE "checklist_standby_v2"
ADD CONSTRAINT "checklist_standby_v2_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "checklist_standby_v2"
DROP CONSTRAINT IF EXISTS "checklist_standby_v2_addedById_fkey";

ALTER TABLE "checklist_standby_v2"
ADD CONSTRAINT "checklist_standby_v2_addedById_fkey"
FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Checklist Assignments V2
ALTER TABLE "checklist_assignments_v2"
DROP CONSTRAINT IF EXISTS "checklist_assignments_v2_checklistId_fkey";

ALTER TABLE "checklist_assignments_v2"
ADD CONSTRAINT "checklist_assignments_v2_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_assignments_v2"
DROP CONSTRAINT IF EXISTS "checklist_assignments_v2_userId_fkey";

ALTER TABLE "checklist_assignments_v2"
ADD CONSTRAINT "checklist_assignments_v2_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Checklist Items V2
ALTER TABLE "checklist_items_v2"
DROP CONSTRAINT IF EXISTS "checklist_items_v2_checklistId_fkey";

ALTER TABLE "checklist_items_v2"
ADD CONSTRAINT "checklist_items_v2_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_items_v2"
DROP CONSTRAINT IF EXISTS "checklist_items_v2_completedById_fkey";

ALTER TABLE "checklist_items_v2"
ADD CONSTRAINT "checklist_items_v2_completedById_fkey"
FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Shift Handovers V2
ALTER TABLE "shift_handovers_v2"
DROP CONSTRAINT IF EXISTS "shift_handovers_v2_fromChecklistId_fkey";

ALTER TABLE "shift_handovers_v2"
ADD CONSTRAINT "shift_handovers_v2_fromChecklistId_fkey"
FOREIGN KEY ("fromChecklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_handovers_v2"
DROP CONSTRAINT IF EXISTS "shift_handovers_v2_toChecklistId_fkey";

ALTER TABLE "shift_handovers_v2"
ADD CONSTRAINT "shift_handovers_v2_toChecklistId_fkey"
FOREIGN KEY ("toChecklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_handovers_v2"
DROP CONSTRAINT IF EXISTS "shift_handovers_v2_outgoingPicId_fkey";

ALTER TABLE "shift_handovers_v2"
ADD CONSTRAINT "shift_handovers_v2_outgoingPicId_fkey"
FOREIGN KEY ("outgoingPicId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_handovers_v2"
DROP CONSTRAINT IF EXISTS "shift_handovers_v2_incomingPicId_fkey";

ALTER TABLE "shift_handovers_v2"
ADD CONSTRAINT "shift_handovers_v2_incomingPicId_fkey"
FOREIGN KEY ("incomingPicId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Shift Assignments V2
ALTER TABLE "shift_assignments_v2"
DROP CONSTRAINT IF EXISTS "shift_assignments_v2_primaryUserId_fkey";

ALTER TABLE "shift_assignments_v2"
ADD CONSTRAINT "shift_assignments_v2_primaryUserId_fkey"
FOREIGN KEY ("primaryUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_assignments_v2"
DROP CONSTRAINT IF EXISTS "shift_assignments_v2_buddyUserId_fkey";

ALTER TABLE "shift_assignments_v2"
ADD CONSTRAINT "shift_assignments_v2_buddyUserId_fkey"
FOREIGN KEY ("buddyUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_assignments_v2"
DROP CONSTRAINT IF EXISTS "shift_assignments_v2_createdById_fkey";

ALTER TABLE "shift_assignments_v2"
ADD CONSTRAINT "shift_assignments_v2_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

-- Checklist Templates V2
CREATE INDEX IF NOT EXISTS "checklist_templates_v2_checklistType_shiftType_isActive_idx"
ON "checklist_templates_v2"("checklistType", "shiftType", "isActive");

CREATE INDEX IF NOT EXISTS "checklist_templates_v2_section_order_idx"
ON "checklist_templates_v2"("section", "order");

-- Daily Checklists V2
CREATE INDEX IF NOT EXISTS "daily_checklists_v2_date_status_idx"
ON "daily_checklists_v2"("date", "status");

-- Checklist Standby V2
CREATE INDEX IF NOT EXISTS "checklist_standby_v2_checklistType_isActive_idx"
ON "checklist_standby_v2"("checklistType", "isActive");

-- Checklist Assignments V2
CREATE INDEX IF NOT EXISTS "checklist_assignments_v2_userId_idx"
ON "checklist_assignments_v2"("userId");

-- Checklist Items V2
CREATE INDEX IF NOT EXISTS "checklist_items_v2_checklistId_section_idx"
ON "checklist_items_v2"("checklistId", "section");

CREATE INDEX IF NOT EXISTS "checklist_items_v2_checklistId_order_idx"
ON "checklist_items_v2"("checklistId", "order");

-- Shift Handovers V2
CREATE INDEX IF NOT EXISTS "shift_handovers_v2_date_idx"
ON "shift_handovers_v2"("date");

CREATE INDEX IF NOT EXISTS "shift_handovers_v2_outgoingPicId_idx"
ON "shift_handovers_v2"("outgoingPicId");

-- Shift Assignments V2
CREATE INDEX IF NOT EXISTS "shift_assignments_v2_date_idx"
ON "shift_assignments_v2"("date");

CREATE INDEX IF NOT EXISTS "shift_assignments_v2_primaryUserId_idx"
ON "shift_assignments_v2"("primaryUserId");

CREATE INDEX IF NOT EXISTS "shift_assignments_v2_buddyUserId_idx"
ON "shift_assignments_v2"("buddyUserId");

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'checklist_templates_v2',
        'daily_checklists_v2',
        'checklist_standby_v2',
        'checklist_assignments_v2',
        'checklist_items_v2',
        'shift_handovers_v2',
        'shift_assignments_v2'
    );

    IF table_count < 7 THEN
        RAISE EXCEPTION 'Migration failed: Only % of 7 tables created', table_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CHECKLIST V2 MIGRATION COMPLETED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New Checklist Types:';
    RAISE NOTICE '  - IT_INFRASTRUKTUR (IT & Infrastructure)';
    RAISE NOTICE '  - KEAMANAN_SIBER (Cyber Security)';
    RAISE NOTICE '  - FRAUD_COMPLIANCE (Fraud & Compliance)';
    RAISE NOTICE '';
    RAISE NOTICE 'Shift Types:';
    RAISE NOTICE '  - SHIFT_SIANG (08:00-20:00)';
    RAISE NOTICE '  - SHIFT_MALAM (20:00-08:00)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Deploy the V2 application code';
    RAISE NOTICE '  2. Import checklist templates';
    RAISE NOTICE '  3. Add users to standby pool';
    RAISE NOTICE '============================================';
END $$;

COMMIT;
