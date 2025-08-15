const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting category-based technician system seeding...');

  // Create branches (keeping branch structure for users)
  console.log('📍 Creating branches...');
  const branches = [
    { name: 'Jakarta Branch', code: 'JKT' },
    { name: 'Surabaya Branch', code: 'SBY' },
    { name: 'Medan Branch', code: 'MDN' }
  ];

  const createdBranches = [];
  for (const branch of branches) {
    const createdBranch = await prisma.branch.upsert({
      where: { code: branch.code },
      update: {
        name: branch.name,
        isActive: true
      },
      create: {
        name: branch.name,
        code: branch.code,
        isActive: true
      }
    });
    createdBranches.push(createdBranch);
    console.log(`✅ Created/Updated branch: ${createdBranch.name} (${createdBranch.code})`);
  }

  // Create category-based support groups
  console.log('🔧 Creating category-based support groups...');
  const supportGroupCategories = [
    { name: 'ATM Services', code: 'ATM_SERVICES', description: 'ATM maintenance, troubleshooting, and support services' },
    { name: 'Claims Processing', code: 'CLAIMS', description: 'Insurance and banking claims processing support' },
    { name: 'Network Infrastructure', code: 'NETWORK', description: 'Network setup, maintenance, and troubleshooting' },
    { name: 'User Management', code: 'USER_MGMT', description: 'User account creation, permissions, and access management' },
    { name: 'Core Banking', code: 'CORE_BANKING', description: 'Core banking system support and maintenance' },
    { name: 'Security Services', code: 'SECURITY', description: 'Information security and cybersecurity support' },
    { name: 'Hardware Support', code: 'HARDWARE', description: 'Computer hardware, printers, and device support' },
    { name: 'Software Support', code: 'SOFTWARE', description: 'Application software installation and troubleshooting' }
  ];

  const supportGroups = [];
  for (const category of supportGroupCategories) {
    const supportGroup = await prisma.supportGroup.upsert({
      where: { code: category.code },
      update: {
        name: category.name,
        description: category.description,
        isActive: true
      },
      create: {
        name: category.name,
        code: category.code,
        description: category.description,
        isActive: true
      }
    });
    supportGroups.push(supportGroup);
    console.log(`✅ Created/Updated support group: ${supportGroup.name}`);
  }

  // Create users with category-based technician assignments
  console.log('👥 Creating users with category-based assignments...');
  
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Super Admin
  await prisma.user.upsert({
    where: { email: 'superadmin@company.com' },
    update: {
      name: 'Super Administrator',
      role: 'ADMIN',
      isActive: true
    },
    create: {
      email: 'superadmin@company.com',
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      branchId: createdBranches[0].id, // Jakarta as default
      isActive: true
    }
  });
  console.log('✅ Created/Updated super admin: superadmin@company.com');

  // Create branch managers (one per branch)
  for (let i = 0; i < createdBranches.length; i++) {
    const branch = createdBranches[i];
    const branchCode = branch.code.toLowerCase();
    
    await prisma.user.upsert({
      where: { email: `manager.${branchCode}@company.com` },
      update: {
        name: `${branch.name} Manager`,
        role: 'MANAGER',
        branchId: branch.id,
        isActive: true
      },
      create: {
        email: `manager.${branchCode}@company.com`,
        name: `${branch.name} Manager`,
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branch.id,
        isActive: true
      }
    });
    console.log(`✅ Created/Updated manager: manager.${branchCode}@company.com`);
  }

  // Create category-based technicians
  for (let i = 0; i < supportGroups.length; i++) {
    const supportGroup = supportGroups[i];
    const techCode = supportGroup.code.toLowerCase().replace('_', '');
    const branchIndex = i % createdBranches.length; // Distribute across branches
    const branch = createdBranches[branchIndex];
    
    await prisma.user.upsert({
      where: { email: `tech.${techCode}@company.com` },
      update: {
        name: `${supportGroup.name} Technician`,
        role: 'TECHNICIAN',
        branchId: branch.id,
        supportGroupId: supportGroup.id,
        isActive: true
      },
      create: {
        email: `tech.${techCode}@company.com`,
        name: `${supportGroup.name} Technician`,
        password: hashedPassword,
        role: 'TECHNICIAN',
        branchId: branch.id,
        supportGroupId: supportGroup.id,
        isActive: true
      }
    });
    console.log(`✅ Created/Updated technician: tech.${techCode}@company.com (${supportGroup.name})`);
  }

  // Create regular users for each branch
  for (let i = 0; i < createdBranches.length; i++) {
    const branch = createdBranches[i];
    const branchCode = branch.code.toLowerCase();
    
    // Create 2 users per branch
    for (let j = 1; j <= 2; j++) {
      await prisma.user.upsert({
        where: { email: `user${j}.${branchCode}@company.com` },
        update: {
          name: `${branch.name} User ${j}`,
          role: 'USER',
          branchId: branch.id,
          isActive: true
        },
        create: {
          email: `user${j}.${branchCode}@company.com`,
          name: `${branch.name} User ${j}`,
          password: hashedPassword,
          role: 'USER',
          branchId: branch.id,
          isActive: true
        }
      });
      console.log(`✅ Created/Updated user: user${j}.${branchCode}@company.com`);
    }
  }

  console.log('\n🎉 Category-based technician system seeding completed!');
  
  console.log('\n📋 Login Credentials (password: password123):');
  console.log('\n🏢 Super Admin:');
  console.log('   📧 superadmin@company.com');
  
  console.log('\n👨‍💼 Branch Managers:');
  for (const branch of createdBranches) {
    const branchCode = branch.code.toLowerCase();
    console.log(`   📧 manager.${branchCode}@company.com (${branch.name})`);
  }
  
  console.log('\n🔧 Category-Based Technicians:');
  for (const supportGroup of supportGroups) {
    const techCode = supportGroup.code.toLowerCase().replace('_', '');
    console.log(`   📧 tech.${techCode}@company.com (${supportGroup.name})`);
  }
  
  console.log('\n👤 Regular Users:');
  for (const branch of createdBranches) {
    const branchCode = branch.code.toLowerCase();
    console.log(`   📧 user1.${branchCode}@company.com, user2.${branchCode}@company.com (${branch.name})`);
  }
  
  console.log('\n🔒 Category-Based Assignment Rules:');
  console.log('   • Users create tickets for their branch');
  console.log('   • Managers approve tickets from their branch');
  console.log('   • Technicians handle tickets based on service category assignment');
  console.log('   • Super Admin can see all tickets across all branches and categories');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });