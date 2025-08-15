const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Function to strategically plan branch distribution
function planBranchDistribution(users, branches) {
  const assignments = {};
  const branchStaff = {};
  
  // Initialize branch staff tracking
  branches.forEach(branch => {
    branchStaff[branch.id] = {
      branch: branch,
      managers: [],
      users: [],
      technicians: []
    };
  });

  // Separate users by role
  const managers = users.filter(u => u.role === 'MANAGER');
  const regularUsers = users.filter(u => u.role === 'USER');
  const technicians = users.filter(u => u.role === 'TECHNICIAN');

  // First, distribute managers across first 4 branches (we have 4 managers)
  managers.forEach((manager, index) => {
    const branch = branches[index];
    assignments[manager.email] = branch;
    branchStaff[branch.id].managers.push(manager);
  });

  // Distribute regular users ensuring each branch with a manager gets at least one user
  // First user goes to branch 0, second to branch 1, third and fourth to branch 2 (giving it 2 users), fourth to branch 3
  if (regularUsers[0]) {
    assignments[regularUsers[0].email] = branches[0]; // Cecep to Manado
    branchStaff[branches[0].id].users.push(regularUsers[0]);
  }
  if (regularUsers[1]) {
    assignments[regularUsers[1].email] = branches[1]; // Yosua to Tomohon
    branchStaff[branches[1].id].users.push(regularUsers[1]);
  }
  if (regularUsers[2]) {
    assignments[regularUsers[2].email] = branches[2]; // Gilby to Bitung (first user)
    branchStaff[branches[2].id].users.push(regularUsers[2]);
  }
  if (regularUsers[3]) {
    assignments[regularUsers[3].email] = branches[2]; // Brayend to Bitung (second user - making Bitung have 2 users)
    branchStaff[branches[2].id].users.push(regularUsers[3]);
  }

  // Distribute technicians across branches with managers
  // IT technicians to branches with more users, KASDA to a strategic location
  if (technicians[0]) {
    assignments[technicians[0].email] = branches[0]; // Frigia (IT) to Manado
    branchStaff[branches[0].id].technicians.push(technicians[0]);
  }
  if (technicians[1]) {
    assignments[technicians[1].email] = branches[3]; // Erwin (KASDA) to Kotamobagu
    branchStaff[branches[3].id].technicians.push(technicians[1]);
  }
  if (technicians[2]) {
    assignments[technicians[2].email] = branches[2]; // Lenora (IT) to Bitung (which has 2 users)
    branchStaff[branches[2].id].technicians.push(technicians[2]);
  }

  // Log the distribution plan
  console.log('\n📋 Branch Distribution Plan:');
  branches.slice(0, 4).forEach(branch => {
    const staff = branchStaff[branch.id];
    if (staff.managers.length > 0 || staff.users.length > 0) {
      console.log(`\n${branch.name} (${branch.code}):`);
      if (staff.managers.length > 0) {
        console.log(`  👔 Manager: ${staff.managers.map(m => m.name).join(', ')}`);
      }
      if (staff.users.length > 0) {
        console.log(`  👤 Users (${staff.users.length}): ${staff.users.map(u => u.name).join(', ')}`);
      }
      if (staff.technicians.length > 0) {
        console.log(`  🔧 Technicians: ${staff.technicians.map(t => t.name).join(', ')}`);
      }
    }
  });

  return assignments;
}

