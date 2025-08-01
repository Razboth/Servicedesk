const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('Checking database state...');
    
    const serviceCount = await prisma.service.count();
    const categoryCount = await prisma.serviceCategory.count();
    const userCount = await prisma.user.count();
    
    console.log(`\nDatabase Summary:`);
    console.log(`- Services: ${serviceCount}`);
    console.log(`- Service Categories: ${categoryCount}`);
    console.log(`- Users: ${userCount}`);
    
    if (serviceCount > 0) {
      console.log('\nFirst 10 services:');
      const services = await prisma.service.findMany({
        take: 10,
        include: {
          category: true
        }
      });
      
      services.forEach((service, index) => {
        console.log(`${index + 1}. ${service.name} (Category: ${service.category?.name || 'N/A'})`);
      });
    }
    
    if (categoryCount > 0) {
      console.log('\nService Categories:');
      const categories = await prisma.serviceCategory.findMany();
      categories.forEach((cat, index) => {
        console.log(`${index + 1}. ${cat.name}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();