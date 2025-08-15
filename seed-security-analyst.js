const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedSecurityAnalyst() {
  console.log('🔒 Seeding Security Analyst...');

  try {
    // Check if Security Analyst already exists
    const existingSecurityAnalyst = await prisma.user.findFirst({
      where: { email: 'security.analyst@banksulutgo.co.id' }
    });

    if (existingSecurityAnalyst) {
      console.log('✅ Security Analyst already exists:', existingSecurityAnalyst.email);
      return;
    }

    // Get a branch for the Security Analyst (use first available branch)
    const branch = await prisma.branch.findFirst();
    
    if (!branch) {
      console.error('❌ No branches found. Please run the main seed script first.');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create Security Analyst
    const securityAnalyst = await prisma.user.create({
      data: {
        name: 'Security Analyst',
        email: 'security.analyst@banksulutgo.co.id',
        password: hashedPassword,
        role: 'SECURITY_ANALYST',
        branchId: branch.id,
        supportGroupId: null, // Security Analyst operates independently
        isActive: true
      }
    });

    console.log('✅ Created Security Analyst:', securityAnalyst.name);
    console.log('📧 Email:', securityAnalyst.email);
    console.log('🔑 Password: password123');
    console.log('🏢 Branch:', branch.name);
    
    // Create a sample confidential ticket for testing
    const service = await prisma.service.findFirst({
      where: { isActive: true }
    });

    if (service) {
      const ticketCount = await prisma.ticket.count();
      const ticketNumber = `SEC-${new Date().getFullYear()}-${String(ticketCount + 1).padStart(4, '0')}`;

      const sampleTicket = await prisma.ticket.create({
        data: {
          ticketNumber,
          title: 'Security Incident Investigation',
          description: 'Confidential security investigation - unauthorized access attempt detected on network infrastructure. Requires immediate analysis and containment measures.',
          serviceId: service.id,
          category: 'INCIDENT',
          priority: 'HIGH',
          status: 'OPEN',
          createdById: securityAnalyst.id,
          branchId: branch.id,
          isConfidential: true,
          securityClassification: 'HIGH',
          issueClassification: 'SECURITY_INCIDENT',
          securityFindings: {
            threatLevel: 'HIGH',
            affectedSystems: ['Network Infrastructure', 'User Authentication'],
            investigationStatus: 'ACTIVE',
            confidentialityLevel: 'RESTRICTED'
          }
        }
      });

      console.log('🎫 Created sample confidential ticket:', sampleTicket.ticketNumber);
    }

    console.log('\n🎉 Security Analyst seeding completed successfully!');
    console.log('\n🔐 Security Analyst Login Credentials:');
    console.log('• Email: security.analyst@banksulutgo.co.id');
    console.log('• Password: password123');
    console.log('• Role: SECURITY_ANALYST');
    console.log('\n📋 Key Features:');
    console.log('• All tickets created are automatically confidential');
    console.log('• Can only view confidential tickets they created/assigned to');
    console.log('• Other technicians cannot see their tickets');
    console.log('• Default security classification: HIGH');

  } catch (error) {
    console.error('❌ Error seeding Security Analyst:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSecurityAnalyst()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });