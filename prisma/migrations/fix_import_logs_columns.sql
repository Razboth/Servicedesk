-- Fix missing columns in import_logs table
-- Run with: sudo -u postgres psql -d servicedesk_database -f /path/to/fix_import_logs_columns.sql

-- Add missing columns (IF NOT EXISTS prevents errors if column already exists)
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "importMode" TEXT DEFAULT 'CREATE_OR_UPDATE';
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "fileSize" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "totalRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "processedRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "createdRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "updatedRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "skippedRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "errorRows" INTEGER DEFAULT 0;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'PENDING';
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "errors" JSONB;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "createdById" TEXT;
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT NOW();
ALTER TABLE import_logs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT NOW();

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "import_logs_entityType_status_idx" ON import_logs("entityType", "status");
CREATE INDEX IF NOT EXISTS "import_logs_createdById_idx" ON import_logs("createdById");
CREATE INDEX IF NOT EXISTS "import_logs_createdAt_idx" ON import_logs("createdAt");

-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'import_logs'
ORDER BY ordinal_position;
