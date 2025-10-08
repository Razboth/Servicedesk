const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOlibsService() {
  try {
    // Find the Buka Blokir - OLIBs service
    const service = await prisma.service.findFirst({
      where: {
        OR: [
          { name: { contains: 'Buka Blokir', mode: 'insensitive' } },
          { name: { contains: 'OLIBs', mode: 'insensitive' } }
        ]
      },
      include: {
        supportGroup: true,
        category: true,
        tier2Subcategory: true,
        tier3Item: true,
        fields: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (service) {
      console.log('Service found:', {
        id: service.id,
        name: service.name,
        description: service.description,
        isActive: service.isActive,
        supportGroupId: service.supportGroupId,
        supportGroupName: service.supportGroup?.name || 'NO SUPPORT GROUP',
        requiresApproval: service.requiresApproval,
        requiresJustification: service.requiresJustification,
        tier1CategoryId: service.tier1CategoryId,
        tier2CategoryId: service.tier2CategoryId,
        tier3CategoryId: service.tier3CategoryId
      });

      if (!service.supportGroupId) {
        console.log('\nERROR: Service has no support group assigned!');
        console.log('This will cause ticket creation to fail.');
      }

      if (!service.isActive) {
        console.log('\nWARNING: Service is not active!');
      }

      // Check required fields
      if (service.fields && service.fields.length > 0) {
        console.log('\nRequired fields for this service:');
        service.fields.forEach(field => {
          if (field.isRequired) {
            console.log(`- ${field.name}: ${field.label} (${field.type})`);
          }
        });
      }

      // Check field templates
      if (service.fieldTemplates && service.fieldTemplates.length > 0) {
        console.log('\nField templates for this service:');
        service.fieldTemplates.forEach(ft => {
          if (ft.isRequired) {
            console.log(`- ${ft.fieldTemplate.name}: ${ft.fieldTemplate.label} (${ft.fieldTemplate.type})`);
          }
        });
      }

      // Check recent tickets for this service
      const recentTickets = await prisma.ticket.findMany({
        where: {
          serviceId: service.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          createdAt: true,
          createdBy: {
            select: {
              username: true
            }
          }
        }
      });

      console.log('\nRecent tickets for this service:');
      if (recentTickets.length > 0) {
        recentTickets.forEach(t => {
          console.log(`- #${t.ticketNumber} by ${t.createdBy.username} at ${t.createdAt}`);
        });
      } else {
        console.log('No recent tickets found for this service');
      }

    } else {
      console.log('Service not found');

      // List all services to help find the correct one
      const allServices = await prisma.service.findMany({
        where: {
          isActive: true
        },
        select: {
          name: true,
          supportGroup: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log('\nAll active services:');
      allServices.forEach(s => console.log(`- ${s.name} (${s.supportGroup?.name || 'NO SUPPORT GROUP'})`));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkOlibsService();