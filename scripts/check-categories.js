const { PrismaClient } = require('@prisma/client');

async function checkCategories() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Category Service Count Analysis ===');
    
    // Get all categories with service counts
    const categories = await prisma.serviceCategory.findMany({
      include: {
        services: {
          where: {
            isActive: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    console.log('\nCategories and their active service counts:');
    categories.forEach(category => {
      console.log(`${category.name}: ${category.services.length} services`);
      if (category.services.length === 0) {
        console.log(`  ⚠️  Category "${category.name}" has no active services!`);
      }
    });
    
    // Check for inactive services
    console.log('\n=== Inactive Services Check ===');
    const inactiveServices = await prisma.service.findMany({
      where: {
        isActive: false
      },
      include: {
        category: true
      }
    });
    
    if (inactiveServices.length > 0) {
      console.log(`Found ${inactiveServices.length} inactive services:`);
      inactiveServices.forEach(service => {
        console.log(`  - ${service.name} (Category: ${service.category?.name || 'None'})`);
      });
    } else {
      console.log('No inactive services found.');
    }
    
    // Check subcategories
    console.log('\n=== Subcategory Analysis ===');
    const subcategories = await prisma.serviceSubcategory.findMany({
      include: {
        services: {
          where: {
            isActive: true
          }
        },
        category: true
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' }
      ]
    });
    
    subcategories.forEach(sub => {
      if (sub.services.length === 0) {
        console.log(`⚠️  Subcategory "${sub.name}" (${sub.category?.name}) has no active services!`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();