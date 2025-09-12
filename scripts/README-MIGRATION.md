# ManageEngine Migration Scripts

This directory contains standalone scripts for migrating tickets from ManageEngine ServiceDesk Plus to our ServiceDesk system.

## Prerequisites

1. **ManageEngine API Key** - Required for authentication
2. **Node.js** installed on your system
3. **Database access** - Scripts connect directly to the database

## Available Scripts

### 1. import-manageengine-tickets.js

Main script for importing tickets from ManageEngine.

```bash
# Basic usage (import all tickets)
node scripts/import-manageengine-tickets.js --api-key YOUR_API_KEY

# Import with custom URL
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --url https://127.0.0.1:8081

# Dry run to preview what will be imported
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --dry-run \
  --limit 10 \
  --verbose

# Import only specific tickets
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --filter "Open" \
  --date-from 2025-01-01 \
  --date-to 2025-12-31

# Large batch import with progress
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --batch-size 100 \
  --verbose

# Import with self-signed SSL certificate (insecure)
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --insecure
```

#### Options:
- `--api-key YOUR_KEY` - ManageEngine API key (required)
- `--url URL` - ManageEngine URL (default: https://127.0.0.1:8081)
- `--batch-size N` - Number of tickets per batch (default: 50)
- `--limit N` - Maximum tickets to import
- `--skip-existing` - Skip already imported tickets (default: true)
- `--import-comments` - Import ticket comments (default: true)
- `--import-attachments` - Import attachment metadata (default: true)
- `--dry-run` - Test without importing
- `--start-from N` - Start from ticket index N
- `--filter STATUS` - Only import tickets with specific status
- `--date-from YYYY-MM-DD` - Import tickets created after date
- `--date-to YYYY-MM-DD` - Import tickets created before date
- `--verbose` - Show detailed progress
- `--insecure` - Disable SSL certificate verification (for self-signed certificates)

### 2. check-migration-status.js

Check the status of migration batches.

```bash
# Check recent migrations
node scripts/check-migration-status.js

# Check specific batch
node scripts/check-migration-status.js --batch-id cmfd123...

# Show all migrations
node scripts/check-migration-status.js --all

# Show only in-progress migrations
node scripts/check-migration-status.js --in-progress

# Show failed migrations with details
node scripts/check-migration-status.js --failed --details
```

#### Options:
- `--batch-id ID` - Check specific batch
- `--all` - Show all migration batches
- `--recent N` - Show N most recent batches (default: 5)
- `--in-progress` - Show only in-progress migrations
- `--failed` - Show only failed migrations
- `--details` - Show detailed information

### 3. rollback-migration.js

Rollback (delete) tickets from a specific migration batch.

```bash
# Dry run to see what would be deleted
node scripts/rollback-migration.js --batch-id cmfd123... --dry-run

# Rollback with confirmation prompt
node scripts/rollback-migration.js --batch-id cmfd123...

# Rollback without confirmation (use with caution!)
node scripts/rollback-migration.js --batch-id cmfd123... --confirm
```

#### Options:
- `--batch-id ID` - Migration batch ID to rollback (required)
- `--confirm` - Skip confirmation prompt
- `--dry-run` - Show what would be deleted without deleting

### 4. test-manageengine-connection.js

Test connection to ManageEngine before importing.

```bash
node scripts/test-manageengine-connection.js YOUR_API_KEY
```

## What Gets Imported

### ✅ Imported:
- **Tickets** - All ticket data including title, description, status, priority
- **Comments/Notes** - All ticket comments with timestamps and authors
- **Attachment Metadata** - File names, sizes, and references (stored in legacyData)
- **Users** - Creates placeholder users for requesters and technicians
- **Branches** - Maps sites to branches
- **Services** - Maps categories to services
- **Custom Fields** - Stored in legacyData JSON field
- **Timestamps** - Preserves original created, resolved, and closed dates

### ❌ Not Imported:
- **Actual Files** - Only metadata is stored, files remain in ManageEngine
- **Email Threads** - Original email conversations
- **Time Entries** - Work logs and time tracking
- **Linked Assets** - Asset relationships
- **Approval Workflows** - Approval chains

## Migration Workflow

### Step 1: Test Connection
```bash
node scripts/test-manageengine-connection.js YOUR_API_KEY
```

### Step 2: Preview Import (Dry Run)
```bash
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --dry-run \
  --limit 10 \
  --verbose
```

### Step 3: Run Full Import
```bash
node scripts/import-manageengine-tickets.js \
  --api-key YOUR_API_KEY \
  --verbose
```

### Step 4: Monitor Progress
```bash
# In another terminal, monitor the migration
node scripts/check-migration-status.js --batch-id BATCH_ID --details
```

### Step 5: Verify Import
- Check imported tickets in the web interface
- Review any errors in the migration logs
- Verify comments and metadata

### Step 6: Rollback if Needed
```bash
# If something went wrong, rollback the batch
node scripts/rollback-migration.js --batch-id BATCH_ID
```

## Performance Tips

1. **Batch Size**: Increase `--batch-size` for faster imports (default: 50)
2. **Skip Existing**: Use `--skip-existing true` to resume interrupted imports
3. **Filters**: Use date ranges or status filters to import in chunks
4. **Off-Peak Hours**: Run large imports during off-peak hours

## Troubleshooting

### Connection Issues
- Verify API key is correct
- Check ManageEngine is accessible at the URL
- Ensure API is enabled in ManageEngine
- **SSL Certificate Issues**: If you get "Hostname/IP does not match certificate" errors:
  - Use `--insecure` flag for self-signed certificates (development only)
  - For production, obtain a proper SSL certificate for your ManageEngine instance

### Import Failures
- Check migration status for specific errors
- Review error logs with `--details` flag
- Try importing failed tickets individually

### Performance Issues
- Reduce batch size if timeouts occur
- Import in date ranges for large datasets
- Check database performance

### Rate Limiting Issues
- **"Maximum access limit exceeded"**: ManageEngine has rate limiting protection
  - Wait 10-15 minutes before retrying
  - Use smaller `--limit` values for testing
  - The script includes automatic delays between API calls
  - For large imports, run during off-peak hours

## Data Mapping

| ManageEngine | Our System | Notes |
|--------------|------------|-------|
| Request ID | legacyTicketId | Stored for reference |
| Subject | title | Ticket title |
| Status | status | Mapped to closest match |
| Priority | priority | LOW/MEDIUM/HIGH/CRITICAL |
| Requester | createdBy | Creates user if not exists |
| Technician | assignedTo | Creates user if not exists |
| Site | branch | Creates branch if not exists |
| Category | service | Maps to closest service |

## Important Notes

1. **Legacy Data**: All original data is preserved in the `legacyData` JSON field
2. **Ticket Numbers**: New ticket numbers are generated (originals in legacyTicketId)
3. **Attachments**: Only metadata imported, files remain in ManageEngine
4. **Users**: Placeholder users created with `me_user_` prefix
5. **Rollback**: Can only rollback entire batch, not individual tickets

## Support

For issues or questions:
1. Check the migration logs
2. Review this documentation
3. Contact system administrator