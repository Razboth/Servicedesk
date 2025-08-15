# Database Seeding Guide

This guide explains the improved seeding system that prevents duplications and errors when running seeds multiple times or on different server instances.

## Overview

The new idempotent seeding system ensures that:
- ✅ No duplicate records are created when running seeds multiple times
- ✅ Relationships are properly validated before creation
- ✅ Failed seeds roll back completely (transactional integrity)
- ✅ Detailed logging shows what was created, updated, or skipped
- ✅ Validation checks prevent common errors before seeding

## Available Scripts

```bash
# Validate database before seeding
npm run db:seed:validate

# Run the new idempotent seed (recommended)
npm run db:seed:idempotent

# Legacy seed scripts (not recommended)
npm run db:seed              # Original seed - may cause duplicates
npm run db:seed:consolidated  # Partially fixed seed
```

## Step-by-Step Usage

### 1. First-Time Setup

```bash
# Update schema with unique constraints
npm run db:schema:update

# Apply migrations
npm run db:migrate

# Validate database
npm run db:seed:validate

# Run idempotent seed
npm run db:seed:idempotent
```

### 2. Re-running Seeds (Safe)

```bash
# Always validate first
npm run db:seed:validate

# Run seed - will skip existing records
npm run db:seed:idempotent
```

### 3. Fresh Database Seed

```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Seed with initial data
npm run db:seed:idempotent
```

## Features

### Idempotent Operations

All create operations use `upsert` with unique constraints:

```typescript
// Example: Creating a branch
await prisma.branch.upsert({
  where: { code: 'MND001' },
  update: { name: 'Manado Main Branch', isActive: true },
  create: { code: 'MND001', name: 'Manado Main Branch', ... }
})
```

### Transaction Safety

All seed operations run in a transaction:

```typescript
await prisma.$transaction(async (tx) => {
  // All operations here
  // If any fail, everything rolls back
})
```

### Detailed Logging

The seed provides color-coded output:
- 🔵 Info messages
- ✅ Success messages
- ⚠️ Warnings
- ❌ Errors

### Validation Checks

Before seeding, the validator checks:
- Database connectivity
- Existing data counts
- Duplicate records
- Orphaned relationships
- Missing required files

## Common Issues and Solutions

### Issue: Duplicate Key Error

**Cause**: Records with same unique key already exist
**Solution**: Run `npm run db:seed:idempotent` instead of legacy seeds

### Issue: Foreign Key Constraint Error

**Cause**: Trying to create relationship to non-existent record
**Solution**: The idempotent seed creates records in correct order

### Issue: CSV File Not Found

**Cause**: Missing import1.csv file
**Solution**: Services will be created without CSV data, or provide the CSV file

### Issue: Transaction Rollback

**Cause**: Any error during seeding
**Solution**: Fix the reported error and run again - no partial data remains

## Data Created

The idempotent seed creates:

1. **Support Groups**
   - IT_HELPDESK
   - NETWORK_ADMIN
   - DATABASE_ADMIN
   - APPLICATION_SUPPORT
   - INFRASTRUCTURE

2. **Branches**
   - Manado Main Branch (MND001)
   - Tomohon Branch (TMH001)
   - Bitung Branch (BTG001)

3. **Users**
   - admin@banksulutgo.co.id (ADMIN)
   - manager@banksulutgo.co.id (MANAGER)
   - tech@banksulutgo.co.id (TECHNICIAN)
   - user@banksulutgo.co.id (USER)
   - Password for all: `password123`

4. **Categories** (from CSV)
   - 3-tier hierarchy: Category → Subcategory → Item

5. **Services** (from CSV)
   - Mapped to categories with SLA times

6. **Field Templates**
   - Customer information fields
   - Technical detail fields
   - ATM-specific fields

## Best Practices

1. **Always validate before seeding**
   ```bash
   npm run db:seed:validate
   ```

2. **Use idempotent seed for all environments**
   ```bash
   npm run db:seed:idempotent
   ```

3. **Check logs for warnings**
   - Even if seeding succeeds, warnings indicate potential issues

4. **For production deployments**
   - Test seed on staging first
   - Back up database before seeding
   - Run validation to check existing data

5. **Custom modifications**
   - Edit `prisma/seed-idempotent.ts`
   - Maintain upsert pattern for new data
   - Add to transaction block

## Troubleshooting

Enable detailed Prisma logging:

```bash
DEBUG=prisma:query npm run db:seed:idempotent
```

Check database directly:

```bash
npm run db:studio
```

Reset and start fresh (development only):

```bash
npx prisma migrate reset
npm run db:seed:idempotent
```