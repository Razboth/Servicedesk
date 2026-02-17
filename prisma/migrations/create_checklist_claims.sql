-- Create checklist_claims table for collaborative checklist claiming
-- Multiple users can claim the same checklist

CREATE TABLE IF NOT EXISTS "checklist_claims" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_claims_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint (one user can only claim a checklist once)
CREATE UNIQUE INDEX IF NOT EXISTS "checklist_claims_checklistId_userId_key" ON "checklist_claims"("checklistId", "userId");

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS "checklist_claims_checklistId_idx" ON "checklist_claims"("checklistId");
CREATE INDEX IF NOT EXISTS "checklist_claims_userId_idx" ON "checklist_claims"("userId");

-- Add foreign key constraints
ALTER TABLE "checklist_claims"
ADD CONSTRAINT "checklist_claims_checklistId_fkey"
FOREIGN KEY ("checklistId")
REFERENCES "server_access_daily_checklists"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_claims"
ADD CONSTRAINT "checklist_claims_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
