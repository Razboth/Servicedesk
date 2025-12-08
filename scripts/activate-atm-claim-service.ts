import { prisma } from '../lib/prisma';

async function main() {
  // Activate the ATM Klaim service
  const result = await prisma.service.update({
    where: { id: 'cmeunn6th000f28zscq6lb72u' },
    data: { isActive: true }
  });
  console.log('Activated service:', result.name);
}

main().then(() => prisma.$disconnect());
