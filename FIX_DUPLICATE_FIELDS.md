# Fix Duplicate Custom Fields Issue

## Problem Summary

After running the morning's seeding scripts (commit 5987705e), duplicate custom field relationships were created in the database. This happened because:

1. **Multiple Seeding Scripts**: `seed-field-templates.ts` and potentially other scripts ran multiple times
2. **No Unique Constraints**: Database allowed duplicate service-field relationships
3. **Create vs Upsert**: Scripts used `create()` instead of `upsert()`, causing duplicates on re-runs

## Solution Components

### 1. Database Cleanup (Required First)

Run the deduplication script to clean existing duplicates:

```bash
# In Windows PowerShell/Command Prompt (where your database runs):
cd C:\Project\servicedesk6
npx tsx prisma/deduplicate-service-fields.ts
```

This script will:
- ✅ Find and remove duplicate `ServiceFieldTemplate` records
- ✅ Find and remove duplicate `ServiceField` records  
- ✅ Keep the oldest record for each duplicate set
- ✅ Provide detailed cleanup statistics

### 2. Add Database Constraints (Prevents Future Issues)

Apply the database migration to add unique constraints:

```bash
# Generate and push the schema changes
npx prisma db push

# Or run the migration manually if needed:
npx prisma migrate deploy
```

This adds:
- ✅ Unique constraint on `ServiceFieldTemplate(serviceId, fieldTemplateId)`
- ✅ Unique constraint on `ServiceField(serviceId, name)`

### 3. Update Seeding Scripts (Prevention)

The seeding scripts have been updated to use `upsert` instead of `create`:

- ✅ `prisma/seed-field-templates.ts` - Uses `upsert` for safe re-runs
- ✅ Database schema includes unique constraints
- ✅ Error handling improved for duplicate prevention

## Verification Steps

After running the cleanup and applying constraints:

### 1. Check Database State
```bash
# Run this to verify cleanup worked:
npx tsx check-duplicates.ts
```

### 2. Test Dynamic Fields
1. Navigate to the ticket creation page
2. Select a service with custom fields
3. Verify that:
   - ✅ Dynamic fields appear
   - ✅ Fields can be typed into
   - ✅ No controlled/uncontrolled input errors
   - ✅ Autofill works correctly

### 3. Check Admin Services
1. Go to `/admin/services`
2. Edit a service with many fields
3. Verify field counts are reasonable (not duplicated)

## Files Modified/Created

### New Files:
- `prisma/deduplicate-service-fields.ts` - Cleanup script
- `prisma/migrations/20250804120000_add_unique_constraint_service_field/migration.sql` - Schema migration
- `FIX_DUPLICATE_FIELDS.md` - This documentation

### Modified Files:
- `prisma/schema.prisma` - Added unique constraint to ServiceField
- `components/tickets/ticket-form.tsx` - Fixed controlled/uncontrolled input issues (already done)

## Expected Results

After applying all fixes:

- **Database**: Clean, no duplicate field relationships
- **Ticket Form**: Dynamic fields work perfectly with autofill
- **Admin Panel**: Services show correct field counts
- **Future Safety**: Seeding scripts can be re-run without creating duplicates

## Troubleshooting

### If Deduplication Fails:
1. Check database connection in Windows
2. Ensure PostgreSQL is running
3. Verify `.env` file has correct DATABASE_URL

### If Fields Still Don't Work:
1. Clear browser cache and reload
2. Check browser console for JavaScript errors
3. Verify the development server restarted after changes

### If Duplicates Return:
1. Check which seeding scripts are being run
2. Ensure they use `upsert` instead of `create`
3. Verify unique constraints are applied in database

## Prevention for Future

- ✅ Always use `upsert` in seeding scripts
- ✅ Add unique constraints for critical relationships
- ✅ Test seeding scripts multiple times before production
- ✅ Use transaction rollback for failed operations

## Contact

If issues persist, the problem likely involves:
1. Database connectivity between WSL and Windows
2. Migration not applied correctly
3. Caching issues in the application

The fix is comprehensive and should resolve all duplicate field issues.