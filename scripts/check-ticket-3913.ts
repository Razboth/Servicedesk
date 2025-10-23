import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTicket() {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: '3913'
      },
      include: {
        service: {
          include: {
            tier1Category: true,
            tier2Subcategory: true,
            tier3Item: true
          }
        }
      }
    });

    if (!ticket) {
      console.log('❌ Ticket 3913 not found');
      return;
    }

    console.log('\n📋 Ticket #3913 Details:');
    console.log('=====================================');
    console.log('Ticket Number:', ticket.ticketNumber);
    console.log('Created At:', ticket.createdAt);
    console.log('Old Category:', ticket.category);
    console.log('Old Subcategory:', ticket.subcategory);
    console.log('\nNew 3-Tier System:');
    console.log('Service ID:', ticket.serviceId);
    console.log('Service Name:', ticket.service?.name || 'N/A');
    console.log('Tier 1 (Category):', ticket.service?.tier1Category?.name || 'N/A');
    console.log('Tier 2 (Subcategory):', ticket.service?.tier2Subcategory?.name || 'N/A');
    console.log('Tier 3 (Item):', ticket.service?.tier3Item?.name || 'N/A');
    console.log('=====================================\n');

    // Check if it matches the current query
    const matchesOldSystem = ticket.category?.toLowerCase().includes('transaction claim');
    const matchesNewSystem = ticket.service?.tier1Category?.name?.toLowerCase().includes('transaction claim');

    console.log('Query Match Analysis:');
    console.log('Matches Old System (category contains "transaction claim"):', matchesOldSystem);
    console.log('Matches New System (tier1 contains "transaction claim"):', matchesNewSystem);
    console.log('Should appear in report:', matchesOldSystem || matchesNewSystem);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicket();
