# Checklist V2 Production Migration

This document describes the migration from the old unit-based checklist system to the new type-based system.

## Changes Overview

| Before | After |
|--------|-------|
| 2 Units: IT_OPERATIONS, MONITORING | 3 Types: IT_INFRASTRUKTUR, KEAMANAN_SIBER, FRAUD_COMPLIANCE |
| 5 Shift types | 2 Shifts: SHIFT_SIANG (08:00-20:00), SHIFT_MALAM (20:00-08:00) |
| Unit-based assignments | Type-based with Buddy System |

## Migration Files

1. **`checklist_v2_publish.sql`** - Main migration script
2. **`checklist_v2_publish_rollback.sql`** - Rollback script (if needed)

## Pre-Migration Checklist

- [ ] Backup the database
- [ ] Deploy V2 code changes first
- [ ] Test in staging environment
- [ ] Schedule maintenance window

## Migration Steps

### Step 1: Backup Database
```bash
pg_dump -h <host> -U <user> -d <database> > backup_before_v2_migration.sql
```

### Step 2: Run Migration
```bash
psql -h <host> -U <user> -d <database> -f prisma/migrations/checklist_v2_publish.sql
```

### Step 3: Verify Migration
Check the migration output for:
- "Data integrity check passed!"
- "Shift type migration check passed!"
- Migration summary showing record counts

### Step 4: Test Application
- [ ] Admin can view standby pool with 3 checklist types
- [ ] Assignments show 3 types
- [ ] Technicians see correct checklist types
- [ ] Supervisor dashboard works

## Rollback (If Needed)

If issues are found after migration:
```bash
psql -h <host> -U <user> -d <database> -f prisma/migrations/checklist_v2_publish_rollback.sql
```

**Note:** Rollback will restore the `unit` columns but data will be mapped from the new `checklistType` values:
- IT_INFRASTRUKTUR → IT_OPERATIONS
- KEAMANAN_SIBER → MONITORING
- FRAUD_COMPLIANCE → MONITORING

## Post-Migration

After successful migration:
1. Run `npx prisma generate` to update Prisma client
2. Verify all API endpoints work
3. Monitor error logs for 24 hours
4. Remove backup after 7 days (if no issues)

## Data Mapping

### Unit → ChecklistType
| Old Unit | New ChecklistType |
|----------|-------------------|
| IT_OPERATIONS | IT_INFRASTRUKTUR |
| MONITORING | IT_INFRASTRUKTUR |

### Old Shift Types → New Shift Types
| Old ShiftType | New ShiftType |
|---------------|---------------|
| HARIAN_KANTOR | SHIFT_SIANG |
| STANDBY_LEMBUR | SHIFT_SIANG |
| SHIFT_SIANG_WEEKEND | SHIFT_SIANG |
| SHIFT_MALAM | SHIFT_MALAM |
| SHIFT_SIANG | SHIFT_SIANG |

## Support

If you encounter issues during migration, check:
1. PostgreSQL error logs
2. Application error logs
3. Database connection settings