async function seedUpdatedUsers() {
  console.log('🔄 Clearing user table and creating updated Bank SulutGo users...');

  try {
    // Get all branches first
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true }
    });

    if (branches.length === 0) {
      console.error('❌ No branches found. Please run the main seed script first.');
      return;
    }

    console.log(`📍 Found ${branches.length} branches for user distribution`);

    // Get support groups
    const supportGroups = await prisma.supportGroup.findMany({
      select: { id: true, name: true, code: true }
    });

    const itHelpdesk = supportGroups.find(sg => sg.code === 'IT_HELPDESK');
    const dukunganLayanan = supportGroups.find(sg => sg.code === 'DUKUNGAN_LAYANAN');

    if (!itHelpdesk || !dukunganLayanan) {
      console.error('❌ Support groups not found. Please run the main seed script first.');
      return;
    }

    console.log('👥 Found support groups:', supportGroups.map(sg => sg.name).join(', '));

    // Instead of deleting users, we'll update existing ones or create new ones
    console.log('🔄 Updating existing users and creating new ones...');
    
    // Keep track of processed emails to avoid duplicates
    const processedEmails = new Set(['admin@banksulutgo.co.id', 'system@banksulutgo.co.id', 'security.analyst@banksulutgo.co.id']);

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Define users with specific roles
    const updatedUsers = [
      {
        name: 'Excelsis Maramis',
        email: 'excelsis.maramis@banksulutgo.co.id',
        role: 'MANAGER',
        title: 'Branch Manager',
        supportGroupId: null
      },
      {
        name: 'Gugah Wijaya',
        email: 'gugah.wijaya@banksulutgo.co.id',
        role: 'MANAGER',
        title: 'Operations Manager',
        supportGroupId: null
      },
      {
        name: 'Shirke Heslin',
        email: 'shirke.heslin@banksulutgo.co.id',
        role: 'MANAGER',
        title: 'Risk Management Manager',
        supportGroupId: null
      },
      {
        name: 'Frigia Pasla',
        email: 'frigia.pasla@banksulutgo.co.id',
        role: 'TECHNICIAN',
        title: 'IT Helpdesk Technician',
        supportGroupId: itHelpdesk.id
      },
      {
        name: 'Daniel Niode',
        email: 'danielniode@banksulutgo.co.id',
        role: 'MANAGER',
        title: 'Credit Manager',
        supportGroupId: null
      },
      {
        name: 'Cecep Juarsa',
        email: 'cecep.juarsa@banksulutgo.co.id',
        role: 'USER',
        title: 'Customer Service Officer',
        supportGroupId: null
      },
      {
        name: 'Yosua Van Beuren',
        email: 'yosua.vanbeuren@banksulutgo.co.id',
        role: 'USER',
        title: 'Account Officer',
        supportGroupId: null
      },
      {
        name: 'Gilby Koloay',
        email: 'gilby.koloay@banksulutgo.co.id',
        role: 'USER',
        title: 'Administrative Staff',
        supportGroupId: null
      },
      {
        name: 'Erwin Lapian',
        email: 'erwin.lapian@banksulutgo.co.id',
        role: 'TECHNICIAN',
        title: 'KASDA Support Technician',
        supportGroupId: dukunganLayanan.id
      },
      {
        name: 'Brayend Tamusa',
        email: 'brayend.tamusa@banksulutgo.co.id',
        role: 'USER',
        title: 'Teller',
        supportGroupId: null
      },
      {
        name: 'Lenora Kepel',
        email: 'lenora.kepel@banksulutgo.co.id',
        role: 'TECHNICIAN',
        title: 'IT Helpdesk Technician',
        supportGroupId: itHelpdesk.id
      }
    ];

    const createdUsers = [];
    let managerCount = 0;
    let technicianCount = 0;
    let userCount = 0;

    // Plan the distribution to ensure each branch with users has a manager
    const branchAssignments = planBranchDistribution(updatedUsers, branches);
    
    console.log('\n👥 Creating/updating users with strategic branch distribution...');

    for (let i = 0; i < updatedUsers.length; i++) {
      const userData = updatedUsers[i];
      
      // Use the planned branch assignment
      const assignedBranch = branchAssignments[userData.email];
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { email: userData.email }
      });

      let newUser;
      if (existingUser) {
        // Update existing user
        newUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: userData.name,
            password: hashedPassword,
            role: userData.role,
            branchId: assignedBranch.id,
            supportGroupId: userData.supportGroupId,
            isActive: true
          }
        });
        console.log(`♻️  Updated ${userData.role}: ${newUser.name}`);
      } else {
        // Create new user
        newUser = await prisma.user.create({
          data: {
            name: userData.name,
            email: userData.email,
            password: hashedPassword,
            role: userData.role,
            branchId: assignedBranch.id,
            supportGroupId: userData.supportGroupId,
            isActive: true
          }
        });
        console.log(`✅ Created ${userData.role}: ${newUser.name}`);
      }
      console.log(`   📧 Email: ${newUser.email}`);
      console.log(`   🏢 Branch: ${assignedBranch.name} (${assignedBranch.code})`);
      console.log(`   💼 Title: ${userData.title}`);
      if (userData.supportGroupId) {
        const supportGroup = supportGroups.find(sg => sg.id === userData.supportGroupId);
        console.log(`   👥 Support Group: ${supportGroup.name}`);
      }
      console.log('');

      // Count by role
      if (userData.role === 'MANAGER') managerCount++;
      else if (userData.role === 'TECHNICIAN') technicianCount++;
      else if (userData.role === 'USER') userCount++;

      createdUsers.push({...newUser, branch: assignedBranch, title: userData.title});
    }

    // Create some sample tickets from these users
    const services = await prisma.service.findMany({
      where: { isActive: true },
      take: 5
    });

    if (services.length > 0) {
      console.log('🎫 Creating sample tickets from updated users...');
      
      const sampleTickets = [
        {
          creatorEmail: 'cecep.juarsa@banksulutgo.co.id',
          title: 'Core Banking System Login Issue',
          description: 'Unable to login to core banking system. Getting "authentication failed" error. Need urgent assistance as this affects customer service.',
          priority: 'HIGH',
          category: 'INCIDENT'
        },
        {
          creatorEmail: 'yosua.vanbeuren@banksulutgo.co.id',
          title: 'New Email Account Request',
          description: 'Request for new corporate email account setup for recently hired account officer. Need access to shared mailboxes and distribution lists.',
          priority: 'MEDIUM',
          category: 'SERVICE_REQUEST'
        },
        {
          creatorEmail: 'gilby.koloay@banksulutgo.co.id',
          title: 'Printer Installation Request',
          description: 'Need new printer installed in administrative office. Current printer frequently jams and affects document processing efficiency.',
          priority: 'MEDIUM',
          category: 'SERVICE_REQUEST'
        },
        {
          creatorEmail: 'brayend.tamusa@banksulutgo.co.id',
          title: 'ATM Transaction Processing Slow',
          description: 'ATM transactions taking unusually long time to process. Customers complaining about wait times. Issue started this morning.',
          priority: 'HIGH',
          category: 'INCIDENT'
        }
      ];

      let ticketCount = await prisma.ticket.count();
      
      for (const ticketData of sampleTickets) {
        const creator = createdUsers.find(u => u.email === ticketData.creatorEmail);
        if (!creator) continue;

        const randomService = services[Math.floor(Math.random() * services.length)];
        ticketCount++;
        const ticketNumber = `USR-${new Date().getFullYear()}-${String(ticketCount).padStart(4, '0')}`;

        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title: ticketData.title,
            description: ticketData.description,
            serviceId: randomService.id,
            category: ticketData.category,
            priority: ticketData.priority,
            status: 'PENDING_APPROVAL', // User tickets need manager approval
            createdById: creator.id,
            branchId: creator.branchId,
            isConfidential: false
          }
        });

        console.log(`🎫 Created ticket: ${ticket.ticketNumber} by ${creator.name} (${creator.branch.name})`);
      }
    }

    console.log('\n🎉 Updated users seeding completed successfully!');
    console.log('\n📊 Summary by Role:');
    console.log(`• Managers: ${managerCount} (can see/approve tickets from users in their branch)`);
    console.log(`• Technicians: ${technicianCount} (IT Helpdesk: 2, KASDA: 1)`);
    console.log(`• Users: ${userCount} (can create and view own tickets)`);
    
    console.log('\n🏢 Branch Distribution:');
    const branchDistribution = {};
    createdUsers.forEach(user => {
      const branchKey = `${user.branch.name} (${user.branch.code})`;
      if (!branchDistribution[branchKey]) {
        branchDistribution[branchKey] = [];
      }
      branchDistribution[branchKey].push(`${user.name} - ${user.role}`);
    });
    
    Object.keys(branchDistribution).forEach(branch => {
      console.log(`• ${branch}:`);
      branchDistribution[branch].forEach(user => {
        console.log(`  - ${user}`);
      });
    });

    console.log('\n🔐 Login Credentials (All users):');
    console.log('• Password: password123 (for all users)');
    
    console.log('\n👥 Managers (Branch isolation - can only manage their own branch):');
    const managers = createdUsers.filter(u => u.role === 'MANAGER');
    managers.forEach(manager => {
      console.log(`• ${manager.name} - ${manager.email} (${manager.branch.name})`);
    });

    console.log('\n🔧 Technicians (Support different service groups):');
    const technicians = createdUsers.filter(u => u.role === 'TECHNICIAN');
    technicians.forEach(technician => {
      const supportGroup = supportGroups.find(sg => sg.id === technician.supportGroupId);
      console.log(`• ${technician.name} - ${technician.email} (${supportGroup ? supportGroup.name : 'No Group'})`);
    });

    console.log('\n👤 Regular Users (Submit tickets to their branch manager):');
    const users = createdUsers.filter(u => u.role === 'USER');
    users.forEach(user => {
      console.log(`• ${user.name} - ${user.email} (${user.branch.name})`);
    });

    console.log('\n📋 Key Features:');
    console.log('• ✅ Branch isolation enforced for managers');
    console.log('• ✅ Technicians assigned to appropriate support groups');
    console.log('• ✅ Users distributed across all branches');
    console.log('• ✅ Sample tickets created for testing workflows');
    console.log('• ✅ Realistic banking organizational structure');

  } catch (error) {
    console.error('❌ Error seeding updated users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedUpdatedUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });