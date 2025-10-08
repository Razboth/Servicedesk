const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findBukaBlokir() {
  try {
    // Find all services with "Buka" in the name
    const services = await prisma.service.findMany({
      where: {
        name: { contains: 'Buka', mode: 'insensitive' }
      },
      include: {
        supportGroup: true,
        category: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    console.log(`Found ${services.length} services with "Buka" in the name:\n`);

    for (const service of services) {
      console.log(`Service: ${service.name}`);
      console.log(`  ID: ${service.id}`);
      console.log(`  Active: ${service.isActive}`);
      console.log(`  Support Group: ${service.supportGroup?.name || 'NO SUPPORT GROUP'}`);
      console.log(`  Category: ${service.category?.name || 'NO CATEGORY'}`);
      console.log(`  Requires Approval: ${service.requiresApproval}`);

      if (service.fieldTemplates && service.fieldTemplates.length > 0) {
        console.log(`  Required Fields:`);
        service.fieldTemplates.forEach(ft => {
          if (ft.isRequired) {
            console.log(`    - ${ft.fieldTemplate.label} (${ft.fieldTemplate.type})`);
          }
        });
      }

      // Check last successful ticket
      const lastTicket = await prisma.ticket.findFirst({
        where: {
          serviceId: service.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          ticketNumber: true,
          createdAt: true,
          createdBy: {
            select: {
              username: true
            }
          }
        }
      });

      if (lastTicket) {
        console.log(`  Last ticket: #${lastTicket.ticketNumber} by ${lastTicket.createdBy.username} at ${lastTicket.createdAt}`);
      } else {
        console.log(`  No tickets created for this service yet`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findBukaBlokir();