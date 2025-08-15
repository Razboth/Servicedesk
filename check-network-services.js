const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNetworkServices() {
  try {
    console.log('🔍 Checking network services and templates...\n');

    // Check services
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'Network' } },
          { name: { contains: 'ATM' } },
          { name: { contains: 'VSAT' } },
          { name: { contains: 'M2M' } },
          { name: { contains: 'Fiber' } }
        ]
      },
      include: {
        supportGroup: true,
        category: true
      }
    });

    console.log(`📊 Found ${services.length} network-related services:`);
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   - ID: ${service.id}`);
      console.log(`   - Category: ${service.category.name}`);
      console.log(`   - Support Group: ${service.supportGroup?.name || 'None'}`);
      console.log(`   - Priority: ${service.priority}`);
      console.log(`   - SLA: ${service.slaHours} hours`);
      console.log('');
    });

    // Check field templates
    const fieldTemplates = await prisma.fieldTemplate.findMany({
      where: {
        OR: [
          { name: { contains: 'Network' } },
          { name: { contains: 'Incident' } },
          { name: { contains: 'IP' } },
          { name: { contains: 'Response Time' } }
        ]
      }
    });

    console.log(`📋 Found ${fieldTemplates.length} network-related field templates:`);
    fieldTemplates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name}`);
      console.log(`   - Type: ${template.type}`);
      console.log(`   - Required: ${template.isRequired}`);
    });

    // Check support groups
    const supportGroups = await prisma.supportGroup.findMany({
      where: {
        OR: [
          { name: { contains: 'Network' } },
          { name: { contains: 'NOC' } }
        ]
      }
    });

    console.log(`\n👥 Found ${supportGroups.length} network-related support groups:`);
    supportGroups.forEach((group, index) => {
      console.log(`${index + 1}. ${group.name} (${group.code})`);
    });

    // Check categories
    const categories = await prisma.serviceCategory.findMany({
      where: {
        name: { contains: 'Network' }
      }
    });

    console.log(`\n📂 Found ${categories.length} network-related categories:`);
    categories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.name}`);
      console.log(`   - Level: ${category.level}`);
      console.log(`   - ID: ${category.id}`);
    });

  } catch (error) {
    console.error('❌ Error checking network services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNetworkServices();