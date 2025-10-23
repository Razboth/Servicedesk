import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkServiceCategories() {
  try {
    // Check ServiceCategory table (OLD system)
    const serviceCategories = await prisma.serviceCategory.findMany({
      where: {
        name: {
          contains: 'Transaction Claim',
          mode: 'insensitive'
        }
      },
      include: {
        _count: {
          select: {
            services: true
          }
        }
      }
    });

    console.log(`\n📊 OLD System - ServiceCategory table:\n`);
    serviceCategories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Services using it: ${cat._count.services}`);
      console.log(`   Active: ${cat.isActive}`);
      console.log('');
    });

    // Check Category table (NEW 3-tier system)
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
            services: true
          }
        }
      }
    });

    console.log(`\n📊 NEW System - Category table (3-tier):\n`);
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name}`);
      console.log(`   ID: ${cat.id}`);
      console.log(`   Services using it as tier1: ${cat._count.services}`);
      console.log(`   Active: ${cat.isActive}`);
      console.log('');
    });

    console.log('\n🔍 Analysis:');
    console.log('The All Tickets filter dropdown is using the NEW Category table IDs');
    console.log('But some services still reference the OLD ServiceCategory table');
    console.log('This causes a mismatch when filtering by category!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkServiceCategories();
