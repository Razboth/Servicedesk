-- =============================================================================
-- COMPREHENSIVE DATABASE SYNC SCRIPT
-- Run this script to ensure all tables and columns exist
-- Safe to run multiple times (idempotent)
-- =============================================================================

-- =============================================================================
-- PART 1: ENUMS
-- =============================================================================

-- LoginFailureReason enum
DO $$ BEGIN
    CREATE TYPE "LoginFailureReason" AS ENUM (
        'WRONG_PASSWORD',
        'USER_NOT_FOUND',
        'ACCOUNT_INACTIVE',
        'ACCOUNT_LOCKED',
        'RATE_LIMITED',
        'SESSION_EXPIRED',
        'INVALID_TOKEN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ATMStatus enum (if not exists)
DO $$ BEGIN
    CREATE TYPE "ATMStatus" AS ENUM (
        'ONLINE',
        'OFFLINE',
        'WARNING',
        'ERROR',
        'MAINTENANCE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- NetworkStatus enum (if not exists)
DO $$ BEGIN
    CREATE TYPE "NetworkStatus" AS ENUM (
        'ONLINE',
        'OFFLINE',
        'SLOW',
        'TIMEOUT',
        'ERROR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- NetworkMedia enum (if not exists)
DO $$ BEGIN
    CREATE TYPE "NetworkMedia" AS ENUM (
        'VSAT',
        'M2M',
        'FO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PART 2: AUDIT TABLES
-- =============================================================================

-- 2.1 Update login_attempts table with new columns
DO $$ BEGIN
    ALTER TABLE "login_attempts" ADD COLUMN "failureReason" "LoginFailureReason";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "login_attempts" ADD COLUMN "deviceInfo" JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- 2.2 User Audit Sessions table
CREATE TABLE IF NOT EXISTS "user_audit_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "location" TEXT,
    "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logoutAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "logoutReason" TEXT,
    "isNewDevice" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_audit_sessions_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint on sessionToken
DO $$ BEGIN
    ALTER TABLE "user_audit_sessions" ADD CONSTRAINT "user_audit_sessions_sessionToken_key" UNIQUE ("sessionToken");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key for user_audit_sessions
DO $$ BEGIN
    ALTER TABLE "user_audit_sessions" ADD CONSTRAINT "user_audit_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for user_audit_sessions
CREATE INDEX IF NOT EXISTS "user_audit_sessions_userId_isActive_idx" ON "user_audit_sessions"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "user_audit_sessions_loginAt_idx" ON "user_audit_sessions"("loginAt");

-- 2.3 Profile Change Logs table
CREATE TABLE IF NOT EXISTS "profile_change_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedBy" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_change_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for profile_change_logs
DO $$ BEGIN
    ALTER TABLE "profile_change_logs" ADD CONSTRAINT "profile_change_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "profile_change_logs" ADD CONSTRAINT "profile_change_logs_changedBy_fkey"
    FOREIGN KEY ("changedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for profile_change_logs
CREATE INDEX IF NOT EXISTS "profile_change_logs_userId_createdAt_idx" ON "profile_change_logs"("userId", "createdAt");

-- =============================================================================
-- PART 3: ATM MONITORING TABLES
-- =============================================================================

-- 3.1 ATM Monitoring Logs table
CREATE TABLE IF NOT EXISTS "atm_monitoring_logs" (
    "id" TEXT NOT NULL,
    "atmId" TEXT NOT NULL,
    "status" "ATMStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key for atm_monitoring_logs
DO $$ BEGIN
    ALTER TABLE "atm_monitoring_logs" ADD CONSTRAINT "atm_monitoring_logs_atmId_fkey"
    FOREIGN KEY ("atmId") REFERENCES "atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3.2 Network Ping Results table
CREATE TABLE IF NOT EXISTS "network_ping_results" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "branchId" TEXT,
    "atmId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "ipType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "networkMedia" "NetworkMedia",
    "networkVendor" TEXT,
    "status" "NetworkStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "packetLoss" DOUBLE PRECISION DEFAULT 0,
    "minRtt" DOUBLE PRECISION,
    "maxRtt" DOUBLE PRECISION,
    "avgRtt" DOUBLE PRECISION,
    "mdev" DOUBLE PRECISION,
    "packetsTransmitted" INTEGER,
    "packetsReceived" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_ping_results_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for network_ping_results
DO $$ BEGIN
    ALTER TABLE "network_ping_results" ADD CONSTRAINT "network_ping_results_atmId_fkey"
    FOREIGN KEY ("atmId") REFERENCES "atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "network_ping_results" ADD CONSTRAINT "network_ping_results_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for network_ping_results
CREATE INDEX IF NOT EXISTS "network_ping_results_entityType_entityId_idx" ON "network_ping_results"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "network_ping_results_checkedAt_idx" ON "network_ping_results"("checkedAt");
CREATE INDEX IF NOT EXISTS "network_ping_results_status_idx" ON "network_ping_results"("status");

-- =============================================================================
-- PART 4: VERIFY ALL TABLES
-- =============================================================================

SELECT 'login_attempts' as table_name, COUNT(*) as row_count FROM "login_attempts"
UNION ALL
SELECT 'user_audit_sessions', COUNT(*) FROM "user_audit_sessions"
UNION ALL
SELECT 'profile_change_logs', COUNT(*) FROM "profile_change_logs"
UNION ALL
SELECT 'atm_monitoring_logs', COUNT(*) FROM "atm_monitoring_logs"
UNION ALL
SELECT 'network_ping_results', COUNT(*) FROM "network_ping_results";

-- Show success message
SELECT '✅ All tables synced successfully!' as message;
