import { prisma } from './lib/prisma';

async function testSLAPerformance() {
  try {
    // Find a service with SLA tracking
    const service = await prisma.service.findFirst({
      where: {
        tickets: {
          some: {
            slaTracking: {
              some: {}
            }
          }
        }
      },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    });

    if (!service) {
      console.log('No service with SLA tracking found. Creating test data...');
      
      // Create test SLA data for existing service
      const testService = await prisma.service.findFirst({
        where: { tickets: { some: {} } }
      });
      
      if (testService) {
        const tickets = await prisma.ticket.findMany({
          where: { serviceId: testService.id },
          take: 5
        });
        
        for (const ticket of tickets) {
          // Check if SLA tracking exists
          const existing = await prisma.sLATracking.findFirst({
            where: { ticketId: ticket.id }
          });
          
          if (!existing) {
            // Find or create SLA template
            let slaTemplate = await prisma.sLATemplate.findFirst({
              where: { serviceId: testService.id }
            });
            
            if (!slaTemplate) {
              slaTemplate = await prisma.sLATemplate.create({
                data: {
                  serviceId: testService.id,
                  responseHours: 4,
                  resolutionHours: 24,
                  escalationHours: 12,
                  businessHoursOnly: false,
                  isActive: true
                }
              });
            }
            
            // Create SLA tracking with some breaches for testing
            const isBreached = Math.random() > 0.7; // 30% chance of breach
            await prisma.sLATracking.create({
              data: {
                ticketId: ticket.id,
                slaTemplateId: slaTemplate.id,
                responseDeadline: new Date(Date.now() + 4 * 60 * 60 * 1000),
                resolutionDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
                escalationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000),
                isResponseBreached: isBreached,
                isResolutionBreached: false
              }
            });
          }
        }
        
        console.log(`✅ Created SLA tracking for ${tickets.length} tickets`);
        service = testService;
      }
    }

    if (service) {
      // Get SLA statistics
      const slaStats = await prisma.sLATracking.findMany({
        where: {
          ticket: {
            serviceId: service.id
          }
        },
        select: {
          isResponseBreached: true,
          isResolutionBreached: true
        }
      });

      const total = slaStats.length;
      const responseBreached = slaStats.filter(s => s.isResponseBreached).length;
      const resolutionBreached = slaStats.filter(s => s.isResolutionBreached).length;
      const met = slaStats.filter(s => !s.isResponseBreached && !s.isResolutionBreached).length;

      console.log(`\n📊 SLA Performance for: ${service.name}`);
      console.log(`📍 Service URL: http://localhost:3000/services/${service.id}`);
      console.log(`\n🎯 SLA Metrics:`);
      console.log(`   Total Tickets with SLA: ${total}`);
      console.log(`   Tickets Meeting SLA: ${met}`);
      console.log(`   Response Breaches: ${responseBreached}`);
      console.log(`   Resolution Breaches: ${resolutionBreached}`);
      console.log(`\n📈 Performance Percentages:`);
      console.log(`   Overall: ${total > 0 ? ((met / total) * 100).toFixed(1) : '100.0'}%`);
      console.log(`   Response: ${total > 0 ? (((total - responseBreached) / total) * 100).toFixed(1) : '100.0'}%`);
      console.log(`   Resolution: ${total > 0 ? (((total - resolutionBreached) / total) * 100).toFixed(1) : '100.0'}%`);
      console.log(`\n🔗 View at: http://localhost:3000/services/${service.id}`);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSLAPerformance();
