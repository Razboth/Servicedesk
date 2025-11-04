import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugServiceCategory() {
  try {
    console.log('Checking service: OLIBs - Mutasi User Pegawai\n');

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
        tier1Category: true,      // NEW system (tier 1)
        tier2Subcategory: true,   // NEW system (tier 2)
        tier3Item: true           // NEW system (tier 3)
      }
    });

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log('✅ Service Found:');
    console.log(`   ID: ${service.id}`);
    console.log(`   Name: ${service.name}`);
    console.log(`   Description: ${service.description || 'N/A'}`);
    console.log('');

    console.log('📊 Category Information:');
    console.log('');

    // OLD System
    console.log('OLD System (ServiceCategory):');
    if (service.categoryId && service.category) {
      console.log(`   ✓ Category ID: ${service.categoryId}`);
      console.log(`   ✓ Category Name: ${service.category.name}`);
    } else {
      console.log('   ✗ No OLD category assigned');
    }
    console.log('');

    // NEW System
    console.log('NEW System (3-tier):');
    if (service.tier1CategoryId && service.tier1Category) {
      console.log(`   ✓ Tier 1 ID: ${service.tier1CategoryId}`);
      console.log(`   ✓ Tier 1 Name: ${service.tier1Category.name}`);
    } else {
      console.log('   ✗ No tier 1 category assigned');
    }

    if (service.tier2SubcategoryId && service.tier2Subcategory) {
      console.log(`   ✓ Tier 2 ID: ${service.tier2SubcategoryId}`);
      console.log(`   ✓ Tier 2 Name: ${service.tier2Subcategory.name}`);
    } else {
      console.log('   ✗ No tier 2 subcategory assigned');
    }

    if (service.tier3ItemId && service.tier3Item) {
      console.log(`   ✓ Tier 3 ID: ${service.tier3ItemId}`);
      console.log(`   ✓ Tier 3 Name: ${service.tier3Item.name}`);
    } else {
      console.log('   ✗ No tier 3 item assigned');
    }
    console.log('');

    // Check tickets using this service
    console.log('🎫 Tickets using this service:');
    const tickets = await prisma.ticket.findMany({
      where: {
        serviceId: service.id,
        createdAt: {
          gte: new Date('2024-10-01'),
          lte: new Date('2024-10-31')
        }
      },
      select: {
        id: true,
        ticketNumber: true,
        categoryId: true,
        status: true
      },
      take: 5
    });

    console.log(`   Found ${tickets.length} tickets (showing max 5)`);
    console.log('');

    for (const ticket of tickets) {
      console.log(`   Ticket #${ticket.ticketNumber}:`);
      console.log(`      Status: ${ticket.status}`);

      if (ticket.categoryId) {
        // Check both Category and ServiceCategory tables
        const newCat = await prisma.category.findUnique({
          where: { id: ticket.categoryId },
          select: { name: true }
        });

        const oldCat = await prisma.serviceCategory.findUnique({
          where: { id: ticket.categoryId },
          select: { name: true }
        });

        if (newCat) {
          console.log(`      Direct Category (NEW): ${newCat.name}`);
        } else if (oldCat) {
          console.log(`      Direct Category (OLD): ${oldCat.name}`);
        } else {
          console.log(`      Direct Category ID: ${ticket.categoryId} (not found in either table)`);
        }
      } else {
        console.log(`      No direct category`);
      }
      console.log('');
    }

    // Summary
    console.log('📋 Summary:');
    console.log('   Based on Monthly Report priority logic:');
    console.log('   1. If ticket has categoryId → use that category name');
    console.log('   2. Else if service has tier1Category → use NEW system category');
    console.log('   3. Else if service has category → use OLD system category');
    console.log('   4. Else → Uncategorized');
    console.log('');

    if (service.tier1Category || service.category) {
      const expectedCategory = service.tier1Category?.name || service.category?.name || 'Uncategorized';
      console.log(`   ✅ Expected category for this service: ${expectedCategory}`);
    } else {
      console.log(`   ⚠️ This service has no category assigned in either system!`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugServiceCategory();
