const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    // Search for supriadi
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'wuata', mode: 'insensitive' } },
          { name: { contains: 'wuata', mode: 'insensitive' } },
          { email: { contains: 'supriadi', mode: 'insensitive' } },
          { name: { contains: 'supriadi', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        branchId: true
      }
    });

    console.log('Found users:', JSON.stringify(users, null, 2));
    console.log('Total:', users.length);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
