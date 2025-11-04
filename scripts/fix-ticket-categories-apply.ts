import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyTicketCategoryFix() {
  try {
    console.log('🔧 Applying ticket category fix...\n');

    // Find "General Services" category ID
    const generalServicesCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'General',
          mode: 'insensitive'
        }
      }
    });

    if (!generalServicesCategory) {
      console.log('❌ General Services category not found');
      return;
    }

    console.log(`✅ General Services Category ID: ${generalServicesCategory.id}`);
    console.log(`   Name: ${generalServicesCategory.name}\n`);

    // Find all tickets with this category
    const tickets = await prisma.ticket.findMany({
      where: {
        categoryId: generalServicesCategory.id
      },
      select: {
        id: true,
        ticketNumber: true
      }
    });

    console.log(`📊 Found ${tickets.length} tickets to fix\n`);

    if (tickets.length === 0) {
      console.log('✅ No tickets to fix!');
      return;
    }

    console.log('🚀 Updating tickets...\n');

    // Update tickets in batches
    const batchSize = 50;
    let fixed = 0;

    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      const ticketIds = batch.map(t => t.id);

      await prisma.ticket.updateMany({
        where: {
          id: { in: ticketIds }
        },
        data: {
          categoryId: null
        }
      });

      fixed += batch.length;
      console.log(`   ✓ Updated ${fixed}/${tickets.length} tickets...`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ FIX COMPLETED');
    console.log('='.repeat(80));
    console.log(`\nUpdated ${fixed} tickets`);
    console.log('\nChanges made:');
    console.log('   ✓ Removed direct "General Services" categoryId from tickets');
    console.log('   ✓ Tickets will now inherit category from their service');
    console.log('   ✓ Monthly Report will show correct service categories');
    console.log('\n💡 Recommendation:');
    console.log('   Rebuild and restart the application to see the changes');
    console.log('   Then check the Monthly Report at /reports/technician/monthly\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyTicketCategoryFix();
