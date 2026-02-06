-- Delete all daily checklists and their items (cascade)
-- Run this to reset all checklist data

-- Delete items first (foreign key constraint)
DELETE FROM "server_access_checklist_items";

-- Delete checklists
DELETE FROM "server_access_daily_checklists";

-- Verify
SELECT 'Remaining checklists:' as info, COUNT(*) as count FROM "server_access_daily_checklists";
SELECT 'Remaining items:' as info, COUNT(*) as count FROM "server_access_checklist_items";
