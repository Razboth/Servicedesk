const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'razaan' } },
          { name: { contains: 'razaan' } }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        branchId: true,
        supportGroupId: true
      }
    });

    console.log('User details for Razaan:', user);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();