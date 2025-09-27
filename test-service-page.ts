import { prisma } from './lib/prisma';

async function testServicePage() {
  try {
    // Find a service with tickets
    const service = await prisma.service.findFirst({
      where: {
        tickets: {
          some: {}
        }
      },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });

    if (service) {
      console.log(`\n✅ Service Detail Page Test:`);
      console.log(`📍 URL: http://localhost:3000/services/${service.id}`);
      console.log(`📦 Service: ${service.name}`);
      console.log(`🎫 Tickets: ${service._count.tickets}`);
      
      // Get first 3 tickets for this service
      const tickets = await prisma.ticket.findMany({
        where: { serviceId: service.id },
        take: 3,
        select: {
          ticketNumber: true,
          title: true,
          status: true,
          priority: true
        }
      });
      
      console.log(`\n📊 Sample Tickets:`);
      tickets.forEach(t => {
        console.log(`  - #${t.ticketNumber}: ${t.title} [${t.status}/${t.priority}]`);
      });
      
      console.log(`\n🔗 View the service detail page at:`);
      console.log(`   http://localhost:3000/services/${service.id}`);
    } else {
      console.log('No services with tickets found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testServicePage();
