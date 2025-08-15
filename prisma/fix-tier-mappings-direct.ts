import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTierMappingsDirect() {
  console.log('🔧 Fixing tier mappings directly using database relationships...\n');

  try {
    // Step 1: Get all services with incomplete tier mappings
    console.log('📋 Step 1: Getting services with incomplete tier mappings...');
    
    const incompleteServices = await prisma.service.findMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: null },
          { tier3ItemId: { not: null } }
        ]
      },
      include: {
        tier1Category: true,
        tier3Item: {
          include: {
            subcategory: {
              include: {
                category: true
              }
            }
          }
        }
      }
    });

    console.log(`   Found ${incompleteServices.length} services with incomplete tier mappings`);

    // Step 2: Fix each service by finding the correct subcategory
    console.log('\n🔧 Step 2: Fixing tier mappings...');
    
    let fixedCount = 0;
    let errorCount = 0;

    for (const service of incompleteServices) {
      try {
        // Get the subcategory from the tier3 item
        const correctSubcategory = service.tier3Item?.subcategory;
        
        if (correctSubcategory) {
          // Verify that this subcategory belongs to the same tier1 category
          if (correctSubcategory.categoryId === service.tier1CategoryId) {
            // Update the service with the correct tier2 subcategory
            await prisma.service.update({
              where: { id: service.id },
              data: {
                tier2SubcategoryId: correctSubcategory.id
              }
            });

            console.log(`   ✅ Fixed "${service.name}"`);
            console.log(`      T1: ${service.tier1Category?.name} → T2: ${correctSubcategory.name} → T3: ${service.tier3Item?.name}`);
            fixedCount++;
          } else {
            console.log(`   ⚠️  Tier mismatch for "${service.name}": T1 category "${service.tier1Category?.name}" doesn't match T3 item's category "${correctSubcategory.category.name}"`);
            errorCount++;
          }
        } else {
          console.log(`   ⚠️  No subcategory found for "${service.name}" tier3 item`);
          errorCount++;
        }
      } catch (error) {
        console.log(`   ❌ Error fixing "${service.name}":`, error);
        errorCount++;
      }
    }

    // Step 3: Handle services with missing tier3 items
    console.log('\n🔧 Step 3: Checking services with only tier1 mappings...');
    
    const tier1OnlyServices = await prisma.service.findMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: null },
          { tier3ItemId: null }
        ]
      },
      include: {
        tier1Category: true
      }
    });

    console.log(`   Found ${tier1OnlyServices.length} services with only tier1 mappings`);

    // Step 4: Final verification
    console.log('\n✅ Step 4: Final verification...');
    
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
    let remainingIncompleteServices = 0;

    verificationServices.forEach(service => {
      if (service.tier1CategoryId && service.tier2SubcategoryId && service.tier3ItemId) {
        completeServices++;
      } else {
        remainingIncompleteServices++;
      }
    });

    console.log(`\n📊 Final Results:`);
    console.log(`   Services fixed: ${fixedCount}`);
    console.log(`   Errors encountered: ${errorCount}`);
    console.log(`   Complete tier mappings: ${completeServices}`);
    console.log(`   Incomplete tier mappings: ${remainingIncompleteServices}`);

    if (remainingIncompleteServices === 0) {
      console.log(`\n🎉 All services now have complete tier hierarchy! Autofill should work perfectly.`);
    } else {
      console.log(`\n📋 Services with incomplete mappings (need manual review):`);
      
      const stillIncompleteServices = await prisma.service.findMany({
        where: {
          OR: [
            {
              AND: [
                { tier1CategoryId: { not: null } },
                { tier2SubcategoryId: null }
              ]
            },
            {
              AND: [
                { tier2SubcategoryId: { not: null } },
                { tier3ItemId: null }
              ]
            }
          ]
        },
        include: {
          tier1Category: true,
          tier2Subcategory: true,
          tier3Item: true
        }
      });

      stillIncompleteServices.forEach(service => {
        const tier1 = service.tier1Category?.name || 'NULL';
        const tier2 = service.tier2Subcategory?.name || 'NULL';
        const tier3 = service.tier3Item?.name || 'NULL';
        console.log(`   - "${service.name}": T1=${tier1} | T2=${tier2} | T3=${tier3}`);
      });
    }

    // Step 5: Show sample of fixed services for verification
    console.log(`\n🔍 Sample of fixed services:`);
    
    const sampleServices = await prisma.service.findMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      },
      include: {
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true
      },
      take: 5
    });

    sampleServices.forEach(service => {
      console.log(`   ✅ "${service.name}"`);
      console.log(`      ${service.tier1Category?.name} → ${service.tier2Subcategory?.name} → ${service.tier3Item?.name}`);
    });

  } catch (error) {
    console.error('❌ Error fixing tier mappings:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing script
if (require.main === module) {
  fixTierMappingsDirect()
    .then(() => {
      console.log('\n🎉 Tier mappings fix completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Tier mappings fix failed:', error);
      process.exit(1);
    });
}

export default fixTierMappingsDirect;