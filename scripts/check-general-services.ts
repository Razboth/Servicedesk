import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkGeneralServices() {
  try {
    // Find the General Services category
    const generalServicesCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'General',
          mode: 'insensitive'
        }
      }
    });

    if (!generalServicesCategory) {
      console.log('No General Services category found');
      return;
    }

    console.log('General Services Category:', generalServicesCategory.name, '(', generalServicesCategory.id, ')');
    console.log('');

    // Find all services using this category
    const services = await prisma.service.findMany({
      where: {
        tier1CategoryId: generalServicesCategory.id
      },
      select: {
        id: true,
        name: true,
        description: true,
        supportGroup: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Found ${services.length} services with General Services category:`);
    console.log('');

    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   Description: ${service.description || 'N/A'}`);
      console.log(`   Support Group: ${service.supportGroup?.name || 'N/A'}`);
      console.log('');
    });

    // Also show available categories
    console.log('Available Categories:');
    const allCategories = await prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });

    allCategories.forEach(cat => {
      console.log(`  - ${cat.name} (${cat.id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkGeneralServices();
