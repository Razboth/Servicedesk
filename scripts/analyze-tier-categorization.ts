import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeTierCategorization() {
  console.log('🔍 Analyzing Service Tier Categorization Issues...\n');
  
  try {
    // 1. Count total services
    const totalServices = await prisma.service.count();
    console.log(`📊 Total Services: ${totalServices}`);
    
    // 2. Services missing tier 1 category
    const missingTier1 = await prisma.service.count({
      where: { tier1CategoryId: null }
    });
    
    // 3. Services missing tier 2 subcategory
    const missingTier2 = await prisma.service.count({
      where: { tier2SubcategoryId: null }
    });
    
    // 4. Services missing tier 3 item
    const missingTier3 = await prisma.service.count({
      where: { tier3ItemId: null }
    });
    
    console.log(`\n❌ Missing Categorization:`);
    console.log(`   - Tier 1 (Category): ${missingTier1} services (${((missingTier1/totalServices)*100).toFixed(1)}%)`);
    console.log(`   - Tier 2 (Subcategory): ${missingTier2} services (${((missingTier2/totalServices)*100).toFixed(1)}%)`);
    console.log(`   - Tier 3 (Item): ${missingTier3} services (${((missingTier3/totalServices)*100).toFixed(1)}%)`);
    
    // 5. Services with invalid tier references (IDs that don't exist)
    console.log(`\n🔍 Checking for invalid tier references...`);
    
    const servicesWithTier1 = await prisma.service.findMany({
      where: { 
        tier1CategoryId: { not: null }
      },
      select: { 
        id: true, 
        name: true, 
        tier1CategoryId: true 
      }
    });
    
    let invalidTier1Count = 0;
    for (const service of servicesWithTier1) {
      const category = await prisma.serviceCategory.findUnique({
        where: { id: service.tier1CategoryId! }
      });
      if (!category) {
        invalidTier1Count++;
        console.log(`   ⚠️ Service "${service.name}" has invalid tier1CategoryId: ${service.tier1CategoryId}`);
      }
    }
    
    // Check tier 2 validity
    const servicesWithTier2 = await prisma.service.findMany({
      where: { 
        tier2SubcategoryId: { not: null }
      },
      select: { 
        id: true, 
        name: true, 
        tier2SubcategoryId: true 
      }
    });
    
    let invalidTier2Count = 0;
    for (const service of servicesWithTier2) {
      const subcategory = await prisma.tierSubcategory.findUnique({
        where: { id: service.tier2SubcategoryId! }
      });
      if (!subcategory) {
        invalidTier2Count++;
        console.log(`   ⚠️ Service "${service.name}" has invalid tier2SubcategoryId: ${service.tier2SubcategoryId}`);
      }
    }
    
    // Check tier 3 validity
    const servicesWithTier3 = await prisma.service.findMany({
      where: { 
        tier3ItemId: { not: null }
      },
      select: { 
        id: true, 
        name: true, 
        tier3ItemId: true 
      }
    });
    
    let invalidTier3Count = 0;
    for (const service of servicesWithTier3) {
      const item = await prisma.tierItem.findUnique({
        where: { id: service.tier3ItemId! }
      });
      if (!item) {
        invalidTier3Count++;
        console.log(`   ⚠️ Service "${service.name}" has invalid tier3ItemId: ${service.tier3ItemId}`);
      }
    }
    
    console.log(`\n📊 Invalid References Summary:`);
    console.log(`   - Invalid Tier 1: ${invalidTier1Count} services`);
    console.log(`   - Invalid Tier 2: ${invalidTier2Count} services`);
    console.log(`   - Invalid Tier 3: ${invalidTier3Count} services`);
    
    // 6. Impact on tickets
    console.log(`\n🎫 Analyzing Ticket Impact...`);
    
    const totalTickets = await prisma.ticket.count();
    const ticketsMissingTier2 = await prisma.ticket.count({
      where: { tier2SubcategoryId: null }
    });
    const ticketsMissingTier3 = await prisma.ticket.count({
      where: { tier3ItemId: null }
    });
    
    console.log(`   Total Tickets: ${totalTickets}`);
    console.log(`   - Missing Tier 2: ${ticketsMissingTier2} tickets (${((ticketsMissingTier2/totalTickets)*100).toFixed(1)}%)`);
    console.log(`   - Missing Tier 3: ${ticketsMissingTier3} tickets (${((ticketsMissingTier3/totalTickets)*100).toFixed(1)}%)`);
    
    // 7. Show sample of affected services
    console.log(`\n📋 Sample of Services Missing Complete Categorization:`);
    const sampleServices = await prisma.service.findMany({
      where: {
        OR: [
          { tier1CategoryId: null },
          { tier2SubcategoryId: null },
          { tier3ItemId: null }
        ]
      },
      take: 10,
      select: {
        name: true,
        categoryId: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true
      }
    });
    
    console.table(sampleServices);
    
    // 8. Available tier categories
    console.log(`\n📁 Available Tier Categories:`);
    const tier1Categories = await prisma.serviceCategory.count({ where: { level: 1 } });
    const tier2Subcategories = await prisma.tierSubcategory.count();
    const tier3Items = await prisma.tierItem.count();
    
    console.log(`   - Tier 1 Categories: ${tier1Categories}`);
    console.log(`   - Tier 2 Subcategories: ${tier2Subcategories}`);
    console.log(`   - Tier 3 Items: ${tier3Items}`);
    
  } catch (error) {
    console.error('❌ Error analyzing categorization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeTierCategorization()
  .catch(console.error);