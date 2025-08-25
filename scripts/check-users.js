const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        username: true,
        email: true,
        role: true,
        isActive: true,
        loginAttempts: true,
        lockedAt: true
      }
    });
    
    console.log('Users in database:');
    console.log(JSON.stringify(users, null, 2));
    
    // Check specifically for admin user
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' }
    });
    
    if (adminUser) {
      console.log('\nAdmin user found:');
      console.log('Username:', adminUser.username);
      console.log('Email:', adminUser.email);
      console.log('Has password:', !!adminUser.password);
      console.log('Login attempts:', adminUser.loginAttempts);
      console.log('Locked:', !!adminUser.lockedAt);
    } else {
      console.log('\nNo admin user found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();