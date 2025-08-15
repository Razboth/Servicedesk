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

    // 3. Create security services
    const securityServices = [
      {
        name: 'SOC Security Finding',
        description: 'Security incident identified by Security Operations Center',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id,
        priority: 'HIGH',
        slaHours: 4, // 4 hours for security incidents
        isConfidential: true,
        requiresApproval: false, // Security incidents don't need approval
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Cyber Security Threat Analysis',
        description: 'Analysis and investigation of cybersecurity threats',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id,
        priority: 'HIGH',
        slaHours: 8,
        isConfidential: true,
        requiresApproval: false,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Security Policy Violation',
        description: 'Investigation of security policy violations',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id,
        priority: 'MEDIUM',
        slaHours: 12,
        isConfidential: true,
        requiresApproval: true,
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT'
      },
      {
        name: 'Vulnerability Assessment Request',
        description: 'Request for vulnerability assessment of systems or applications',
        supportGroupId: securitySupportGroup.id,
        categoryId: securityServiceCategory.id,
        priority: 'MEDIUM',
        slaHours: 24,
        isConfidential: false,
        requiresApproval: true,
        defaultItilCategory: 'SERVICE_REQUEST',
        defaultIssueClassification: 'PROCESS_GAP'
      }
    ];

    for (const serviceData of securityServices) {
      const service = await prisma.service.upsert({
        where: { name: serviceData.name },
        update: serviceData,
        create: serviceData
      });
      console.log('✅ Created/updated security service:', service.name);
    }

    // 4. Create 3-tier category structure for security
    const securityCategory = await prisma.category.upsert({
      where: { name: 'Security' },
      update: {},
      create: {
        name: 'Security',
        description: 'Cybersecurity and information security categories',
        order: 1,
        isActive: true
      }
    });

    const securitySubcategories = [
      {
        name: 'Cyber Security',
        description: 'Cybersecurity threats and incidents'
      },
      {
        name: 'Physical Security',
        description: 'Physical security incidents and violations'
      },
      {
        name: 'Data Security',
        description: 'Data protection and privacy incidents'
      }
    ];

    for (const subcategoryData of securitySubcategories) {
      const subcategory = await prisma.subcategory.upsert({
        where: { 
          categoryId_name: {
            categoryId: securityCategory.id,
            name: subcategoryData.name
          }
        },
        update: subcategoryData,
        create: {
          ...subcategoryData,
          categoryId: securityCategory.id,
          order: 1,
          isActive: true
        }
      });

      console.log('✅ Created/updated security subcategory:', subcategory.name);

      // Create items for each subcategory
      let items = [];
      if (subcategoryData.name === 'Cyber Security') {
        items = [
          'Malware Detection',
          'Phishing Attack',
          'Data Breach',
          'Unauthorized Access',
          'DDoS Attack',
          'Insider Threat',
          'Security Policy Violation'
        ];
      } else if (subcategoryData.name === 'Physical Security') {
        items = [
          'Unauthorized Physical Access',
          'Equipment Theft',
          'Facility Security Breach'
        ];
      } else if (subcategoryData.name === 'Data Security') {
        items = [
          'Data Leak',
          'Privacy Violation',
          'Data Loss',
          'Unauthorized Data Access'
        ];
      }

      for (const itemName of items) {
        const item = await prisma.item.upsert({
          where: {
            subcategoryId_name: {
              subcategoryId: subcategory.id,
              name: itemName
            }
          },
          update: {},
          create: {
            name: itemName,
            subcategoryId: subcategory.id,
            order: 1,
            isActive: true
          }
        });
        console.log('✅ Created/updated security item:', item.name);
      }
    }

    // 5. Create a demo security analyst user (if in development)
    if (process.env.NODE_ENV === 'development') {
      const demoSecurityAnalyst = await prisma.user.upsert({
        where: { email: 'security@sulutgo.id' },
        update: {},
        create: {
          name: 'Security Analyst Demo',
          email: 'security@sulutgo.id',
          role: 'SECURITY_ANALYST',
          supportGroupId: securitySupportGroup.id,
          isActive: true
        }
      });
      console.log('✅ Created demo security analyst user:', demoSecurityAnalyst.name);
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