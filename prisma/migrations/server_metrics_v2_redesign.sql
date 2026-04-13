-- ============================================
-- SERVER METRICS V2 REDESIGN
-- ============================================
-- Drops old tables and creates new simplified schema
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: DROP OLD TABLES
-- ============================================

DROP TABLE IF EXISTS "server_metric_snapshots" CASCADE;
DROP TABLE IF EXISTS "metric_collections" CASCADE;
DROP TABLE IF EXISTS "monitored_servers" CASCADE;

-- ============================================
-- STEP 2: CREATE NEW ENUM
-- ============================================

DO $$ BEGIN
    CREATE TYPE "ServerMetricStatus" AS ENUM ('OK', 'CAUTION', 'WARNING');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- STEP 3: CREATE NEW TABLES
-- ============================================

-- Collection metadata from Grafana fetch
CREATE TABLE IF NOT EXISTS "server_metric_collections_v2" (
    "id" TEXT NOT NULL,
    "dashboard" TEXT,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAtLocal" TEXT,
    "timeRange" TEXT,
    "totalServers" INTEGER NOT NULL,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "cautionCount" INTEGER NOT NULL DEFAULT 0,
    "okCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_metric_collections_v2_pkey" PRIMARY KEY ("id")
);

-- Individual server metric snapshots
CREATE TABLE IF NOT EXISTS "server_metric_snapshots_v2" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "instance" TEXT NOT NULL,
    "cpuPercent" DOUBLE PRECISION NOT NULL,
    "memoryPercent" DOUBLE PRECISION NOT NULL,
    "storagePercent" DOUBLE PRECISION NOT NULL,
    "status" "ServerMetricStatus" NOT NULL,

    CONSTRAINT "server_metric_snapshots_v2_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 4: CREATE FOREIGN KEYS
-- ============================================

ALTER TABLE "server_metric_snapshots_v2"
ADD CONSTRAINT "server_metric_snapshots_v2_collectionId_fkey"
FOREIGN KEY ("collectionId") REFERENCES "server_metric_collections_v2"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS "server_metric_collections_v2_createdAt_idx"
ON "server_metric_collections_v2"("createdAt");

CREATE INDEX IF NOT EXISTS "server_metric_snapshots_v2_collectionId_idx"
ON "server_metric_snapshots_v2"("collectionId");

CREATE INDEX IF NOT EXISTS "server_metric_snapshots_v2_instance_idx"
ON "server_metric_snapshots_v2"("instance");

-- ============================================
-- STEP 6: VERIFICATION
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'server_metric_collections_v2',
        'server_metric_snapshots_v2'
    );

    IF table_count < 2 THEN
        RAISE EXCEPTION 'Migration failed: Only % of 2 tables created', table_count;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'SERVER METRICS V2 MIGRATION COMPLETED';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE 'New tables:';
    RAISE NOTICE '  - server_metric_collections_v2';
    RAISE NOTICE '  - server_metric_snapshots_v2';
    RAISE NOTICE '';
    RAISE NOTICE 'New enum: ServerMetricStatus (OK, CAUTION, WARNING)';
    RAISE NOTICE '============================================';
END $$;

COMMIT;
