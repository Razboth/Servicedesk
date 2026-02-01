-- Cleanup duplicate server metrics (keep only 1 per server per hour)
-- Run this script to remove existing duplicates

-- First, let's see how many duplicates we have (preview)
SELECT
    serverId,
    DATE_FORMAT(collectedAt, '%Y-%m-%d %H:00:00') as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY serverId, DATE_FORMAT(collectedAt, '%Y-%m-%d %H:00:00')
HAVING COUNT(*) > 1
ORDER BY metric_count DESC;

-- Delete duplicates, keeping the earliest record per server per hour
-- This uses a self-join to find and delete duplicates
DELETE s1 FROM server_metric_snapshots s1
INNER JOIN server_metric_snapshots s2
ON s1.serverId = s2.serverId
   AND DATE_FORMAT(s1.collectedAt, '%Y-%m-%d %H:00:00') = DATE_FORMAT(s2.collectedAt, '%Y-%m-%d %H:00:00')
   AND s1.id > s2.id;

-- Alternative: Delete duplicates keeping the LATEST record per server per hour
-- DELETE s1 FROM server_metric_snapshots s1
-- INNER JOIN server_metric_snapshots s2
-- ON s1.serverId = s2.serverId
--    AND DATE_FORMAT(s1.collectedAt, '%Y-%m-%d %H:00:00') = DATE_FORMAT(s2.collectedAt, '%Y-%m-%d %H:00:00')
--    AND s1.id < s2.id;

-- Verify cleanup (should return empty or fewer rows)
SELECT
    serverId,
    DATE_FORMAT(collectedAt, '%Y-%m-%d %H:00:00') as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY serverId, DATE_FORMAT(collectedAt, '%Y-%m-%d %H:00:00')
HAVING COUNT(*) > 1;

-- Also clean up orphaned metric collections (collections with no snapshots)
DELETE FROM metric_collections
WHERE id NOT IN (SELECT DISTINCT collectionId FROM server_metric_snapshots);
