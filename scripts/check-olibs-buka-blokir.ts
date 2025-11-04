import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkOlibsBukaBlokir() {
  try {
    console.log('🔍 Checking OLIBs - Buka Blokir service...\n');

    // Find the service - search for multiple variations
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'OLIBs - Buka Blokir', mode: 'insensitive' } },
          { name: { contains: 'OLIBs-Buka Blokir', mode: 'insensitive' } },
          { name: { contains: 'Buka Blokir', mode: 'insensitive' } }
        ]
      },
      include: {
        category: true,           // OLD system
        tier1Category: true,      // NEW system
        tier2Subcategory: true,
        tier3Item: true
      }
    });

    if (services.length === 0) {
      console.log('❌ No services found matching "Buka Blokir"');
      return;
    }

    console.log(`✅ Found ${services.length} service(s):\n`);

    for (const service of services) {
      console.log('─'.repeat(80));
      console.log(`Service: ${service.name}`);
      console.log(`ID: ${service.id}\n`);

      console.log('📊 Service Categories:');
      console.log(`   OLD System: ${service.category?.name || 'None'}`);
      console.log(`   NEW System Tier 1: ${service.tier1Category?.name || 'None'}`);
      console.log(`   NEW System Tier 2: ${service.tier2Subcategory?.name || 'None'}`);
      console.log(`   NEW System Tier 3: ${service.tier3Item?.name || 'None'}\n`);

      // Get tickets for this service
      const tickets = await prisma.ticket.findMany({
        where: { serviceId: service.id },
        select: {
          id: true,
          ticketNumber: true,
          categoryId: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`🎫 Total Tickets: ${tickets.length}\n`);

      if (tickets.length === 0) {
        console.log('   No tickets found for this service.\n');
        continue;
      }

      // Analyze ticket categories
      const categoryMap = new Map<string, number>();
      const categoryDetails = new Map<string, any[]>();

      for (const ticket of tickets) {
        let categoryName = 'No Direct Category';

        if (ticket.categoryId) {
          // Check NEW Category table
          const newCat = await prisma.category.findUnique({
            where: { id: ticket.categoryId },
            select: { name: true }
          });

          // Check OLD ServiceCategory table
          const oldCat = await prisma.serviceCategory.findUnique({
            where: { id: ticket.categoryId },
            select: { name: true }
          });

          categoryName = newCat?.name || oldCat?.name || `Unknown (${ticket.categoryId})`;
        }

        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);

        if (!categoryDetails.has(categoryName)) {
          categoryDetails.set(categoryName, []);
        }
        categoryDetails.get(categoryName)!.push({
          ticketNumber: ticket.ticketNumber,
          status: ticket.status,
          createdAt: ticket.createdAt
        });
      }

      console.log('📋 Tickets by Direct Category:\n');

      for (const [categoryName, count] of Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])) {
        console.log(`   ${categoryName}: ${count} tickets`);

        const details = categoryDetails.get(categoryName)!;
        for (let i = 0; i < Math.min(3, details.length); i++) {
          const ticket = details[i];
          console.log(`      - #${ticket.ticketNumber} [${ticket.status}] - ${ticket.createdAt.toISOString().split('T')[0]}`);
        }
        if (details.length > 3) {
          console.log(`      ... and ${details.length - 3} more`);
        }
        console.log('');
      }

      // Analysis
      const withDirectCategory = Array.from(categoryMap.entries()).filter(([cat]) => cat !== 'No Direct Category');
      const withoutDirectCategory = categoryMap.get('No Direct Category') || 0;
      const withGeneralServices = categoryMap.get('General Services') || 0;

      console.log('🔍 Analysis:\n');

      if (withGeneralServices > 0) {
        console.log(`⚠️  ${withGeneralServices} tickets have DIRECT "General Services" category!`);
        console.log('   These override the service\'s correct category.\n');
        console.log('   Solution: Clear direct categoryId from these tickets\n');
      }

      if (withoutDirectCategory > 0) {
        const expectedCategory = service.tier1Category?.name || service.category?.name || 'Uncategorized';
        console.log(`✅ ${withoutDirectCategory} tickets will inherit from service → "${expectedCategory}"\n`);
      }

      if (withDirectCategory.length > 0) {
        console.log('📝 Other direct categories:');
        withDirectCategory.forEach(([cat, count]) => {
          if (cat !== 'General Services') {
            console.log(`   ${cat}: ${count} tickets`);
          }
        });
        console.log('');
      }
    }

    console.log('═'.repeat(80));
    console.log('💡 RECOMMENDATION');
    console.log('═'.repeat(80));
    console.log('\nIf tickets have "General Services" direct category:');
    console.log('   Run: npx tsx scripts/fix-ticket-categories-apply.ts\n');
    console.log('This will clear incorrect direct categories so tickets inherit from service.\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOlibsBukaBlokir();
