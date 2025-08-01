-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('INCIDENT', 'SERVICE_REQUEST', 'CHANGE_REQUEST', 'EVENT_REQUEST');

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "category" "TicketCategory" NOT NULL DEFAULT 'INCIDENT';

-- CreateTable
CREATE TABLE "comment_attachments" (
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

-- AddForeignKey
ALTER TABLE "comment_attachments" ADD CONSTRAINT "comment_attachments_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "ticket_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
