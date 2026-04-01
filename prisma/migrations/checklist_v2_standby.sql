-- Checklist V2 Standby Pool Migration
-- This migration creates the standby pool table for checklist user assignment workflow

-- Create checklist_standby_v2 table
CREATE TABLE IF NOT EXISTS "checklist_standby_v2" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "unit" "ChecklistUnit" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedById" TEXT NOT NULL,

    CONSTRAINT "checklist_standby_v2_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on userId (one user can only be in standby pool once)
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_standby_v2_userId_key" ON "checklist_standby_v2"("userId");

-- Create index for unit and isActive filtering
CREATE INDEX IF NOT EXISTS "checklist_standby_v2_unit_isActive_idx" ON "checklist_standby_v2"("unit", "isActive");

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "checklist_standby_v2"
    ADD CONSTRAINT "checklist_standby_v2_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TABLE "checklist_standby_v2"
    ADD CONSTRAINT "checklist_standby_v2_addedById_fkey"
    FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Success message
SELECT 'Checklist Standby V2 table created successfully!' as message;
