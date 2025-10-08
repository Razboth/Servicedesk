const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testTicketCreation() {
  try {
    // Find Frigia user
    const user = await prisma.user.findFirst({
      where: {
        username: 'frigia.pasla'
      },
      include: {
        branch: true
      }
    });

    if (!user) {
      console.log('User not found');
      return;
    }

    console.log('User:', {
      id: user.id,
      username: user.username,
      branchId: user.branchId,
      branchName: user.branch?.name
    });

    // Find OLIBs - Buka Blokir service
    const service = await prisma.service.findFirst({
      where: {
        id: 'cmekrqilp00r9hlusb3y16jis' // OLIBs - Buka Blokir
      },
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (!service) {
      console.log('Service not found');
      return;
    }

    console.log('\nService:', {
      id: service.id,
      name: service.name,
      requiresApproval: service.requiresApproval,
      supportGroupId: service.supportGroupId
    });

    console.log('\nRequired fields:');
    service.fieldTemplates.forEach(ft => {
      if (ft.isRequired) {
        console.log(`- ${ft.fieldTemplate.name}: ${ft.fieldTemplate.label} (${ft.fieldTemplate.type})`);
      }
    });

    // Try to create a test ticket
    console.log('\nAttempting to create ticket...');

    const ticketData = {
      title: 'TEST - Buka Blokir OLIBs',
      description: 'Test ticket creation for debugging',
      priority: 'MEDIUM',
      status: 'OPEN',
      category: 'SERVICE_REQUEST',
      serviceId: service.id,
      branchId: user.branchId,
      createdById: user.id,
      ticketNumber: 'TEST-' + Date.now()
    };

    console.log('\nTicket data:', ticketData);

    const ticket = await prisma.ticket.create({
      data: ticketData
    });

    console.log('\n✅ Ticket created successfully:', {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber
    });

    // Delete the test ticket
    await prisma.ticket.delete({
      where: { id: ticket.id }
    });
    console.log('✅ Test ticket deleted');

  } catch (error) {
    console.error('\n❌ Error creating ticket:', error.message);
    if (error.code === 'P2003') {
      console.error('Foreign key constraint failed - check if all referenced IDs exist');
    }
    console.error('\nFull error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketCreation();
