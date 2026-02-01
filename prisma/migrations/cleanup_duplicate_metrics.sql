-- Cleanup duplicate server metrics (keep only 1 per server per hour)
-- PostgreSQL version

-- First, let's see how many duplicates we have (preview)
SELECT
    "serverId",
    DATE_TRUNC('hour', "collectedAt") as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY "serverId", DATE_TRUNC('hour', "collectedAt")
HAVING COUNT(*) > 1
ORDER BY metric_count DESC;

-- Delete duplicates, keeping the earliest record per server per hour
DELETE FROM server_metric_snapshots
WHERE id IN (
    SELECT id FROM (
        SELECT
            id,
            ROW_NUMBER() OVER (
                PARTITION BY "serverId", DATE_TRUNC('hour', "collectedAt")
                ORDER BY "collectedAt" ASC
            ) as rn
        FROM server_metric_snapshots
    ) ranked
    WHERE rn > 1
);

-- Alternative: Delete duplicates keeping the LATEST record per server per hour
-- DELETE FROM server_metric_snapshots
-- WHERE id IN (
--     SELECT id FROM (
--         SELECT
--             id,
--             ROW_NUMBER() OVER (
--                 PARTITION BY "serverId", DATE_TRUNC('hour', "collectedAt")
--                 ORDER BY "collectedAt" DESC
--             ) as rn
--         FROM server_metric_snapshots
--     ) ranked
--     WHERE rn > 1
-- );

-- Verify cleanup (should return empty or fewer rows)
SELECT
    "serverId",
    DATE_TRUNC('hour', "collectedAt") as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY "serverId", DATE_TRUNC('hour', "collectedAt")
HAVING COUNT(*) > 1;

-- Also clean up orphaned metric collections (collections with no snapshots)
DELETE FROM metric_collections
WHERE id NOT IN (SELECT DISTINCT "collectionId" FROM server_metric_snapshots);
