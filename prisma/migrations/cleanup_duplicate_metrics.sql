-- Cleanup duplicate server metrics (keep only 1 per server per hour)
-- PostgreSQL version

-- Step 1: Preview duplicates (run this first to see what we have)
SELECT
    "serverId",
    DATE_TRUNC('hour', "collectedAt") as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY "serverId", DATE_TRUNC('hour', "collectedAt")
HAVING COUNT(*) > 1
ORDER BY metric_count DESC;

-- Step 2: Preview what will be KEPT (one per server per hour - the earliest)
SELECT DISTINCT ON ("serverId", DATE_TRUNC('hour', "collectedAt"))
    id,
    "serverId",
    "collectedAt",
    DATE_TRUNC('hour', "collectedAt") as hour_bucket
FROM server_metric_snapshots
ORDER BY "serverId", DATE_TRUNC('hour', "collectedAt"), "collectedAt" ASC;

-- Step 3: Delete duplicates - keep only the earliest record per server per hour
-- Using DISTINCT ON to identify records to keep
DELETE FROM server_metric_snapshots
WHERE id NOT IN (
    SELECT DISTINCT ON ("serverId", DATE_TRUNC('hour', "collectedAt")) id
    FROM server_metric_snapshots
    ORDER BY "serverId", DATE_TRUNC('hour', "collectedAt"), "collectedAt" ASC
);

-- Step 4: Verify cleanup (should return no rows if successful)
SELECT
    "serverId",
    DATE_TRUNC('hour', "collectedAt") as hour_bucket,
    COUNT(*) as metric_count
FROM server_metric_snapshots
GROUP BY "serverId", DATE_TRUNC('hour', "collectedAt")
HAVING COUNT(*) > 1;

-- Step 5: Clean up orphaned metric collections (collections with no snapshots)
DELETE FROM metric_collections
WHERE id NOT IN (SELECT DISTINCT "collectionId" FROM server_metric_snapshots);
