const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPermasalahanTeknis() {
  try {
    // Find the service
    const service = await prisma.service.findFirst({
      where: {
        name: {
          contains: 'Permasalahan Teknis'
        }
      },
      include: {
        fields: true, // ServiceField
        fieldTemplates: {  // ServiceFieldTemplate
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    console.log('Service found:', service ? 'Yes' : 'No');
    if (service) {
      console.log('Service ID:', service.id);
      console.log('Service Name:', service.name);
      console.log('ServiceFields (direct):', service.fields.length);
      console.log('ServiceFieldTemplates (linked):', service.fieldTemplates.length);

      console.log('\nServiceFields (direct):');
      service.fields.forEach(field => {
        console.log(`  - ${field.label} (${field.type})`);
      });

      console.log('\nServiceFieldTemplates (linked):');
      service.fieldTemplates.forEach(link => {
        console.log(`  - ${link.fieldTemplate.label} (${link.fieldTemplate.fieldType})`);
      });
    }

    // Find recent tickets with this service
    const tickets = await prisma.ticket.findMany({
      where: {
        service: {
          name: {
            contains: 'Permasalahan Teknis'
          }
        }
      },
      include: {
        fieldValues: true,
        service: {
          include: {
            fields: true
          }
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`\nFound ${tickets.length} tickets with this service\n`);

    tickets.forEach(ticket => {
      console.log(`Ticket #${ticket.ticketNumber}:`);
      console.log(`  Service: ${ticket.service.name}`);
      console.log(`  fieldValues: ${ticket.fieldValues.length}`);

      if (ticket.fieldValues.length > 0) {
        console.log('  Field Values:');
        ticket.fieldValues.forEach(value => {
          const field = ticket.service.fields.find(f => f.id === value.fieldId);
          console.log(`    - ${field ? field.label : 'Unknown'}: ${value.value}`);
        });
      } else {
        console.log(`    (No field values saved)`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPermasalahanTeknis();
