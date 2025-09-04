const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixServiceCategories() {
  console.log('🔧 Starting service 3-tier category fix...\n');

  try {
    // Step 1: Ensure default categories exist
    console.log('📁 Ensuring default categories exist...');
    
    // Create default tier 1 category if not exists
    let defaultTier1 = await prisma.category.findFirst({
      where: { name: 'General' }
    });
    
    if (!defaultTier1) {
      defaultTier1 = await prisma.category.create({
        data: {
          name: 'General',
          description: 'Default category for uncategorized services',
          isActive: true
        }
      });
      console.log('✅ Created default tier 1 category: General');
    }

    // Create default tier 2 subcategory if not exists
    let defaultTier2 = await prisma.subcategory.findFirst({
      where: { 
        name: 'General Services',
        categoryId: defaultTier1.id
      }
    });
    
    if (!defaultTier2) {
      defaultTier2 = await prisma.subcategory.create({
        data: {
          name: 'General Services',
          description: 'Default subcategory for uncategorized services',
          categoryId: defaultTier1.id,
          isActive: true
        }
      });
      console.log('✅ Created default tier 2 subcategory: General Services');
    }

    // Create default tier 3 item if not exists
    let defaultTier3 = await prisma.item.findFirst({
      where: { 
        name: 'Other',
        subcategoryId: defaultTier2.id
      }
    });
    
    if (!defaultTier3) {
      defaultTier3 = await prisma.item.create({
        data: {
          name: 'Other',
          description: 'Default item for uncategorized services',
          subcategoryId: defaultTier2.id,
          isActive: true
        }
      });
      console.log('✅ Created default tier 3 item: Other');
    }

    // Step 2: Create default service category if not exists
    let defaultServiceCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'General' }
    });
    
    if (!defaultServiceCategory) {
      defaultServiceCategory = await prisma.serviceCategory.create({
        data: {
          name: 'General',
          description: 'Default service category',
          isActive: true
        }
      });
      console.log('✅ Created default service category: General');
    }

    // Step 3: Fix services with missing 3-tier categories
    console.log('\n📋 Checking services for missing 3-tier categories...');
    
    const servicesWithoutTiers = await prisma.service.findMany({
      where: {
        OR: [
          { tier1CategoryId: null },
          { tier2CategoryId: null },
          { tier3CategoryId: null }
        ]
      },
      include: {
        category: true,
        tier1Category: true,
        tier2Category: true,
        tier3Category: true
      }
    });

    console.log(`Found ${servicesWithoutTiers.length} services with missing 3-tier categories`);

    for (const service of servicesWithoutTiers) {
      console.log(`\n🔄 Fixing service: ${service.name} (ID: ${service.id})`);
      
      const updateData = {};
      
      // Set missing tier categories to defaults
      if (!service.tier1CategoryId) {
        updateData.tier1CategoryId = defaultTier1.id;
        console.log(`  - Setting tier1CategoryId to: ${defaultTier1.name}`);
      }
      
      if (!service.tier2CategoryId) {
        updateData.tier2CategoryId = defaultTier2.id;
        console.log(`  - Setting tier2CategoryId to: ${defaultTier2.name}`);
      }
      
      if (!service.tier3CategoryId) {
        updateData.tier3CategoryId = defaultTier3.id;
        console.log(`  - Setting tier3CategoryId to: ${defaultTier3.name}`);
      }
      
      // Also ensure categoryId is set
      if (!service.categoryId) {
        updateData.categoryId = defaultServiceCategory.id;
        console.log(`  - Setting categoryId to: ${defaultServiceCategory.name}`);
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.service.update({
          where: { id: service.id },
          data: updateData
        });
        console.log(`  ✅ Service updated`);
      } else {
        console.log(`  ℹ️ Service already has all categories`);
      }
    }

    // Step 4: Verify all services now have complete categories
    console.log('\n🔍 Verifying all services...');
    
    const incompleteServices = await prisma.service.findMany({
      where: {
        OR: [
          { categoryId: null },
          { tier1CategoryId: null },
          { tier2CategoryId: null },
          { tier3CategoryId: null }
        ]
      }
    });

    if (incompleteServices.length === 0) {
      console.log('✅ All services now have complete category assignments!');
    } else {
      console.log(`⚠️ ${incompleteServices.length} services still have missing categories`);
      for (const service of incompleteServices) {
        console.log(`  - ${service.name} (ID: ${service.id})`);
      }
    }

    // Step 5: Display summary
    console.log('\n📊 Summary:');
    
    const totalServices = await prisma.service.count();
    const servicesWithComplete = await prisma.service.count({
      where: {
        AND: [
          { categoryId: { not: null } },
          { tier1CategoryId: { not: null } },
          { tier2CategoryId: { not: null } },
          { tier3CategoryId: { not: null } }
        ]
      }
    });

    console.log(`  Total services: ${totalServices}`);
    console.log(`  Services with complete categories: ${servicesWithComplete}`);
    console.log(`  Services fixed: ${servicesWithoutTiers.length}`);

  } catch (error) {
    console.error('❌ Error fixing service categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixServiceCategories()
  .then(() => {
    console.log('\n✅ Service category fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Service category fix failed:', error);
    process.exit(1);
  });