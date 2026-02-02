-- KMS (Knowledge Management System) Enums and Schema Updates
-- Run with: psql -d servicedesk_database -f kms_enums.sql

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
-- TABLE FIXES
-- =============================================

-- Add missing createdAt column to knowledge_visible_branches
ALTER TABLE knowledge_visible_branches ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- =============================================
-- Verify enums created
-- =============================================
SELECT typname FROM pg_type WHERE typname IN ('KnowledgeStatus', 'KnowledgeVisibility', 'CollaboratorRole', 'AccessType');
