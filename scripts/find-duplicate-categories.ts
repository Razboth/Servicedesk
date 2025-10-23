import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findDuplicateCategories() {
  try {
    // Find all categories with "Transaction Claim" in name
    const categories = await prisma.category.findMany({
      where: {
        name: {
          contains: 'Transaction Claim',
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: {
            services: true  // Count services using this category
          }
        }
      }
    });

    console.log(`\n📊 Found ${categories.length} "Transaction Claim" categories:\n`);

    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Services using it: ${cat._count.services}`);
      console.log(`   Active: ${cat.isActive}`);
      console.log('');
    });

    // Check specifically which services use each category
    for (const cat of categories) {
      const services = await prisma.service.findMany({
        where: {
          OR: [
            { categoryId: cat.id },
            { tier1CategoryId: cat.id }
          ]
        },
        select: {
          id: true,
          name: true,
          categoryId: true,
          tier1CategoryId: true
        }
      });

      if (services.length > 0) {
        console.log(`\n🔍 Services using category "${cat.name}" (${cat.id}):`);
        services.forEach(svc => {
          console.log(`  - ${svc.name}`);
          console.log(`    OLD categoryId: ${svc.categoryId === cat.id ? '✅ YES' : '❌ NO'}`);
          console.log(`    NEW tier1CategoryId: ${svc.tier1CategoryId === cat.id ? '✅ YES' : '❌ NO'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findDuplicateCategories();
