-- KMS (Knowledge Management System) Enums and Schema Updates
-- Run with: psql -d servicedesk_database -f kms_enums.sql
-- Safe to run multiple times (idempotent)

-- =============================================
-- ENUMS
-- =============================================

-- KnowledgeStatus enum
DO $$ BEGIN
    CREATE TYPE "KnowledgeStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- KnowledgeVisibility enum
DO $$ BEGIN
    CREATE TYPE "KnowledgeVisibility" AS ENUM ('EVERYONE', 'BY_ROLE', 'BY_BRANCH', 'PRIVATE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CollaboratorRole enum
DO $$ BEGIN
    CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'OWNER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AccessType enum
DO $$ BEGIN
    CREATE TYPE "AccessType" AS ENUM ('VIEW', 'DOWNLOAD', 'PRINT', 'SHARE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLE: knowledge_access_logs
-- =============================================
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

-- Add indexes if not exist
CREATE INDEX IF NOT EXISTS "knowledge_access_logs_articleId_accessedAt_idx" ON "knowledge_access_logs"("articleId", "accessedAt");
CREATE INDEX IF NOT EXISTS "knowledge_access_logs_userId_accessedAt_idx" ON "knowledge_access_logs"("userId", "accessedAt");

-- Add foreign keys (skip if exists)
DO $$ BEGIN
    ALTER TABLE "knowledge_access_logs" ADD CONSTRAINT "knowledge_access_logs_articleId_fkey"
        FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "knowledge_access_logs" ADD CONSTRAINT "knowledge_access_logs_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- TABLE FIXES
-- =============================================

-- Add missing createdAt column to knowledge_visible_branches
ALTER TABLE knowledge_visible_branches ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- =============================================
-- CONVERT COLUMNS TO ENUM TYPES (safe conversion)
-- =============================================

-- Convert visibility column from text to KnowledgeVisibility enum
DO $$
BEGIN
    -- Check if column is still text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'knowledge_articles'
        AND column_name = 'visibility'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE knowledge_articles ALTER COLUMN visibility DROP DEFAULT;
        ALTER TABLE knowledge_articles ALTER COLUMN visibility TYPE "KnowledgeVisibility" USING visibility::"KnowledgeVisibility";
        ALTER TABLE knowledge_articles ALTER COLUMN visibility SET DEFAULT 'EVERYONE'::"KnowledgeVisibility";
    END IF;
END $$;

-- Convert status column from text to KnowledgeStatus enum
DO $$
BEGIN
    -- Check if column is still text type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'knowledge_articles'
        AND column_name = 'status'
        AND data_type = 'text'
    ) THEN
        ALTER TABLE knowledge_articles ALTER COLUMN status DROP DEFAULT;
        ALTER TABLE knowledge_articles ALTER COLUMN status TYPE "KnowledgeStatus" USING status::"KnowledgeStatus";
        ALTER TABLE knowledge_articles ALTER COLUMN status SET DEFAULT 'DRAFT'::"KnowledgeStatus";
    END IF;
END $$;

-- =============================================
-- Verify
-- =============================================
SELECT 'Enums:' as info;
SELECT typname FROM pg_type WHERE typname IN ('KnowledgeStatus', 'KnowledgeVisibility', 'CollaboratorRole', 'AccessType');

SELECT 'knowledge_access_logs table:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'knowledge_access_logs';

SELECT 'knowledge_articles visibility/status columns:' as info;
SELECT column_name, udt_name FROM information_schema.columns WHERE table_name = 'knowledge_articles' AND column_name IN ('visibility', 'status');
