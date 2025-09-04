import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTicketCategorization() {
  console.log('🎫 Starting Ticket Tier Categorization Fix...\n');
  
  try {
    // Step 1: Analyze current ticket categorization state
    console.log('📌 Step 1: Analyzing current ticket categorization...');
    
    const totalTickets = await prisma.ticket.count();
    
    // Count tickets missing tier categorization
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
    console.log('\n📌 Step 2: Getting services with complete tier categorization...');
    
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
    
    // Step 3: Update tickets to inherit tier categorization from their services
    console.log('\n📌 Step 3: Updating tickets to inherit service categorization...');
    
    let totalUpdated = 0;
    let updateDetails: { serviceName: string, ticketsUpdated: number }[] = [];
    
    for (const service of servicesWithTiers) {
      // Update tickets that are missing any tier categorization
      const result = await prisma.ticket.updateMany({
        where: {
          serviceId: service.id,
          OR: [
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
        totalUpdated += result.count;
        updateDetails.push({
          serviceName: service.name,
          ticketsUpdated: result.count
        });
        
        // Log progress for services with updates
        if (result.count > 10) {
          console.log(`   ✅ Updated ${result.count} tickets for service: ${service.name}`);
        }
      }
    }
    
    console.log(`\n   Total tickets updated: ${totalUpdated}`);
    
    // Step 4: Handle tickets without a service (if any)
    console.log('\n📌 Step 4: Handling tickets without a service...');
    
    const ticketsWithoutService = await prisma.ticket.count({
      where: {
        AND: [
          { serviceId: null },
          {
            OR: [
              { categoryId: null },
              { subcategoryId: null },
              { itemId: null }
            ]
          }
        ]
      }
    });
    
    if (ticketsWithoutService > 0) {
      console.log(`   Found ${ticketsWithoutService} tickets without a service`);
      
      // Get or create default categorization
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
      
      // Update tickets without service to use default categorization
      const defaultUpdated = await prisma.ticket.updateMany({
        where: {
          AND: [
            { serviceId: null },
            {
              OR: [
                { categoryId: null },
                { subcategoryId: null },
                { itemId: null }
              ]
            }
          ]
        },
        data: {
          categoryId: defaultCategory.id,
          subcategoryId: defaultSubcategory.id,
          itemId: defaultItem.id
        }
      });
      
      console.log(`   ✅ Assigned default categorization to ${defaultUpdated.count} tickets without a service`);
      totalUpdated += defaultUpdated.count;
    } else {
      console.log('   ✅ All tickets have an associated service');
    }
    
    // Step 5: Fix any remaining tickets with partial categorization
    console.log('\n📌 Step 5: Fixing tickets with partial categorization...');
    
    // Find tickets that have categoryId but missing subcategory or item
    const partialTickets = await prisma.ticket.findMany({
      where: {
        AND: [
          { categoryId: { not: null } },
          {
            OR: [
              { subcategoryId: null },
              { itemId: null }
            ]
          }
        ]
      },
      select: {
        id: true,
        categoryId: true,
        subcategoryId: true,
        itemId: true,
        serviceId: true
      },
      take: 100 // Process in batches
    });
    
    if (partialTickets.length > 0) {
      console.log(`   Found ${partialTickets.length} tickets with partial categorization`);
      
      for (const ticket of partialTickets) {
        // Try to complete the categorization based on the category
        if (ticket.categoryId && !ticket.subcategoryId) {
          const subcategory = await prisma.subcategory.findFirst({
            where: { categoryId: ticket.categoryId }
          });
          
          if (subcategory) {
            const item = await prisma.item.findFirst({
              where: { subcategoryId: subcategory.id }
            });
            
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: {
                subcategoryId: subcategory.id,
                itemId: item?.id || null
              }
            });
            totalUpdated++;
          }
        }
      }
      
      console.log(`   ✅ Fixed ${partialTickets.length} tickets with partial categorization`);
    }
    
    // Step 6: Final verification and summary
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
      ticketsWithService: await prisma.ticket.count({
        where: { serviceId: { not: null } }
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
    console.log(`   Tickets with Service: ${finalStats.ticketsWithService}`);
    console.log(`   Remaining without Category: ${finalStats.remainingWithoutCategory}`);
    console.log(`   Remaining without Subcategory: ${finalStats.remainingWithoutSubcategory}`);
    console.log(`   Remaining without Item: ${finalStats.remainingWithoutItem}`);
    console.log(`\n   ✨ Total tickets fixed in this run: ${totalUpdated}`);
    
    // Show top services that had tickets updated
    if (updateDetails.length > 0) {
      console.log('\n📋 Top Services with Updated Tickets:');
      updateDetails
        .sort((a, b) => b.ticketsUpdated - a.ticketsUpdated)
        .slice(0, 10)
        .forEach(detail => {
          console.log(`   - ${detail.serviceName}: ${detail.ticketsUpdated} tickets`);
        });
    }
    
    console.log('\n✅ Ticket tier categorization fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing ticket categorization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixTicketCategorization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });