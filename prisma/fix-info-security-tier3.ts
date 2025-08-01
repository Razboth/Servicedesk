import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixInfoSecurityTier3() {
  console.log('🔧 Fixing Information Security Request Tier 3 Assignment...\n');

  try {
    // Find the Information Security Request service
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

    if (!service) {
      console.log('❌ Information Security Request service not found!');
      return;
    }

    console.log('📋 Current Service Configuration:');
    console.log(`   Service: ${service.name}`);
    console.log(`   Tier 1: ${service.tier1Category?.name || 'Not set'}`);
    console.log(`   Tier 2: ${service.tier2Subcategory?.name || 'Not set'}`);
    console.log(`   Tier 3: ${service.tier3Item?.name || 'Not set'}`);

    // If tier 2 is set but tier 3 is not, let's find the right item
    if (service.tier2SubcategoryId && !service.tier3ItemId) {
      console.log('\n🔍 Looking for appropriate Tier 3 item...');
      
      // Get all items for this subcategory
      const items = await prisma.item.findMany({
        where: {
          subcategoryId: service.tier2SubcategoryId
        },
        orderBy: { order: 'asc' }
      });

      console.log(`\nFound ${items.length} items in "${service.tier2Subcategory?.name}" subcategory:`);
      items.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} (ID: ${item.id})`);
      });

      // Look for "Keamanan Informasi" or similar
      let targetItem = items.find(item => 
        item.name === 'Keamanan Informasi' ||
        item.name.toLowerCase().includes('keamanan') ||
        item.name.toLowerCase().includes('information security')
      );

      // If not found, use the first item in the subcategory
      if (!targetItem && items.length > 0) {
        targetItem = items[0];
        console.log(`\n⚠️  Could not find "Keamanan Informasi", using first item: ${targetItem.name}`);
      }

      if (targetItem) {
        console.log(`\n✅ Updating service with Tier 3 item: ${targetItem.name}`);
        
        await prisma.service.update({
          where: { id: service.id },
          data: {
            tier3ItemId: targetItem.id
          }
        });

        console.log('✅ Service updated successfully!');
        
        // Verify the update
        const updatedService = await prisma.service.findUnique({
          where: { id: service.id },
          include: {
            tier1Category: true,
            tier2Subcategory: true,
            tier3Item: true
          }
        });

        console.log('\n📋 Updated Service Configuration:');
        console.log(`   Tier 1: ${updatedService?.tier1Category?.name}`);
        console.log(`   Tier 2: ${updatedService?.tier2Subcategory?.name}`);
        console.log(`   Tier 3: ${updatedService?.tier3Item?.name}`);
      } else {
        console.log('\n❌ No items found in the subcategory!');
      }
    } else if (service.tier3ItemId) {
      console.log('\n✅ Service already has Tier 3 item assigned.');
    } else {
      console.log('\n⚠️  Service needs Tier 2 subcategory to be set first.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixInfoSecurityTier3().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default fixInfoSecurityTier3;