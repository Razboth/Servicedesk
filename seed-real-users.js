const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedRealUsers() {
  console.log('👥 Seeding Real Bank SulutGo Users...');

  try {
    // Get all available branches
    const branches = await prisma.branch.findMany({
      select: { id: true, name: true, code: true }
    });

    if (branches.length === 0) {
      console.error('❌ No branches found. Please run the main seed script first.');
      return;
    }

    console.log(`📍 Found ${branches.length} branches for user assignment`);

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Real users list with role assignments
    const realUsers = [
      {
        name: 'Excelsis Maramis',
        email: 'excelsis.maramis@banksulutgo.co.id',
        role: 'MANAGER', // Senior position - Manager
        title: 'Branch Manager'
      },
      {
        name: 'Gugah Wijaya', 
        email: 'gugah.wijaya@banksulutgo.co.id',
        role: 'USER',
        title: 'Customer Service Officer'
      },
      {
        name: 'Shirke Heslin',
        email: 'shirke.heslin@banksulutgo.co.id',
        role: 'MANAGER', // Manager role
        title: 'Operations Manager'
      },
      {
        name: 'Frigia Pasla',
        email: 'frigia.pasla@banksulutgo.co.id',
        role: 'USER',
        title: 'Teller'
      },
      {
        name: 'Daniel Niode',
        email: 'danielniode@banksulutgo.co.id',
        role: 'USER',
        title: 'Account Officer'
      },
      {
        name: 'Cecep Juarsa',
        email: 'cecep.juarsa@banksulutgo.co.id',
        role: 'MANAGER', // Manager role
        title: 'Credit Manager'
      },
      {
        name: 'Yosua Van Beuren',
        email: 'yosua.vanbeuren@banksulutgo.co.id',
        role: 'USER',
        title: 'Customer Relationship Officer'
      },
      {
        name: 'Gilby Koloay',
        email: 'gilby.koloay@banksulutgo.co.id',
        role: 'USER',
        title: 'Administrative Staff'
      },
      {
        name: 'Erwin Lapian',
        email: 'erwin.lapian@banksulutgo.co.id',
        role: 'MANAGER', // Manager role
        title: 'Risk Management Manager'
      }
    ];

    const createdUsers = [];
    let managerCount = 0;
    let userCount = 0;

    for (let i = 0; i < realUsers.length; i++) {
      const userData = realUsers[i];
      
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`✅ User already exists: ${userData.name} (${userData.email})`);
        createdUsers.push(existingUser);
        continue;
      }

      // Assign to random branch
      const randomBranch = branches[Math.floor(Math.random() * branches.length)];
      
      // Create the user
      const newUser = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          branchId: randomBranch.id,
          phone: null, // Can be updated later
          isActive: true
        }
      });

      console.log(`✅ Created ${userData.role.toLowerCase()}: ${newUser.name}`);
      console.log(`   📧 Email: ${newUser.email}`);
      console.log(`   🏢 Branch: ${randomBranch.name} (${randomBranch.code})`);
      console.log(`   💼 Title: ${userData.title}`);

      if (userData.role === 'MANAGER') {
        managerCount++;
      } else {
        userCount++;
      }

      createdUsers.push(newUser);
    }

    // Create some sample tickets from these real users for testing
    const services = await prisma.service.findMany({
      where: { isActive: true },
      take: 5
    });

    if (services.length > 0) {
      console.log('\n🎫 Creating sample tickets from real users...');
      
      const sampleTickets = [
        {
          creatorEmail: 'gugah.wijaya@banksulutgo.co.id',
          title: 'ATM Card Issue - Customer Complaint',
          description: 'Customer reports ATM card not working at main branch ATM. Card gets stuck and transaction fails. Need urgent resolution as customer is unable to access funds.',
          priority: 'HIGH',
          category: 'INCIDENT'
        },
        {
          creatorEmail: 'frigia.pasla@banksulutgo.co.id',
          title: 'Printer Not Working - Teller Station',
          description: 'Receipt printer at teller station 3 is not printing. Need replacement or repair as it affects customer service during busy hours.',
          priority: 'MEDIUM',
          category: 'SERVICE_REQUEST'
        },
        {
          creatorEmail: 'danielniode@banksulutgo.co.id',
          title: 'Core Banking System Slow Response',
          description: 'Core banking application responding very slowly during peak hours. Takes 30+ seconds to load customer accounts. Affecting productivity and customer wait times.',
          priority: 'HIGH',
          category: 'INCIDENT'
        },
        {
          creatorEmail: 'yosua.vanbeuren@banksulutgo.co.id',
          title: 'Email Access Request - New Employee',
          description: 'New customer relationship officer needs email account setup and access to CRM system. Employee starts Monday and needs access for client communications.',
          priority: 'MEDIUM',
          category: 'SERVICE_REQUEST'
        },
        {
          creatorEmail: 'gilby.koloay@banksulutgo.co.id',
          title: 'File Server Access Issue',
          description: 'Unable to access shared documents on file server. Getting "access denied" error when trying to open monthly reports folder. Need administrative access.',
          priority: 'MEDIUM',
          category: 'SERVICE_REQUEST'
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
            status: 'PENDING_APPROVAL', // Real user tickets need approval
            createdById: creator.id,
            branchId: creator.branchId,
            isConfidential: false // Regular business tickets
          }
        });

        console.log(`🎫 Created ticket: ${ticket.ticketNumber} by ${creator.name}`);
      }
    }

    console.log('\n🎉 Real users seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`• Total Users Created: ${realUsers.length}`);
    console.log(`• Managers: ${managerCount}`);
    console.log(`• Regular Users: ${userCount}`);
    console.log(`• Branches Used: ${branches.length}`);
    console.log(`• Sample Tickets: 5 business tickets created`);

    console.log('\n🔐 Login Credentials (All users):');
    console.log('• Password: password123 (for all users)');
    
    console.log('\n👥 Managers (Can see branch tickets):');
    const managers = realUsers.filter(u => u.role === 'MANAGER');
    managers.forEach(manager => {
      console.log(`• ${manager.name} - ${manager.email}`);
    });

    console.log('\n👤 Regular Users (Can see own tickets only):');
    const users = realUsers.filter(u => u.role === 'USER');  
    users.forEach(user => {
      console.log(`• ${user.name} - ${user.email}`);
    });

    console.log('\n📋 User Capabilities:');
    console.log('• Managers: View all branch tickets, approve user requests');
    console.log('• Users: Create tickets, view own tickets, ticket requires approval');
    console.log('• All users assigned to random Bank SulutGo branches');
    console.log('• Sample business tickets created for testing workflows');

  } catch (error) {
    console.error('❌ Error seeding real users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedRealUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });