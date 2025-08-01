import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function updateServicesTiers() {
  console.log('🔄 Updating Services with Tier Category IDs from CSV...');

  try {
    // Read and parse the CSV file
    const csvPath = join(process.cwd(), 'import1.csv');
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      delimiter: ';'
    });

    // Build maps for quick lookup
    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, string>();
    const itemMap = new Map<string, string>();

    // Load all categories
    const categories = await prisma.category.findMany();
    categories.forEach(cat => categoryMap.set(cat.name, cat.id));

    // Load all subcategories with their categories
    const subcategories = await prisma.subcategory.findMany({
      include: { category: true }
    });
    subcategories.forEach(sub => {
      const key = `${sub.category.name}|${sub.name}`;
      subcategoryMap.set(key, sub.id);
    });

    // Load all items with their subcategories
    const items = await prisma.item.findMany({
      include: { 
        subcategory: {
          include: { category: true }
        }
      }
    });
    items.forEach(item => {
      const key = `${item.subcategory.name}|${item.name}`;
      itemMap.set(key, item.id);
      // Also add without subcategory prefix for debugging
      itemMap.set(item.name, item.id);
    });
    
    console.log('Item map sample entries:', Array.from(itemMap.entries()).slice(0, 5));

    console.log(`Found ${categories.length} categories, ${subcategories.length} subcategories, ${items.length} items`);

    // Process each record and update matching services
    let updatedCount = 0;
    let notFoundCount = 0;

    for (const record of records) {
      const originalName = record['Original_Service_Name']?.trim();
      const title = record['Title']?.trim();
      const tier1 = record['Tier_1_Category']?.trim();
      const tier2 = record['Tier_2_SubCategory']?.trim();
      const tier3 = record['Tier_3_Service_Type']?.trim();

      if (!originalName || !title) continue;

      // Find the service by name or title
      const service = await prisma.service.findFirst({
        where: {
          OR: [
            { name: originalName },
            { name: title },
            { defaultTitle: title }
          ]
        }
      });

      if (service) {
        const updates: any = {};

        // Find tier 1 category ID
        if (tier1) {
          const categoryId = categoryMap.get(tier1);
          if (categoryId) {
            updates.tier1CategoryId = categoryId;
          }
        }

        // Find tier 2 subcategory ID
        if (tier1 && tier2) {
          const subcategoryKey = `${tier1}|${tier2}`;
          const subcategoryId = subcategoryMap.get(subcategoryKey);
          if (subcategoryId) {
            updates.tier2SubcategoryId = subcategoryId;
          }
        }

        // Find tier 3 item ID
        if (tier2 && tier3) {
          const itemKey = `${tier2}|${tier3}`;
          let itemId = itemMap.get(itemKey);
          
          // Try alternate lookup if primary fails
          if (!itemId) {
            itemId = itemMap.get(tier3);
            if (itemId) {
              console.log(`  Found item by name only: ${tier3}`);
            }
          }
          
          if (itemId) {
            updates.tier3ItemId = itemId;
          } else {
            console.log(`  ⚠️ Could not find item: "${tier3}" with subcategory "${tier2}"`);
          }
        }

        // Update the service if we have any tier updates
        if (Object.keys(updates).length > 0) {
          await prisma.service.update({
            where: { id: service.id },
            data: updates
          });
          
          console.log(`✓ Updated service "${service.name}" with:`, updates);
          updatedCount++;
        }
      } else {
        console.log(`⚠️  Service not found for: ${originalName} / ${title}`);
        notFoundCount++;
      }
    }

    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updatedCount} services`);
    console.log(`   Not found: ${notFoundCount} services`);

    // Show the Information Security Request service details
    const infoSecService = await prisma.service.findFirst({
      where: {
        OR: [
          { name: 'Information Security Request' },
          { defaultTitle: 'Information Security Request' }
        ]
      },
      include: {
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true
      }
    });

    if (infoSecService) {
      console.log('\n📋 Information Security Request Service:');
      console.log(`   Service ID: ${infoSecService.id}`);
      console.log(`   Name: ${infoSecService.name}`);
      console.log(`   Tier 1: ${infoSecService.tier1Category?.name || 'Not set'} (${infoSecService.tier1CategoryId || 'null'})`);
      console.log(`   Tier 2: ${infoSecService.tier2Subcategory?.name || 'Not set'} (${infoSecService.tier2SubcategoryId || 'null'})`);
      console.log(`   Tier 3: ${infoSecService.tier3Item?.name || 'Not set'} (${infoSecService.tier3ItemId || 'null'})`);
    }

  } catch (error) {
    console.error('❌ Error updating services:', error);
    throw error;
  }
}

async function main() {
  try {
    await updateServicesTiers();
  } catch (error) {
    console.error('❌ Error in main:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default main;