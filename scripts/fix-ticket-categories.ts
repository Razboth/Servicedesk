import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTicketCategories() {
  try {
    console.log('🔍 Finding tickets with incorrect "General Services" category...\n');

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
      include: {
        service: {
          include: {
            category: true,        // OLD system
            tier1Category: true    // NEW system
          }
        }
      }
    });

    console.log(`📊 Found ${tickets.length} tickets with "General Services" direct category\n`);

    // Group by service category
    const serviceGroups = new Map<string, any[]>();

    for (const ticket of tickets) {
      if (!ticket.service) continue;

      const serviceCategoryKey = ticket.service.tier1Category?.name || ticket.service.category?.name || 'Uncategorized';

      if (!serviceGroups.has(serviceCategoryKey)) {
        serviceGroups.set(serviceCategoryKey, []);
      }

      serviceGroups.get(serviceCategoryKey)!.push({
        ticketNumber: ticket.ticketNumber,
        ticketId: ticket.id,
        serviceName: ticket.service.name,
        serviceOldCategory: ticket.service.category?.name,
        serviceNewCategory: ticket.service.tier1Category?.name
      });
    }

    console.log('📋 Tickets grouped by their service\'s ACTUAL category:\n');

    let totalToFix = 0;
    for (const [categoryName, ticketList] of Array.from(serviceGroups.entries()).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`\n${categoryName}: ${ticketList.length} tickets`);
      console.log('─'.repeat(60));

      const serviceSummary = new Map<string, number>();
      for (const ticket of ticketList) {
        serviceSummary.set(ticket.serviceName, (serviceSummary.get(ticket.serviceName) || 0) + 1);
      }

      for (const [serviceName, count] of Array.from(serviceSummary.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${serviceName}: ${count} tickets`);
      }

      totalToFix += ticketList.length;
    }

    console.log('\n\n' + '='.repeat(80));
    console.log('📝 SUMMARY');
    console.log('='.repeat(80));
    console.log(`\nTotal tickets to fix: ${totalToFix}`);
    console.log('\nProposed fix:');
    console.log('   Clear direct categoryId from these tickets (set to NULL)');
    console.log('   → Tickets will then inherit category from their service');
    console.log('   → Monthly Report will use service category (Priority 2 or 3)');
    console.log('\n⚠️  This script is in DRY-RUN mode. No changes made.');
    console.log('\nTo apply the fix, run: npm run fix:ticket-categories:apply');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTicketCategories();
