const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkServiceSupportGroups() {
  try {
    console.log('🔍 Checking current service-support group assignments...');
    
    // Get all support groups
    const supportGroups = await prisma.supportGroup.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 Available Support Groups:');
    supportGroups.forEach(group => {
      console.log(`   • ${group.name} (${group.code})`);
    });
    
    // Get all services with their support group assignments
    const services = await prisma.service.findMany({
      include: {
        supportGroup: true,
        category: true,
        tier1Category: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n🔧 Total Services: ${services.length}`);
    
    // Group services by support group
    const servicesByGroup = new Map();
    services.forEach(service => {
      const groupName = service.supportGroup?.name || 'Unassigned';
      if (!servicesByGroup.has(groupName)) {
        servicesByGroup.set(groupName, []);
      }
      servicesByGroup.get(groupName).push(service);
    });
    
    console.log('\n📊 Services by Support Group:');
    for (const [groupName, groupServices] of servicesByGroup) {
      console.log(`\n   ${groupName}: ${groupServices.length} services`);
      groupServices.slice(0, 5).forEach(service => {
        console.log(`     - ${service.name} (Category: ${service.tier1Category?.name || service.category?.name || 'N/A'})`);
      });
      if (groupServices.length > 5) {
        console.log(`     ... and ${groupServices.length - 5} more`);
      }
    }
    
    // Check for category patterns
    console.log('\n🏷️  Service Categories Analysis:');
    const categoryMap = new Map();
    services.forEach(service => {
      const categoryName = service.tier1Category?.name || service.category?.name || 'Unknown';
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName).push(service);
    });
    
    for (const [categoryName, categoryServices] of categoryMap) {
      console.log(`   • ${categoryName}: ${categoryServices.length} services`);
    }
    
  } catch (error) {
    console.error('❌ Error checking service assignments:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceSupportGroups();