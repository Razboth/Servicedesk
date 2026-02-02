-- KMS Enhancement Migration
-- Run with: sudo -u postgres psql -d servicedesk_database -f kms_enhancement_full.sql

-- =============================================
-- PHASE 1: Access Logs
-- =============================================

-- Create AccessType enum
DO $$ BEGIN
    CREATE TYPE "AccessType" AS ENUM ('VIEW', 'DOWNLOAD', 'PRINT', 'SHARE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create knowledge_access_logs table
CREATE TABLE IF NOT EXISTS "knowledge_access_logs" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessType" "AccessType" NOT NULL DEFAULT 'VIEW',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "duration" INTEGER,
    "referrer" TEXT,
    "searchQuery" TEXT,

    CONSTRAINT "knowledge_access_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_access_logs_articleId_accessedAt_idx"
    ON "knowledge_access_logs"("articleId", "accessedAt");
CREATE INDEX IF NOT EXISTS "knowledge_access_logs_userId_accessedAt_idx"
    ON "knowledge_access_logs"("userId", "accessedAt");

ALTER TABLE "knowledge_access_logs" DROP CONSTRAINT IF EXISTS "knowledge_access_logs_articleId_fkey";
ALTER TABLE "knowledge_access_logs" ADD CONSTRAINT "knowledge_access_logs_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_access_logs" DROP CONSTRAINT IF EXISTS "knowledge_access_logs_userId_fkey";
ALTER TABLE "knowledge_access_logs" ADD CONSTRAINT "knowledge_access_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =============================================
-- PHASE 2: Enhanced Version Features
-- =============================================

ALTER TABLE "knowledge_versions" ADD COLUMN IF NOT EXISTS "isStable" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "knowledge_versions" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "knowledge_versions" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

ALTER TABLE "knowledge_versions" DROP CONSTRAINT IF EXISTS "knowledge_versions_approvedBy_fkey";
ALTER TABLE "knowledge_versions" ADD CONSTRAINT "knowledge_versions_approvedBy_fkey"
    FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "knowledge_versions_articleId_isStable_idx"
    ON "knowledge_versions"("articleId", "isStable");

-- =============================================
-- PHASE 3: Permissions & Governance
-- =============================================

-- Update KnowledgeCollaborator
ALTER TABLE "knowledge_collaborators" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);
ALTER TABLE "knowledge_collaborators" ADD COLUMN IF NOT EXISTS "permissions" TEXT[];

CREATE INDEX IF NOT EXISTS "knowledge_collaborators_expiresAt_idx"
    ON "knowledge_collaborators"("expiresAt");

-- Create Permission Templates table
CREATE TABLE IF NOT EXISTS "knowledge_permission_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_permission_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "knowledge_permission_templates_name_key"
    ON "knowledge_permission_templates"("name");

ALTER TABLE "knowledge_permission_templates" DROP CONSTRAINT IF EXISTS "knowledge_permission_templates_createdBy_fkey";
ALTER TABLE "knowledge_permission_templates" ADD CONSTRAINT "knowledge_permission_templates_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Update KnowledgeArticle for governance
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "ownerId" TEXT;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "reviewFrequencyDays" INTEGER;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "nextReviewDate" TIMESTAMP(3);
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3);
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "lastReviewedBy" TEXT;
ALTER TABLE "knowledge_articles" ADD COLUMN IF NOT EXISTS "isStale" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "knowledge_articles" DROP CONSTRAINT IF EXISTS "knowledge_articles_ownerId_fkey";
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" DROP CONSTRAINT IF EXISTS "knowledge_articles_lastReviewedBy_fkey";
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_lastReviewedBy_fkey"
    FOREIGN KEY ("lastReviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "knowledge_articles_isStale_idx" ON "knowledge_articles"("isStale");
CREATE INDEX IF NOT EXISTS "knowledge_articles_nextReviewDate_idx" ON "knowledge_articles"("nextReviewDate");
CREATE INDEX IF NOT EXISTS "knowledge_articles_ownerId_idx" ON "knowledge_articles"("ownerId");

-- =============================================
-- Verify changes
-- =============================================

SELECT 'knowledge_access_logs' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'knowledge_access_logs';

SELECT 'knowledge_versions new columns' as info, column_name
FROM information_schema.columns
WHERE table_name = 'knowledge_versions' AND column_name IN ('isStable', 'approvedBy', 'approvedAt');

SELECT 'knowledge_permission_templates' as table_name, COUNT(*) as column_count
FROM information_schema.columns WHERE table_name = 'knowledge_permission_templates';

SELECT 'knowledge_articles governance columns' as info, column_name
FROM information_schema.columns
WHERE table_name = 'knowledge_articles'
AND column_name IN ('ownerId', 'reviewFrequencyDays', 'nextReviewDate', 'lastReviewedAt', 'lastReviewedBy', 'isStale');
