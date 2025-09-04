import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTicketsCategorization() {
  console.log('🎫 Starting Ticket Categorization Update...\n');
  
  try {
    // Step 1: Analyze current state
    console.log('📌 Step 1: Analyzing current ticket categorization...');
    
    const totalTickets = await prisma.ticket.count();
    
    const ticketsMissingCategory = await prisma.ticket.count({
      where: { categoryId: null }
    });
    
    const ticketsMissingSubcategory = await prisma.ticket.count({
      where: { subcategoryId: null }
    });
    
    const ticketsMissingItem = await prisma.ticket.count({
      where: { itemId: null }
    });
    
    console.log(`   Total Tickets: ${totalTickets}`);
    console.log(`   Missing Category (Tier 1): ${ticketsMissingCategory} (${((ticketsMissingCategory/totalTickets)*100).toFixed(1)}%)`);
    console.log(`   Missing Subcategory (Tier 2): ${ticketsMissingSubcategory} (${((ticketsMissingSubcategory/totalTickets)*100).toFixed(1)}%)`);
    console.log(`   Missing Item (Tier 3): ${ticketsMissingItem} (${((ticketsMissingItem/totalTickets)*100).toFixed(1)}%)`);
    
    // Step 2: Get all services with complete tier categorization
    console.log('\n📌 Step 2: Getting services with updated tier categorization...');
    
    const servicesWithTiers = await prisma.service.findMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true,
        _count: {
          select: { tickets: true }
        }
      }
    });
    
    console.log(`   Found ${servicesWithTiers.length} services with complete tier categorization`);
    const totalTicketsToUpdate = servicesWithTiers.reduce((sum, s) => sum + s._count.tickets, 0);
    console.log(`   Total tickets associated with these services: ${totalTicketsToUpdate}`);
    
    // Step 3: Update tickets to inherit tier categorization from their services
    console.log('\n📌 Step 3: Updating tickets to inherit service categorization...');
    
    let totalUpdated = 0;
    let batchCount = 0;
    const batchSize = 10; // Process services in batches
    
    for (let i = 0; i < servicesWithTiers.length; i += batchSize) {
      const batch = servicesWithTiers.slice(i, i + batchSize);
      batchCount++;
      
      const updatePromises = batch.map(async (service) => {
        const result = await prisma.ticket.updateMany({
          where: {
            serviceId: service.id,
            OR: [
              { categoryId: { not: service.tier1CategoryId } },
              { subcategoryId: { not: service.tier2SubcategoryId } },
              { itemId: { not: service.tier3ItemId } },
              { categoryId: null },
              { subcategoryId: null },
              { itemId: null }
            ]
          },
          data: {
            categoryId: service.tier1CategoryId,
            subcategoryId: service.tier2SubcategoryId,
            itemId: service.tier3ItemId
          }
        });
        
        if (result.count > 0) {
          console.log(`   ✅ Updated ${result.count} tickets for service: ${service.name}`);
        }
        
        return result.count;
      });
      
      const results = await Promise.all(updatePromises);
      const batchUpdated = results.reduce((sum, count) => sum + count, 0);
      totalUpdated += batchUpdated;
      
      if (batchUpdated > 0) {
        console.log(`   📦 Batch ${batchCount}: Updated ${batchUpdated} tickets`);
      }
      
      // Add a small delay between batches to avoid overwhelming the database
      if (i + batchSize < servicesWithTiers.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`\n   Total tickets updated: ${totalUpdated}`);
    
    // Step 4: Handle tickets without a service or with incomplete service categorization
    console.log('\n📌 Step 4: Handling tickets with incomplete categorization...');
    
    // Get default categorization
    let defaultCategory = await prisma.category.findFirst({
      where: { name: 'General Services' }
    });
    
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'General Services',
          description: 'Default category for uncategorized tickets',
          isActive: true
        }
      });
    }
    
    let defaultSubcategory = await prisma.subcategory.findFirst({
      where: {
        name: 'General Requests',
        categoryId: defaultCategory.id
      }
    });
    
    if (!defaultSubcategory) {
      defaultSubcategory = await prisma.subcategory.create({
        data: {
          name: 'General Requests',
          description: 'Default subcategory for general requests',
          categoryId: defaultCategory.id,
          isActive: true
        }
      });
    }
    
    let defaultItem = await prisma.item.findFirst({
      where: {
        name: 'General Service Item',
        subcategoryId: defaultSubcategory.id
      }
    });
    
    if (!defaultItem) {
      defaultItem = await prisma.item.create({
        data: {
          name: 'General Service Item',
          description: 'Default item for general requests',
          subcategoryId: defaultSubcategory.id,
          isActive: true
        }
      });
    }
    
    // Update tickets with incomplete categorization
    const orphanedTickets = await prisma.ticket.updateMany({
      where: {
        OR: [
          { categoryId: null },
          { subcategoryId: null },
          { itemId: null }
        ]
      },
      data: {
        categoryId: defaultCategory.id,
        subcategoryId: defaultSubcategory.id,
        itemId: defaultItem.id
      }
    });
    
    if (orphanedTickets.count > 0) {
      console.log(`   ✅ Assigned default categorization to ${orphanedTickets.count} tickets with incomplete categorization`);
      totalUpdated += orphanedTickets.count;
    }
    
    // Step 5: Final verification and summary
    console.log('\n📊 Final Summary:');
    
    const finalStats = {
      totalTickets: await prisma.ticket.count(),
      ticketsWithCompleteCategories: await prisma.ticket.count({
        where: {
          AND: [
            { categoryId: { not: null } },
            { subcategoryId: { not: null } },
            { itemId: { not: null } }
          ]
        }
      }),
      remainingWithoutCategory: await prisma.ticket.count({
        where: { categoryId: null }
      }),
      remainingWithoutSubcategory: await prisma.ticket.count({
        where: { subcategoryId: null }
      }),
      remainingWithoutItem: await prisma.ticket.count({
        where: { itemId: null }
      })
    };
    
    console.log(`   Total Tickets: ${finalStats.totalTickets}`);
    console.log(`   Tickets with Complete Categorization: ${finalStats.ticketsWithCompleteCategories} (${((finalStats.ticketsWithCompleteCategories/finalStats.totalTickets)*100).toFixed(1)}%)`);
    console.log(`   Remaining without Category: ${finalStats.remainingWithoutCategory}`);
    console.log(`   Remaining without Subcategory: ${finalStats.remainingWithoutSubcategory}`);
    console.log(`   Remaining without Item: ${finalStats.remainingWithoutItem}`);
    console.log(`\n   ✨ Total tickets updated in this run: ${totalUpdated}`);
    
    // Show sample of updated tickets
    console.log('\n📋 Sample of Updated Tickets:');
    const sampleTickets = await prisma.ticket.findMany({
      where: {
        AND: [
          { categoryId: { not: null } },
          { subcategoryId: { not: null } },
          { itemId: { not: null } }
        ]
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: {
        ticketNumber: true,
        title: true,
        category: { select: { name: true } },
        subcategory: { select: { name: true } },
        item: { select: { name: true } },
        service: { select: { name: true } }
      }
    });
    
    for (const ticket of sampleTickets) {
      console.log(`\n   Ticket: ${ticket.ticketNumber}`);
      console.log(`   Service: ${ticket.service?.name || 'N/A'}`);
      console.log(`   Category: ${ticket.category?.name}`);
      console.log(`   Subcategory: ${ticket.subcategory?.name}`);
      console.log(`   Item: ${ticket.item?.name}`);
    }
    
    // Check for any services that still need categorization
    const servicesNeedingAttention = await prisma.service.count({
      where: {
        OR: [
          { tier1CategoryId: null },
          { tier2SubcategoryId: null },
          { tier3ItemId: null }
        ]
      }
    });
    
    if (servicesNeedingAttention > 0) {
      console.log(`\n⚠️ Note: There are still ${servicesNeedingAttention} services without complete tier categorization.`);
      console.log('   These services may need manual review or additional CSV mapping.');
    }
    
    console.log('\n✅ Ticket categorization update completed successfully!');
    
  } catch (error) {
    console.error('❌ Error updating ticket categorization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateTicketsCategorization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });