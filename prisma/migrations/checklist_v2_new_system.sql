-- Checklist V2 New System Migration
-- This migration creates the new checklist system based on Excel templates

-- Create new enums (if not exists)
DO $$ BEGIN
    CREATE TYPE "ChecklistUnit" AS ENUM ('IT_OPERATIONS', 'MONITORING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChecklistShiftType" AS ENUM ('HARIAN_KANTOR', 'STANDBY_LEMBUR', 'SHIFT_MALAM', 'SHIFT_SIANG_WEEKEND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChecklistRole" AS ENUM ('STAFF', 'SUPERVISOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ChecklistItemStatusV2" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'NOT_APPLICABLE', 'NEEDS_ATTENTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create checklist_templates_v2 table
CREATE TABLE IF NOT EXISTS "checklist_templates_v2" (
    "id" TEXT NOT NULL,
    "unit" "ChecklistUnit" NOT NULL,
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

-- Create indexes for checklist_templates_v2
CREATE INDEX IF NOT EXISTS "checklist_templates_v2_unit_shiftType_isActive_idx" ON "checklist_templates_v2"("unit", "shiftType", "isActive");
CREATE INDEX IF NOT EXISTS "checklist_templates_v2_section_order_idx" ON "checklist_templates_v2"("section", "order");

-- Create daily_checklists_v2 table
CREATE TABLE IF NOT EXISTS "daily_checklists_v2" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "unit" "ChecklistUnit" NOT NULL,
    "shiftType" "ChecklistShiftType" NOT NULL,
    "status" "ServerChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "daily_checklists_v2_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes for daily_checklists_v2
CREATE UNIQUE INDEX IF NOT EXISTS "daily_checklists_v2_date_unit_shiftType_key" ON "daily_checklists_v2"("date", "unit", "shiftType");
CREATE INDEX IF NOT EXISTS "daily_checklists_v2_date_status_idx" ON "daily_checklists_v2"("date", "status");

-- Create checklist_assignments_v2 table
CREATE TABLE IF NOT EXISTS "checklist_assignments_v2" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChecklistRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_assignments_v2_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes for checklist_assignments_v2
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_assignments_v2_checklistId_userId_key" ON "checklist_assignments_v2"("checklistId", "userId");
CREATE INDEX IF NOT EXISTS "checklist_assignments_v2_userId_idx" ON "checklist_assignments_v2"("userId");

-- Create checklist_items_v2 table
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

-- Create indexes for checklist_items_v2
CREATE INDEX IF NOT EXISTS "checklist_items_v2_checklistId_section_idx" ON "checklist_items_v2"("checklistId", "section");
CREATE INDEX IF NOT EXISTS "checklist_items_v2_checklistId_order_idx" ON "checklist_items_v2"("checklistId", "order");

-- Create shift_handovers_v2 table
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

-- Create indexes for shift_handovers_v2
CREATE INDEX IF NOT EXISTS "shift_handovers_v2_date_idx" ON "shift_handovers_v2"("date");
CREATE INDEX IF NOT EXISTS "shift_handovers_v2_outgoingPicId_idx" ON "shift_handovers_v2"("outgoingPicId");

-- Add foreign key constraints (using DO blocks to handle existing constraints)
DO $$ BEGIN
    ALTER TABLE "checklist_assignments_v2"
    ADD CONSTRAINT "checklist_assignments_v2_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "checklist_assignments_v2"
    ADD CONSTRAINT "checklist_assignments_v2_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "checklist_items_v2"
    ADD CONSTRAINT "checklist_items_v2_checklistId_fkey"
    FOREIGN KEY ("checklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "checklist_items_v2"
    ADD CONSTRAINT "checklist_items_v2_completedById_fkey"
    FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "shift_handovers_v2"
    ADD CONSTRAINT "shift_handovers_v2_fromChecklistId_fkey"
    FOREIGN KEY ("fromChecklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "shift_handovers_v2"
    ADD CONSTRAINT "shift_handovers_v2_toChecklistId_fkey"
    FOREIGN KEY ("toChecklistId") REFERENCES "daily_checklists_v2"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "shift_handovers_v2"
    ADD CONSTRAINT "shift_handovers_v2_outgoingPicId_fkey"
    FOREIGN KEY ("outgoingPicId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "shift_handovers_v2"
    ADD CONSTRAINT "shift_handovers_v2_incomingPicId_fkey"
    FOREIGN KEY ("incomingPicId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Success message
SELECT 'Checklist V2 tables created successfully!' as message;
