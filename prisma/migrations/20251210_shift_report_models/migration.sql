-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "ShiftReportStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftChecklistCategory" AS ENUM ('SYSTEM_MONITORING', 'TICKET_MANAGEMENT', 'HANDOVER_TASKS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE "server_metrics" (
    "id" TEXT NOT NULL,
    "serverId" TEXT,
    "serverName" TEXT,
    "cpuUsagePercent" DOUBLE PRECISION,
    "cpuCores" INTEGER,
    "cpuLoadAvg1m" DOUBLE PRECISION,
    "cpuLoadAvg5m" DOUBLE PRECISION,
    "cpuLoadAvg15m" DOUBLE PRECISION,
    "ramTotalGB" DOUBLE PRECISION,
    "ramUsedGB" DOUBLE PRECISION,
    "ramUsagePercent" DOUBLE PRECISION,
    "diskTotalGB" DOUBLE PRECISION,
    "diskUsedGB" DOUBLE PRECISION,
    "diskUsagePercent" DOUBLE PRECISION,
    "networkInBytesPerSec" DOUBLE PRECISION,
    "networkOutBytesPerSec" DOUBLE PRECISION,
    "uptimeSeconds" INTEGER,
    "lastBootTime" TIMESTAMP(3),
    "additionalMetrics" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceIp" TEXT,

    CONSTRAINT "server_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_reports" (
    "id" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "status" "ShiftReportStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "serverMetricsId" TEXT,
    "summary" TEXT,
    "handoverNotes" TEXT,
    "issuesEncountered" TEXT,
    "pendingActions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_checklist_items" (
    "id" TEXT NOT NULL,
    "shiftReportId" TEXT NOT NULL,
    "category" "ShiftChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "status" "ShiftChecklistStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_checklist_templates" (
    "id" TEXT NOT NULL,
    "shiftType" "ShiftType",
    "category" "ShiftChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "server_metrics_collectedAt_idx" ON "server_metrics"("collectedAt");

-- CreateIndex
CREATE INDEX "server_metrics_serverId_collectedAt_idx" ON "server_metrics"("serverId", "collectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "shift_reports_shiftAssignmentId_key" ON "shift_reports"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "shift_reports_shiftAssignmentId_idx" ON "shift_reports"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "shift_reports_status_idx" ON "shift_reports"("status");

-- CreateIndex
CREATE INDEX "shift_checklist_items_shiftReportId_category_idx" ON "shift_checklist_items"("shiftReportId", "category");

-- CreateIndex
CREATE INDEX "shift_checklist_items_shiftReportId_order_idx" ON "shift_checklist_items"("shiftReportId", "order");

-- CreateIndex
CREATE INDEX "shift_checklist_templates_shiftType_category_isActive_idx" ON "shift_checklist_templates"("shiftType", "category", "isActive");

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_serverMetricsId_fkey" FOREIGN KEY ("serverMetricsId") REFERENCES "server_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_checklist_items" ADD CONSTRAINT "shift_checklist_items_shiftReportId_fkey" FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;
