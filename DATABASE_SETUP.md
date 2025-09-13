# Database Setup Guide

## Recent Schema Changes

### OS and Office Type Management (Latest)
The system now uses a type-based approach for managing OS and Office products instead of license management.

#### New Tables
- `operating_systems` - Stores OS types (Windows, Linux, macOS, etc.)
- `office_products` - Stores Office product types (Microsoft 365, LibreOffice, etc.)

#### Updated Tables
- `pc_assets` - Now references `operatingSystemId` and `officeProductId` instead of string fields

### Running Migrations

```bash
# Generate Prisma client after schema changes
npm run db:generate

# Push schema changes to database (development)
npm run db:push

# Create a new migration (production)
npx prisma migrate dev --name your-migration-name

# Apply migrations in production
npx prisma migrate deploy
```

## Seeding Data

### Full Database Seed
```bash
# Run all seeds
npm run db:seed
```

### Individual Seeds

#### OS and Office Types
```bash
# Seed OS types (Windows, Linux, macOS) and Office products
npx tsx scripts/seed-os-office-types.ts
```

#### Vendor Management
Vendors are created through the UI at `/admin/vendors`. No seed script required.

#### PC Assets
PC assets should be created through the UI at `/admin/pc-assets` after:
1. Setting up OS and Office types
2. Creating branches
3. Creating users

### Other Available Seeds
```bash
# Network monitoring templates
npm run db:seed:network

# ATM claim templates  
npm run db:seed:atm-claims

# SOC-related data
npm run db:seed:soc

# Consolidated seed (all core data)
npm run db:seed:consolidated

# Idempotent seed (safe to run multiple times)
npm run db:seed:idempotent
```

## Database Schema Updates

After pulling latest changes:

1. **Update Prisma Client**
   ```bash
   npm run db:generate
   ```

2. **Apply Schema Changes**
   ```bash
   # Development
   npm run db:push
   
   # Production (with migration history)
   npx prisma migrate deploy
   ```

3. **Seed New Data**
   ```bash
   # OS and Office types (required for PC asset management)
   npx tsx scripts/seed-os-office-types.ts
   ```

## Troubleshooting

### Schema Drift
If you encounter schema drift errors:
```bash
# Development only - resets database
npx prisma migrate reset

# Then re-seed
npm run db:seed
```

### Missing Types in PC Asset Creation
If OS or Office dropdowns are empty:
```bash
npx tsx scripts/seed-os-office-types.ts
```

### Connection Issues
Check `.env` file for correct `DATABASE_URL`:
```
DATABASE_URL="postgresql://username:password@localhost:5432/servicedesk_database"
```

## Important Notes

1. **Never run `migrate reset` in production** - it drops all data
2. **Always backup before major migrations**
3. **Test migrations in development first**
4. **The system uses soft deletes** - data is marked inactive rather than deleted