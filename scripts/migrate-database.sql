-- ==========================================================
-- Bank SulutGo ServiceDesk - Database Migration Script
-- ==========================================================
-- Script ini digunakan untuk mengupgrade database lama ke schema terbaru
-- Jalankan setelah restore database backup
--
-- PENTING: Backup database sebelum menjalankan script ini!
-- ==========================================================

-- Mulai transaksi
BEGIN;

-- ==========================================================
-- 1. ENUM TYPES - Tambahkan enum baru jika belum ada
-- ==========================================================

-- PCAsset related enums
DO $$ BEGIN
    CREATE TYPE "PCFormFactor" AS ENUM ('LAPTOP', 'DESKTOP', 'ALL_IN_ONE', 'WORKSTATION', 'MINI_PC', 'SERVER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PCStorageType" AS ENUM ('HDD', 'SSD', 'NVME', 'HYBRID', 'EMMC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PCAssetStatus" AS ENUM ('IN_USE', 'STOCK', 'BROKEN', 'DISPOSED', 'MAINTENANCE', 'RESERVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ServiceLogStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'PENDING_PARTS', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfficeLicenseStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'UNLICENSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "HardeningCategory" AS ENUM ('USER_ACCOUNTS', 'NETWORK_SECURITY', 'SYSTEM_UPDATES', 'FIREWALL', 'ANTIVIRUS', 'ACCESS_CONTROL', 'DATA_ENCRYPTION', 'AUDIT_LOGGING', 'APPLICATION_CONTROL', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OSLicenseType" AS ENUM ('OEM', 'FPP', 'OLP', 'VOLUME', 'ACADEMIC', 'ENTERPRISE', 'NFR', 'TRIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfficeLicenseType" AS ENUM ('SUBSCRIPTION', 'PERPETUAL', 'VOLUME', 'OEM', 'ACADEMIC', 'NFR', 'TRIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfficeProductType" AS ENUM ('OFFICE_365_PERSONAL', 'OFFICE_365_HOME', 'OFFICE_365_BUSINESS', 'OFFICE_365_ENTERPRISE', 'OFFICE_2019', 'OFFICE_2021', 'OFFICE_LTSC', 'LIBRE_OFFICE', 'WPS_OFFICE', 'GOOGLE_WORKSPACE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PCServiceType" AS ENUM ('INSTALLATION', 'REPAIR', 'MAINTENANCE', 'UPGRADE', 'HARDENING', 'VIRUS_REMOVAL', 'DATA_RECOVERY', 'BACKUP', 'INSPECTION', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OSType" AS ENUM ('WINDOWS', 'LINUX', 'MACOS', 'UNIX', 'CHROME_OS', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "OfficeType" AS ENUM ('MICROSOFT_365', 'OFFICE_LTSC', 'LIBRE_OFFICE', 'OPEN_OFFICE', 'WPS_OFFICE', 'GOOGLE_WORKSPACE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Daily Task related enums
DO $$ BEGIN
    CREATE TYPE "DailyTaskCategory" AS ENUM ('TICKET', 'MAINTENANCE', 'MEETING', 'TRAINING', 'DOCUMENTATION', 'SUPPORT', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "DailyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Knowledge Base related enums
DO $$ BEGIN
    CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'OWNER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Announcement related enums
DO $$ BEGIN
    CREATE TYPE "AnnouncementType" AS ENUM ('GENERAL', 'MAINTENANCE', 'UPDATE', 'ALERT', 'PROMOTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shift Management related enums
DO $$ BEGIN
    CREATE TYPE "StaffShiftType" AS ENUM ('NIGHT', 'DAY', 'STANDBY', 'MIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftType" AS ENUM ('NIGHT_WEEKDAY', 'DAY_WEEKEND', 'NIGHT_WEEKEND', 'STANDBY_ONCALL', 'STANDBY_BRANCH', 'OFF', 'LEAVE', 'HOLIDAY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ScheduleStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'SWAPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('ANNUAL_LEAVE', 'SICK_LEAVE', 'EMERGENCY_LEAVE', 'UNPAID_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'COMPASSIONATE_LEAVE', 'STUDY_LEAVE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "HolidayType" AS ENUM ('PUBLIC', 'COMPANY', 'RELIGIOUS', 'SPECIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftSwapType" AS ENUM ('ONE_TO_ONE', 'GIVE_AWAY', 'TRADE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SwapRequestStatus" AS ENUM ('PENDING_RECIPIENT', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Shift Report related enums
DO $$ BEGIN
    CREATE TYPE "ShiftReportStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftChecklistCategory" AS ENUM ('SYSTEM_MONITORING', 'TICKET_MANAGEMENT', 'HANDOVER_TASKS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftChecklistStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "ShiftIssueStatus" AS ENUM ('ONGOING', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "IssuePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ==========================================================
-- 2. TABLES - Buat tabel baru jika belum ada
-- ==========================================================

-- PC Asset Management Tables
CREATE TABLE IF NOT EXISTS "operating_systems" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "type" "OSType" NOT NULL,
    "architecture" TEXT,
    "edition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

CREATE TABLE IF NOT EXISTS "office_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "type" "OfficeType" NOT NULL,
    "edition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

CREATE TABLE IF NOT EXISTS "pc_assets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pcName" TEXT NOT NULL UNIQUE,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "processor" TEXT NOT NULL,
    "ram" INTEGER NOT NULL,
    "formFactor" "PCFormFactor",
    "storageType" "PCStorageType",
    "storageCapacity" TEXT,
    "storageDevices" JSONB,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "branchId" TEXT NOT NULL,
    "department" TEXT,
    "assignedToId" TEXT,
    "assignedUserName" TEXT,
    "status" "PCAssetStatus" NOT NULL DEFAULT 'IN_USE',
    "purchaseDate" TIMESTAMP(3),
    "purchaseOrderNumber" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "assetTag" TEXT UNIQUE,
    "operatingSystemId" TEXT,
    "osLicenseType" "OSLicenseType",
    "osProductKey" TEXT,
    "osInstallationDate" TIMESTAMP(3),
    "osSerialNumber" TEXT,
    "officeProductId" TEXT,
    "officeLicenseType" "OfficeLicenseType",
    "officeLicenseAccount" TEXT,
    "officeLicenseStatus" "OfficeLicenseStatus",
    "officeSerialNumber" TEXT,
    "antivirusName" TEXT,
    "antivirusVersion" TEXT,
    "antivirusLicenseExpiry" TIMESTAMP(3),
    "avRealTimeProtection" BOOLEAN DEFAULT true,
    "avDefinitionDate" TIMESTAMP(3),
    "lastHardeningDate" TIMESTAMP(3),
    "hardeningCompliant" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "lastAuditDate" TIMESTAMP(3),
    "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "pc_service_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pcAssetId" TEXT NOT NULL,
    "ticketId" TEXT,
    "serviceType" "PCServiceType" NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueReported" TEXT,
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "recommendations" TEXT,
    "beforeStatus" JSONB,
    "afterStatus" JSONB,
    "attachments" JSONB,
    "cost" DECIMAL(15, 2),
    "status" "ServiceLogStatus" NOT NULL DEFAULT 'OPEN',
    "technicianName" TEXT
);

CREATE TABLE IF NOT EXISTS "hardening_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "osType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "hardening_checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "category" "HardeningCategory" NOT NULL,
    "itemCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "verificationSteps" TEXT,
    "remediationSteps" TEXT
);

CREATE TABLE IF NOT EXISTS "hardening_checklists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pcAssetId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceLogId" TEXT UNIQUE,
    "performedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "complianceScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "hardening_checklist_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checklistId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "isCompliant" BOOLEAN NOT NULL,
    "notes" TEXT,
    "evidence" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- License Management Tables
CREATE TABLE IF NOT EXISTS "os_licenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "osName" TEXT NOT NULL,
    "osVersion" TEXT,
    "licenseType" "OSLicenseType" NOT NULL,
    "licenseKey" TEXT UNIQUE,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "vendor" TEXT,
    "invoiceNumber" TEXT,
    "maxActivations" INTEGER NOT NULL DEFAULT 1,
    "currentActivations" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "assignedToPC" TEXT,
    "assignedToBranch" TEXT,
    "assignedToUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

CREATE TABLE IF NOT EXISTS "office_licenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" "OfficeProductType" NOT NULL,
    "licenseType" "OfficeLicenseType" NOT NULL,
    "licenseKey" TEXT UNIQUE,
    "subscriptionId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "costPeriod" TEXT,
    "vendor" TEXT,
    "invoiceNumber" TEXT,
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "currentUsers" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assignedToPC" TEXT,
    "assignedToBranch" TEXT,
    "assignedToUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT
);

CREATE TABLE IF NOT EXISTS "antivirus_licenses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productVersion" TEXT,
    "licenseType" TEXT NOT NULL,
    "licenseKey" TEXT UNIQUE,
    "subscriptionId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "costPeriod" TEXT,
    "vendor" TEXT,
    "invoiceNumber" TEXT,
    "maxDevices" INTEGER NOT NULL DEFAULT 1,
    "currentDevices" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "assignedToPC" TEXT,
    "assignedToBranch" TEXT,
    "assignedToUser" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Daily Task Tables
CREATE TABLE IF NOT EXISTS "daily_task_lists" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "technicianId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("technicianId", "date")
);

CREATE TABLE IF NOT EXISTS "daily_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskListId" TEXT NOT NULL,
    "ticketId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "DailyTaskCategory" NOT NULL DEFAULT 'OTHER',
    "status" "DailyTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TicketPriority",
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Enhancement Tables
CREATE TABLE IF NOT EXISTS "knowledge_collaborators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    UNIQUE("articleId", "userId")
);

CREATE TABLE IF NOT EXISTS "knowledge_service_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "linkedBy" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("articleId", "serviceId"),
    UNIQUE("articleId", "categoryId")
);

CREATE TABLE IF NOT EXISTS "knowledge_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "knowledge_comment_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Announcement Tables
CREATE TABLE IF NOT EXISTS "announcements" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" "AnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "priority" "AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "announcement_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "announcement_views" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("announcementId", "userId")
);

CREATE TABLE IF NOT EXISTS "announcement_branches" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("announcementId", "branchId")
);

-- Omnichannel Tables
CREATE TABLE IF NOT EXISTS "omnichannel_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apiKeyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "requestData" JSONB NOT NULL,
    "responseData" JSONB,
    "ticketId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "webhook_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'POST',
    "headers" JSONB,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "error" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Shift Management Tables
CREATE TABLE IF NOT EXISTS "staff_shift_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "branchId" TEXT NOT NULL,
    "canWorkType1" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType2" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType3" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType4" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType5" BOOLEAN NOT NULL DEFAULT false,
    "hasServerAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasSabbathRestriction" BOOLEAN NOT NULL DEFAULT false,
    "preferredShiftType" "StaffShiftType",
    "maxNightShiftsPerMonth" INTEGER NOT NULL DEFAULT 5,
    "minDaysBetweenNightShifts" INTEGER NOT NULL DEFAULT 3,
    "lastMonthEndShift" "ShiftType",
    "carryOverOffDays" INTEGER NOT NULL DEFAULT 0,
    "lastMonthNightCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "generationRules" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS "shift_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftType" "ShiftType" NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "status" "ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "notes" TEXT,
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("scheduleId", "staffProfileId", "date")
);

CREATE TABLE IF NOT EXISTS "on_call_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "wasActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffProfileId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "scheduleId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "contactNumber" TEXT,
    "emergencyContact" TEXT,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "holidays" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scheduleId" TEXT,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "holidayType" "HolidayType" NOT NULL DEFAULT 'PUBLIC',
    "affectsNightShift" BOOLEAN NOT NULL DEFAULT true,
    "affectsWeekendShift" BOOLEAN NOT NULL DEFAULT true,
    "requiresMinimalStaff" BOOLEAN NOT NULL DEFAULT false,
    "minimalStaffCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_swap_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "initiatorProfileId" TEXT NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "proposedDate" DATE,
    "reason" TEXT NOT NULL,
    "swapType" "ShiftSwapType" NOT NULL DEFAULT 'ONE_TO_ONE',
    "status" "SwapRequestStatus" NOT NULL DEFAULT 'PENDING_RECIPIENT',
    "recipientResponse" TEXT,
    "recipientRespondedAt" TIMESTAMP(3),
    "approvalRequired" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3)
);

