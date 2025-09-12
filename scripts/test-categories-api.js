const { PrismaClient } = require('@prisma/client');

async function testCategoriesAPI() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Testing Categories API Logic ===');
    
    // Simulate the API logic
    const categories = await prisma.serviceCategory.findMany({
      where: {
        isActive: true
      },
      include: {
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            services: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter out categories with no active services
    const categoriesWithServices = categories.filter(cat => cat._count.services > 0);

    console.log('\n=== API Results ===');
    console.log(`Total categories: ${categories.length}`);
    console.log(`Categories with services: ${categoriesWithServices.length}`);
    
    console.log('\n=== Categories that will be shown in ticket wizard ===');
    categoriesWithServices.forEach(cat => {
      console.log(`✅ ${cat.name}: ${cat._count.services} services`);
    });

    console.log('\n=== Categories that will be hidden (0 services) ===');
    const categoriesWithoutServices = categories.filter(cat => cat._count.services === 0);
    categoriesWithoutServices.forEach(cat => {
      console.log(`❌ ${cat.name}: ${cat._count.services} services`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCategoriesAPI();