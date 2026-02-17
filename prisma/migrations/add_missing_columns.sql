-- Add missing columns to maintenance_windows table
ALTER TABLE "maintenance_windows" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Maintenance';
ALTER TABLE "maintenance_windows" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "maintenance_windows" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "maintenance_windows" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "maintenance_windows" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- Add index if not exists
CREATE INDEX IF NOT EXISTS "maintenance_windows_entityType_entityId_idx" ON "maintenance_windows"("entityType", "entityId");