CREATE TABLE IF NOT EXISTS "shift_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branchId" TEXT,
    "templateRules" JSONB NOT NULL,
    "weekdayNightCount" INTEGER NOT NULL DEFAULT 1,
    "weekendDayCount" INTEGER NOT NULL DEFAULT 2,
    "weekendNightCount" INTEGER NOT NULL DEFAULT 3,
    "targetNightsPerMonth" INTEGER NOT NULL DEFAULT 5,
    "minGapBetweenNights" INTEGER NOT NULL DEFAULT 3,
    "requireOffAfterNight" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL
);

-- Shift Report Tables
CREATE TABLE IF NOT EXISTS "server_metrics" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "sourceIp" TEXT
);

CREATE TABLE IF NOT EXISTS "shift_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftAssignmentId" TEXT NOT NULL UNIQUE,
    "status" "ShiftReportStatus" NOT NULL DEFAULT 'DRAFT',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "serverMetricsId" TEXT,
    "summary" TEXT,
    "handoverNotes" TEXT,
    "issuesEncountered" TEXT,
    "pendingActions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_checklist_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_checklist_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftType" "ShiftType",
    "category" "ShiftChecklistCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_backup_checklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftReportId" TEXT NOT NULL,
    "databaseName" TEXT NOT NULL,
    "description" TEXT,
    "isChecked" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3),
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_backup_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "databaseName" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shift_issues" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shiftReportId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ShiftIssueStatus" NOT NULL DEFAULT 'ONGOING',
    "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "ticketId" TEXT,
    "ticketNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- 3. ALTER EXISTING TABLES - Tambahkan kolom baru ke tabel existing
-- ==========================================================

-- Add omnichannel fields to tickets table
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "sourceChannel" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "channelReferenceId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "customerEmail" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "customerIdentifier" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- ==========================================================
-- 4. INDEXES - Buat index untuk performa
-- ==========================================================

-- Operating Systems indexes
CREATE INDEX IF NOT EXISTS "operating_systems_type_isActive_idx" ON "operating_systems"("type", "isActive");
CREATE INDEX IF NOT EXISTS "operating_systems_sortOrder_idx" ON "operating_systems"("sortOrder");

-- Office Products indexes
CREATE INDEX IF NOT EXISTS "office_products_type_isActive_idx" ON "office_products"("type", "isActive");
CREATE INDEX IF NOT EXISTS "office_products_sortOrder_idx" ON "office_products"("sortOrder");

-- PC Assets indexes
CREATE INDEX IF NOT EXISTS "pc_assets_branchId_idx" ON "pc_assets"("branchId");
CREATE INDEX IF NOT EXISTS "pc_assets_assignedToId_idx" ON "pc_assets"("assignedToId");
CREATE INDEX IF NOT EXISTS "pc_assets_isActive_idx" ON "pc_assets"("isActive");
CREATE INDEX IF NOT EXISTS "pc_assets_status_idx" ON "pc_assets"("status");
CREATE INDEX IF NOT EXISTS "pc_assets_formFactor_idx" ON "pc_assets"("formFactor");
CREATE INDEX IF NOT EXISTS "pc_assets_operatingSystemId_idx" ON "pc_assets"("operatingSystemId");
CREATE INDEX IF NOT EXISTS "pc_assets_officeProductId_idx" ON "pc_assets"("officeProductId");
CREATE INDEX IF NOT EXISTS "pc_assets_antivirusLicenseExpiry_idx" ON "pc_assets"("antivirusLicenseExpiry");
CREATE INDEX IF NOT EXISTS "pc_assets_warrantyExpiry_idx" ON "pc_assets"("warrantyExpiry");

-- PC Service Logs indexes
CREATE INDEX IF NOT EXISTS "pc_service_logs_pcAssetId_performedAt_idx" ON "pc_service_logs"("pcAssetId", "performedAt");
CREATE INDEX IF NOT EXISTS "pc_service_logs_ticketId_idx" ON "pc_service_logs"("ticketId");
CREATE INDEX IF NOT EXISTS "pc_service_logs_serviceType_idx" ON "pc_service_logs"("serviceType");
CREATE INDEX IF NOT EXISTS "pc_service_logs_status_idx" ON "pc_service_logs"("status");

-- Hardening indexes
CREATE INDEX IF NOT EXISTS "hardening_checklist_items_templateId_category_idx" ON "hardening_checklist_items"("templateId", "category");
CREATE INDEX IF NOT EXISTS "hardening_checklists_pcAssetId_startedAt_idx" ON "hardening_checklists"("pcAssetId", "startedAt");
CREATE INDEX IF NOT EXISTS "hardening_checklists_status_idx" ON "hardening_checklists"("status");

-- License indexes
CREATE INDEX IF NOT EXISTS "os_licenses_licenseType_isActive_idx" ON "os_licenses"("licenseType", "isActive");
CREATE INDEX IF NOT EXISTS "os_licenses_osName_idx" ON "os_licenses"("osName");
CREATE INDEX IF NOT EXISTS "os_licenses_assignedToPC_idx" ON "os_licenses"("assignedToPC");
CREATE INDEX IF NOT EXISTS "os_licenses_assignedToBranch_idx" ON "os_licenses"("assignedToBranch");

CREATE INDEX IF NOT EXISTS "office_licenses_productType_isActive_idx" ON "office_licenses"("productType", "isActive");
CREATE INDEX IF NOT EXISTS "office_licenses_licenseType_idx" ON "office_licenses"("licenseType");
CREATE INDEX IF NOT EXISTS "office_licenses_assignedToPC_idx" ON "office_licenses"("assignedToPC");
CREATE INDEX IF NOT EXISTS "office_licenses_assignedToBranch_idx" ON "office_licenses"("assignedToBranch");
CREATE INDEX IF NOT EXISTS "office_licenses_expiryDate_idx" ON "office_licenses"("expiryDate");

CREATE INDEX IF NOT EXISTS "antivirus_licenses_expiryDate_idx" ON "antivirus_licenses"("expiryDate");
CREATE INDEX IF NOT EXISTS "antivirus_licenses_assignedToPC_idx" ON "antivirus_licenses"("assignedToPC");
CREATE INDEX IF NOT EXISTS "antivirus_licenses_assignedToBranch_idx" ON "antivirus_licenses"("assignedToBranch");
CREATE INDEX IF NOT EXISTS "antivirus_licenses_isActive_idx" ON "antivirus_licenses"("isActive");

-- Daily Task indexes
CREATE INDEX IF NOT EXISTS "daily_task_lists_technicianId_date_idx" ON "daily_task_lists"("technicianId", "date");
CREATE INDEX IF NOT EXISTS "daily_tasks_taskListId_idx" ON "daily_tasks"("taskListId");

-- Knowledge Base indexes
CREATE INDEX IF NOT EXISTS "knowledge_collaborators_userId_idx" ON "knowledge_collaborators"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_service_links_serviceId_idx" ON "knowledge_service_links"("serviceId");
CREATE INDEX IF NOT EXISTS "knowledge_service_links_categoryId_idx" ON "knowledge_service_links"("categoryId");
CREATE INDEX IF NOT EXISTS "knowledge_activities_articleId_createdAt_idx" ON "knowledge_activities"("articleId", "createdAt");
CREATE INDEX IF NOT EXISTS "knowledge_activities_userId_idx" ON "knowledge_activities"("userId");
CREATE INDEX IF NOT EXISTS "knowledge_comment_attachments_commentId_idx" ON "knowledge_comment_attachments"("commentId");

-- Announcement indexes
CREATE INDEX IF NOT EXISTS "announcements_isActive_startDate_endDate_idx" ON "announcements"("isActive", "startDate", "endDate");
CREATE INDEX IF NOT EXISTS "announcements_createdBy_idx" ON "announcements"("createdBy");
CREATE INDEX IF NOT EXISTS "announcements_isGlobal_idx" ON "announcements"("isGlobal");
CREATE INDEX IF NOT EXISTS "announcement_images_announcementId_idx" ON "announcement_images"("announcementId");
CREATE INDEX IF NOT EXISTS "announcement_views_userId_idx" ON "announcement_views"("userId");
CREATE INDEX IF NOT EXISTS "announcement_branches_branchId_idx" ON "announcement_branches"("branchId");

-- Omnichannel indexes
CREATE INDEX IF NOT EXISTS "omnichannel_logs_apiKeyId_idx" ON "omnichannel_logs"("apiKeyId");
CREATE INDEX IF NOT EXISTS "omnichannel_logs_ticketId_idx" ON "omnichannel_logs"("ticketId");
CREATE INDEX IF NOT EXISTS "omnichannel_logs_status_idx" ON "omnichannel_logs"("status");
CREATE INDEX IF NOT EXISTS "omnichannel_logs_createdAt_idx" ON "omnichannel_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "webhook_queue_status_scheduledFor_idx" ON "webhook_queue"("status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "webhook_queue_createdAt_idx" ON "webhook_queue"("createdAt");

-- Shift Management indexes
CREATE INDEX IF NOT EXISTS "staff_shift_profiles_branchId_isActive_idx" ON "staff_shift_profiles"("branchId", "isActive");
CREATE INDEX IF NOT EXISTS "staff_shift_profiles_canWorkType1_hasServerAccess_idx" ON "staff_shift_profiles"("canWorkType1", "hasServerAccess");
CREATE INDEX IF NOT EXISTS "shift_schedules_branchId_month_year_idx" ON "shift_schedules"("branchId", "month", "year");
CREATE INDEX IF NOT EXISTS "shift_schedules_branchId_status_idx" ON "shift_schedules"("branchId", "status");
CREATE INDEX IF NOT EXISTS "shift_schedules_month_year_idx" ON "shift_schedules"("month", "year");
CREATE INDEX IF NOT EXISTS "shift_assignments_scheduleId_date_idx" ON "shift_assignments"("scheduleId", "date");
CREATE INDEX IF NOT EXISTS "shift_assignments_staffProfileId_date_shiftType_idx" ON "shift_assignments"("staffProfileId", "date", "shiftType");
CREATE INDEX IF NOT EXISTS "shift_assignments_date_shiftType_idx" ON "shift_assignments"("date", "shiftType");
CREATE INDEX IF NOT EXISTS "on_call_assignments_scheduleId_date_idx" ON "on_call_assignments"("scheduleId", "date");
CREATE INDEX IF NOT EXISTS "on_call_assignments_staffProfileId_date_idx" ON "on_call_assignments"("staffProfileId", "date");
CREATE INDEX IF NOT EXISTS "leave_requests_staffProfileId_status_idx" ON "leave_requests"("staffProfileId", "status");
CREATE INDEX IF NOT EXISTS "leave_requests_startDate_endDate_idx" ON "leave_requests"("startDate", "endDate");
CREATE INDEX IF NOT EXISTS "leave_requests_scheduleId_idx" ON "leave_requests"("scheduleId");
CREATE INDEX IF NOT EXISTS "holidays_date_idx" ON "holidays"("date");
CREATE INDEX IF NOT EXISTS "holidays_scheduleId_date_idx" ON "holidays"("scheduleId", "date");
CREATE INDEX IF NOT EXISTS "shift_swap_requests_initiatorProfileId_status_idx" ON "shift_swap_requests"("initiatorProfileId", "status");
CREATE INDEX IF NOT EXISTS "shift_swap_requests_recipientProfileId_status_idx" ON "shift_swap_requests"("recipientProfileId", "status");
CREATE INDEX IF NOT EXISTS "shift_swap_requests_shiftAssignmentId_idx" ON "shift_swap_requests"("shiftAssignmentId");
CREATE INDEX IF NOT EXISTS "shift_templates_branchId_isActive_idx" ON "shift_templates"("branchId", "isActive");

