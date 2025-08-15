const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding essential database data...');

  try {
    // 1. Create Branches
    console.log('📍 Creating branches...');
    
    const branches = [
      {
        name: 'Kantor Pusat Manado',
        code: 'MND001',
        address: 'Jl. Sam Ratulangi No. 1',
        city: 'Manado',
        province: 'Sulawesi Utara'
      },
      {
        name: 'Kantor Cabang Tomohon',
        code: 'TMH001', 
        address: 'Jl. Raya Tomohon-Manado',
        city: 'Tomohon',
        province: 'Sulawesi Utara'
      },
      {
        name: 'Kantor Cabang Bitung',
        code: 'BTG001',
        address: 'Jl. Yos Sudarso No. 15',
        city: 'Bitung',
        province: 'Sulawesi Utara'
      },
      {
        name: 'Kantor Cabang Kotamobagu',
        code: 'KMB001',
        address: 'Jl. Diponegoro No. 20',
        city: 'Kotamobagu', 
        province: 'Sulawesi Utara'
      }
    ];

    const createdBranches = [];
    for (const branchData of branches) {
      let branch = await prisma.branch.findFirst({
        where: { code: branchData.code }
      });

      if (!branch) {
        branch = await prisma.branch.create({
          data: branchData
        });
        console.log(`✅ Created branch: ${branch.name} (${branch.code})`);
      } else {
        console.log(`✅ Branch already exists: ${branch.name} (${branch.code})`);
      }
      createdBranches.push(branch);
    }

    // 2. Create Support Groups
    console.log('👥 Creating support groups...');
    
    const supportGroups = [
      {
        name: 'IT Helpdesk',
        code: 'IT_HELPDESK',
        description: 'General IT support and helpdesk services'
      },
      {
        name: 'Network Administration',
        code: 'NETWORK_ADMIN', 
        description: 'Network infrastructure and connectivity support'
      },
      {
        name: 'Database Administration',
        code: 'DATABASE_ADMIN',
        description: 'Database management and support'
      },
      {
        name: 'Application Support',
        code: 'APPLICATION_SUPPORT',
        description: 'Banking application and software support'
      },
      {
        name: 'Infrastructure',
        code: 'INFRASTRUCTURE',
        description: 'Server and infrastructure support'
      },
      {
        name: 'ATM Technical Support',
        code: 'ATM_SUPPORT',
        description: 'ATM hardware and software technical support'
      }
    ];

    const createdSupportGroups = [];
    for (const groupData of supportGroups) {
      let supportGroup = await prisma.supportGroup.findFirst({
        where: { code: groupData.code }
      });

      if (!supportGroup) {
        supportGroup = await prisma.supportGroup.create({
          data: groupData
        });
        console.log(`✅ Created support group: ${supportGroup.name}`);
      } else {
        console.log(`✅ Support group already exists: ${supportGroup.name}`);
      }
      createdSupportGroups.push(supportGroup);
    }

    // 3. Create Service Categories  
    console.log('📂 Creating service categories...');
    
    const serviceCategories = [
      {
        name: 'IT Services',
        description: 'Information Technology services and support',
        level: 1
      },
      {
        name: 'ATM Services', 
        description: 'Automated Teller Machine services',
        level: 1
      },
      {
        name: 'Banking Applications',
        description: 'Core banking and business applications',
        level: 1
      },
      {
        name: 'Infrastructure Services',
        description: 'Network, server, and infrastructure services', 
        level: 1
      }
    ];

    const createdServiceCategories = [];
    for (const categoryData of serviceCategories) {
      let category = await prisma.serviceCategory.findFirst({
        where: { name: categoryData.name }
      });

      if (!category) {
        category = await prisma.serviceCategory.create({
          data: categoryData
        });
        console.log(`✅ Created service category: ${category.name}`);
      } else {
        console.log(`✅ Service category already exists: ${category.name}`);
      }
      createdServiceCategories.push(category);
    }

    // 4. Create Users
    console.log('👤 Creating users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const users = [
      {
        name: 'Super Administrator',
        email: 'admin@banksulutgo.co.id',
        password: hashedPassword,
        role: 'ADMIN',
        branchId: createdBranches[0].id, // Manado main branch
        isActive: true
      },
      {
        name: 'IT Manager',
        email: 'manager@banksulutgo.co.id', 
        password: hashedPassword,
        role: 'MANAGER',
        branchId: createdBranches[0].id,
        isActive: true
      },
      {
        name: 'IT Technician 1',
        email: 'tech1@banksulutgo.co.id',
        password: hashedPassword,
        role: 'TECHNICIAN',
        branchId: createdBranches[0].id,
        supportGroupId: createdSupportGroups[0].id, // IT Helpdesk
        isActive: true
      },
      {
        name: 'IT Technician 2', 
        email: 'tech2@banksulutgo.co.id',
        password: hashedPassword,
        role: 'TECHNICIAN',
        branchId: createdBranches[0].id,
        supportGroupId: createdSupportGroups[1].id, // Network Admin
        isActive: true
      },
      {
        name: 'ATM Technician',
        email: 'atm.tech@banksulutgo.co.id',
        password: hashedPassword,
        role: 'TECHNICIAN', 
        branchId: createdBranches[0].id,
        supportGroupId: createdSupportGroups[5].id, // ATM Support
        isActive: true
      },
      {
        name: 'Branch User Tomohon',
        email: 'user.tomohon@banksulutgo.co.id',
        password: hashedPassword,
        role: 'USER',
        branchId: createdBranches[1].id, // Tomohon branch
        isActive: true
      },
      {
        name: 'Branch User Bitung',
        email: 'user.bitung@banksulutgo.co.id',
        password: hashedPassword,
        role: 'USER',
        branchId: createdBranches[2].id, // Bitung branch
        isActive: true
      }
    ];

    const createdUsers = [];
    for (const userData of users) {
      let user = await prisma.user.findFirst({
        where: { email: userData.email }
      });

      if (!user) {
        user = await prisma.user.create({
          data: userData
        });
        console.log(`✅ Created user: ${user.name} (${user.email}) - Role: ${user.role}`);
      } else {
        console.log(`✅ User already exists: ${user.name} (${user.email})`);
      }
      createdUsers.push(user);
    }

    // 5. Create Basic Services
    console.log('🔧 Creating basic services...');
    
    const services = [
      {
        name: 'Password Reset Request',
        description: 'Reset user password for banking applications',
        categoryId: createdServiceCategories[0].id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        supportGroupId: createdSupportGroups[0].id, // IT Helpdesk
        priority: 'MEDIUM',
        slaHours: 4,
        responseHours: 2,
        resolutionHours: 4,
        requiresApproval: false,
        defaultItilCategory: 'SERVICE_REQUEST',
        defaultIssueClassification: 'PROCESS_GAP'
      },
      {
        name: 'ATM Hardware Issue',
        description: 'ATM hardware malfunction or failure',
        categoryId: createdServiceCategories[1].id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)  
        supportGroupId: createdSupportGroups[5].id, // ATM Support
        priority: 'HIGH',
        slaHours: 4,
        responseHours: 1, 
        resolutionHours: 4,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'HARDWARE_FAILURE'
      },
      {
        name: 'Network Connectivity Issue',
        description: 'Network connection problems or outages',
        categoryId: createdServiceCategories[3].id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        supportGroupId: createdSupportGroups[1].id, // Network Admin
        priority: 'HIGH',
        slaHours: 2,
        responseHours: 1,
        resolutionHours: 2,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT', 
        defaultIssueClassification: 'NETWORK_ISSUE'
      },
      {
        name: 'Banking Application Error',
        description: 'Core banking application errors or bugs',
        categoryId: createdServiceCategories[2].id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        supportGroupId: createdSupportGroups[3].id, // Application Support
        priority: 'HIGH',
        slaHours: 4,
        responseHours: 2,
        resolutionHours: 4,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SYSTEM_ERROR'
      },
      {
        name: 'New User Account Request', 
        description: 'Request for new user account creation',
        categoryId: createdServiceCategories[0].id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        supportGroupId: createdSupportGroups[0].id, // IT Helpdesk
        priority: 'MEDIUM',
        slaHours: 8,
        responseHours: 4,
        resolutionHours: 8,
        requiresApproval: true,
        defaultItilCategory: 'SERVICE_REQUEST',
        defaultIssueClassification: 'PROCESS_GAP'
      }
    ];

    const createdServices = [];
    for (const serviceData of services) {
      let service = await prisma.service.findFirst({
        where: { name: serviceData.name }
      });

      if (!service) {
        service = await prisma.service.create({
          data: serviceData
        });
        console.log(`✅ Created service: ${service.name}`);
      } else {
        console.log(`✅ Service already exists: ${service.name}`);
      }
      createdServices.push(service);
    }

    // 6. Create some sample ATMs
    console.log('🏧 Creating ATMs...');
    
    const atms = [
      {
        code: 'ATM-MND-001',
        name: 'ATM Kantor Pusat Manado',
        location: 'Lobby Kantor Pusat',
        branchId: createdBranches[0].id,
        latitude: 1.4748,
        longitude: 124.8421
      },
      {
        code: 'ATM-TMH-001', 
        name: 'ATM Tomohon Plaza',
        location: 'Tomohon Plaza Mall',
        branchId: createdBranches[1].id,
        latitude: 1.3297,
        longitude: 124.8397
      },
      {
        code: 'ATM-BTG-001',
        name: 'ATM Pelabuhan Bitung',
        location: 'Area Pelabuhan Bitung',
        branchId: createdBranches[2].id, 
        latitude: 1.4401,
        longitude: 125.1838
      }
    ];

    for (const atmData of atms) {
      let atm = await prisma.aTM.findFirst({
        where: { code: atmData.code }
      });

      if (!atm) {
        atm = await prisma.aTM.create({
          data: atmData
        });
        console.log(`✅ Created ATM: ${atm.name} (${atm.code})`);
      } else {
        console.log(`✅ ATM already exists: ${atm.name} (${atm.code})`);
      }
    }

    console.log('\n🎉 Essential database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`• Branches: ${createdBranches.length}`);
    console.log(`• Support Groups: ${createdSupportGroups.length}`); 
    console.log(`• Service Categories: ${createdServiceCategories.length}`);
    console.log(`• Users: ${createdUsers.length}`);
    console.log(`• Services: ${createdServices.length}`);
    console.log(`• ATMs: ${atms.length}`);

    console.log('\n🔐 Default Login Credentials:');
    console.log('• Super Admin: admin@banksulutgo.co.id / password123');
    console.log('• Manager: manager@banksulutgo.co.id / password123');  
    console.log('• Technician: tech1@banksulutgo.co.id / password123');
    console.log('• User: user.tomohon@banksulutgo.co.id / password123');

  } catch (error) {
    console.error('❌ Error seeding essential data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });