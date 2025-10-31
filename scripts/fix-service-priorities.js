const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixServicePriorities() {
  try {
    console.log('Checking all services for priority values...');

    // Get all services
    const allServices = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        priority: true
      }
    });

    console.log(`Found ${allServices.length} total services`);

    // Filter services that need updating
    const servicesToUpdate = allServices.filter(s =>
      !s.priority || !['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY'].includes(s.priority)
    );

    console.log(`\nServices needing update: ${servicesToUpdate.length}`);
    servicesToUpdate.forEach(s => console.log(`  - ${s.name}: ${s.priority || 'null'}`));

    if (servicesToUpdate.length === 0) {
      console.log('\nNo services need updating!');
      return;
    }

    // Update each service individually
    let updated = 0;
    for (const service of servicesToUpdate) {
      await prisma.service.update({
        where: { id: service.id },
        data: { priority: 'HIGH' }
      });
      updated++;
      console.log(`  ✓ Updated ${service.name} to HIGH`);
    }

    console.log(`\n✅ Successfully updated ${updated} services to HIGH priority`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixServicePriorities();
