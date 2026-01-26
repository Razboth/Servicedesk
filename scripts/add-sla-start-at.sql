-- Add slaStartAt column to tickets table
-- SLA calculation should start from approval date, not creation date
-- For tickets that don't require approval, slaStartAt = createdAt

-- Add the new column
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "slaStartAt" TIMESTAMP(3);

-- Create index for performance
CREATE INDEX IF NOT EXISTS "tickets_slaStartAt_idx" ON "tickets"("slaStartAt");

-- Backfill existing tickets:
-- For tickets with APPROVED status in approvals, set slaStartAt to the approval date
UPDATE "tickets" t
SET "slaStartAt" = (
    SELECT ta."updatedAt"
    FROM "ticket_approvals" ta
    WHERE ta."ticketId" = t.id AND ta."status" = 'APPROVED'
    ORDER BY ta."updatedAt" DESC
    LIMIT 1
)
WHERE EXISTS (
    SELECT 1 FROM "ticket_approvals" ta
    WHERE ta."ticketId" = t.id AND ta."status" = 'APPROVED'
);

-- For tickets without approval records (didn't require approval), set slaStartAt to createdAt
UPDATE "tickets"
SET "slaStartAt" = "createdAt"
WHERE "slaStartAt" IS NULL
  AND "status" NOT IN ('PENDING_APPROVAL', 'REJECTED');

-- Log the changes
SELECT
    COUNT(*) FILTER (WHERE "slaStartAt" IS NOT NULL) as "tickets_with_sla_start",
    COUNT(*) FILTER (WHERE "slaStartAt" IS NULL) as "tickets_without_sla_start",
    COUNT(*) as "total_tickets"
FROM "tickets";
