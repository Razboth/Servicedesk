const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTicketAPI() {
  try {
    // Get ticket #12678 which we know has field values
    const ticket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: '12678'
      },
      include: {
        service: { select: { name: true } },
        createdBy: { select: { name: true, email: true, role: true } },
        assignedTo: { select: { name: true, email: true, role: true, avatar: true } },
        fieldValues: {
          include: {
            field: { select: { name: true, type: true, label: true } }
          }
        }
      }
    });

    if (ticket) {
      console.log('Ticket Number:', ticket.ticketNumber);
      console.log('Service:', ticket.service.name);
      console.log('Field Values Count:', ticket.fieldValues.length);
      console.log('\nField Values:');
      ticket.fieldValues.forEach(fv => {
        console.log(`  - ${fv.field.label} (${fv.field.type}): ${fv.value}`);
      });
      
      // Show the API response structure
      console.log('\n\nAPI Response Structure:');
      console.log(JSON.stringify({
        ticketNumber: ticket.ticketNumber,
        service: ticket.service,
        fieldValuesLength: ticket.fieldValues.length,
        fieldValues: ticket.fieldValues
      }, null, 2));
    } else {
      console.log('Ticket not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketAPI();
