# Database Seeding Guide

This guide explains how to seed the Bank SulutGo ServiceDesk database with comprehensive test data.

## Overview

The consolidated seed file (`prisma/seed-consolidated.ts`) creates a complete, production-ready database structure with all necessary data to test and demonstrate the application functionality.

## What Gets Created

### 1. Support Groups (6 Groups)
- **IT Helpdesk** - General IT support and helpdesk services
- **Network Administration** - Network infrastructure and connectivity support  
- **Application Support** - Business application support and maintenance
- **Security Operations** - Information security and compliance
- **Database Administration** - Database management and optimization
- **Hardware Support** - Hardware maintenance and troubleshooting

### 2. Branches & ATMs (5 Branches, 9 ATMs)
- **Manado Main Branch** (MND001) - 2 ATMs
- **Tomohon Branch** (TMH001) - 2 ATMs  
- **Bitung Branch** (BTG001) - 2 ATMs
- **Kotamobagu Branch** (KTG001) - 1 ATM
- **Airmadidi Branch** (AMD001) - 1 ATM

### 3. Users (10 Users)
- **2 Administrators** (superadmin, admin)
- **2 Branch Managers** (Manado, Tomohon)
- **3 Technicians** (IT Helpdesk, Network, Application Support)
- **3 Branch Users** (Manado, Tomohon, Bitung)

All users have password: `password123`

### 4. Service Catalog Structure
- **3-Tier Categories** from CSV import (Categories → Subcategories → Items)
- **Legacy Service Categories** for backward compatibility
- **200+ Services** imported from CSV with proper support group assignments
- **SLA Configuration** with response and resolution times

### 5. Field Templates & Service Mappings
- **50+ Field Templates** organized by category:
  - Customer Information (Name, Account, Card, Phone)
  - ATM Information (ID, Location, Serial Number, etc.)
  - User Account (Name, Code, Email, Position, etc.)
  - Transaction Information (Amount, Date, ID, etc.)
  - Error Information (Description, Chronology)  
  - Location Information (Location, Complaint)
  - Approval Information (Approval Date)
  - ATM Reconciliation (ATM List, Discrepancy Type, etc.)

- **Automatic Service-Field Mapping** based on service name patterns

### 6. Sample Tickets (4 Tickets)
- ATM Terminal Registration Request (PENDING_APPROVAL)
- Application Error Report (IN_PROGRESS)  
- Network Connectivity Issue (OPEN)
- User Access Request (RESOLVED)

## Usage

### Prerequisites
1. PostgreSQL database running
2. Database connection configured in `.env`
3. Prisma client generated (`npm run db:generate`)
4. CSV files present: `import1.csv` (required)

### Running the Consolidated Seed

```bash
# Generate Prisma client first
npm run db:generate

# Run the consolidated seed
npm run db:seed:consolidated
```

### Alternative: Run JavaScript version directly
```bash
node prisma/seed-consolidated.js
```

## Important Notes

### Data Safety
- The seed is **idempotent** - it can be run multiple times safely
- Existing records are preserved (no duplicates created)
- Only missing data is added

### Dependencies
- **Support Groups** must exist first (created automatically)
- **CSV Import** requires `import1.csv` in the project root
- **Branch Structure** must be established before users

### CSV Format
The seed expects `import1.csv` with these columns:
- `Tier_1_Category` - Top-level category
- `Tier_2_SubCategory` - Middle-level subcategory  
- `Tier_3_Service_Type` - Bottom-level item/service type
- `Title` - Service name
- `Original_Service_Name` - Original service identifier
- `Priority` - Service priority (Low/Medium/High/Critical)
- `Resolution_Time` - SLA resolution time
- `First_Response` - SLA response time
- `ITIL_Category` - ITIL category (Incident/Service Request/etc.)
- `Issue_Classification` - Issue type classification

## Verification

After seeding, verify the data:

```bash
# Open Prisma Studio to browse data
npm run db:studio

# Or check via SQL
psql [connection-string]
SELECT 
  'Support Groups' as type, COUNT(*)::text as count FROM support_groups
UNION ALL
SELECT 'Branches', COUNT(*)::text FROM branches  
UNION ALL
SELECT 'ATMs', COUNT(*)::text FROM "atms"
UNION ALL  
SELECT 'Users', COUNT(*)::text FROM users
UNION ALL
SELECT 'Services', COUNT(*)::text FROM services
UNION ALL
SELECT 'Field Templates', COUNT(*)::text FROM field_templates
UNION ALL
SELECT 'Tickets', COUNT(*)::text FROM tickets;
```

Expected output:
```
     type      | count 
---------------+-------
 Support Groups|   6
 Branches      |   5
 ATMs          |   9
 Users         |  10
 Services      | 200+
 Field Templates| 50+
 Tickets       |   4
```

## Login Credentials

After seeding, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@banksulutgo.co.id | password123 |
| Admin | admin@banksulutgo.co.id | password123 |
| Manager | manager.manado@banksulutgo.co.id | password123 |
| Technician | tech.helpdesk@banksulutgo.co.id | password123 |
| User | user.manado@banksulutgo.co.id | password123 |

## Troubleshooting

### Error: "Support groups not found"
Ensure the support groups are created first. The seed will create them automatically.

### Error: "import1.csv not found"  
Place the CSV file in the project root directory, same level as `package.json`.

### Error: "Database connection failed"
Check your `.env` file has the correct `DATABASE_URL`.

### Error: "Prisma client not generated"
Run `npm run db:generate` first.

## Development

To modify the seed data:
1. Edit `prisma/seed-consolidated.ts`
2. Recompile: `npx tsc prisma/seed-consolidated.ts --outDir prisma --skipLibCheck --esModuleInterop --target es2017 --moduleResolution node`
3. Run: `npm run db:seed:consolidated`

The seed file is structured with individual functions for each data type, making it easy to modify specific sections without affecting others.