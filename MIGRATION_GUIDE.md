# ManageEngine ServiceDesk Plus Migration Guide

## 📋 Prerequisites

1. **Access to ManageEngine ServiceDesk Plus**
   - URL: https://127.0.0.1:8081
   - Admin or Technician account with API access

2. **API Key Generation**
   - Navigate to: https://127.0.0.1:8081/SetUpWizard.do?forwardTo=apidoc
   - Click on "Generate API Key" 
   - Select the technician user
   - Copy the generated API key

## 🔧 Configuration

### Step 1: Set Environment Variables

Add the following to your `.env` file:

```env
# ManageEngine ServiceDesk Plus Integration
MANAGEENGINE_URL=https://127.0.0.1:8081
MANAGEENGINE_API_KEY=YOUR_API_KEY_HERE
MANAGEENGINE_TECHNICIAN=your_technician_username
```

Replace:
- `YOUR_API_KEY_HERE` with the API key from ManageEngine
- `your_technician_username` with your technician account username

### Step 2: Test Connection

Run the validation script to test the connection:

```bash
npx tsx scripts/validate-migration.ts test
```

You should see:
- ✅ Successfully connected to ManageEngine ServiceDesk Plus
- 📊 Total tickets found: [number]

## 🚀 Migration Process

### Option 1: Using the Web Interface (Recommended)

1. **Access Migration Dashboard**
   - Navigate to: http://localhost:3000/admin/migration
   - Login with an Admin account

2. **Configure Connection**
   - Enter your API key
   - Click "Test Connection"
   - Verify the total ticket count

3. **Preview Data**
   - Click "Preview Sample" to see first 10 tickets
   - Review the data format and mapping

4. **Start Migration**
   - Click "Start Migration" to begin
   - Monitor progress in real-time
   - The system will:
     - Import tickets in batches of 100
     - Create placeholder users for unknown requesters
     - Map categories to services
     - Import comments/notes
     - Mark all tickets as legacy (read-only)

### Option 2: Using Command Line Scripts

#### Preview Tickets
```bash
# Preview first 5 tickets (default)
npx tsx scripts/validate-migration.ts preview

# Preview specific number of tickets
npx tsx scripts/validate-migration.ts preview 10
```

#### Test Migration (Single Ticket)
```bash
# Migrate a random ticket as test
npx tsx scripts/validate-migration.ts migrate

# Migrate specific ticket by ID
npx tsx scripts/validate-migration.ts migrate 12345
```

#### Validate Migration
```bash
# Check migration statistics and data integrity
npx tsx scripts/validate-migration.ts validate
```

#### Full Test (Connection + Preview + Test Migration + Validation)
```bash
npx tsx scripts/validate-migration.ts all
```

#### Cleanup Test Data
```bash
# Remove test migration data
npx tsx scripts/validate-migration.ts cleanup --cleanup
```

## 📊 Data Mapping

### Status Mapping
| ManageEngine Status | Our System Status |
|-------------------|------------------|
| Open | OPEN |
| Pending | PENDING |
| In Progress | IN_PROGRESS |
| On Hold | PENDING |
| Resolved | RESOLVED |
| Closed | CLOSED |
| Cancelled | CANCELLED |

### Priority Mapping
| ManageEngine Priority | Our System Priority |
|---------------------|-------------------|
| Low | LOW |
| Normal/Medium | MEDIUM |
| High | HIGH |
| Urgent | CRITICAL |
| Critical | EMERGENCY |

### Entity Handling

- **Users**: Creates placeholder users with prefix `me_` if not found
- **Branches**: Maps sites to branches, creates placeholders if needed
- **Services**: Maps categories to services, creates `[Legacy]` services
- **Comments**: Imports all notes/comments with timestamps
- **Attachments**: Metadata stored, files can be downloaded separately

## ✅ Validation Checklist

After migration, verify:

1. **Connection Test**
   - [ ] API connection successful
   - [ ] Correct total ticket count

2. **Data Integrity**
   - [ ] No duplicate legacy ticket IDs
   - [ ] All required fields populated
   - [ ] Comments imported correctly
   - [ ] User mappings correct

3. **Legacy Markers**
   - [ ] All imported tickets marked as `isLegacy = true`
   - [ ] Legacy system set to "MANAGEENGINE"
   - [ ] Original ticket IDs preserved in `legacyTicketId`
   - [ ] Original data stored in `legacyData` JSON field

4. **Web Interface**
   - [ ] Legacy tickets viewable in `/tickets`
   - [ ] Legacy badge displayed
   - [ ] Read-only status enforced
   - [ ] Original data accessible

## 🔄 Rollback

If needed, you can rollback a migration batch:

### Via Web Interface
1. Go to `/admin/migration`
2. Find the batch in Migration History
3. Click "Rollback" button

### Via API
```bash
curl -X POST http://localhost:3000/api/migration/manageengine \
  -H "Content-Type: application/json" \
  -d '{"action": "rollback", "batchId": "YOUR_BATCH_ID"}'
```

## 🚨 Troubleshooting

### Common Issues

1. **SSL Certificate Error**
   - The system automatically handles self-signed certificates
   - Ensure `skipSSLVerification: true` is set in the code

2. **API Key Invalid**
   - Regenerate key in ManageEngine
   - Ensure technician has proper permissions
   - Check key format (no extra spaces)

3. **Connection Timeout**
   - Verify ManageEngine is running at https://127.0.0.1:8081
   - Check firewall settings
   - Verify network connectivity

4. **Missing Data**
   - Check ManageEngine user permissions
   - Verify API access to all modules
   - Review error logs in migration batch

### Debug Mode

Enable detailed logging:
```bash
DEBUG=* npx tsx scripts/validate-migration.ts test
```

### Check Logs

View migration logs:
```sql
-- In your database
SELECT * FROM migration_batches 
WHERE source = 'MANAGEENGINE' 
ORDER BY created_at DESC;

-- View error details
SELECT error_log FROM migration_batches 
WHERE id = 'YOUR_BATCH_ID';
```

## 📈 Performance Tips

1. **Batch Size**: Default is 100 tickets per batch. Adjust if needed:
   ```javascript
   batchSize: 50 // Smaller batches for slower connections
   ```

2. **Delay Between Batches**: Add delay to reduce load:
   ```javascript
   delayBetweenBatches: 2000 // 2 seconds
   ```

3. **Skip Attachments**: For faster initial import:
   ```javascript
   downloadAttachments: false
   ```

4. **Off-Peak Hours**: Run migration during low-usage periods

## 📝 Post-Migration

1. **Verify Data**
   - Run validation script
   - Check sample tickets
   - Verify user access

2. **Update Documentation**
   - Note migration date
   - Document any custom mappings
   - Record total tickets migrated

3. **Train Users**
   - Explain legacy ticket indicators
   - Show read-only restrictions
   - Demonstrate search features

4. **Monitor Performance**
   - Check database size
   - Monitor query performance
   - Optimize indexes if needed

## 🆘 Support

For issues or questions:
1. Check migration logs in `/admin/migration`
2. Review error details in database
3. Run validation script for diagnostics
4. Check console logs for API errors

## 📊 Sample Migration Statistics

Expected results for successful migration:
```
✅ Successfully connected to ManageEngine ServiceDesk Plus
📊 Total tickets found: 1,234
📋 Migration started - Batch ID: clxxxxx
⏳ Progress: 234/1,234 tickets (19%)
✅ Migration completed
   - Imported: 1,230 tickets
   - Errors: 4 tickets
   - Duration: 15 minutes
```

---

Last Updated: 2025-09-10
Version: 1.0.0