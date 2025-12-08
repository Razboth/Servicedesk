import { prisma } from '../lib/prisma';

async function main() {
  const services = await prisma.service.findMany({
    where: {
      OR: [
        { name: { contains: 'ATM', mode: 'insensitive' } },
        { name: { contains: 'Klaim', mode: 'insensitive' } },
        { name: { contains: 'Claim', mode: 'insensitive' } },
        { name: { contains: 'Penarikan', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      isActive: true
    }
  });
  console.log('ATM-related services:', JSON.stringify(services, null, 2));
}

main().then(() => prisma.$disconnect());
