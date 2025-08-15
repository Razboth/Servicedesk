const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Override database URL for localhost
process.env.DATABASE_URL = "postgresql://postgres:admin@localhost:5432/servicedesk_database?schema=public";

const prisma = new PrismaClient();

async function checkAuth() {
  try {
    console.log('Checking authentication setup...\n');
    
    // Check if users exist
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['admin@banksulutgo.co.id', 'manager@banksulutgo.co.id', 'tech@banksulutgo.co.id']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        password: true,
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });

    console.log(`Found ${users.length} demo users:\n`);
    
    for (const user of users) {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      if (user.branch) {
        console.log(`Branch: ${user.branch.name} (${user.branch.code})`);
      }
      
      // Test password
      if (user.password) {
        const isValid = await bcrypt.compare('password123', user.password);
        console.log(`Password 'password123' is valid: ${isValid}`);
      }
      
      console.log('---');
    }

    // If no users found, create them
    if (users.length === 0) {
      console.log('\nNo demo users found. Creating them now...\n');
      
      const hashedPassword = await bcrypt.hash('password123', 10);
      console.log('Hashed password:', hashedPassword);
      
      // Get a branch
      const branch = await prisma.branch.findFirst();
      
      const newUsers = await Promise.all([
        prisma.user.create({
          data: {
            email: 'admin@banksulutgo.co.id',
            name: 'Super Admin',
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: 'manager@banksulutgo.co.id',
            name: 'Branch Manager',
            password: hashedPassword,
            role: 'MANAGER',
            branchId: branch?.id,
            isActive: true,
          },
        }),
        prisma.user.create({
          data: {
            email: 'tech@banksulutgo.co.id',
            name: 'IT Technician',
            password: hashedPassword,
            role: 'TECHNICIAN',
            isActive: true,
          },
        }),
      ]);
      
      console.log(`Created ${newUsers.length} demo users successfully!`);
    }
    
    // Check total user count
    const totalUsers = await prisma.user.count();
    console.log(`\nTotal users in database: ${totalUsers}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAuth();