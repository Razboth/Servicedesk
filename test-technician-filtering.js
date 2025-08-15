const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTechnicianFiltering() {
  try {
    console.log('🧪 Testing technician ticket filtering by support group...');
    
    // Get all technicians with their support groups
    const technicians = await prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      include: {
        supportGroup: true,
        branch: true
      }
    });
    
    console.log(`\n👨‍🔧 Found ${technicians.length} technicians:`);
    technicians.forEach(tech => {
      console.log(`   • ${tech.name} (${tech.email}) - ${tech.supportGroup?.name || 'No Support Group'}`);
    });
    
    // Create some test tickets for different support groups
    console.log('\n🎫 Creating test tickets...');
    
    // Get some services from different support groups
    const atmService = await prisma.service.findFirst({
      where: {
        supportGroup: {
          code: 'ATM_SERVICES'
        }
      },
      include: { supportGroup: true }
    });
    
    const userMgmtService = await prisma.service.findFirst({
      where: {
        supportGroup: {
          code: 'USER_MGMT'
        }
      },
      include: { supportGroup: true }
    });
    
    const networkService = await prisma.service.findFirst({
      where: {
        supportGroup: {
          code: 'NETWORK'
        }
      },
      include: { supportGroup: true }
    });
    
    // Get a regular user to create tickets
    const regularUser = await prisma.user.findFirst({
      where: { role: 'USER' }
    });
    
    if (!regularUser) {
      console.log('❌ No regular user found to create test tickets');
      return;
    }
    
    const testTickets = [];
    
    // Create ATM ticket
    if (atmService) {
      const atmTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TEST-ATM-${Date.now()}`,
          title: 'Test ATM Issue',
          description: 'Test ticket for ATM services',
          serviceId: atmService.id,
          supportGroupId: atmService.supportGroupId,
          createdById: regularUser.id,
          branchId: regularUser.branchId,
          priority: 'MEDIUM',
          status: 'OPEN'
        }
      });
      testTickets.push({ ticket: atmTicket, service: atmService });
      console.log(`   ✅ Created ATM ticket: ${atmTicket.ticketNumber}`);
    }
    
    // Create User Management ticket
    if (userMgmtService) {
      const userTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TEST-USER-${Date.now()}`,
          title: 'Test User Management Issue',
          description: 'Test ticket for user management',
          serviceId: userMgmtService.id,
          supportGroupId: userMgmtService.supportGroupId,
          createdById: regularUser.id,
          branchId: regularUser.branchId,
          priority: 'MEDIUM',
          status: 'OPEN'
        }
      });
      testTickets.push({ ticket: userTicket, service: userMgmtService });
      console.log(`   ✅ Created User Management ticket: ${userTicket.ticketNumber}`);
    }
    
    // Create Network ticket
    if (networkService) {
      const networkTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TEST-NET-${Date.now()}`,
          title: 'Test Network Issue',
          description: 'Test ticket for network services',
          serviceId: networkService.id,
          supportGroupId: networkService.supportGroupId,
          createdById: regularUser.id,
          branchId: regularUser.branchId,
          priority: 'MEDIUM',
          status: 'OPEN'
        }
      });
      testTickets.push({ ticket: networkTicket, service: networkService });
      console.log(`   ✅ Created Network ticket: ${networkTicket.ticketNumber}`);
    }
    
    console.log(`\n🔍 Testing ticket visibility for each technician...`);
    
    // Test filtering for each technician
    for (const technician of technicians) {
      if (!technician.supportGroupId) {
        console.log(`\n   ⚠️  ${technician.name} has no support group assigned`);
        continue;
      }
      
      console.log(`\n   👨‍🔧 Testing for ${technician.name} (${technician.supportGroup.name}):`);
      
      // Simulate the API filtering logic
      const visibleTickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { createdById: technician.id },
            { assignedToId: technician.id },
            { 
              AND: [
                { assignedToId: null }, // Unassigned tickets
                { 
                  service: {
                    supportGroupId: technician.supportGroupId
                  }
                }
              ]
            }
          ]
        },
        include: {
          service: {
            include: {
              supportGroup: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log(`     📊 Can see ${visibleTickets.length} tickets:`);
      
      // Show test tickets they can see
      const testTicketsVisible = visibleTickets.filter(ticket => 
        testTickets.some(test => test.ticket.id === ticket.id)
      );
      
      if (testTicketsVisible.length > 0) {
        testTicketsVisible.forEach(ticket => {
          console.log(`       ✅ ${ticket.ticketNumber} (${ticket.service.supportGroup?.name})`);
        });
      } else {
        console.log(`       ❌ No test tickets visible (this might be expected)`);
      }
      
      // Show breakdown by support group
      const ticketsByGroup = new Map();
      visibleTickets.forEach(ticket => {
        const groupName = ticket.service.supportGroup?.name || 'Unassigned';
        ticketsByGroup.set(groupName, (ticketsByGroup.get(groupName) || 0) + 1);
      });
      
      console.log(`     📋 Breakdown by support group:`);
      for (const [groupName, count] of ticketsByGroup) {
        console.log(`       • ${groupName}: ${count} tickets`);
      }
    }
    
    // Clean up test tickets
    console.log(`\n🧹 Cleaning up test tickets...`);
    for (const { ticket } of testTickets) {
      await prisma.ticket.delete({ where: { id: ticket.id } });
      console.log(`   🗑️  Deleted ${ticket.ticketNumber}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing technician filtering:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTechnicianFiltering();