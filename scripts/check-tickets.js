const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTickets() {
  try {
    // Count total tickets
    const totalTickets = await prisma.ticket.count();
    console.log('Total tickets in database:', totalTickets);
    
    // Get first 5 tickets to verify data
    const sampleTickets = await prisma.ticket.findMany({
      take: 5,
      include: {
        createdBy: true,
        service: true
      }
    });
    
    console.log('\nSample tickets:');
    sampleTickets.forEach(ticket => {
      console.log(`- #${ticket.ticketNumber}: ${ticket.title} (Status: ${ticket.status})`);
    });
    
    // Check if there are any filters that might be excluding tickets
    const openTickets = await prisma.ticket.count({ where: { status: 'OPEN' } });
    const inProgressTickets = await prisma.ticket.count({ where: { status: 'IN_PROGRESS' } });
    const resolvedTickets = await prisma.ticket.count({ where: { status: 'RESOLVED' } });
    const closedTickets = await prisma.ticket.count({ where: { status: 'CLOSED' } });
    
    console.log('\nTickets by status:');
    console.log('- OPEN:', openTickets);
    console.log('- IN_PROGRESS:', inProgressTickets);
    console.log('- RESOLVED:', resolvedTickets);
    console.log('- CLOSED:', closedTickets);
    
  } catch (error) {
    console.error('Error checking tickets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTickets();