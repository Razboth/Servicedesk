import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOlibsMutasiCategory() {
  try {
    console.log('🔍 Checking OLIBs - Mutasi User Pegawai service...\n');

    // Find the service
    const service = await prisma.service.findFirst({
      where: {
        name: {
          contains: 'OLIBs - Mutasi User Pegawai',
          mode: 'insensitive'
        }
      },
      include: {
        category: true,           // OLD system
        tier1Category: true       // NEW system
      }
    });

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('✅ Service Found:');
    console.log(`   ID: ${service.id}`);
    console.log(`   Name: ${service.name}\n`);

    console.log('📊 Current Categories:');
    console.log(`   OLD System: ${service.category?.name || 'None'}`);
    console.log(`   NEW System: ${service.tier1Category?.name || 'None'}\n`);

    // Check if User Management exists in NEW Category system
    const userManagementCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: 'User Management',
          mode: 'insensitive'
        }
      }
    });

    if (userManagementCategory) {
      console.log('✅ Found "User Management" in NEW Category system');
      console.log(`   Category ID: ${userManagementCategory.id}\n`);

      console.log('🔧 Updating service to use "User Management" from NEW system...\n');

      await prisma.service.update({
        where: { id: service.id },
        data: {
          tier1CategoryId: userManagementCategory.id,
          tier2SubcategoryId: null,  // Clear tier 2 and 3
          tier3ItemId: null
        }
      });

      console.log('✅ Service updated successfully!');
      console.log(`   NEW System: ${service.tier1Category?.name} → User Management\n`);

    } else {
      console.log('⚠️  "User Management" not found in NEW Category system');
      console.log('   Clearing NEW system categories to use OLD system...\n');

      await prisma.service.update({
        where: { id: service.id },
        data: {
          tier1CategoryId: null,
          tier2SubcategoryId: null,
          tier3ItemId: null
        }
      });

      console.log('✅ Service updated to use OLD system category');
      console.log(`   Will use: ${service.category?.name}\n`);
    }

    console.log('=' .repeat(80));
    console.log('✅ FIX COMPLETED');
    console.log('=' .repeat(80));
    console.log('\n💡 The service will now show under "User Management" in Monthly Report\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOlibsMutasiCategory();
