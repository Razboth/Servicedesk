-- Ensure ATM monitoring tables exist for the /api/public/atm-status endpoint
-- Run this script if tables don't exist or need to be verified

-- ATM Monitoring Logs table
CREATE TABLE IF NOT EXISTS "atm_monitoring_logs" (
    "id" TEXT NOT NULL,
    "atmId" TEXT NOT NULL,
    "status" "ATMStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign key if not exists
DO $$ BEGIN
    ALTER TABLE "atm_monitoring_logs" ADD CONSTRAINT "atm_monitoring_logs_atmId_fkey"
    FOREIGN KEY ("atmId") REFERENCES "atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Network Ping Results table (if not exists)
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

-- Add foreign keys for network_ping_results if not exists
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

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS "network_ping_results_entityType_entityId_idx" ON "network_ping_results"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "network_ping_results_checkedAt_idx" ON "network_ping_results"("checkedAt");
CREATE INDEX IF NOT EXISTS "network_ping_results_status_idx" ON "network_ping_results"("status");

-- Verify tables exist
SELECT 'atm_monitoring_logs' as table_name, COUNT(*) as row_count FROM "atm_monitoring_logs"
UNION ALL
SELECT 'network_ping_results', COUNT(*) FROM "network_ping_results";
