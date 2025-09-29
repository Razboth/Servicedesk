# Custom Fields Cleanup Guide

## Problem: Custom Fields Keep Coming Back

If you're experiencing custom fields that reappear after deletion, this is due to the system having **two separate field systems** that can be confusing.

### Understanding the Two Field Systems

Your ServiceDesk has two types of custom fields:

1. **📝 Direct Custom Fields (ServiceField)**
   - Fields created directly for a specific service
   - Stored in the `ServiceField` table
   - Visible with blue "📝 Direct Field" badges in the UI

2. **📋 Template Fields (ServiceFieldTemplate)**
   - Reusable field templates linked to services
   - Stored in `FieldTemplate` table with links in `ServiceFieldTemplate`
   - Visible with purple "📋 Template Field" badges in the UI

### Why Fields "Come Back"

When you delete custom fields through the normal UI, you might only be removing one type while the other remains. This makes it appear that fields are regenerating automatically.

## Solutions

### Option 1: Use the Web UI Cleanup Tool (Recommended)

1. Go to **Admin → Services**
2. Find your service and click "Manage Fields"
3. Click the **🧹 Cleanup** tab
4. Click "Preview Cleanup" to see what will be removed
5. Choose your cleanup option:
   - **Clean All**: Removes both direct fields AND template links
   - **Clean Direct Fields**: Removes only direct custom fields
   - **Clean Templates**: Removes only template field links

### Option 2: Use the Command-Line Tool

For services with existing ticket data, use the comprehensive cleanup script:

```bash
# Preview what would be cleaned (safe to run)
npx tsx scripts/cleanup-service-fields.ts --service-name "Your Service Name" --dry-run

# Clean a specific service
npx tsx scripts/cleanup-service-fields.ts --service-name "Your Service Name"

# Clean by service ID
npx tsx scripts/cleanup-service-fields.ts --service-id "clm123456..."

# Clean ALL services (use with extreme caution!)
npx tsx scripts/cleanup-service-fields.ts --all --dry-run
```

#### Command-Line Options

- `--service-name <name>`: Clean specific service by name (partial match)
- `--service-id <id>`: Clean specific service by ID
- `--all`: Clean ALL services (requires confirmation)
- `--dry-run`: Show what would be deleted without making changes
- `--only-direct-fields`: Only remove ServiceFields (direct custom fields)
- `--only-templates`: Only remove ServiceFieldTemplate links
- `--help`: Show detailed help

## Safety Features

### Web UI Protections
- Preview mode shows exactly what will be deleted
- Services with ticket data show warnings
- Confirmation dialogs for destructive actions
- Separate cleanup options for granular control

### Command-Line Protections
- Dry run mode to preview changes
- Confirmation prompts for dangerous operations
- Detailed logging of all operations
- Rollback tracking via audit logs

### Ticket Data Protection
Both tools detect when services have existing ticket data and:
- Show warnings about potential data loss
- Prevent deletion of fields with ticket values (in UI)
- Provide guidance on safe cleanup procedures

## Best Practices

1. **Always preview first**: Use dry-run mode or preview features
2. **Start with specific services**: Don't use `--all` unless absolutely necessary
3. **Check for ticket data**: Services with tickets need careful handling
4. **Backup before cleanup**: Consider database backup for large operations
5. **Use granular options**: Remove only the field type you need to remove

## Identifying Field Types in the UI

The updated UI now clearly shows which type each field is:

- **📝 Direct Field** (blue badge): Direct custom fields
- **📋 Template Field** (purple badge): Template-based fields

## API Endpoints for Developers

New API endpoints for programmatic cleanup:

- `GET /api/admin/services/[id]/fields/cleanup` - Preview cleanup
- `DELETE /api/admin/services/[id]/fields/cleanup` - Execute cleanup
- Query parameters:
  - `type=all|fields|templates` - What to clean
  - `dryRun=true` - Preview mode

## Troubleshooting

### Fields Still Coming Back?
1. Check both field types are removed (not just one)
2. Verify no seed scripts are running automatically
3. Check for any automated field generation in code
4. Use the command-line tool for complete cleanup

### Cannot Delete Fields?
1. Check if the service has existing ticket data
2. Use the command-line tool for services with tickets
3. Verify you have ADMIN or SUPER_ADMIN role
4. Check for any foreign key constraints

### Need Help?
1. Use `--help` flag on command-line tools
2. Check the cleanup preview in the web UI
3. Review audit logs for cleanup operations
4. Contact system administrator for database-level issues

## Example Workflows

### Quick Cleanup (No Ticket Data)
```bash
# 1. Preview what would be cleaned
npx tsx scripts/cleanup-service-fields.ts --service-name "ATM" --dry-run

# 2. Execute if preview looks correct
npx tsx scripts/cleanup-service-fields.ts --service-name "ATM"
```

### Safe Cleanup (With Ticket Data)
```bash
# 1. Use dry-run to assess impact
npx tsx scripts/cleanup-service-fields.ts --service-id "clm123..." --dry-run

# 2. Remove only problematic field type
npx tsx scripts/cleanup-service-fields.ts --service-id "clm123..." --only-templates

# 3. Verify in UI that fields are gone
```

### Mass Cleanup (Development Environment)
```bash
# 1. Always dry-run first
npx tsx scripts/cleanup-service-fields.ts --all --dry-run

# 2. Execute with confirmation
npx tsx scripts/cleanup-service-fields.ts --all
# Type "CONFIRM" when prompted
```

This guide should help you resolve the custom fields reappearing issue permanently!