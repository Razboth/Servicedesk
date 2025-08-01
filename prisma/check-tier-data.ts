import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTierData() {
  console.log('🔍 Checking Tier Category Data...\n');

  try {
    // Check Information Security category
    const infoSecCategory = await prisma.category.findFirst({
      where: { name: 'Information Security' },
      include: {
        subcategories: {
          include: {
            items: true
          }
        }
      }
    });

    if (infoSecCategory) {
      console.log('📁 Information Security Category:');
      console.log(`   ID: ${infoSecCategory.id}`);
      console.log(`   Name: ${infoSecCategory.name}`);
      console.log(`   Subcategories: ${infoSecCategory.subcategories.length}`);
      
      infoSecCategory.subcategories.forEach(sub => {
        console.log(`\n   📂 Subcategory: ${sub.name}`);
        console.log(`      ID: ${sub.id}`);
        console.log(`      Items: ${sub.items.length}`);
        
        sub.items.forEach(item => {
          console.log(`      📄 Item: ${item.name} (ID: ${item.id})`);
        });
      });
    } else {
      console.log('❌ Information Security category not found!');
    }

    // Check the Information Security Request service
    console.log('\n\n🔍 Checking Information Security Request Service...\n');
    
    const service = await prisma.service.findFirst({
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

    if (service) {
      console.log('🎯 Service Found:');
      console.log(`   ID: ${service.id}`);
      console.log(`   Name: ${service.name}`);
      console.log(`   Default Title: ${service.defaultTitle || 'Not set'}`);
      console.log('\n   Tier Categories:');
      console.log(`   Tier 1: ${service.tier1Category?.name || 'Not set'} (ID: ${service.tier1CategoryId || 'null'})`);
      console.log(`   Tier 2: ${service.tier2Subcategory?.name || 'Not set'} (ID: ${service.tier2SubcategoryId || 'null'})`);
      console.log(`   Tier 3: ${service.tier3Item?.name || 'Not set'} (ID: ${service.tier3ItemId || 'null'})`);
      
      // Check if the item exists
      if (service.tier2SubcategoryId && !service.tier3ItemId) {
        console.log('\n   🔍 Checking for "Keamanan Informasi" item in the subcategory...');
        const items = await prisma.item.findMany({
          where: {
            subcategoryId: service.tier2SubcategoryId
          }
        });
        console.log(`   Found ${items.length} items in subcategory:`);
        items.forEach(item => {
          console.log(`   - ${item.name} (ID: ${item.id})`);
        });
      }
    } else {
      console.log('❌ Information Security Request service not found!');
    }

    // Show all categories, subcategories, and items
    console.log('\n\n📊 Complete Tier Structure Summary:\n');
    
    const allCategories = await prisma.category.findMany({
      include: {
        subcategories: {
          include: {
            items: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    allCategories.forEach(cat => {
      console.log(`📁 ${cat.name} (${cat.subcategories.length} subcategories)`);
      cat.subcategories.forEach(sub => {
        console.log(`   📂 ${sub.name} (${sub.items.length} items)`);
        if (sub.items.length <= 5) {
          sub.items.forEach(item => {
            console.log(`      📄 ${item.name}`);
          });
        } else {
          console.log(`      📄 ... ${sub.items.length} items total`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error checking tier data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkTierData().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default checkTierData;