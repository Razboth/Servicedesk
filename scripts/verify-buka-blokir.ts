import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verify() {
  console.log('🔍 Verifying all Buka Blokir services...\n');

  const services = await prisma.service.findMany({
    where: {
      name: { contains: 'Buka Blokir', mode: 'insensitive' }
    },
    include: {
      category: true,
      tier1Category: true,
      _count: { select: { tickets: true } }
    },
    orderBy: { name: 'asc' }
  });

  console.log(`Found ${services.length} services:\n`);

  let allCorrect = true;

  for (const service of services) {
    const isCorrect = service.tier1Category?.name === 'User Management';
    const icon = isCorrect ? '✅' : '❌';

    console.log(`${icon} ${service.name}`);
    console.log(`   OLD: ${service.category?.name || 'None'}`);
    console.log(`   NEW: ${service.tier1Category?.name || 'None'}`);
    console.log(`   Tickets: ${service._count.tickets}`);
    console.log('');

    if (!isCorrect) {
      allCorrect = false;
    }
  }

  if (allCorrect) {
    console.log('═'.repeat(80));
    console.log('✅ SUCCESS - All Buka Blokir services correctly use User Management!');
    console.log('═'.repeat(80));
    console.log('\n💡 These services will now show under "User Management" in Monthly Report\n');
  } else {
    console.log('⚠️  Some services still have incorrect categories\n');
  }

  await prisma.$disconnect();
}

verify();
