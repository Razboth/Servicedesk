const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugServices() {
  console.log('🔍 Debugging service tier categorization...\n');
  
  try {
    // Check total services
    const totalServices = await prisma.service.count();
    console.log(`📊 Total services: ${totalServices}`);
    
    // Check services with tier1CategoryId
    const servicesWithTier1 = await prisma.service.count({
      where: { tier1CategoryId: { not: null } }
    });
    console.log(`📊 Services with tier1CategoryId: ${servicesWithTier1}`);
    
    // Check services with tier2SubcategoryId
    const servicesWithTier2 = await prisma.service.count({
      where: { tier2SubcategoryId: { not: null } }
    });
    console.log(`📊 Services with tier2SubcategoryId: ${servicesWithTier2}`);
    
    // Check services with tier3ItemId
    const servicesWithTier3 = await prisma.service.count({
      where: { tier3ItemId: { not: null } }
    });
    console.log(`📊 Services with tier3ItemId: ${servicesWithTier3}\n`);
    
    // Sample a few services to see their tier data
    const sampleServices = await prisma.service.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true
      }
    });
    
    console.log('📋 Sample services:');
    sampleServices.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   tier1CategoryId: ${service.tier1CategoryId || 'null'}`);
      console.log(`   tier2SubcategoryId: ${service.tier2SubcategoryId || 'null'}`);
      console.log(`   tier3ItemId: ${service.tier3ItemId || 'null'}`);
      console.log('');
    });
    
    // Check if we have 3-tier categories at all
    const categoriesCount = await prisma.category.count();
    const subcategoriesCount = await prisma.subcategory.count();
    const itemsCount = await prisma.item.count();
    
    console.log(`📊 3-tier structure counts:`);
    console.log(`   Categories: ${categoriesCount}`);
    console.log(`   Subcategories: ${subcategoriesCount}`);
    console.log(`   Items: ${itemsCount}\n`);
    
    // Check if we have any items with specific IDs that services reference
    if (servicesWithTier3 > 0) {
      const servicesWithTierData = await prisma.service.findMany({
        where: { tier3ItemId: { not: null } },
        take: 3,
        select: {
          name: true,
          tier1CategoryId: true,
          tier2SubcategoryId: true,
          tier3ItemId: true
        }
      });
      
      console.log('🔗 Services with tier3 data:');
      for (const service of servicesWithTierData) {
        console.log(`   ${service.name}:`);
        
        // Check if referenced category exists
        if (service.tier1CategoryId) {
          const categoryExists = await prisma.category.findUnique({
            where: { id: service.tier1CategoryId },
            select: { name: true }
          });
          console.log(`     Category: ${categoryExists?.name || 'NOT FOUND'}`);
        }
        
        // Check if referenced subcategory exists
        if (service.tier2SubcategoryId) {
          const subcategoryExists = await prisma.subcategory.findUnique({
            where: { id: service.tier2SubcategoryId },
            select: { name: true }
          });
          console.log(`     Subcategory: ${subcategoryExists?.name || 'NOT FOUND'}`);
        }
        
        // Check if referenced item exists
        if (service.tier3ItemId) {
          const itemExists = await prisma.item.findUnique({
            where: { id: service.tier3ItemId },
            select: { name: true }
          });
          console.log(`     Item: ${itemExists?.name || 'NOT FOUND'}`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugServices();