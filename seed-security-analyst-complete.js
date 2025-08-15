const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedSecurityAnalyst() {
  console.log('🔒 Seeding Security Analyst (Complete)...');

  try {
    // Check if Security Analyst already exists
    const existingSecurityAnalyst = await prisma.user.findFirst({
      where: { email: 'security.analyst@banksulutgo.co.id' }
    });

    if (existingSecurityAnalyst) {
      console.log('✅ Security Analyst already exists:', existingSecurityAnalyst.email);
      console.log('🔄 Updating role if needed...');
      
      // Ensure role is SECURITY_ANALYST (not TECHNICIAN)
      if (existingSecurityAnalyst.role !== 'SECURITY_ANALYST') {
        await prisma.user.update({
          where: { id: existingSecurityAnalyst.id },
          data: { role: 'SECURITY_ANALYST' }
        });
        console.log('✅ Updated Security Analyst role to SECURITY_ANALYST');
      }
      
      return existingSecurityAnalyst;
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
        role: 'SECURITY_ANALYST', // Special role - functions like technician but with confidential access
        branchId: branch.id,
        supportGroupId: null, // Security Analyst operates independently
        isActive: true
      }
    });

    console.log('✅ Created Security Analyst:', securityAnalyst.name);
    console.log('📧 Email:', securityAnalyst.email);
    console.log('🔑 Password: password123');
    console.log('🏢 Branch:', branch.name);
    console.log('👮 Role: SECURITY_ANALYST (functions as technician with special permissions)');
    
    // Create sample confidential tickets for testing
    const service = await prisma.service.findFirst({
      where: { isActive: true }
    });

    if (service) {
      // Create confidential security tickets
      const securityTickets = [
        {
          title: 'Suspicious Login Activity Investigation',
          description: 'CONFIDENTIAL - Multiple failed login attempts detected from foreign IP addresses. Requires immediate investigation and security analysis. Potential credential stuffing attack identified.',
          priority: 'HIGH',
          category: 'INCIDENT',
          issueClassification: 'SECURITY_INCIDENT',
          securityFindings: {
            threatLevel: 'HIGH',
            affectedSystems: ['Authentication System', 'User Database'],
            investigationStatus: 'ACTIVE',
            evidenceCollected: ['Login logs', 'IP geolocation data'],
            confidentialityLevel: 'RESTRICTED'
          }
        },
        {
          title: 'Internal Data Access Anomaly',
          description: 'CONFIDENTIAL - Unusual data access patterns detected in core banking system. Employee accessing customer records outside normal working hours and job scope.',
          priority: 'CRITICAL',
          category: 'INCIDENT', 
          issueClassification: 'SECURITY_INCIDENT',
          securityFindings: {
            threatLevel: 'CRITICAL',
            affectedSystems: ['Core Banking System', 'Customer Database'],
            investigationStatus: 'URGENT',
            evidenceCollected: ['Access logs', 'Employee records', 'System audit trails'],
            confidentialityLevel: 'TOP SECRET'
          }
        },
        {
          title: 'Network Intrusion Attempt Analysis',
          description: 'CONFIDENTIAL - Firewall logs show attempted network intrusion from advanced persistent threat. Requires forensic analysis and security containment measures.',
          priority: 'HIGH',
          category: 'INCIDENT',
          issueClassification: 'SECURITY_INCIDENT',
          securityFindings: {
            threatLevel: 'HIGH',
            affectedSystems: ['Network Infrastructure', 'Firewall Systems'],
            investigationStatus: 'CONTAINMENT',
            evidenceCollected: ['Network logs', 'Firewall alerts', 'Traffic analysis'],
            confidentialityLevel: 'RESTRICTED'
          }
        }
      ];

      let ticketCount = await prisma.ticket.count();
      
      for (const ticketData of securityTickets) {
        ticketCount++;
        const ticketNumber = `SEC-${new Date().getFullYear()}-${String(ticketCount).padStart(4, '0')}`;
        
        const ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title: ticketData.title,
            description: ticketData.description,
            serviceId: service.id,
            category: ticketData.category,
            priority: ticketData.priority,
            status: 'OPEN',
            createdById: securityAnalyst.id,
            branchId: branch.id,
            // Security fields - automatically set for Security Analyst tickets
            isConfidential: true,
            securityClassification: 'HIGH',
            issueClassification: ticketData.issueClassification,
            securityFindings: ticketData.securityFindings
          }
        });

        console.log(`🎫 Created confidential security ticket: ${ticket.ticketNumber}`);
      }
    }

    console.log('\n🎉 Security Analyst seeding completed successfully!');
    console.log('\n🔐 Security Analyst Login Credentials:');
    console.log('• Email: security.analyst@banksulutgo.co.id');
    console.log('• Password: password123');
    console.log('• Role: SECURITY_ANALYST');
    
    console.log('\n📋 Security Analyst Capabilities:');
    console.log('• ✅ Can create tickets (automatically marked confidential)');
    console.log('• ✅ Can claim/assign tickets like other technicians');
    console.log('• ✅ Can work on tickets (update status, add comments, etc.)');
    console.log('• ✅ Can see their own tickets (confidential or not)');
    console.log('• ✅ Can see confidential tickets from other Security Analysts');
    console.log('• ❌ Regular technicians CANNOT see Security Analyst tickets');
    console.log('• 🔒 All created tickets auto-marked as confidential with HIGH classification');
    
    console.log('\n🛡️  Security Features:');
    console.log('• Confidential ticket isolation from regular technicians');
    console.log('• Automatic security classification and findings tracking');
    console.log('• Special access controls for security investigations');
    console.log('• Sample security incident tickets for testing');

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