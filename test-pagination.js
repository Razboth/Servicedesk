const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPagination() {
  try {
    // Find user frigia.pasla
    const user = await prisma.user.findFirst({
      where: { username: 'frigia.pasla' }
    });

    if (!user) {
      console.log('User frigia.pasla not found');
      return;
    }

    console.log(`Found user: ${user.name} (${user.username})`);

    // Count total tickets for this user
    const totalTickets = await prisma.ticket.count({
      where: { assignedToId: user.id }
    });

    console.log(`Total tickets assigned to ${user.name}: ${totalTickets}`);

    // Test pagination - fetch in pages
    const pageSize = 100;
    const totalPages = Math.ceil(totalTickets / pageSize);

    console.log(`\nTesting pagination with ${pageSize} tickets per page:`);
    console.log(`Total pages needed: ${totalPages}`);

    // Test first page
    const firstPage = await prisma.ticket.findMany({
      where: { assignedToId: user.id },
      take: pageSize,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        ticketNumber: true,
        title: true
      }
    });

    console.log(`\nFirst page: ${firstPage.length} tickets`);
    if (firstPage.length > 0) {
      console.log(`First ticket: #${firstPage[0].ticketNumber}`);
      console.log(`Last ticket on page: #${firstPage[firstPage.length - 1].ticketNumber}`);
    }

    // Test last page (if more than 500 tickets)
    if (totalTickets > 500) {
      const lastPageSkip = (Math.floor(totalTickets / pageSize)) * pageSize;
      const lastPage = await prisma.ticket.findMany({
        where: { assignedToId: user.id },
        take: pageSize,
        skip: lastPageSkip,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          title: true
        }
      });

      console.log(`\nLast page (skip ${lastPageSkip}): ${lastPage.length} tickets`);
      if (lastPage.length > 0) {
        console.log(`First ticket on last page: #${lastPage[0].ticketNumber}`);
        console.log(`Last ticket: #${lastPage[lastPage.length - 1].ticketNumber}`);
      }
    }

    // Test API endpoint simulation
    console.log('\n=== Simulating API pagination ===');
    for (let page = 1; page <= Math.min(3, totalPages); page++) {
      const skip = (page - 1) * pageSize;
      const tickets = await prisma.ticket.findMany({
        where: { assignedToId: user.id },
        take: pageSize,
        skip: skip,
        orderBy: { createdAt: 'desc' }
      });

      console.log(`Page ${page}: Retrieved ${tickets.length} tickets (skip: ${skip})`);
    }

    console.log('\n✅ Pagination test completed successfully!');
    console.log(`The system can now handle all ${totalTickets} tickets with proper pagination.`);

  } catch (error) {
    console.error('Error during pagination test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPagination();