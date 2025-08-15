const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixDemoUsers() {
  try {
    console.log('Fixing demo user accounts...\n');
    
    const demoUsers = [
      {
        email: 'admin@banksulutgo.co.id',
        name: 'Super Admin',
        role: 'ADMIN'
      },
      {
        email: 'manager@banksulutgo.co.id',
        name: 'Branch Manager',
        role: 'MANAGER'
      },
      {
        email: 'tech@banksulutgo.co.id',
        name: 'IT Technician',
        role: 'TECHNICIAN'
      }
    ];
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    console.log('Password hashed successfully');
    
    // Get first branch for manager
    const firstBranch = await prisma.branch.findFirst({
      where: { isActive: true }
    });
    
    for (const userData of demoUsers) {
      console.log(`\nProcessing ${userData.email}...`);
      
      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (existingUser) {
        // Update user
        await prisma.user.update({
          where: { email: userData.email },
          data: {
            password: hashedPassword,
            isActive: true,
            name: userData.name,
            role: userData.role,
            ...(userData.role === 'MANAGER' && firstBranch ? { branchId: firstBranch.id } : {})
          }
        });
        console.log(`✓ Updated user: ${userData.email}`);
      } else {
        // Create user
        await prisma.user.create({
          data: {
            email: userData.email,
            name: userData.name,
            password: hashedPassword,
            role: userData.role,
            isActive: true,
            ...(userData.role === 'MANAGER' && firstBranch ? { branchId: firstBranch.id } : {})
          }
        });
        console.log(`✓ Created user: ${userData.email}`);
      }
    }
    
    // Verify all users
    console.log('\n=== Verifying Demo Users ===');
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: demoUsers.map(u => u.email)
        }
      },
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
        branch: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });
    
    for (const user of users) {
      console.log(`\n${user.email}:`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Active: ${user.isActive}`);
      if (user.branch) {
        console.log(`  Branch: ${user.branch.name} (${user.branch.code})`);
      }
      
      // Test password
      const userWithPassword = await prisma.user.findUnique({
        where: { email: user.email },
        select: { password: true }
      });
      
      if (userWithPassword?.password) {
        const isValid = await bcrypt.compare('password123', userWithPassword.password);
        console.log(`  Password valid: ${isValid}`);
      }
    }
    
    console.log('\n✓ Demo users fixed successfully!');
    console.log('\nYou can now login with:');
    console.log('  admin@banksulutgo.co.id / password123');
    console.log('  manager@banksulutgo.co.id / password123');
    console.log('  tech@banksulutgo.co.id / password123');
    
  } catch (error) {
    console.error('Error fixing demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDemoUsers();