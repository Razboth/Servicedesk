-- Migration: Update Server Metrics checklist item to use SERVER_METRICS input type
-- Date: 2025-02-05

-- Add SERVER_METRICS to ChecklistInputType enum (if not exists)
-- Note: Run this line separately if it fails in a transaction
ALTER TYPE "ChecklistInputType" ADD VALUE IF NOT EXISTS 'SERVER_METRICS';

-- Update the checklist template to use SERVER_METRICS input type
UPDATE "server_access_checklist_templates"
SET "inputType" = 'SERVER_METRICS'
WHERE "title" LIKE '%Check Server Metrics%'
  AND "checklistType" = 'MONITORING_SIANG';

-- Also update any existing checklist items that were created from this template
UPDATE "server_access_checklist_items"
SET "inputType" = 'SERVER_METRICS'
WHERE "title" LIKE '%Check Server Metrics%';
