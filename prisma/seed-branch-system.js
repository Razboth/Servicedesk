const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting branch-based system seeding...');

  // Create 3 branches
  const branches = [
    {
      name: 'Jakarta Branch',
      code: 'JKT',
      address: 'Jl. Sudirman No. 1',
      city: 'Jakarta',
      province: 'DKI Jakarta'
    },
    {
      name: 'Surabaya Branch',
      code: 'SBY',
      address: 'Jl. Pemuda No. 15',
      city: 'Surabaya',
      province: 'Jawa Timur'
    },
    {
      name: 'Medan Branch',
      code: 'MDN',
      address: 'Jl. Gatot Subroto No. 8',
      city: 'Medan',
      province: 'Sumatera Utara'
    }
  ];

  console.log('📍 Creating branches...');
  const createdBranches = [];
  for (const branchData of branches) {
    const branch = await prisma.branch.upsert({
      where: { code: branchData.code },
      update: branchData,
      create: branchData
    });
    createdBranches.push(branch);
    console.log(`✅ Created/Updated branch: ${branch.name} (${branch.code})`);
  }

  // Create support groups for each branch
  console.log('🔧 Creating support groups...');
  const supportGroups = [];
  for (const branch of createdBranches) {
    const supportGroup = await prisma.supportGroup.upsert({
      where: { name: `${branch.name} IT Support` },
      update: {
        description: `IT Support team for ${branch.name}`,
        isActive: true
      },
      create: {
        name: `${branch.name} IT Support`,
        code: `${branch.code}_IT`,
        description: `IT Support team for ${branch.name}`,
        isActive: true
      }
    });
    supportGroups.push({ ...supportGroup, branchId: branch.id });
    console.log(`✅ Created/Updated support group: ${supportGroup.name}`);
  }

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Create users for each branch
  console.log('👥 Creating users for each branch...');
  
  for (let i = 0; i < createdBranches.length; i++) {
    const branch = createdBranches[i];
    const supportGroup = supportGroups[i];
    const branchCode = branch.code.toLowerCase();
    
    // Create Branch Manager
    const manager = await prisma.user.upsert({
      where: { email: `manager.${branchCode}@company.com` },
      update: {
        name: `${branch.name} Manager`,
        password: hashedPassword,
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
    console.log(`✅ Created/Updated manager: ${manager.email}`);

    // Create Branch Technician
    const technician = await prisma.user.upsert({
      where: { email: `tech.${branchCode}@company.com` },
      update: {
        name: `${branch.name} Technician`,
        password: hashedPassword,
        role: 'TECHNICIAN',
        branchId: branch.id,
        supportGroupId: supportGroup.id,
        isActive: true
      },
      create: {
        email: `tech.${branchCode}@company.com`,
        name: `${branch.name} Technician`,
        password: hashedPassword,
        role: 'TECHNICIAN',
        branchId: branch.id,
        supportGroupId: supportGroup.id,
        isActive: true
      }
    });
    console.log(`✅ Created/Updated technician: ${technician.email}`);

    // Create 2 Branch Users
    for (let j = 1; j <= 2; j++) {
      const user = await prisma.user.upsert({
        where: { email: `user${j}.${branchCode}@company.com` },
        update: {
          name: `${branch.name} User ${j}`,
          password: hashedPassword,
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
      console.log(`✅ Created/Updated user: ${user.email}`);
    }
  }

  // Create a Super Admin (can see all branches)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@company.com' },
    update: {
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      branchId: null, // No branch restriction
      isActive: true
    },
    create: {
      email: 'superadmin@company.com',
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN',
      branchId: null, // No branch restriction
      isActive: true
    }
  });
  console.log(`✅ Created/Updated super admin: ${superAdmin.email}`);

  console.log('\n🎉 Branch-based system seeding completed!');
  console.log('\n📋 Login Credentials (password: password123):');
  console.log('\n🏢 Super Admin:');
  console.log('   📧 superadmin@company.com');
  
  for (const branch of createdBranches) {
    const branchCode = branch.code.toLowerCase();
    console.log(`\n🏢 ${branch.name}:`);
    console.log(`   👨‍💼 Manager: manager.${branchCode}@company.com`);
    console.log(`   🔧 Technician: tech.${branchCode}@company.com`);
    console.log(`   👤 User 1: user1.${branchCode}@company.com`);
    console.log(`   👤 User 2: user2.${branchCode}@company.com`);
  }

  console.log('\n🔒 Branch Isolation Rules:');
  console.log('   • Users can only create tickets for their branch');
  console.log('   • Managers can only approve tickets from their branch');
  console.log('   • Technicians can only see tickets from their branch');
  console.log('   • Super Admin can see all tickets across all branches');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });