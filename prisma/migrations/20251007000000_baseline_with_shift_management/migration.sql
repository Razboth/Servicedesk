-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."NetworkMedia" AS ENUM ('VSAT', 'M2M', 'FO');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'TECHNICIAN', 'MANAGER', 'MANAGER_IT', 'ADMIN', 'SECURITY_ANALYST');

-- CreateEnum
CREATE TYPE "public"."TicketCategory" AS ENUM ('INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('OPEN', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'PENDING_VENDOR', 'RESOLVED', 'CLOSED', 'CANCELLED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "public"."IssueClassification" AS ENUM ('HUMAN_ERROR', 'SYSTEM_ERROR', 'HARDWARE_FAILURE', 'NETWORK_ISSUE', 'SECURITY_INCIDENT', 'DATA_ISSUE', 'PROCESS_GAP', 'EXTERNAL_FACTOR');

-- CreateEnum
CREATE TYPE "public"."FieldType" AS ENUM ('TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER', 'DATE', 'DATETIME', 'SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'FILE', 'URL');

-- CreateEnum
CREATE TYPE "public"."ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."ATMStatus" AS ENUM ('ONLINE', 'OFFLINE', 'WARNING', 'ERROR', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "public"."IncidentType" AS ENUM ('NETWORK_DOWN', 'HARDWARE_FAILURE', 'SOFTWARE_ERROR', 'MAINTENANCE', 'SECURITY_BREACH');

-- CreateEnum
CREATE TYPE "public"."IncidentSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."VendorStatus" AS ENUM ('PENDING', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."NetworkStatus" AS ENUM ('ONLINE', 'OFFLINE', 'SLOW', 'TIMEOUT', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."NetworkIncidentType" AS ENUM ('COMMUNICATION_OFFLINE', 'SLOW_CONNECTION', 'PACKET_LOSS', 'HIGH_LATENCY', 'DNS_ISSUE', 'NETWORK_CONGESTION');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('TICKET_CREATED', 'TICKET_ASSIGNED', 'TICKET_UPDATED', 'TICKET_RESOLVED', 'TICKET_CLOSED', 'TICKET_COMMENT', 'TICKET_APPROVED', 'TICKET_REJECTED', 'TICKET_ESCALATED', 'SYSTEM_ALERT', 'MENTION');

-- CreateEnum
CREATE TYPE "public"."KnowledgeStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('TABULAR', 'MATRIX', 'METRICS', 'QUERY');

-- CreateEnum
CREATE TYPE "public"."ScheduleFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "public"."ExportFormat" AS ENUM ('PDF', 'EXCEL', 'CSV', 'HTML');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."VerificationRecommendation" AS ENUM ('APPROVE', 'REJECT', 'ESCALATE', 'NEED_MORE_INFO');

-- CreateEnum
CREATE TYPE "public"."BranchTaskType" AS ENUM ('VERIFY_CLAIM', 'REVIEW_DOCUMENTS', 'PROCESS_REFUND', 'CONTACT_CUSTOMER', 'CHECK_CCTV', 'RECONCILE_CASH');

-- CreateEnum
CREATE TYPE "public"."AssignmentStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "public"."CommunicationType" AS ENUM ('INFO', 'URGENT', 'REQUEST', 'RESPONSE', 'ESCALATION');

-- CreateEnum
CREATE TYPE "public"."MigrationStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."OSLicenseType" AS ENUM ('OEM', 'FPP', 'OLP', 'VOLUME', 'OPEN_SOURCE', 'TRIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OfficeLicenseType" AS ENUM ('OEM', 'FPP', 'OLP', 'VOLUME', 'SUBSCRIPTION', 'OPEN_SOURCE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OfficeProductType" AS ENUM ('OFFICE_365', 'OFFICE_2021_LTSC', 'OFFICE_2019', 'OFFICE_2016', 'LIBRE_OFFICE', 'OPEN_OFFICE', 'WPS_OFFICE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."PCServiceType" AS ENUM ('HARDENING', 'MAINTENANCE', 'REPAIR', 'UPGRADE', 'INSTALLATION', 'AUDIT', 'DECOMMISSION');

-- CreateEnum
CREATE TYPE "public"."HardeningCategory" AS ENUM ('USER_ACCOUNTS', 'NETWORK_SECURITY', 'SYSTEM_UPDATES', 'FIREWALL', 'ANTIVIRUS', 'ACCESS_CONTROL', 'DATA_ENCRYPTION', 'AUDIT_LOGGING', 'APPLICATION_CONTROL', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OSType" AS ENUM ('WINDOWS', 'LINUX', 'MACOS', 'UNIX', 'CHROME_OS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."OfficeType" AS ENUM ('MICROSOFT_365', 'OFFICE_LTSC', 'LIBRE_OFFICE', 'OPEN_OFFICE', 'WPS_OFFICE', 'GOOGLE_WORKSPACE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DailyTaskCategory" AS ENUM ('TICKET', 'MAINTENANCE', 'MEETING', 'TRAINING', 'DOCUMENTATION', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."DailyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'DEFERRED');

-- CreateEnum
CREATE TYPE "public"."CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR', 'OWNER');

-- CreateEnum
CREATE TYPE "public"."AnnouncementType" AS ENUM ('GENERAL', 'MAINTENANCE', 'UPDATE', 'ALERT', 'PROMOTION');

-- CreateEnum
CREATE TYPE "public"."AnnouncementPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "public"."StaffShiftType" AS ENUM ('NIGHT', 'DAY', 'STANDBY', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."ShiftType" AS ENUM ('NIGHT_WEEKDAY', 'DAY_WEEKEND', 'NIGHT_WEEKEND', 'STANDBY_ONCALL', 'STANDBY_BRANCH', 'OFF', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "public"."ScheduleStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."ShiftStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'SWAPPED');

-- CreateEnum
CREATE TYPE "public"."LeaveType" AS ENUM ('ANNUAL_LEAVE', 'SICK_LEAVE', 'EMERGENCY_LEAVE', 'UNPAID_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE', 'COMPASSIONATE_LEAVE', 'STUDY_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."HolidayType" AS ENUM ('PUBLIC', 'COMPANY', 'RELIGIOUS', 'SPECIAL');

-- CreateEnum
CREATE TYPE "public"."ShiftSwapType" AS ENUM ('ONE_TO_ONE', 'GIVE_AWAY', 'TRADE');

-- CreateEnum
CREATE TYPE "public"."SwapRequestStatus" AS ENUM ('PENDING_RECIPIENT', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT,
    "role" "public"."UserRole" NOT NULL DEFAULT 'USER',
    "branchId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "supportGroupId" TEXT,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAttempt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "username" TEXT NOT NULL,
    "isFirstLogin" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "passwordChangedAt" TIMESTAMP(3),
    "emailNotifyOnTicketCreated" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnTicketAssigned" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnTicketUpdated" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnTicketResolved" BOOLEAN NOT NULL DEFAULT true,
    "emailNotifyOnComment" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."branches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "backupIpAddress" TEXT,
    "ipAddress" TEXT,
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
    "networkMedia" "public"."NetworkMedia",
    "networkVendor" TEXT,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."services" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "helpText" TEXT,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "itemId" TEXT,
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "estimatedHours" INTEGER DEFAULT 4,
    "slaHours" INTEGER NOT NULL DEFAULT 24,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "escalationHours" INTEGER DEFAULT 48,
    "isKasdaService" BOOLEAN NOT NULL DEFAULT false,
    "resolutionHours" INTEGER DEFAULT 24,
    "responseHours" INTEGER DEFAULT 4,
    "tier1CategoryId" TEXT,
    "tier2SubcategoryId" TEXT,
    "tier3ItemId" TEXT,
    "defaultIssueClassification" "public"."IssueClassification",
    "defaultItilCategory" "public"."TicketCategory" DEFAULT 'INCIDENT',
    "defaultTitle" TEXT,
    "supportGroupId" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_fields" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "public"."FieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isUserVisible" BOOLEAN NOT NULL DEFAULT true,
    "placeholder" TEXT,
    "helpText" TEXT,
    "defaultValue" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."field_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."FieldType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "placeholder" TEXT,
    "helpText" TEXT,
    "defaultValue" TEXT,
    "options" JSONB,
    "validation" JSONB,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "field_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_field_templates" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "fieldTemplateId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN,
    "isUserVisible" BOOLEAN NOT NULL DEFAULT true,
    "helpText" TEXT,
    "defaultValue" TEXT,

    CONSTRAINT "service_field_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "itemId" TEXT,
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "branchId" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "issueClassification" "public"."IssueClassification",
    "rootCause" TEXT,
    "preventiveMeasures" TEXT,
    "knowledgeBaseCreated" BOOLEAN NOT NULL DEFAULT false,
    "estimatedHours" INTEGER,
    "actualHours" DOUBLE PRECISION,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "category" "public"."TicketCategory" NOT NULL DEFAULT 'INCIDENT',
    "securityClassification" TEXT,
    "securityFindings" JSONB,
    "supportGroupId" TEXT,
    "importBatchId" TEXT,
    "importedAt" TIMESTAMP(3),
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "legacyData" JSONB,
    "legacySystem" TEXT,
    "legacyTicketId" TEXT,
    "sourceChannel" TEXT,
    "channelReferenceId" TEXT,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerIdentifier" TEXT,
    "metadata" JSONB,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_field_values" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ticket_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_comments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."comment_attachments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subcategories" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."items" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_approvals" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "public"."ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sla_templates" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "responseHours" INTEGER NOT NULL DEFAULT 4,
    "resolutionHours" INTEGER NOT NULL DEFAULT 24,
    "escalationHours" INTEGER NOT NULL DEFAULT 48,
    "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sla_tracking" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "slaTemplateId" TEXT NOT NULL,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "resolutionDeadline" TIMESTAMP(3) NOT NULL,
    "escalationDeadline" TIMESTAMP(3) NOT NULL,
    "responseTime" TIMESTAMP(3),
    "resolutionTime" TIMESTAMP(3),
    "isResponseBreached" BOOLEAN NOT NULL DEFAULT false,
    "isResolutionBreached" BOOLEAN NOT NULL DEFAULT false,
    "isEscalated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sla_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."atms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "networkMedia" "public"."NetworkMedia",
    "networkVendor" TEXT,

    CONSTRAINT "atms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."atm_monitoring_logs" (
    "id" TEXT NOT NULL,
    "atmId" TEXT NOT NULL,
    "status" "public"."ATMStatus" NOT NULL,
    "responseTime" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "atm_monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."atm_incidents" (
    "id" TEXT NOT NULL,
    "atmId" TEXT NOT NULL,
    "ticketId" TEXT,
    "type" "public"."IncidentType" NOT NULL,
    "severity" "public"."IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalReferenceId" TEXT,
    "metrics" JSONB,

    CONSTRAINT "atm_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "supportHours" TEXT,
    "slaResponseTime" INTEGER,
    "slaResolutionTime" INTEGER,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_tickets" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorTicketNumber" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "status" "public"."VendorStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "ticketId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."login_attempts" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "success" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockTriggered" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."password_reset_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "categoryId" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "itemId" TEXT,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "slug" TEXT NOT NULL,
    "status" "public"."KnowledgeStatus" NOT NULL DEFAULT 'DRAFT',
    "subcategoryId" TEXT,
    "summary" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_templates" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."task_template_items" (
    "id" TEXT NOT NULL,
    "taskTemplateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "estimatedMinutes" INTEGER DEFAULT 30,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "knowledgeBaseUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_tasks" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "taskTemplateItemId" TEXT NOT NULL,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_monitoring_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" "public"."NetworkStatus" NOT NULL,
    "responseTimeMs" INTEGER,
    "packetLoss" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousStatus" "public"."NetworkStatus",
    "statusChangedAt" TIMESTAMP(3),
    "downSince" TIMESTAMP(3),
    "uptimeSeconds" INTEGER,
    "downtimeSeconds" INTEGER,

    CONSTRAINT "network_monitoring_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_status_history" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" "public"."NetworkStatus" NOT NULL,
    "previousStatus" "public"."NetworkStatus",
    "responseTimeMs" INTEGER,
    "packetLoss" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "network_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_incidents" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "atmId" TEXT,
    "type" "public"."NetworkIncidentType" NOT NULL,
    "severity" "public"."IncidentSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "ticketId" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "externalReferenceId" TEXT,
    "metrics" JSONB,

    CONSTRAINT "network_incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "linkedUserId" TEXT,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_ping_results" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "branchId" TEXT,
    "atmId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "ipType" TEXT NOT NULL DEFAULT 'PRIMARY',
    "networkMedia" "public"."NetworkMedia",
    "networkVendor" TEXT,
    "status" "public"."NetworkStatus" NOT NULL,
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

-- CreateTable
CREATE TABLE "public"."service_usage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "branchId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_favorite_services" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_favorite_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_favorite_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_versions" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "changeNotes" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_attachments" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_comments" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_knowledge" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "linkedBy" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_feedback" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."custom_reports" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."ReportType" NOT NULL,
    "module" TEXT NOT NULL,
    "configuration" JSONB NOT NULL,
    "query" TEXT,
    "columns" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "groupBy" TEXT[],
    "orderBy" JSONB NOT NULL,
    "chartConfig" JSONB,
    "createdBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "tags" TEXT[],
    "lastRunAt" TIMESTAMP(3),
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_schedules" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "frequency" "public"."ScheduleFrequency" NOT NULL,
    "scheduleTime" TEXT NOT NULL,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "format" "public"."ExportFormat" NOT NULL,
    "recipients" TEXT[],
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_executions" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "executedBy" TEXT,
    "status" "public"."ExecutionStatus" NOT NULL,
    "resultCount" INTEGER,
    "executionTime" INTEGER,
    "error" TEXT,
    "resultPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_favorites" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."report_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "serviceId" TEXT,
    "baseQuery" TEXT NOT NULL,
    "availableFields" JSONB NOT NULL,
    "defaultFilters" JSONB,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."atm_claim_verifications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "journalChecked" BOOLEAN NOT NULL DEFAULT false,
    "journalFindings" TEXT,
    "journalAttachments" JSONB,
    "ejTransactionFound" BOOLEAN,
    "ejReferenceNumber" TEXT,
    "amountMatches" BOOLEAN,
    "cashOpening" DECIMAL(15,2),
    "cashDispensed" DECIMAL(15,2),
    "cashRemaining" DECIMAL(15,2),
    "cashVariance" DECIMAL(15,2),
    "cctvReviewed" BOOLEAN NOT NULL DEFAULT false,
    "cctvFindings" TEXT,
    "cctvEvidenceUrl" TEXT,
    "cctvRequestedAt" TIMESTAMP(3),
    "debitSuccessful" BOOLEAN,
    "reversalCompleted" BOOLEAN,
    "coreSystemCheckedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "recommendation" "public"."VerificationRecommendation",
    "recommendationNotes" TEXT,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "atm_claim_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branch_assignments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "taskType" "public"."BranchTaskType" NOT NULL,
    "dueTime" TIMESTAMP(3) NOT NULL,
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "instructions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."branch_communications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "messageType" "public"."CommunicationType" NOT NULL DEFAULT 'INFO',
    "attachments" JSONB,
    "readBy" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branch_communications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."legacy_tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."TicketCategory" NOT NULL DEFAULT 'INCIDENT',
    "serviceId" TEXT NOT NULL,
    "priority" "public"."TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "branchId" TEXT,
    "supportGroupId" TEXT,
    "isConfidential" BOOLEAN NOT NULL DEFAULT false,
    "issueClassification" "public"."IssueClassification",
    "resolutionNotes" TEXT,
    "originalTicketId" TEXT NOT NULL,
    "originalSystem" TEXT NOT NULL,
    "originalData" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importBatchId" TEXT NOT NULL,
    "mappedToTicketId" TEXT,
    "isConverted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "convertedById" TEXT,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalUpdatedAt" TIMESTAMP(3),
    "originalResolvedAt" TIMESTAMP(3),
    "originalClosedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."legacy_ticket_comments" (
    "id" TEXT NOT NULL,
    "legacyTicketId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "originalAuthor" TEXT,
    "originalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legacy_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."legacy_ticket_attachments" (
    "id" TEXT NOT NULL,
    "legacyTicketId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "originalUrl" TEXT,
    "downloadUrl" TEXT,
    "isDownloaded" BOOLEAN NOT NULL DEFAULT false,
    "originalData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "legacy_ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."migration_batches" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" "public"."MigrationStatus" NOT NULL DEFAULT 'PENDING',
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "errorLog" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pc_assets" (
    "id" TEXT NOT NULL,
    "pcName" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT,
    "processor" TEXT NOT NULL,
    "ram" TEXT NOT NULL,
    "storageDevices" JSONB NOT NULL,
    "macAddress" TEXT,
    "ipAddress" TEXT,
    "branchId" TEXT NOT NULL,
    "assignedToId" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "purchaseOrderNumber" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "assetTag" TEXT,
    "operatingSystemId" TEXT,
    "osLicenseType" "public"."OSLicenseType",
    "osSerialNumber" TEXT,
    "officeProductId" TEXT,
    "officeLicenseType" "public"."OfficeLicenseType",
    "officeSerialNumber" TEXT,
    "antivirusName" TEXT,
    "antivirusVersion" TEXT,
    "antivirusLicenseExpiry" TIMESTAMP(3),
    "lastHardeningDate" TIMESTAMP(3),
    "hardeningCompliant" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "lastAuditDate" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "pc_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pc_service_logs" (
    "id" TEXT NOT NULL,
    "pcAssetId" TEXT NOT NULL,
    "ticketId" TEXT,
    "serviceType" "public"."PCServiceType" NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "findings" TEXT,
    "recommendations" TEXT,
    "beforeStatus" JSONB,
    "afterStatus" JSONB,
    "attachments" JSONB,

    CONSTRAINT "pc_service_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hardening_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "osType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hardening_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hardening_checklist_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" "public"."HardeningCategory" NOT NULL,
    "itemCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "verificationSteps" TEXT,
    "remediationSteps" TEXT,

    CONSTRAINT "hardening_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hardening_checklists" (
    "id" TEXT NOT NULL,
    "pcAssetId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "serviceLogId" TEXT,
    "performedById" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "complianceScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "notes" TEXT,

    CONSTRAINT "hardening_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."hardening_checklist_results" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "isCompliant" BOOLEAN NOT NULL,
    "notes" TEXT,
    "evidence" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hardening_checklist_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."os_licenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "osName" TEXT NOT NULL,
    "osVersion" TEXT,
    "licenseType" "public"."OSLicenseType" NOT NULL,
    "licenseKey" TEXT,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "os_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."office_licenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productType" "public"."OfficeProductType" NOT NULL,
    "licenseType" "public"."OfficeLicenseType" NOT NULL,
    "licenseKey" TEXT,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "office_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."antivirus_licenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productVersion" TEXT,
    "licenseType" TEXT NOT NULL,
    "licenseKey" TEXT,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "antivirus_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."operating_systems" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "type" "public"."OSType" NOT NULL,
    "architecture" TEXT,
    "edition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "operating_systems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."office_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT,
    "type" "public"."OfficeType" NOT NULL,
    "edition" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "office_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_task_lists" (
    "id" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_task_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."daily_tasks" (
    "id" TEXT NOT NULL,
    "taskListId" TEXT NOT NULL,
    "ticketId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."DailyTaskCategory" NOT NULL DEFAULT 'OTHER',
    "status" "public"."DailyTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "public"."TicketPriority",
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "actualMinutes" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_collaborators" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "public"."CollaboratorRole" NOT NULL DEFAULT 'EDITOR',
    "invitedBy" TEXT NOT NULL,
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),

    CONSTRAINT "knowledge_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_service_links" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "serviceId" TEXT,
    "categoryId" TEXT,
    "linkedBy" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_service_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_activities" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_comment_attachments" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_comment_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "type" "public"."AnnouncementType" NOT NULL DEFAULT 'GENERAL',
    "priority" "public"."AnnouncementPriority" NOT NULL DEFAULT 'NORMAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcement_images" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcement_views" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."announcement_branches" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."omnichannel_logs" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "omnichannel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_queue" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."staff_shift_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "canWorkType1" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType2" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType3" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType4" BOOLEAN NOT NULL DEFAULT false,
    "canWorkType5" BOOLEAN NOT NULL DEFAULT false,
    "hasServerAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasSabbathRestriction" BOOLEAN NOT NULL DEFAULT false,
    "preferredShiftType" "public"."StaffShiftType",
    "maxNightShiftsPerMonth" INTEGER NOT NULL DEFAULT 5,
    "minDaysBetweenNightShifts" INTEGER NOT NULL DEFAULT 3,
    "lastMonthEndShift" "public"."ShiftType",
    "carryOverOffDays" INTEGER NOT NULL DEFAULT 0,
    "lastMonthNightCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_shift_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_schedules" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "public"."ScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedBy" TEXT,
    "generationRules" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_assignments" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "shiftType" "public"."ShiftType" NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT true,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."ShiftStatus" NOT NULL DEFAULT 'SCHEDULED',
    "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
    "checkInTime" TIMESTAMP(3),
    "checkOutTime" TIMESTAMP(3),
    "notes" TEXT,
    "managerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."on_call_assignments" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "wasActivated" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "activationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "on_call_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leave_requests" (
    "id" TEXT NOT NULL,
    "staffProfileId" TEXT NOT NULL,
    "leaveType" "public"."LeaveType" NOT NULL,
    "scheduleId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT,
    "contactNumber" TEXT,
    "emergencyContact" TEXT,
    "status" "public"."LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."holidays" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "name" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "holidayType" "public"."HolidayType" NOT NULL DEFAULT 'PUBLIC',
    "affectsNightShift" BOOLEAN NOT NULL DEFAULT true,
    "affectsWeekendShift" BOOLEAN NOT NULL DEFAULT true,
    "requiresMinimalStaff" BOOLEAN NOT NULL DEFAULT false,
    "minimalStaffCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holidays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_swap_requests" (
    "id" TEXT NOT NULL,
    "initiatorProfileId" TEXT NOT NULL,
    "recipientProfileId" TEXT NOT NULL,
    "shiftAssignmentId" TEXT NOT NULL,
    "proposedDate" DATE,
    "reason" TEXT NOT NULL,
    "swapType" "public"."ShiftSwapType" NOT NULL DEFAULT 'ONE_TO_ONE',
    "status" "public"."SwapRequestStatus" NOT NULL DEFAULT 'PENDING_RECIPIENT',
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "shift_swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shift_templates" (
    "id" TEXT NOT NULL,
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "shift_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "public"."accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "public"."verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "public"."verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "branches_code_key" ON "public"."branches"("code");

-- CreateIndex
CREATE UNIQUE INDEX "service_fields_serviceId_name_key" ON "public"."service_fields"("serviceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "field_templates_name_key" ON "public"."field_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_field_templates_serviceId_fieldTemplateId_key" ON "public"."service_field_templates"("serviceId", "fieldTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "public"."tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_field_values_ticketId_fieldId_key" ON "public"."ticket_field_values"("ticketId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "sla_templates_serviceId_key" ON "public"."sla_templates"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "atms_code_key" ON "public"."atms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "public"."vendors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "public"."password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "public"."password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "public"."password_reset_tokens"("email");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "public"."password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_name_key" ON "public"."support_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_code_key" ON "public"."support_groups"("code");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_articles_slug_key" ON "public"."knowledge_articles"("slug");

-- CreateIndex
CREATE INDEX "knowledge_articles_status_isActive_idx" ON "public"."knowledge_articles"("status", "isActive");

-- CreateIndex
CREATE INDEX "knowledge_articles_categoryId_subcategoryId_itemId_idx" ON "public"."knowledge_articles"("categoryId", "subcategoryId", "itemId");

-- CreateIndex
CREATE INDEX "knowledge_articles_publishedAt_idx" ON "public"."knowledge_articles"("publishedAt");

-- CreateIndex
CREATE INDEX "knowledge_articles_views_idx" ON "public"."knowledge_articles"("views");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_tasks_ticketId_taskTemplateItemId_key" ON "public"."ticket_tasks"("ticketId", "taskTemplateItemId");

-- CreateIndex
CREATE UNIQUE INDEX "network_monitoring_logs_entityType_entityId_key" ON "public"."network_monitoring_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "network_status_history_entityType_entityId_startedAt_idx" ON "public"."network_status_history"("entityType", "entityId", "startedAt");

-- CreateIndex
CREATE INDEX "network_status_history_status_startedAt_idx" ON "public"."network_status_history"("status", "startedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "public"."notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "public"."notifications"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "public"."ApiKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_hashedKey_key" ON "public"."ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "public"."ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_hashedKey_idx" ON "public"."ApiKey"("hashedKey");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "public"."ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_linkedUserId_idx" ON "public"."ApiKey"("linkedUserId");

-- CreateIndex
CREATE INDEX "network_ping_results_entityType_entityId_idx" ON "public"."network_ping_results"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "network_ping_results_checkedAt_idx" ON "public"."network_ping_results"("checkedAt");

-- CreateIndex
CREATE INDEX "network_ping_results_status_idx" ON "public"."network_ping_results"("status");

-- CreateIndex
CREATE INDEX "service_usage_serviceId_usedAt_idx" ON "public"."service_usage"("serviceId", "usedAt");

-- CreateIndex
CREATE INDEX "service_usage_userId_serviceId_idx" ON "public"."service_usage"("userId", "serviceId");

-- CreateIndex
CREATE INDEX "service_usage_branchId_serviceId_idx" ON "public"."service_usage"("branchId", "serviceId");

-- CreateIndex
CREATE INDEX "service_usage_usedAt_idx" ON "public"."service_usage"("usedAt");

-- CreateIndex
CREATE INDEX "user_favorite_services_userId_lastUsedAt_idx" ON "public"."user_favorite_services"("userId", "lastUsedAt");

-- CreateIndex
CREATE INDEX "user_favorite_services_userId_isPinned_order_idx" ON "public"."user_favorite_services"("userId", "isPinned", "order");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_services_userId_serviceId_key" ON "public"."user_favorite_services"("userId", "serviceId");

-- CreateIndex
CREATE INDEX "user_favorite_categories_userId_order_idx" ON "public"."user_favorite_categories"("userId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "user_favorite_categories_userId_categoryId_key" ON "public"."user_favorite_categories"("userId", "categoryId");

-- CreateIndex
CREATE INDEX "knowledge_versions_articleId_createdAt_idx" ON "public"."knowledge_versions"("articleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_versions_articleId_version_key" ON "public"."knowledge_versions"("articleId", "version");

-- CreateIndex
CREATE INDEX "knowledge_attachments_articleId_idx" ON "public"."knowledge_attachments"("articleId");

-- CreateIndex
CREATE INDEX "knowledge_comments_articleId_parentId_idx" ON "public"."knowledge_comments"("articleId", "parentId");

-- CreateIndex
CREATE INDEX "knowledge_comments_userId_idx" ON "public"."knowledge_comments"("userId");

-- CreateIndex
CREATE INDEX "ticket_knowledge_ticketId_idx" ON "public"."ticket_knowledge"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_knowledge_articleId_idx" ON "public"."ticket_knowledge"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_knowledge_ticketId_articleId_key" ON "public"."ticket_knowledge"("ticketId", "articleId");

-- CreateIndex
CREATE INDEX "knowledge_feedback_articleId_isHelpful_idx" ON "public"."knowledge_feedback"("articleId", "isHelpful");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_feedback_articleId_userId_key" ON "public"."knowledge_feedback"("articleId", "userId");

-- CreateIndex
CREATE INDEX "custom_reports_createdBy_idx" ON "public"."custom_reports"("createdBy");

-- CreateIndex
CREATE INDEX "custom_reports_type_idx" ON "public"."custom_reports"("type");

-- CreateIndex
CREATE INDEX "custom_reports_module_idx" ON "public"."custom_reports"("module");

-- CreateIndex
CREATE INDEX "report_schedules_reportId_idx" ON "public"."report_schedules"("reportId");

-- CreateIndex
CREATE INDEX "report_schedules_nextRunAt_idx" ON "public"."report_schedules"("nextRunAt");

-- CreateIndex
CREATE INDEX "report_executions_reportId_idx" ON "public"."report_executions"("reportId");

-- CreateIndex
CREATE INDEX "report_executions_executedBy_idx" ON "public"."report_executions"("executedBy");

-- CreateIndex
CREATE UNIQUE INDEX "report_favorites_reportId_userId_key" ON "public"."report_favorites"("reportId", "userId");

-- CreateIndex
CREATE INDEX "report_templates_serviceId_idx" ON "public"."report_templates"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "atm_claim_verifications_ticketId_key" ON "public"."atm_claim_verifications"("ticketId");

-- CreateIndex
CREATE INDEX "branch_assignments_branchId_status_idx" ON "public"."branch_assignments"("branchId", "status");

-- CreateIndex
CREATE INDEX "branch_assignments_assignedToId_status_idx" ON "public"."branch_assignments"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "branch_communications_ticketId_createdAt_idx" ON "public"."branch_communications"("ticketId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_tickets_ticketNumber_key" ON "public"."legacy_tickets"("ticketNumber");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_tickets_mappedToTicketId_key" ON "public"."legacy_tickets"("mappedToTicketId");

-- CreateIndex
CREATE INDEX "legacy_tickets_originalSystem_originalTicketId_idx" ON "public"."legacy_tickets"("originalSystem", "originalTicketId");

-- CreateIndex
CREATE INDEX "legacy_tickets_importBatchId_idx" ON "public"."legacy_tickets"("importBatchId");

-- CreateIndex
CREATE INDEX "legacy_tickets_isConverted_idx" ON "public"."legacy_tickets"("isConverted");

-- CreateIndex
CREATE UNIQUE INDEX "pc_assets_pcName_key" ON "public"."pc_assets"("pcName");

-- CreateIndex
CREATE UNIQUE INDEX "pc_assets_assetTag_key" ON "public"."pc_assets"("assetTag");

-- CreateIndex
CREATE INDEX "pc_assets_branchId_idx" ON "public"."pc_assets"("branchId");

-- CreateIndex
CREATE INDEX "pc_assets_assignedToId_idx" ON "public"."pc_assets"("assignedToId");

-- CreateIndex
CREATE INDEX "pc_assets_isActive_idx" ON "public"."pc_assets"("isActive");

-- CreateIndex
CREATE INDEX "pc_assets_operatingSystemId_idx" ON "public"."pc_assets"("operatingSystemId");

-- CreateIndex
CREATE INDEX "pc_assets_officeProductId_idx" ON "public"."pc_assets"("officeProductId");

-- CreateIndex
CREATE INDEX "pc_assets_antivirusLicenseExpiry_idx" ON "public"."pc_assets"("antivirusLicenseExpiry");

-- CreateIndex
CREATE INDEX "pc_assets_warrantyExpiry_idx" ON "public"."pc_assets"("warrantyExpiry");

-- CreateIndex
CREATE INDEX "pc_service_logs_pcAssetId_performedAt_idx" ON "public"."pc_service_logs"("pcAssetId", "performedAt");

-- CreateIndex
CREATE INDEX "pc_service_logs_ticketId_idx" ON "public"."pc_service_logs"("ticketId");

-- CreateIndex
CREATE INDEX "pc_service_logs_serviceType_idx" ON "public"."pc_service_logs"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "hardening_templates_name_key" ON "public"."hardening_templates"("name");

-- CreateIndex
CREATE INDEX "hardening_checklist_items_templateId_category_idx" ON "public"."hardening_checklist_items"("templateId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "hardening_checklist_items_templateId_itemCode_key" ON "public"."hardening_checklist_items"("templateId", "itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "hardening_checklists_serviceLogId_key" ON "public"."hardening_checklists"("serviceLogId");

-- CreateIndex
CREATE INDEX "hardening_checklists_pcAssetId_startedAt_idx" ON "public"."hardening_checklists"("pcAssetId", "startedAt");

-- CreateIndex
CREATE INDEX "hardening_checklists_status_idx" ON "public"."hardening_checklists"("status");

-- CreateIndex
CREATE UNIQUE INDEX "hardening_checklist_results_checklistId_checklistItemId_key" ON "public"."hardening_checklist_results"("checklistId", "checklistItemId");

-- CreateIndex
CREATE UNIQUE INDEX "os_licenses_licenseKey_key" ON "public"."os_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "os_licenses_licenseType_isActive_idx" ON "public"."os_licenses"("licenseType", "isActive");

-- CreateIndex
CREATE INDEX "os_licenses_osName_idx" ON "public"."os_licenses"("osName");

-- CreateIndex
CREATE INDEX "os_licenses_assignedToPC_idx" ON "public"."os_licenses"("assignedToPC");

-- CreateIndex
CREATE INDEX "os_licenses_assignedToBranch_idx" ON "public"."os_licenses"("assignedToBranch");

-- CreateIndex
CREATE UNIQUE INDEX "office_licenses_licenseKey_key" ON "public"."office_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "office_licenses_productType_isActive_idx" ON "public"."office_licenses"("productType", "isActive");

-- CreateIndex
CREATE INDEX "office_licenses_licenseType_idx" ON "public"."office_licenses"("licenseType");

-- CreateIndex
CREATE INDEX "office_licenses_assignedToPC_idx" ON "public"."office_licenses"("assignedToPC");

-- CreateIndex
CREATE INDEX "office_licenses_assignedToBranch_idx" ON "public"."office_licenses"("assignedToBranch");

-- CreateIndex
CREATE INDEX "office_licenses_expiryDate_idx" ON "public"."office_licenses"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "antivirus_licenses_licenseKey_key" ON "public"."antivirus_licenses"("licenseKey");

-- CreateIndex
CREATE INDEX "antivirus_licenses_expiryDate_idx" ON "public"."antivirus_licenses"("expiryDate");

-- CreateIndex
CREATE INDEX "antivirus_licenses_assignedToPC_idx" ON "public"."antivirus_licenses"("assignedToPC");

-- CreateIndex
CREATE INDEX "antivirus_licenses_assignedToBranch_idx" ON "public"."antivirus_licenses"("assignedToBranch");

-- CreateIndex
CREATE INDEX "antivirus_licenses_isActive_idx" ON "public"."antivirus_licenses"("isActive");

-- CreateIndex
CREATE INDEX "operating_systems_type_isActive_idx" ON "public"."operating_systems"("type", "isActive");

-- CreateIndex
CREATE INDEX "operating_systems_sortOrder_idx" ON "public"."operating_systems"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "operating_systems_name_version_key" ON "public"."operating_systems"("name", "version");

-- CreateIndex
CREATE INDEX "office_products_type_isActive_idx" ON "public"."office_products"("type", "isActive");

-- CreateIndex
CREATE INDEX "office_products_sortOrder_idx" ON "public"."office_products"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "office_products_name_version_key" ON "public"."office_products"("name", "version");

-- CreateIndex
CREATE INDEX "daily_task_lists_technicianId_date_idx" ON "public"."daily_task_lists"("technicianId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "daily_task_lists_technicianId_date_key" ON "public"."daily_task_lists"("technicianId", "date");

-- CreateIndex
CREATE INDEX "daily_tasks_taskListId_idx" ON "public"."daily_tasks"("taskListId");

-- CreateIndex
CREATE INDEX "knowledge_collaborators_userId_idx" ON "public"."knowledge_collaborators"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_collaborators_articleId_userId_key" ON "public"."knowledge_collaborators"("articleId", "userId");

-- CreateIndex
CREATE INDEX "knowledge_service_links_serviceId_idx" ON "public"."knowledge_service_links"("serviceId");

-- CreateIndex
CREATE INDEX "knowledge_service_links_categoryId_idx" ON "public"."knowledge_service_links"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_service_links_articleId_serviceId_key" ON "public"."knowledge_service_links"("articleId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_service_links_articleId_categoryId_key" ON "public"."knowledge_service_links"("articleId", "categoryId");

-- CreateIndex
CREATE INDEX "knowledge_activities_articleId_createdAt_idx" ON "public"."knowledge_activities"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "knowledge_activities_userId_idx" ON "public"."knowledge_activities"("userId");

-- CreateIndex
CREATE INDEX "knowledge_comment_attachments_commentId_idx" ON "public"."knowledge_comment_attachments"("commentId");

-- CreateIndex
CREATE INDEX "announcements_isActive_startDate_endDate_idx" ON "public"."announcements"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "announcements_createdBy_idx" ON "public"."announcements"("createdBy");

-- CreateIndex
CREATE INDEX "announcements_isGlobal_idx" ON "public"."announcements"("isGlobal");

-- CreateIndex
CREATE INDEX "announcement_images_announcementId_idx" ON "public"."announcement_images"("announcementId");

-- CreateIndex
CREATE INDEX "announcement_views_userId_idx" ON "public"."announcement_views"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_views_announcementId_userId_key" ON "public"."announcement_views"("announcementId", "userId");

-- CreateIndex
CREATE INDEX "announcement_branches_branchId_idx" ON "public"."announcement_branches"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_branches_announcementId_branchId_key" ON "public"."announcement_branches"("announcementId", "branchId");

-- CreateIndex
CREATE INDEX "omnichannel_logs_apiKeyId_idx" ON "public"."omnichannel_logs"("apiKeyId");

-- CreateIndex
CREATE INDEX "omnichannel_logs_ticketId_idx" ON "public"."omnichannel_logs"("ticketId");

-- CreateIndex
CREATE INDEX "omnichannel_logs_status_idx" ON "public"."omnichannel_logs"("status");

-- CreateIndex
CREATE INDEX "omnichannel_logs_createdAt_idx" ON "public"."omnichannel_logs"("createdAt");

-- CreateIndex
CREATE INDEX "webhook_queue_status_scheduledFor_idx" ON "public"."webhook_queue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "webhook_queue_createdAt_idx" ON "public"."webhook_queue"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "staff_shift_profiles_userId_key" ON "public"."staff_shift_profiles"("userId");

-- CreateIndex
CREATE INDEX "staff_shift_profiles_branchId_isActive_idx" ON "public"."staff_shift_profiles"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "staff_shift_profiles_canWorkType1_hasServerAccess_idx" ON "public"."staff_shift_profiles"("canWorkType1", "hasServerAccess");

-- CreateIndex
CREATE INDEX "shift_schedules_branchId_month_year_idx" ON "public"."shift_schedules"("branchId", "month", "year");

-- CreateIndex
CREATE INDEX "shift_schedules_branchId_status_idx" ON "public"."shift_schedules"("branchId", "status");

-- CreateIndex
CREATE INDEX "shift_schedules_month_year_idx" ON "public"."shift_schedules"("month", "year");

-- CreateIndex
CREATE INDEX "shift_assignments_scheduleId_date_idx" ON "public"."shift_assignments"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "shift_assignments_staffProfileId_date_shiftType_idx" ON "public"."shift_assignments"("staffProfileId", "date", "shiftType");

-- CreateIndex
CREATE INDEX "shift_assignments_date_shiftType_idx" ON "public"."shift_assignments"("date", "shiftType");

-- CreateIndex
CREATE UNIQUE INDEX "shift_assignments_scheduleId_staffProfileId_date_key" ON "public"."shift_assignments"("scheduleId", "staffProfileId", "date");

-- CreateIndex
CREATE INDEX "on_call_assignments_scheduleId_date_idx" ON "public"."on_call_assignments"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "on_call_assignments_staffProfileId_date_idx" ON "public"."on_call_assignments"("staffProfileId", "date");

-- CreateIndex
CREATE INDEX "leave_requests_staffProfileId_status_idx" ON "public"."leave_requests"("staffProfileId", "status");

-- CreateIndex
CREATE INDEX "leave_requests_startDate_endDate_idx" ON "public"."leave_requests"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "leave_requests_scheduleId_idx" ON "public"."leave_requests"("scheduleId");

-- CreateIndex
CREATE INDEX "holidays_date_idx" ON "public"."holidays"("date");

-- CreateIndex
CREATE INDEX "holidays_scheduleId_date_idx" ON "public"."holidays"("scheduleId", "date");

-- CreateIndex
CREATE INDEX "shift_swap_requests_initiatorProfileId_status_idx" ON "public"."shift_swap_requests"("initiatorProfileId", "status");

-- CreateIndex
CREATE INDEX "shift_swap_requests_recipientProfileId_status_idx" ON "public"."shift_swap_requests"("recipientProfileId", "status");

-- CreateIndex
CREATE INDEX "shift_swap_requests_shiftAssignmentId_idx" ON "public"."shift_swap_requests"("shiftAssignmentId");

-- CreateIndex
CREATE INDEX "shift_templates_branchId_isActive_idx" ON "public"."shift_templates"("branchId", "isActive");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "public"."support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_categories" ADD CONSTRAINT "service_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "public"."support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_tier1CategoryId_fkey" FOREIGN KEY ("tier1CategoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_tier2SubcategoryId_fkey" FOREIGN KEY ("tier2SubcategoryId") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."services" ADD CONSTRAINT "services_tier3ItemId_fkey" FOREIGN KEY ("tier3ItemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_fields" ADD CONSTRAINT "service_fields_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_field_templates" ADD CONSTRAINT "service_field_templates_fieldTemplateId_fkey" FOREIGN KEY ("fieldTemplateId") REFERENCES "public"."field_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_field_templates" ADD CONSTRAINT "service_field_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "public"."migration_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "public"."support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_field_values" ADD CONSTRAINT "ticket_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "public"."service_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_field_values" ADD CONSTRAINT "ticket_field_values_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_comments" ADD CONSTRAINT "ticket_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."comment_attachments" ADD CONSTRAINT "comment_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."ticket_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."items" ADD CONSTRAINT "items_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."subcategories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_approvals" ADD CONSTRAINT "ticket_approvals_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_approvals" ADD CONSTRAINT "ticket_approvals_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sla_templates" ADD CONSTRAINT "sla_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sla_tracking" ADD CONSTRAINT "sla_tracking_slaTemplateId_fkey" FOREIGN KEY ("slaTemplateId") REFERENCES "public"."sla_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sla_tracking" ADD CONSTRAINT "sla_tracking_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atms" ADD CONSTRAINT "atms_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atm_monitoring_logs" ADD CONSTRAINT "atm_monitoring_logs_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES "public"."atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atm_incidents" ADD CONSTRAINT "atm_incidents_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES "public"."atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atm_incidents" ADD CONSTRAINT "atm_incidents_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_tickets" ADD CONSTRAINT "vendor_tickets_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_tickets" ADD CONSTRAINT "vendor_tickets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "public"."vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_tickets" ADD CONSTRAINT "vendor_tickets_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_articles" ADD CONSTRAINT "knowledge_articles_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_articles" ADD CONSTRAINT "knowledge_articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_articles" ADD CONSTRAINT "knowledge_articles_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "public"."items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_articles" ADD CONSTRAINT "knowledge_articles_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "public"."subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_templates" ADD CONSTRAINT "task_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."task_template_items" ADD CONSTRAINT "task_template_items_taskTemplateId_fkey" FOREIGN KEY ("taskTemplateId") REFERENCES "public"."task_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_tasks" ADD CONSTRAINT "ticket_tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_tasks" ADD CONSTRAINT "ticket_tasks_taskTemplateItemId_fkey" FOREIGN KEY ("taskTemplateItemId") REFERENCES "public"."task_template_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_tasks" ADD CONSTRAINT "ticket_tasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_incidents" ADD CONSTRAINT "network_incidents_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES "public"."atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_incidents" ADD CONSTRAINT "network_incidents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_incidents" ADD CONSTRAINT "network_incidents_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiKey" ADD CONSTRAINT "ApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiKey" ADD CONSTRAINT "ApiKey_linkedUserId_fkey" FOREIGN KEY ("linkedUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_ping_results" ADD CONSTRAINT "network_ping_results_atmId_fkey" FOREIGN KEY ("atmId") REFERENCES "public"."atms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_ping_results" ADD CONSTRAINT "network_ping_results_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_usage" ADD CONSTRAINT "service_usage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_usage" ADD CONSTRAINT "service_usage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_usage" ADD CONSTRAINT "service_usage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_usage" ADD CONSTRAINT "service_usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorite_services" ADD CONSTRAINT "user_favorite_services_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorite_services" ADD CONSTRAINT "user_favorite_services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorite_categories" ADD CONSTRAINT "user_favorite_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_favorite_categories" ADD CONSTRAINT "user_favorite_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_versions" ADD CONSTRAINT "knowledge_versions_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_versions" ADD CONSTRAINT "knowledge_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_attachments" ADD CONSTRAINT "knowledge_attachments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_attachments" ADD CONSTRAINT "knowledge_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_comments" ADD CONSTRAINT "knowledge_comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_comments" ADD CONSTRAINT "knowledge_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."knowledge_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_comments" ADD CONSTRAINT "knowledge_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_knowledge" ADD CONSTRAINT "ticket_knowledge_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_knowledge" ADD CONSTRAINT "ticket_knowledge_linkedBy_fkey" FOREIGN KEY ("linkedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_knowledge" ADD CONSTRAINT "ticket_knowledge_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_feedback" ADD CONSTRAINT "knowledge_feedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_feedback" ADD CONSTRAINT "knowledge_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."custom_reports" ADD CONSTRAINT "custom_reports_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_schedules" ADD CONSTRAINT "report_schedules_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."custom_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_executions" ADD CONSTRAINT "report_executions_executedBy_fkey" FOREIGN KEY ("executedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_executions" ADD CONSTRAINT "report_executions_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."custom_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_favorites" ADD CONSTRAINT "report_favorites_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "public"."custom_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_favorites" ADD CONSTRAINT "report_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."report_templates" ADD CONSTRAINT "report_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atm_claim_verifications" ADD CONSTRAINT "atm_claim_verifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."atm_claim_verifications" ADD CONSTRAINT "atm_claim_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_assignments" ADD CONSTRAINT "branch_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_assignments" ADD CONSTRAINT "branch_assignments_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_assignments" ADD CONSTRAINT "branch_assignments_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_assignments" ADD CONSTRAINT "branch_assignments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_communications" ADD CONSTRAINT "branch_communications_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_communications" ADD CONSTRAINT "branch_communications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_communications" ADD CONSTRAINT "branch_communications_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."branch_communications" ADD CONSTRAINT "branch_communications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_convertedById_fkey" FOREIGN KEY ("convertedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "public"."migration_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_mappedToTicketId_fkey" FOREIGN KEY ("mappedToTicketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_tickets" ADD CONSTRAINT "legacy_tickets_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "public"."support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_ticket_comments" ADD CONSTRAINT "legacy_ticket_comments_legacyTicketId_fkey" FOREIGN KEY ("legacyTicketId") REFERENCES "public"."legacy_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."legacy_ticket_attachments" ADD CONSTRAINT "legacy_ticket_attachments_legacyTicketId_fkey" FOREIGN KEY ("legacyTicketId") REFERENCES "public"."legacy_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_assets" ADD CONSTRAINT "pc_assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_assets" ADD CONSTRAINT "pc_assets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_assets" ADD CONSTRAINT "pc_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_assets" ADD CONSTRAINT "pc_assets_operatingSystemId_fkey" FOREIGN KEY ("operatingSystemId") REFERENCES "public"."operating_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_assets" ADD CONSTRAINT "pc_assets_officeProductId_fkey" FOREIGN KEY ("officeProductId") REFERENCES "public"."office_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_service_logs" ADD CONSTRAINT "pc_service_logs_pcAssetId_fkey" FOREIGN KEY ("pcAssetId") REFERENCES "public"."pc_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_service_logs" ADD CONSTRAINT "pc_service_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pc_service_logs" ADD CONSTRAINT "pc_service_logs_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklist_items" ADD CONSTRAINT "hardening_checklist_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."hardening_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklists" ADD CONSTRAINT "hardening_checklists_pcAssetId_fkey" FOREIGN KEY ("pcAssetId") REFERENCES "public"."pc_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklists" ADD CONSTRAINT "hardening_checklists_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."hardening_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklists" ADD CONSTRAINT "hardening_checklists_serviceLogId_fkey" FOREIGN KEY ("serviceLogId") REFERENCES "public"."pc_service_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklists" ADD CONSTRAINT "hardening_checklists_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklist_results" ADD CONSTRAINT "hardening_checklist_results_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "public"."hardening_checklists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hardening_checklist_results" ADD CONSTRAINT "hardening_checklist_results_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "public"."hardening_checklist_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."os_licenses" ADD CONSTRAINT "os_licenses_assignedToPC_fkey" FOREIGN KEY ("assignedToPC") REFERENCES "public"."pc_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."os_licenses" ADD CONSTRAINT "os_licenses_assignedToBranch_fkey" FOREIGN KEY ("assignedToBranch") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."os_licenses" ADD CONSTRAINT "os_licenses_assignedToUser_fkey" FOREIGN KEY ("assignedToUser") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."os_licenses" ADD CONSTRAINT "os_licenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_licenses" ADD CONSTRAINT "office_licenses_assignedToPC_fkey" FOREIGN KEY ("assignedToPC") REFERENCES "public"."pc_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_licenses" ADD CONSTRAINT "office_licenses_assignedToBranch_fkey" FOREIGN KEY ("assignedToBranch") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_licenses" ADD CONSTRAINT "office_licenses_assignedToUser_fkey" FOREIGN KEY ("assignedToUser") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_licenses" ADD CONSTRAINT "office_licenses_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."antivirus_licenses" ADD CONSTRAINT "antivirus_licenses_assignedToPC_fkey" FOREIGN KEY ("assignedToPC") REFERENCES "public"."pc_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."antivirus_licenses" ADD CONSTRAINT "antivirus_licenses_assignedToBranch_fkey" FOREIGN KEY ("assignedToBranch") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."antivirus_licenses" ADD CONSTRAINT "antivirus_licenses_assignedToUser_fkey" FOREIGN KEY ("assignedToUser") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."operating_systems" ADD CONSTRAINT "operating_systems_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."office_products" ADD CONSTRAINT "office_products_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_task_lists" ADD CONSTRAINT "daily_task_lists_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_tasks" ADD CONSTRAINT "daily_tasks_taskListId_fkey" FOREIGN KEY ("taskListId") REFERENCES "public"."daily_task_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."daily_tasks" ADD CONSTRAINT "daily_tasks_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_collaborators" ADD CONSTRAINT "knowledge_collaborators_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_collaborators" ADD CONSTRAINT "knowledge_collaborators_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_collaborators" ADD CONSTRAINT "knowledge_collaborators_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_service_links" ADD CONSTRAINT "knowledge_service_links_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_service_links" ADD CONSTRAINT "knowledge_service_links_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_service_links" ADD CONSTRAINT "knowledge_service_links_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_service_links" ADD CONSTRAINT "knowledge_service_links_linkedBy_fkey" FOREIGN KEY ("linkedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_activities" ADD CONSTRAINT "knowledge_activities_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_activities" ADD CONSTRAINT "knowledge_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_comment_attachments" ADD CONSTRAINT "knowledge_comment_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "public"."knowledge_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_comment_attachments" ADD CONSTRAINT "knowledge_comment_attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcements" ADD CONSTRAINT "announcements_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_images" ADD CONSTRAINT "announcement_images_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_views" ADD CONSTRAINT "announcement_views_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_views" ADD CONSTRAINT "announcement_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_branches" ADD CONSTRAINT "announcement_branches_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "public"."announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."announcement_branches" ADD CONSTRAINT "announcement_branches_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."omnichannel_logs" ADD CONSTRAINT "omnichannel_logs_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "public"."ApiKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."omnichannel_logs" ADD CONSTRAINT "omnichannel_logs_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_shift_profiles" ADD CONSTRAINT "staff_shift_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."staff_shift_profiles" ADD CONSTRAINT "staff_shift_profiles_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_schedules" ADD CONSTRAINT "shift_schedules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_assignments" ADD CONSTRAINT "shift_assignments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."shift_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_assignments" ADD CONSTRAINT "shift_assignments_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "public"."staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."on_call_assignments" ADD CONSTRAINT "on_call_assignments_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."shift_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."on_call_assignments" ADD CONSTRAINT "on_call_assignments_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "public"."staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_staffProfileId_fkey" FOREIGN KEY ("staffProfileId") REFERENCES "public"."staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."leave_requests" ADD CONSTRAINT "leave_requests_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."shift_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."holidays" ADD CONSTRAINT "holidays_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."shift_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_initiatorProfileId_fkey" FOREIGN KEY ("initiatorProfileId") REFERENCES "public"."staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_recipientProfileId_fkey" FOREIGN KEY ("recipientProfileId") REFERENCES "public"."staff_shift_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shift_swap_requests" ADD CONSTRAINT "shift_swap_requests_shiftAssignmentId_fkey" FOREIGN KEY ("shiftAssignmentId") REFERENCES "public"."shift_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ================================================
-- SEED DATA: IT Manager Support Group
-- ================================================

-- Insert IT Manager support group if it doesn't exist
INSERT INTO "support_groups" ("id", "name", "description", "code", "isActive", "createdAt", "updatedAt")
VALUES (
  'cm2p5it0000000manager00000',
  'IT Manager',
  'IT Management team with shift management access',
  'IT_MGR',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (code) DO NOTHING;

-- Alternative insert using name uniqueness
INSERT INTO "support_groups" ("id", "name", "description", "code", "isActive", "createdAt", "updatedAt")
SELECT 
  'cm2p5it0000001manager00001',
  'Shift Management',
  'Support group for shift scheduling and management',
  'SHIFT_MGR',
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "support_groups" WHERE "code" = 'SHIFT_MGR'
);

