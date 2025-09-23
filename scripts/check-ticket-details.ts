import { prisma } from '../lib/prisma';

async function checkTicketDetails() {
  try {
    const ticket = await prisma.ticket.findFirst({
      where: { ticketNumber: '1445' },
      include: { branch: true }
    });

    if (ticket) {
      console.log('Ticket Details:');
      console.log('  Ticket Number:', ticket.ticketNumber);
      console.log('  Title:', ticket.title);
      console.log('  Branch:', ticket.branch?.name);
      console.log('  Branch Code:', ticket.branch?.code);
      console.log('  Description Preview:');
      console.log(ticket.description?.substring(0, 400));
    } else {
      console.log('Ticket not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTicketDetails();