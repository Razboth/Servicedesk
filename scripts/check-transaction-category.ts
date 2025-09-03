import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking Transaction Claims Category Configuration...\n');

  // Check for Transaction Claims category
  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'Transaction' } },
        { name: { contains: 'Claim' } },
        { name: { contains: 'ATM' } }
      ]
    },
    include: {
      subcategories: {
        include: {
          items: true
        }
      }
    }
  });

  console.log(`Found ${categories.length} related categories:\n`);
  
  for (const category of categories) {
    console.log(`Category: ${category.name} (ID: ${category.id})`);
    console.log(`  Active: ${category.isActive}`);
    console.log(`  Subcategories: ${category.subcategories.length}`);
    
    for (const sub of category.subcategories) {
      console.log(`    - ${sub.name} (${sub.items.length} items)`);
      for (const item of sub.items) {
        console.log(`        * ${item.name}`);
      }
    }
    console.log('');
  }

  // Check services linked to these categories
  console.log('\nChecking Services with Transaction Claims categories:');
  const services = await prisma.service.findMany({
    where: {
      OR: [
        { name: { contains: 'Transaction' } },
        { name: { contains: 'Claim' } },
        { name: { contains: 'ATM' } }
      ]
    },
    select: {
      id: true,
      name: true,
      tier1CategoryId: true,
      tier1Category: {
        select: { name: true }
      },
      tier2SubcategoryId: true,
      tier2Subcategory: {
        select: { name: true }
      },
      tier3ItemId: true,
      tier3Item: {
        select: { name: true }
      }
    }
  });

  console.log(`Found ${services.length} services:`);
  for (const service of services) {
    console.log(`\nService: ${service.name}`);
    console.log(`  Category: ${service.tier1Category?.name || 'N/A'} (ID: ${service.tier1CategoryId || 'N/A'})`);
    console.log(`  Subcategory: ${service.tier2Subcategory?.name || 'N/A'}`);
    console.log(`  Item: ${service.tier3Item?.name || 'N/A'}`);
  }

  // Check actual tickets with these categories
  console.log('\n\nChecking Tickets with Transaction Claims:');
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { service: { name: { contains: 'Transaction' } } },
        { service: { name: { contains: 'Claim' } } },
        { service: { name: { contains: 'ATM' } } }
      ]
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      categoryId: true,
      subcategoryId: true,
      itemId: true,
      service: {
        select: {
          name: true,
          tier1CategoryId: true,
          tier2SubcategoryId: true,
          tier3ItemId: true
        }
      }
    },
    take: 5
  });

  console.log(`Found ${tickets.length} tickets (showing first 5):`);
  for (const ticket of tickets) {
    console.log(`\n${ticket.ticketNumber}: ${ticket.title}`);
    console.log(`  Service: ${ticket.service.name}`);
    console.log(`  Ticket categoryId: ${ticket.categoryId || 'N/A'}`);
    console.log(`  Service tier1CategoryId: ${ticket.service.tier1CategoryId || 'N/A'}`);
  }

  // Get the specific category IDs that should be visible
  const transactionCategories = await prisma.category.findMany({
    where: {
      OR: [
        { name: { contains: 'Transaction', mode: 'insensitive' } },
        { name: { contains: 'Claim', mode: 'insensitive' } },
        { name: { contains: 'Financial', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true
    }
  });

  console.log('\n\nCategory IDs to include in filter:');
  for (const cat of transactionCategories) {
    console.log(`  ${cat.name}: ${cat.id}`);
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });