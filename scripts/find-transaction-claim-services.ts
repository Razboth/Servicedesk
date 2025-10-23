import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findServices() {
  try {
    // Find all services with "klaim" or "claim" or "transaksi" or "transaction" in the name
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'klaim', mode: 'insensitive' } },
          { name: { contains: 'claim', mode: 'insensitive' } },
          { name: { contains: 'transaksi', mode: 'insensitive' } },
          { name: { contains: 'transaction', mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: {
        tier1Category: true,
        tier2Subcategory: true,
        tier3Item: true
      }
    });

    console.log(`\n📋 Found ${services.length} services related to claims/transactions:\n`);

    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   Tier 1: ${service.tier1Category?.name || 'N/A'}`);
      console.log(`   Tier 2: ${service.tier2Subcategory?.name || 'N/A'}`);
      console.log(`   Tier 3: ${service.tier3Item?.name || 'N/A'}`);
      console.log('');
    });

    // Also check tickets with old "Transaction Claim" category
    const ticketsWithOldCategory = await prisma.ticket.findMany({
      where: {
        OR: [
          { category: { contains: 'transaction', mode: 'insensitive' } },
          { category: { contains: 'klaim', mode: 'insensitive' } }
        ]
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    console.log('\n📊 Old category values containing transaction/klaim:');
    ticketsWithOldCategory.forEach(t => {
      console.log(`   - ${t.category}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findServices();
