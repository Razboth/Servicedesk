# Instructions to Seed Tier Categories and Update Services

## Updated: Fixed scripts for Tier 3 (Items) issue

Since you're running in a Windows environment with WSL, you need to run these commands in Windows (not in WSL).

## Steps to Execute:

### 1. First, regenerate Prisma Client in Windows

Open a Windows Command Prompt or PowerShell in the project directory and run:

```cmd
cd C:\Project\servicedesk6
npx prisma generate
```

### 2. Seed the Tier Categories from CSV

This will create the 3-tier category structure from your import1.csv file:

```cmd
npx tsx prisma/seed-tier-categories.ts
```

This script will:
- Read the import1.csv file
- Create all unique Tier 1 categories (like "Information Security", "ATM Services", etc.)
- Create all Tier 2 subcategories under their respective categories
- Create all Tier 3 items under their respective subcategories
- Show you the IDs for the Information Security structure

### 3. Update Services with Tier IDs

After seeding the categories, run this to update all services with the correct tier IDs:

```cmd
npx tsx prisma/update-services-tiers.ts
```

This script will:
- Read the import1.csv file
- Find each service by its name or title
- Update the service with the correct tier1CategoryId, tier2SubcategoryId, and tier3ItemId
- Show you which services were updated and which weren't found

### 4. Check Current Data (Optional)

If you want to see what's currently in your database before or after running the scripts:

```cmd
npx tsx prisma/check-tier-data.ts
```

This will show you:
- The Information Security category structure
- The current tier assignments for the Information Security Request service
- All items available in each subcategory

### 5. Verify in Admin Panel

After running these scripts:
1. Go to the admin services page (`/admin/services`)
2. Find the "Information Security Request" service
3. You should now see that it has all three tier fields populated
4. If you need to make any adjustments, you can edit and save the service

### Alternative Fix: If Tier 3 (Item) is still not working

If the Information Security Request service has Tier 1 and Tier 2 set but Tier 3 is still empty, run this specific fix:

```cmd
npx tsx prisma/fix-info-security-tier3.ts
```

This script will:
- Find the Information Security Request service
- Look for the appropriate item in the Security Services subcategory
- Automatically assign it to the service

### Manual Database Update

If you prefer, you can also manually run this SQL query in your PostgreSQL database to check the Information Security service:

```sql
SELECT 
  s.id,
  s.name,
  s.tier1_category_id,
  c.name as tier1_name,
  s.tier2_subcategory_id,
  sub.name as tier2_name,
  s.tier3_item_id,
  i.name as tier3_name
FROM services s
LEFT JOIN categories c ON s.tier1_category_id = c.id
LEFT JOIN subcategories sub ON s.tier2_subcategory_id = sub.id
LEFT JOIN items i ON s.tier3_item_id = i.id
WHERE s.name = 'Information Security Request'
OR s.default_title = 'Information Security Request';
```

This will show you the current state of the service and its tier assignments.