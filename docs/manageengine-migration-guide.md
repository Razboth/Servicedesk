# ManageEngine ServiceDesk Plus Migration Guide

## Prerequisites

1. **ManageEngine ServiceDesk Plus** must be running (typically on https://127.0.0.1:8081)
2. You need **Administrator** or **SDAdmin** access to generate an API key
3. The ServiceDesk Plus API must be enabled

## Step 1: Generate API Key in ManageEngine

1. Login to ManageEngine ServiceDesk Plus as an administrator
2. Navigate to **Admin** → **Technicians**
3. Click on a technician account (preferably an admin account)
4. Click **Edit** 
5. Scroll down to **API Key Authentication** section
6. Click **Generate** to create a new API key
7. Copy the generated API key (it will look like: `XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`)

## Step 2: Test the Connection

### Option A: Using the test script

```bash
node scripts/test-manageengine-connection.js YOUR_API_KEY_HERE
```

Example:
```bash
node scripts/test-manageengine-connection.js 12345678-1234-1234-1234-123456789012
```

### Option B: Using the Migration Dashboard

1. Go to **Admin** → **Migration** in the ServiceDesk application
2. Enter your ManageEngine URL (default: `https://127.0.0.1:8081`)
3. Enter your API key
4. Click **Test Connection**

## Step 3: Run Migration

Once connection is successful:

1. Click **Preview** to see what tickets will be imported
2. Review the sample tickets
3. Click **Start Migration** to begin the import process
4. Monitor the progress in real-time

## Troubleshooting

### Connection Failed

#### Issue: "Connection refused"
- **Solution**: Make sure ManageEngine ServiceDesk Plus is running
- Check if you can access it directly at https://127.0.0.1:8081

#### Issue: "Invalid API Key"
- **Solution**: 
  - Verify the API key is correct (no extra spaces)
  - Make sure the technician account is active
  - Regenerate the API key if needed

#### Issue: "SSL Certificate Error"
- **Solution**: This is normal for self-signed certificates. The migration tool automatically handles this.

#### Issue: "API not enabled"
- **Solution**: 
  1. Login to ManageEngine as administrator
  2. Go to **Admin** → **General Settings** → **API**
  3. Enable the REST API

### Common ManageEngine URLs

- **Local installation**: `https://127.0.0.1:8081` or `http://localhost:8080`
- **Server installation**: `https://servicedesk.yourcompany.com`
- **Cloud version**: `https://yourcompany.servicedeskplus.com`

### API Permissions Required

The technician account used for API access needs:
- View access to Requests/Tickets
- View access to Notes/Comments
- View access to Attachments
- View access to Users

## Migration Details

### What Gets Migrated

✅ **Migrated Data:**
- Ticket number and title
- Description
- Status
- Priority  
- Created date
- Modified date
- Requester information
- Technician/assigned to
- Category/Service mapping
- Comments/Notes
- Resolution notes

⚠️ **Stored but Not Fully Mapped:**
- Custom fields (stored in legacyData)
- Attachments (reference only, files need separate migration)
- Approval workflows
- SLA information

❌ **Not Migrated:**
- File attachments (only references)
- Email threads
- Time entries
- Tasks/Activities
- Change/Problem/Asset links

### Field Mapping

| ManageEngine Field | ServiceDesk Field | Notes |
|-------------------|-------------------|-------|
| id | legacyTicketId | Original ticket ID stored for reference |
| subject | title | Ticket title |
| description | description | HTML converted to plain text |
| status.name | status | Mapped to closest status |
| priority.name | priority | LOW/MEDIUM/HIGH/URGENT |
| created_time | createdAt | Preserves original timestamp |
| requester | createdBy | Mapped to user or stored as note |
| technician | assignedTo | Mapped to technician or null |
| category | service | Best match or default service |
| site | branch | Mapped to branch or default |

### Post-Migration

After migration completes:

1. **Verify Data**: Check a sample of migrated tickets
2. **Update References**: Update any external systems referencing old ticket IDs
3. **Train Users**: Show users how to find legacy tickets (marked with "LEGACY" tag)
4. **Archive ManageEngine**: Keep ManageEngine running in read-only mode for reference

## Support

For issues or questions about migration:
1. Check the migration logs in the dashboard
2. Review error details for specific tickets
3. Contact system administrator for API key issues