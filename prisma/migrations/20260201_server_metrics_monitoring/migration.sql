-- CreateTable: Server registry for storing server identification info
CREATE TABLE "monitored_servers" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "serverName" TEXT,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitored_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Collection metadata - groups snapshots from single API call
CREATE TABLE "metric_collections" (
    "id" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "reportTimestamp" TIMESTAMP(3) NOT NULL,
    "totalIps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Individual metric snapshot per server per collection
CREATE TABLE "server_metric_snapshots" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "cpuPercent" DOUBLE PRECISION,
    "memoryPercent" DOUBLE PRECISION,
    "storage" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "server_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique constraint on IP address
CREATE UNIQUE INDEX "monitored_servers_ipAddress_key" ON "monitored_servers"("ipAddress");

-- CreateIndex: Index on IP address for fast lookups
CREATE INDEX "monitored_servers_ipAddress_idx" ON "monitored_servers"("ipAddress");

-- CreateIndex: Index on category for filtering
CREATE INDEX "monitored_servers_category_idx" ON "monitored_servers"("category");

-- CreateIndex: Index on collection creation time
CREATE INDEX "metric_collections_createdAt_idx" ON "metric_collections"("createdAt");

-- CreateIndex: Composite index on server and collection time
CREATE INDEX "server_metric_snapshots_serverId_collectedAt_idx" ON "server_metric_snapshots"("serverId", "collectedAt");

-- CreateIndex: Index on collection ID for grouping
CREATE INDEX "server_metric_snapshots_collectionId_idx" ON "server_metric_snapshots"("collectionId");

-- AddForeignKey: Link snapshots to monitored servers
ALTER TABLE "server_metric_snapshots" ADD CONSTRAINT "server_metric_snapshots_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "monitored_servers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Link snapshots to metric collections
ALTER TABLE "server_metric_snapshots" ADD CONSTRAINT "server_metric_snapshots_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "metric_collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
