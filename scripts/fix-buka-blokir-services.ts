import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixBukaBokirServices() {
  try {
    console.log('🔧 Fixing "Buka Blokir" services with incorrect "General Services" category...\n');

    // Find User Management category
    const userManagementCategory = await prisma.category.findFirst({
      where: {
        name: { equals: 'User Management', mode: 'insensitive' }
      }
    });

    if (!userManagementCategory) {
      console.log('❌ User Management category not found');
      return;
    }

    console.log(`✅ User Management Category ID: ${userManagementCategory.id}\n`);

    // Find General Services category
    const generalServicesCategory = await prisma.category.findFirst({
      where: {
        name: { contains: 'General', mode: 'insensitive' }
      }
    });

    if (!generalServicesCategory) {
      console.log('❌ General Services category not found');
      return;
    }

    console.log(`✅ General Services Category ID: ${generalServicesCategory.id}\n`);

    // Find all services with "Buka Blokir" that have General Services as tier1Category
    const services = await prisma.service.findMany({
      where: {
        AND: [
          {
            name: {
              contains: 'Buka Blokir',
              mode: 'insensitive'
            }
          },
          {
            tier1CategoryId: generalServicesCategory.id
          }
        ]
      },
      include: {
        category: true,
        tier1Category: true,
        _count: {
          select: { tickets: true }
        }
      }
    });

    if (services.length === 0) {
      console.log('✅ No services found with incorrect General Services category\n');
      return;
    }

    console.log(`📊 Found ${services.length} service(s) to fix:\n`);

    let fixed = 0;

    for (const service of services) {
      console.log('─'.repeat(80));
      console.log(`Service: ${service.name}`);
      console.log(`ID: ${service.id}`);
      console.log(`Total Tickets: ${service._count.tickets}\n`);

      console.log('BEFORE:');
      console.log(`   OLD System: ${service.category?.name || 'None'}`);
      console.log(`   NEW System: ${service.tier1Category?.name || 'None'}\n`);

      // Update the service
      await prisma.service.update({
        where: { id: service.id },
        data: {
          tier1CategoryId: userManagementCategory.id
        }
      });

      console.log('AFTER:');
      console.log(`   OLD System: ${service.category?.name || 'None'}`);
      console.log(`   NEW System: User Management ✅\n`);

      fixed++;
    }

    console.log('═'.repeat(80));
    console.log('✅ FIX COMPLETED');
    console.log('═'.repeat(80));
    console.log(`\nFixed ${fixed} service(s)`);
    console.log('\nAll "Buka Blokir" services now correctly use "User Management" category\n');
    console.log('💡 Restart the application to see changes in Monthly Report\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixBukaBokirServices();
