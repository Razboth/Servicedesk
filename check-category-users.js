const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategoryUsers() {
  try {
    console.log('Checking category-based users...');
    
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: [
            'superadmin@banksulutgo.co.id',
            'manager.jakarta@banksulutgo.co.id',
            'manager.surabaya@banksulutgo.co.id',
            'manager.medan@banksulutgo.co.id',
            'tech.atm@banksulutgo.co.id',
            'tech.claims@banksulutgo.co.id',
            'tech.network@banksulutgo.co.id',
            'tech.usermgmt@banksulutgo.co.id',
            'user.jakarta@banksulutgo.co.id',
            'user.surabaya@banksulutgo.co.id',
            'user.medan@banksulutgo.co.id'
          ]
        }
      },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true
      },
      orderBy: {
        email: 'asc'
      }
    });
    
    console.log(`\nFound ${users.length} category-based users:\n`);
    
    users.forEach(user => {
      console.log(`${user.email} - ${user.name} (${user.role}) - Active: ${user.isActive}`);
    });
    
    if (users.length === 0) {
      console.log('\nNo category-based users found. The seed script may not have run properly.');
      console.log('Please run: node prisma/seed-category-based-system.js');
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategoryUsers();