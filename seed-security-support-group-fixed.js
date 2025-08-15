const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔐 Seeding security support group and related data...');

  try {
    // 1. Create "Ketahanan & Keamanan Siber" support group
    const securitySupportGroup = await prisma.supportGroup.upsert({
      where: { code: 'CYBER_SECURITY' },
      update: {},
      create: {
        name: 'Ketahanan & Keamanan Siber',
        description: 'Cyber Security and Resilience Unit - Handles SOC findings, security incidents, and cyber threats',
        code: 'CYBER_SECURITY',
        isActive: true
      }
    });

    console.log('✅ Created security support group:', securitySupportGroup.name);

    // 2. Create or get security service categories
    let securityServiceCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Security Services' }
    });
    
    if (!securityServiceCategory) {
      securityServiceCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Security Services',
          description: 'Cybersecurity and information security services',
          level: 1,
          isActive: true
        }
      });
    }

    console.log('✅ Created/found security service category:', securityServiceCategory.name);

    // 3. Create security services - simplified to work with current schema
    const securityServices = [
      {
        name: 'SOC Security Finding',
        description: 'Security incident identified by Security Operations Center',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory) // Use correct field name
        priority: 'HIGH',
        slaHours: 4,
        responseHours: 2,
        resolutionHours: 4,
        escalationHours: 8,
        isConfidential: true,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Cyber Security Threat Analysis',
        description: 'Analysis and investigation of cybersecurity threats',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        priority: 'HIGH',
        slaHours: 8,
        responseHours: 4,
        resolutionHours: 8,
        escalationHours: 12,
        isConfidential: true,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Security Policy Violation',
        description: 'Investigation of security policy violations',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        priority: 'MEDIUM',
        slaHours: 12,
        responseHours: 4,
        resolutionHours: 12,
        escalationHours: 24,
        isConfidential: true,
        requiresApproval: true,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Vulnerability Assessment Request',
        description: 'Request for vulnerability assessment of systems or applications',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id, // Required legacy field
        tier1CategoryId: null, // Optional 3-tier category (different from ServiceCategory)
        priority: 'MEDIUM',
        slaHours: 24,
        responseHours: 8,
        resolutionHours: 24,
        escalationHours: 48,
        isConfidential: false,
        requiresApproval: true,
        defaultItilCategory: 'SERVICE_REQUEST',
        defaultIssueClassification: 'PROCESS_GAP'
      }
    ];

    for (const serviceData of securityServices) {
      let existingService = await prisma.service.findFirst({
        where: { name: serviceData.name }
      });

      if (!existingService) {
        const service = await prisma.service.create({
          data: serviceData
        });
        console.log('✅ Created security service:', service.name);
      } else {
        console.log('✅ Service already exists:', existingService.name);
      }
    }

    // 4. Skip 3-tier categories for now since they use different models
    // This can be added later if needed

    // 5. Create a demo security analyst user (if in development)
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      let demoSecurityAnalyst = await prisma.user.findFirst({
        where: { email: 'security@sulutgo.id' }
      });

      if (!demoSecurityAnalyst) {
        demoSecurityAnalyst = await prisma.user.create({
          data: {
            name: 'Security Analyst Demo',
            email: 'security@sulutgo.id',
            role: 'ADMIN', // Use existing role instead of SECURITY_ANALYST
            supportGroupId: securitySupportGroup.id,
            isActive: true
          }
        });
        console.log('✅ Created demo security analyst user:', demoSecurityAnalyst.name);
      } else {
        console.log('✅ Security analyst user already exists:', demoSecurityAnalyst.name);
      }
    }

    console.log('🎉 Security support group seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding security support group:', error);
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