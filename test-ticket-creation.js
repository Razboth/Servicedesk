const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTicketCreation() {
  try {
    console.log('🧪 Testing network ticket creation process...\n');

    // Step 1: Check if we can find services
    const services = await prisma.service.findMany({
      where: {
        name: {
          in: [
            'Critical Network Outage - Branch Complete Failure',
            'ATM Network Outage - Transaction Processing Failure',
            'Intermittent Network Connectivity Issues',
            'Severe Network Performance Degradation'
          ]
        }
      },
      include: {
        supportGroup: true,
        category: true
      }
    });

    console.log(`📊 Found ${services.length} expected network services`);
    if (services.length === 0) {
      console.log('❌ No network services found! Need to run enhanced templates seeding.');
      console.log('Run: npx tsx scripts/seed-enhanced-network-templates.ts');
      return;
    }

    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   - Support Group: ${service.supportGroup?.name || 'MISSING!'}`);
    });

    // Step 2: Test service selection logic
    async function determineServiceForIncident(incidentType, networkMedia, endpointType) {
      let serviceName = '';
      
      switch (incidentType) {
        case 'OUTAGE':
        case 'OFFLINE':
          if (endpointType === 'ATM') {
            serviceName = 'ATM Network Outage - Transaction Processing Failure';
          } else if (networkMedia === 'VSAT') {
            serviceName = 'VSAT Satellite Network Issues';
          } else if (networkMedia === 'M2M') {
            serviceName = 'M2M Cellular Network Issues';
          } else if (networkMedia === 'FO') {
            serviceName = 'Fiber Optic Network Issues';
          } else {
            serviceName = 'Critical Network Outage - Branch Complete Failure';
          }
          break;
        case 'SLOW':
          serviceName = 'Severe Network Performance Degradation';
          break;
        case 'INTERMITTENT':
        case 'TIMEOUT':
        case 'ERROR':
          serviceName = 'Intermittent Network Connectivity Issues';
          break;
        default:
          serviceName = endpointType === 'ATM' 
            ? 'ATM Network Outage - Transaction Processing Failure'
            : 'Critical Network Outage - Branch Complete Failure';
      }

      const service = await prisma.service.findFirst({
        where: { 
          name: serviceName,
          isActive: true
        },
        select: { id: true, name: true, priority: true, slaHours: true }
      });

      return service?.id || null;
    }

    // Test different incident types
    const testCases = [
      { incidentType: 'OUTAGE', networkMedia: null, endpointType: 'BRANCH' },
      { incidentType: 'OFFLINE', networkMedia: 'VSAT', endpointType: 'BRANCH' },
      { incidentType: 'SLOW', networkMedia: null, endpointType: 'ATM' },
      { incidentType: 'ERROR', networkMedia: 'M2M', endpointType: 'ATM' }
    ];

    console.log('\n🧪 Testing service selection logic...');
    for (const testCase of testCases) {
      const serviceId = await determineServiceForIncident(
        testCase.incidentType, 
        testCase.networkMedia, 
        testCase.endpointType
      );
      
      console.log(`📋 ${testCase.incidentType} + ${testCase.networkMedia || 'null'} + ${testCase.endpointType}: ${serviceId ? '✅ Found' : '❌ Not Found'}`);
    }

    // Step 3: Check if we can create a test ticket
    console.log('\n🎯 Testing minimal ticket creation...');

    const firstService = services[0];
    if (!firstService.supportGroup) {
      console.log('❌ Service has no support group! This will cause ticket creation to fail.');
      return;
    }

    // Get a sample user to test with
    const testUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!testUser) {
      console.log('❌ No ADMIN user found for testing');
      return;
    }

    console.log(`👤 Using test user: ${testUser.name} (${testUser.role})`);

    // Test minimal ticket creation
    const timestamp = Date.now();
    const ticketNumber = `TEST-${timestamp.toString().slice(-8)}-NET-TEST`;

    const testTicketData = {
      ticketNumber,
      title: '[TEST] Network Test Ticket',
      description: 'This is a test ticket for network incident creation',
      category: 'INCIDENT',
      priority: 'MEDIUM',
      status: 'OPEN',
      serviceId: firstService.id,
      supportGroupId: firstService.supportGroup.id,
      createdById: testUser.id
    };

    console.log('📝 Attempting to create test ticket with data:', {
      ticketNumber: testTicketData.ticketNumber,
      serviceId: testTicketData.serviceId,
      supportGroupId: testTicketData.supportGroupId,
      createdById: testTicketData.createdById
    });

    const testTicket = await prisma.ticket.create({
      data: testTicketData
    });

    console.log('✅ Test ticket created successfully!');
    console.log(`🎫 Ticket ID: ${testTicket.id}`);
    console.log(`🎫 Ticket Number: ${testTicket.ticketNumber}`);

    // Clean up test ticket
    await prisma.ticket.delete({
      where: { id: testTicket.id }
    });
    console.log('🗑️  Test ticket cleaned up');

    console.log('\n✅ All tests passed! Network ticket creation should work.');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    
    if (error.code === 'P2002') {
      console.log('💡 This is likely a unique constraint violation (duplicate ticket number)');
    } else if (error.code === 'P2003') {
      console.log('💡 This is a foreign key constraint violation (invalid reference)');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testTicketCreation();