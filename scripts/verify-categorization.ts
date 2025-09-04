import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCategorization() {
  console.log('🔍 Verifying Tier Categorization Status...\n');
  
  try {
    // Check Services
    console.log('📊 SERVICES STATUS:');
    const totalServices = await prisma.service.count();
    const servicesComplete = await prisma.service.count({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      }
    });
    
    console.log(`   Total Services: ${totalServices}`);
    console.log(`   Services with Complete 3-Tier: ${servicesComplete} (${((servicesComplete/totalServices)*100).toFixed(1)}%)`);
    
    // Check Tickets
    console.log('\n📊 TICKETS STATUS:');
    const totalTickets = await prisma.ticket.count();
    const ticketsComplete = await prisma.ticket.count({
      where: {
        AND: [
          { categoryId: { not: null } },
          { subcategoryId: { not: null } },
          { itemId: { not: null } }
        ]
      }
    });
    
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
    console.log(`   Tickets with Complete 3-Tier: ${ticketsComplete} (${((ticketsComplete/totalTickets)*100).toFixed(1)}%)`);
    console.log(`   Missing Category: ${ticketsMissingCategory}`);
    console.log(`   Missing Subcategory: ${ticketsMissingSubcategory}`);
    console.log(`   Missing Item: ${ticketsMissingItem}`);
    
    // Show sample of tickets with their categories
    console.log('\n📋 Sample Tickets with Categories:');
    const sampleTickets = await prisma.ticket.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        ticketNumber: true,
        title: true,
        category: {
          select: { name: true }
        },
        subcategory: {
          select: { name: true }
        },
        item: {
          select: { name: true }
        },
        service: {
          select: { name: true }
        }
      }
    });
    
    for (const ticket of sampleTickets) {
      console.log(`\n   Ticket: ${ticket.ticketNumber}`);
      console.log(`   Service: ${ticket.service?.name || 'N/A'}`);
      console.log(`   Category: ${ticket.category?.name || 'N/A'}`);
      console.log(`   Subcategory: ${ticket.subcategory?.name || 'N/A'}`);
      console.log(`   Item: ${ticket.item?.name || 'N/A'}`);
    }
    
    // Check tier structure
    console.log('\n📁 TIER STRUCTURE:');
    const categories = await prisma.category.count();
    const subcategories = await prisma.subcategory.count();
    const items = await prisma.item.count();
    
    console.log(`   Categories (Tier 1): ${categories}`);
    console.log(`   Subcategories (Tier 2): ${subcategories}`);
    console.log(`   Items (Tier 3): ${items}`);
    
    // Show category breakdown
    console.log('\n📊 TOP CATEGORIES BY TICKET COUNT:');
    const categoryStats = await prisma.category.findMany({
      select: {
        name: true,
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: {
        tickets: {
          _count: 'desc'
        }
      },
      take: 10
    });
    
    for (const cat of categoryStats) {
      console.log(`   ${cat.name}: ${cat._count.tickets} tickets`);
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyCategorization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });