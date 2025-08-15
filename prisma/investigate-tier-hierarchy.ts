import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function investigateTierHierarchy() {
  console.log('🔍 Investigating current tier hierarchy in database...\n');

  try {
    // 1. Check Categories (Tier 1)
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    console.log(`📁 Categories (Tier 1): ${categories.length} found`);
    categories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.id})`);
    });

    // 2. Check Subcategories (Tier 2) 
    const subcategories = await prisma.subcategory.findMany({
      include: { category: true },
      orderBy: { name: 'asc' }
    });
    console.log(`\n📂 Subcategories (Tier 2): ${subcategories.length} found`);
    subcategories.forEach(sub => {
      console.log(`  - ${sub.name} → under "${sub.category.name}" (${sub.id})`);
    });

    // 3. Check Items (Tier 3)
    const items = await prisma.item.findMany({
      include: { 
        subcategory: {
          include: { category: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    console.log(`\n📄 Items (Tier 3): ${items.length} found`);
    items.forEach(item => {
      console.log(`  - ${item.name} → under "${item.subcategory.name}" → "${item.subcategory.category.name}" (${item.id})`);
    });

    // 4. Check Services with Tier Mappings
    const services = await prisma.service.findMany({
      include: {
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true
      },
      where: {
        OR: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n🎫 Services with Tier Mappings: ${services.length} found`);
    let incompleteCount = 0;
    services.forEach(service => {
      const tier1 = service.tier1Category?.name || 'NULL';
      const tier2 = service.tier2Subcategory?.name || 'NULL';
      const tier3 = service.tier3Item?.name || 'NULL';
      
      const isIncomplete = !service.tier2SubcategoryId && (service.tier1CategoryId || service.tier3ItemId);
      if (isIncomplete) incompleteCount++;
      
      console.log(`  ${isIncomplete ? '⚠️ ' : '✅ '} ${service.name}`);
      console.log(`    T1: ${tier1} | T2: ${tier2} | T3: ${tier3}`);
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Incomplete mappings (missing tier2): ${incompleteCount}`);
    console.log(`   Complete mappings: ${services.length - incompleteCount}`);

    // 5. Analyze import2.csv hierarchy expectations
    console.log(`\n📋 Analyzing import2.csv hierarchy expectations...`);
    const csvPath = join(process.cwd(), 'import2.csv');
    const fileContent = readFileSync(csvPath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      delimiter: ';'
    });

    const hierarchyMap = new Map<string, Set<string>>();
    const itemMap = new Map<string, string>();

    records.forEach(record => {
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
        itemMap.set(`${tier2}|${tier3}`, tier1 || 'Unknown');
      }
    });

    console.log(`\n🎯 Expected Hierarchy from CSV:`);
    for (const [category, subcats] of hierarchyMap) {
      console.log(`  📁 ${category}:`);
      for (const subcat of subcats) {
        console.log(`    📂 ${subcat}`);
        
        // Show items under this subcategory
        for (const [key, parentCat] of itemMap) {
          if (key.startsWith(subcat + '|') && parentCat === category) {
            const itemName = key.split('|')[1];
            console.log(`      📄 ${itemName}`);
          }
        }
      }
    }

    // 6. Identify Missing Subcategories
    console.log(`\n🔍 Missing Subcategories Analysis:`);
    const existingSubcategoryNames = new Set(subcategories.map(s => `${s.category.name}|${s.name}`));
    const missingSubcategories: { category: string, subcategory: string }[] = [];

    for (const [category, subcats] of hierarchyMap) {
      for (const subcat of subcats) {
        const key = `${category}|${subcat}`;
        if (!existingSubcategoryNames.has(key)) {
          missingSubcategories.push({ category, subcategory: subcat });
        }
      }
    }

    if (missingSubcategories.length > 0) {
      console.log(`  ❌ Found ${missingSubcategories.length} missing subcategories:`);
      missingSubcategories.forEach(missing => {
        console.log(`    - "${missing.subcategory}" under "${missing.category}"`);
      });
    } else {
      console.log(`  ✅ All expected subcategories exist in database`);
    }

    // 7. Identify Missing Items
    console.log(`\n🔍 Missing Items Analysis:`);
    const existingItemNames = new Set(items.map(i => `${i.subcategory.name}|${i.name}`));
    const missingItems: { subcategory: string, item: string, category: string }[] = [];

    for (const [key, category] of itemMap) {
      if (!existingItemNames.has(key)) {
        const [subcategory, item] = key.split('|');
        missingItems.push({ subcategory, item, category });
      }
    }

    if (missingItems.length > 0) {
      console.log(`  ❌ Found ${missingItems.length} missing items:`);
      missingItems.forEach(missing => {
        console.log(`    - "${missing.item}" under "${missing.subcategory}" (${missing.category})`);
      });
    } else {
      console.log(`  ✅ All expected items exist in database`);
    }

    console.log(`\n✅ Tier hierarchy investigation completed!`);
    console.log(`\n📝 Next Steps:`);
    if (missingSubcategories.length > 0) {
      console.log(`   1. Create ${missingSubcategories.length} missing subcategories`);
    }
    if (missingItems.length > 0) {
      console.log(`   2. Create ${missingItems.length} missing items`);
    }
    if (incompleteCount > 0) {
      console.log(`   3. Re-map ${incompleteCount} services with incomplete tier mappings`);
    }
    console.log(`   4. Test tier categorization autofill functionality`);

  } catch (error) {
    console.error('❌ Error investigating tier hierarchy:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing script
if (require.main === module) {
  investigateTierHierarchy()
    .then(() => {
      console.log('\n🎉 Investigation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Investigation failed:', error);
      process.exit(1);
    });
}

export default investigateTierHierarchy;