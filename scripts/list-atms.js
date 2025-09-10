const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listATMs() {
  const atms = await prisma.aTM.findMany({
    take: 10,
    select: {
      code: true,
      name: true,
      branch: {
        select: { name: true }
      }
    }
  });
  
  console.log('Available ATMs in database:');
  console.log('===========================\n');
  
  if (atms.length === 0) {
    console.log('No ATMs found in database.');
    console.log('You may need to run: npm run db:seed');
  } else {
    atms.forEach((atm, idx) => {
      console.log(`${idx + 1}. ${atm.code} - ${atm.name}`);
      console.log(`   Branch: ${atm.branch?.name || 'N/A'}`);
    });
  }
  
  await prisma.$disconnect();
}

listATMs().catch(console.error);