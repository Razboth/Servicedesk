import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function fixTierHierarchy() {
  console.log('🔧 Fixing tier hierarchy for proper autofill functionality...\n');

  try {
    // Step 1: Analyze CSV expectations
    console.log('📋 Step 1: Analyzing import2.csv hierarchy...');
    const csvPath = join(process.cwd(), 'import2.csv');
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      delimiter: ';'
    });

    // Build expected hierarchy maps
    const hierarchyMap = new Map<string, Set<string>>();
    const itemMap = new Map<string, { subcategory: string, category: string }>();
    const serviceExpectations = new Map<string, { tier1: string, tier2: string, tier3: string }>();

    records.forEach(record => {
      const originalName = record['Original_Service_Name']?.trim();
      const title = record['Title']?.trim();
      const tier1 = record['Tier_1_Category']?.trim();
      const tier2 = record['Tier_2_SubCategory']?.trim();
      const tier3 = record['Tier_3_Service_Type']?.trim();
      
      if (tier1 && tier2) {
        if (!hierarchyMap.has(tier1)) {
          hierarchyMap.set(tier1, new Set());
        }
        hierarchyMap.get(tier1)!.add(tier2);
      }
      
      if (tier2 && tier3) {
        itemMap.set(tier3, { subcategory: tier2, category: tier1 || 'Unknown' });
      }

      if (title && tier1 && tier2 && tier3) {
        serviceExpectations.set(title, { tier1, tier2, tier3 });
        if (originalName && originalName !== title) {
          serviceExpectations.set(originalName, { tier1, tier2, tier3 });
        }
      }
    });

    console.log(`   Found ${hierarchyMap.size} categories with ${Array.from(hierarchyMap.values()).reduce((sum, set) => sum + set.size, 0)} subcategories`);
    console.log(`   Found ${itemMap.size} items`);
    console.log(`   Found ${serviceExpectations.size} service mappings`);

    // Step 2: Get current database state
    console.log('\n🗄️  Step 2: Loading current database state...');
    const categories = await prisma.category.findMany();
    const subcategories = await prisma.subcategory.findMany({
      include: { category: true }
    });
    const items = await prisma.item.findMany({
      include: { 
        subcategory: {
          include: { category: true }
        }
      }
    });

    // Create lookup maps
    const categoryMap = new Map(categories.map(c => [c.name, c]));
    const subcategoryMap = new Map(subcategories.map(s => [`${s.category.name}|${s.name}`, s]));
    const itemMap_db = new Map(items.map(i => [i.name, i]));

    console.log(`   Current: ${categories.length} categories, ${subcategories.length} subcategories, ${items.length} items`);

    // Step 3: Create missing subcategories
    console.log('\n📂 Step 3: Creating missing subcategories...');
    let subcategoriesCreated = 0;

    for (const [categoryName, subcatNames] of hierarchyMap) {
      const category = categoryMap.get(categoryName);
      if (!category) {
        console.log(`   ⚠️  Category "${categoryName}" not found, skipping its subcategories`);
        continue;
      }

      for (const subcatName of subcatNames) {
        const key = `${categoryName}|${subcatName}`;
        if (!subcategoryMap.has(key)) {
          console.log(`   Creating subcategory: "${subcatName}" under "${categoryName}"`);
          
          const newSubcategory = await prisma.subcategory.create({
            data: {
              name: subcatName,
              categoryId: category.id,
              description: `Subcategory for ${subcatName} services`
            },
            include: { category: true }
          });

          // Update our lookup map
          subcategoryMap.set(key, newSubcategory);
          subcategoriesCreated++;
          console.log(`   ✅ Created: "${subcatName}" (${newSubcategory.id})`);
        }
      }
    }

    console.log(`   Created ${subcategoriesCreated} subcategories`);

    // Step 4: Create missing items
    console.log('\n📄 Step 4: Creating missing items...');
    let itemsCreated = 0;

    for (const [itemName, itemInfo] of itemMap) {
      if (!itemMap_db.has(itemName)) {
        const subcategoryKey = `${itemInfo.category}|${itemInfo.subcategory}`;
        const subcategory = subcategoryMap.get(subcategoryKey);
        
        if (!subcategory) {
          console.log(`   ⚠️  Subcategory "${itemInfo.subcategory}" not found for item "${itemName}"`);
          continue;
        }

        console.log(`   Creating item: "${itemName}" under "${itemInfo.subcategory}"`);
        
        const newItem = await prisma.item.create({
          data: {
            name: itemName,
            subcategoryId: subcategory.id,
            description: `Service type for ${itemName}`
          },
          include: { 
            subcategory: {
              include: { category: true }
            }
          }
        });

        // Update our lookup map
        itemMap_db.set(itemName, newItem);
        itemsCreated++;
        console.log(`   ✅ Created: "${itemName}" (${newItem.id})`);
      }
    }

    console.log(`   Created ${itemsCreated} items`);

    // Step 5: Re-map services with proper tier hierarchy
    console.log('\n🎫 Step 5: Re-mapping services with complete tier hierarchy...');
    
    // Refresh our maps with newly created items
    const refreshedSubcategories = await prisma.subcategory.findMany({
      include: { category: true }
    });
    const refreshedItems = await prisma.item.findMany({
      include: { 
        subcategory: {
          include: { category: true }
        }
      }
    });

    // Rebuild maps
    const subcategoryLookup = new Map<string, any>();
    refreshedSubcategories.forEach(sub => {
      subcategoryLookup.set(`${sub.category.name}|${sub.name}`, sub);
    });

    const itemLookup = new Map<string, any>();
    refreshedItems.forEach(item => {
      itemLookup.set(`${item.subcategory.name}|${item.name}`, item);
      // Also allow lookup by item name only for fallback
      itemLookup.set(item.name, item);
    });

    // Process each service expectation
    let servicesUpdated = 0;
    let servicesNotFound = 0;

    for (const [serviceName, expectations] of serviceExpectations) {
      const service = await prisma.service.findFirst({
        where: {
          OR: [
            { name: serviceName },
            { defaultTitle: serviceName }
          ]
        }
      });

      if (!service) {
        console.log(`   ⚠️  Service not found: "${serviceName}"`);
        servicesNotFound++;
        continue;
      }

      const updates: any = {};

      // Find tier 1 category
      const category = categoryMap.get(expectations.tier1);
      if (category) {
        updates.tier1CategoryId = category.id;
      }

      // Find tier 2 subcategory
      const subcategoryKey = `${expectations.tier1}|${expectations.tier2}`;
      const subcategory = subcategoryLookup.get(subcategoryKey);
      if (subcategory) {
        updates.tier2SubcategoryId = subcategory.id;
      }

      // Find tier 3 item
      const itemKey = `${expectations.tier2}|${expectations.tier3}`;
      let item = itemLookup.get(itemKey);
      if (!item) {
        // Fallback to item name only
        item = itemLookup.get(expectations.tier3);
      }
      if (item) {
        updates.tier3ItemId = item.id;
      }

      // Update service if we have all three tiers
      if (updates.tier1CategoryId && updates.tier2SubcategoryId && updates.tier3ItemId) {
        await prisma.service.update({
          where: { id: service.id },
          data: updates
        });

        console.log(`   ✅ Updated "${service.name}": ${expectations.tier1} → ${expectations.tier2} → ${expectations.tier3}`);
        servicesUpdated++;
      } else {
        console.log(`   ⚠️  Incomplete mapping for "${service.name}": T1=${!!updates.tier1CategoryId} T2=${!!updates.tier2SubcategoryId} T3=${!!updates.tier3ItemId}`);
      }
    }

    // Step 6: Verification
    console.log('\n✅ Step 6: Final verification...');
    
    const verificationServices = await prisma.service.findMany({
      include: {
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true
      },
      where: {
        tier1CategoryId: { not: null }
      }
    });

    let completeServices = 0;
    let incompleteServices = 0;

    verificationServices.forEach(service => {
      if (service.tier1CategoryId && service.tier2SubcategoryId && service.tier3ItemId) {
        completeServices++;
      } else {
        incompleteServices++;
        console.log(`   ⚠️  Still incomplete: "${service.name}" - T1: ${service.tier1Category?.name || 'NULL'}, T2: ${service.tier2Subcategory?.name || 'NULL'}, T3: ${service.tier3Item?.name || 'NULL'}`);
      }
    });

    console.log(`\n📊 Final Results:`);
    console.log(`   Subcategories created: ${subcategoriesCreated}`);
    console.log(`   Items created: ${itemsCreated}`);
    console.log(`   Services updated: ${servicesUpdated}`);
    console.log(`   Services not found: ${servicesNotFound}`);
    console.log(`   Complete tier mappings: ${completeServices}`);
    console.log(`   Incomplete tier mappings: ${incompleteServices}`);

    if (incompleteServices === 0) {
      console.log(`\n🎉 All services now have complete tier hierarchy! Autofill should work perfectly.`);
    } else {
      console.log(`\n⚠️  ${incompleteServices} services still have incomplete tier mappings. Check the logs above for details.`);
    }

  } catch (error) {
    console.error('❌ Error fixing tier hierarchy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing script
if (require.main === module) {
  fixTierHierarchy()
    .then(() => {
      console.log('\n🎉 Tier hierarchy fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tier hierarchy fix failed:', error);
      process.exit(1);
    });
}

export default fixTierHierarchy;