const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTicket() {
  // Check the most recent ticket
  const ticket = await prisma.ticket.findFirst({
    where: { ticketNumber: 'TKT-2025-000854' },
    include: {
      service: {
        include: {
          category: true
        }
      }
    }
  });
  
  if (ticket) {
    console.log('=================================');
    console.log('TICKET DETAILS:');
    console.log('=================================');
    console.log('Ticket Number:', ticket.ticketNumber);
    console.log('Title:', ticket.title);
    console.log('Service ID:', ticket.serviceId);
    console.log('Service Name:', ticket.service?.name || 'N/A');
    console.log('Category:', ticket.service?.category?.name || 'N/A');
    console.log('Created At:', ticket.createdAt);
  } else {
    console.log('Ticket TKT-2025-000854 not found');
  }
  
  // Check what ATM Monitoring Alert service exists
  console.log('\n=================================');
  console.log('ATM MONITORING ALERT SERVICE:');
  console.log('=================================');
  
  const atmService = await prisma.service.findFirst({
    where: { name: 'ATM Monitoring Alert' },
    include: {
      category: true
    }
  });
  
  if (atmService) {
    console.log('Service ID:', atmService.id);
    console.log('Service Name:', atmService.name);
    console.log('Category:', atmService.category?.name || 'N/A');
    console.log('Is Active:', atmService.isActive);
  } else {
    console.log('ATM Monitoring Alert service not found!');
  }
  
  // Check if there's a "Laporan Penerimaan Kartu ATM" service
  console.log('\n=================================');
  console.log('CARD RECEIPT SERVICE:');
  console.log('=================================');
  
  const cardService = await prisma.service.findFirst({
    where: { 
      name: { contains: 'Laporan Penerimaan Kartu ATM' }
    },
    include: {
      category: true
    }
  });
  
  if (cardService) {
    console.log('Service ID:', cardService.id);
    console.log('Service Name:', cardService.name);
    console.log('Category:', cardService.category?.name || 'N/A');
  } else {
    console.log('Card receipt service not found');
  }
  
  await prisma.$disconnect();
}

checkTicket().catch(console.error);