-- Add LoginFailureReason enum if not exists
DO $$ BEGIN
    CREATE TYPE "LoginFailureReason" AS ENUM ('WRONG_PASSWORD', 'USER_NOT_FOUND', 'ACCOUNT_INACTIVE', 'ACCOUNT_LOCKED', 'RATE_LIMITED', 'SESSION_EXPIRED', 'INVALID_TOKEN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add failureReason column to login_attempts if not exists
DO $$ BEGIN
    ALTER TABLE "login_attempts" ADD COLUMN "failureReason" "LoginFailureReason";
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Add deviceInfo column to login_attempts if not exists
DO $$ BEGIN
    ALTER TABLE "login_attempts" ADD COLUMN "deviceInfo" JSONB;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create user_audit_sessions table if not exists
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

-- Add unique constraint on sessionToken if not exists
DO $$ BEGIN
    ALTER TABLE "user_audit_sessions" ADD CONSTRAINT "user_audit_sessions_sessionToken_key" UNIQUE ("sessionToken");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key if not exists
DO $$ BEGIN
    ALTER TABLE "user_audit_sessions" ADD CONSTRAINT "user_audit_sessions_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for user_audit_sessions if not exists
CREATE INDEX IF NOT EXISTS "user_audit_sessions_userId_isActive_idx" ON "user_audit_sessions"("userId", "isActive");
CREATE INDEX IF NOT EXISTS "user_audit_sessions_loginAt_idx" ON "user_audit_sessions"("loginAt");

-- Create profile_change_logs table if not exists
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

-- Add foreign keys for profile_change_logs if not exists
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

-- Create index for profile_change_logs if not exists
CREATE INDEX IF NOT EXISTS "profile_change_logs_userId_createdAt_idx" ON "profile_change_logs"("userId", "createdAt");

-- Verify tables were created
SELECT 'user_audit_sessions' as table_name, COUNT(*) as row_count FROM "user_audit_sessions"
UNION ALL
SELECT 'profile_change_logs', COUNT(*) FROM "profile_change_logs"
UNION ALL
SELECT 'login_attempts', COUNT(*) FROM "login_attempts";
