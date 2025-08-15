/*
  Warnings:

  - You are about to drop the column `supportGroup` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `supportGroup` on the `tickets` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "atm_incidents" ADD COLUMN     "externalReferenceId" TEXT,
ADD COLUMN     "metrics" JSONB;

-- AlterTable
ALTER TABLE "services" DROP COLUMN "supportGroup",
ADD COLUMN     "defaultIssueClassification" "IssueClassification",
ADD COLUMN     "defaultItilCategory" "TicketCategory" DEFAULT 'INCIDENT',
ADD COLUMN     "defaultTitle" TEXT,
ADD COLUMN     "supportGroupId" TEXT;

-- AlterTable
ALTER TABLE "tickets" DROP COLUMN "supportGroup",
ADD COLUMN     "securityClassification" TEXT,
ADD COLUMN     "securityFindings" JSONB,
ADD COLUMN     "supportGroupId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "supportGroupId" TEXT;

-- DropEnum
DROP TYPE "SupportGroup";

-- CreateTable
CREATE TABLE "field_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "FieldType" NOT NULL,
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
CREATE TABLE "service_field_templates" (
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
CREATE TABLE "support_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_templates_name_key" ON "field_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "service_field_templates_serviceId_fieldTemplateId_key" ON "service_field_templates"("serviceId", "fieldTemplateId");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_name_key" ON "support_groups"("name");

-- CreateIndex
CREATE UNIQUE INDEX "support_groups_code_key" ON "support_groups"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_field_templates" ADD CONSTRAINT "service_field_templates_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_field_templates" ADD CONSTRAINT "service_field_templates_fieldTemplateId_fkey" FOREIGN KEY ("fieldTemplateId") REFERENCES "field_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_supportGroupId_fkey" FOREIGN KEY ("supportGroupId") REFERENCES "support_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "atm_incidents" ADD CONSTRAINT "atm_incidents_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ServiceField_serviceId_name_key" RENAME TO "service_fields_serviceId_name_key";
