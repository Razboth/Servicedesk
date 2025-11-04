import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServiceTickets() {
  try {
    console.log('Checking all tickets for: OLIBs - Mutasi User Pegawai\n');

    // Find the service
    const service = await prisma.service.findFirst({
      where: {
        name: {
          contains: 'OLIBs - Mutasi User Pegawai',
          mode: 'insensitive'
        }
      }
    });

    if (!service) {
      console.log('❌ Service not found');
      return;
    }

    console.log(`✅ Service ID: ${service.id}`);
    console.log('');

    // Check all tickets for this service
    const tickets = await prisma.ticket.findMany({
      where: {
        serviceId: service.id
      },
      select: {
        id: true,
        ticketNumber: true,
        categoryId: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total tickets: ${tickets.length}\n`);

    if (tickets.length === 0) {
      console.log('No tickets found for this service.');
      return;
    }

    // Categorize by category
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

    console.log('\n🔍 Analysis:');
    console.log('');
    console.log('The service has:');
    console.log('   OLD System: User Management');
    console.log('   NEW System: Core Banking → General Requests → General Service Item');
    console.log('');
    console.log('Monthly Report logic:');
    console.log('   1. If ticket.categoryId exists → uses that category name (Priority 1)');
    console.log('   2. Else uses service.tier1Category → "Core Banking" (Priority 2)');
    console.log('   3. Else uses service.category → "User Management" (Priority 3)');
    console.log('');

    const hasDirectCategory = Array.from(categoryMap.keys()).some(cat => cat !== 'No Direct Category');
    const noDirectCategoryCount = categoryMap.get('No Direct Category') || 0;

    if (hasDirectCategory) {
      console.log(`⚠️  ${tickets.length - noDirectCategoryCount} tickets have DIRECT category IDs that override service categories!`);
      console.log('   These tickets will show under their direct category, not the service category.');
    }

    if (noDirectCategoryCount > 0) {
      console.log(`✅ ${noDirectCategoryCount} tickets will use service category → "Core Banking" (NEW system has priority)`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceTickets();