-- Shift Report indexes
CREATE INDEX IF NOT EXISTS "server_metrics_collectedAt_idx" ON "server_metrics"("collectedAt");
CREATE INDEX IF NOT EXISTS "server_metrics_serverId_collectedAt_idx" ON "server_metrics"("serverId", "collectedAt");
CREATE INDEX IF NOT EXISTS "shift_reports_shiftAssignmentId_idx" ON "shift_reports"("shiftAssignmentId");
CREATE INDEX IF NOT EXISTS "shift_reports_status_idx" ON "shift_reports"("status");
CREATE INDEX IF NOT EXISTS "shift_checklist_items_shiftReportId_category_idx" ON "shift_checklist_items"("shiftReportId", "category");
CREATE INDEX IF NOT EXISTS "shift_checklist_items_shiftReportId_order_idx" ON "shift_checklist_items"("shiftReportId", "order");
CREATE INDEX IF NOT EXISTS "shift_checklist_templates_shiftType_category_isActive_idx" ON "shift_checklist_templates"("shiftType", "category", "isActive");
CREATE INDEX IF NOT EXISTS "shift_backup_checklist_shiftReportId_idx" ON "shift_backup_checklist"("shiftReportId");
CREATE INDEX IF NOT EXISTS "shift_backup_templates_isActive_order_idx" ON "shift_backup_templates"("isActive", "order");
CREATE INDEX IF NOT EXISTS "shift_issues_shiftReportId_status_idx" ON "shift_issues"("shiftReportId", "status");
CREATE INDEX IF NOT EXISTS "shift_issues_ticketId_idx" ON "shift_issues"("ticketId");

-- ==========================================================
-- 5. FOREIGN KEYS - Tambahkan relasi antar tabel
-- ==========================================================

-- PC Assets foreign keys
ALTER TABLE "pc_assets" DROP CONSTRAINT IF EXISTS "pc_assets_branchId_fkey";
ALTER TABLE "pc_assets" ADD CONSTRAINT "pc_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pc_assets" DROP CONSTRAINT IF EXISTS "pc_assets_assignedToId_fkey";
ALTER TABLE "pc_assets" ADD CONSTRAINT "pc_assets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pc_assets" DROP CONSTRAINT IF EXISTS "pc_assets_createdById_fkey";
ALTER TABLE "pc_assets" ADD CONSTRAINT "pc_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pc_assets" DROP CONSTRAINT IF EXISTS "pc_assets_operatingSystemId_fkey";
ALTER TABLE "pc_assets" ADD CONSTRAINT "pc_assets_operatingSystemId_fkey" FOREIGN KEY ("operatingSystemId") REFERENCES "operating_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pc_assets" DROP CONSTRAINT IF EXISTS "pc_assets_officeProductId_fkey";
ALTER TABLE "pc_assets" ADD CONSTRAINT "pc_assets_officeProductId_fkey" FOREIGN KEY ("officeProductId") REFERENCES "office_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- PC Service Logs foreign keys
ALTER TABLE "pc_service_logs" DROP CONSTRAINT IF EXISTS "pc_service_logs_pcAssetId_fkey";
ALTER TABLE "pc_service_logs" ADD CONSTRAINT "pc_service_logs_pcAssetId_fkey" FOREIGN KEY ("pcAssetId") REFERENCES "pc_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pc_service_logs" DROP CONSTRAINT IF EXISTS "pc_service_logs_ticketId_fkey";
ALTER TABLE "pc_service_logs" ADD CONSTRAINT "pc_service_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pc_service_logs" DROP CONSTRAINT IF EXISTS "pc_service_logs_performedById_fkey";
ALTER TABLE "pc_service_logs" ADD CONSTRAINT "pc_service_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift Management foreign keys
ALTER TABLE "staff_shift_profiles" DROP CONSTRAINT IF EXISTS "staff_shift_profiles_userId_fkey";
ALTER TABLE "staff_shift_profiles" ADD CONSTRAINT "staff_shift_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "staff_shift_profiles" DROP CONSTRAINT IF EXISTS "staff_shift_profiles_branchId_fkey";
ALTER TABLE "staff_shift_profiles" ADD CONSTRAINT "staff_shift_profiles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_schedules" DROP CONSTRAINT IF EXISTS "shift_schedules_branchId_fkey";
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shift_assignments" DROP CONSTRAINT IF EXISTS "shift_assignments_scheduleId_fkey";
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "shift_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_assignments" DROP CONSTRAINT IF EXISTS "shift_assignments_staffProfileId_fkey";
ALTER TABLE "shift_assignments" ADD CONSTRAINT "shift_assignments_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Shift Reports foreign keys
ALTER TABLE "shift_reports" DROP CONSTRAINT IF EXISTS "shift_reports_shiftAssignmentId_fkey";
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "shift_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_reports" DROP CONSTRAINT IF EXISTS "shift_reports_serverMetricsId_fkey";
ALTER TABLE "shift_reports" ADD CONSTRAINT "shift_reports_serverMetricsId_fkey" FOREIGN KEY ("serverMetricsId") REFERENCES "server_metrics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "shift_checklist_items" DROP CONSTRAINT IF EXISTS "shift_checklist_items_shiftReportId_fkey";
ALTER TABLE "shift_checklist_items" ADD CONSTRAINT "shift_checklist_items_shiftReportId_fkey" FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_backup_checklist" DROP CONSTRAINT IF EXISTS "shift_backup_checklist_shiftReportId_fkey";
ALTER TABLE "shift_backup_checklist" ADD CONSTRAINT "shift_backup_checklist_shiftReportId_fkey" FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_issues" DROP CONSTRAINT IF EXISTS "shift_issues_shiftReportId_fkey";
ALTER TABLE "shift_issues" ADD CONSTRAINT "shift_issues_shiftReportId_fkey" FOREIGN KEY ("shiftReportId") REFERENCES "shift_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shift_issues" DROP CONSTRAINT IF EXISTS "shift_issues_ticketId_fkey";
ALTER TABLE "shift_issues" ADD CONSTRAINT "shift_issues_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Commit transaksi
COMMIT;

-- ==========================================================
-- 6. VERIFY MIGRATION
-- ==========================================================

-- Script untuk verifikasi migrasi berhasil
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';

    RAISE NOTICE 'Migration completed. Total tables: %', table_count;
    RAISE NOTICE 'Please run "npx prisma generate" and "npx prisma db push" to sync Prisma client.';
END $$;
