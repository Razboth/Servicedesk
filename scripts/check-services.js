const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkServices() {
  try {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      include: {
        category: true
      }
    });
    
    console.log(`Found ${services.length} active services:`);
    
    // Group by category
    const byCategory = {};
    services.forEach(service => {
      const catName = service.category?.name || 'Uncategorized';
      if (!byCategory[catName]) {
        byCategory[catName] = [];
      }
      byCategory[catName].push(service.name);
    });
    
    Object.keys(byCategory).sort().forEach(category => {
      console.log(`\n${category}:`);
      byCategory[category].forEach(service => {
        console.log(`  - ${service}`);
      });
    });
    
    // Also check service categories
    const categories = await prisma.serviceCategory.findMany({
      where: { isActive: true }
    });
    
    console.log(`\n\nFound ${categories.length} active service categories:`);
    categories.forEach(cat => {
      console.log(`- ${cat.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServices();