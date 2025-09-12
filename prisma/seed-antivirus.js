const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAntivirusService() {
  console.log('🛡️ Seeding Antivirus Alert Service...');

  try {
    // Check if Security ServiceCategory exists (legacy requirement)
    let serviceCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Security' }
    });

    if (!serviceCategory) {
      serviceCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Security',
          description: 'Security-related services and incidents',
          isActive: true
        }
      });
      console.log('✅ Created Security service category');
    }

    // Check if Security category exists (3-tier)
    let securityCategory = await prisma.category.findFirst({
      where: { name: 'Security' }
    });

    if (!securityCategory) {
      securityCategory = await prisma.category.create({
        data: {
          name: 'Security',
          description: 'Security-related services and incidents',
          isActive: true,
          order: 10
        }
      });
      console.log('✅ Created Security category (3-tier)');
    }

    // Check if Threat Detection subcategory exists
    let threatSubcategory = await prisma.subcategory.findFirst({
      where: { 
        name: 'Threat Detection',
        categoryId: securityCategory.id
      }
    });

    if (!threatSubcategory) {
      threatSubcategory = await prisma.subcategory.create({
        data: {
          name: 'Threat Detection',
          description: 'Virus, malware, and threat detection services',
          categoryId: securityCategory.id,
          isActive: true
        }
      });
      console.log('✅ Created Threat Detection subcategory');
    }

    // Check if Antivirus Alert item exists
    let antivirusItem = await prisma.item.findFirst({
      where: { 
        name: 'Antivirus Alert',
        subcategoryId: threatSubcategory.id
      }
    });

    if (!antivirusItem) {
      antivirusItem = await prisma.item.create({
        data: {
          name: 'Antivirus Alert',
          description: 'Alert for virus or malware detection',
          subcategoryId: threatSubcategory.id,
          isActive: true
        }
      });
      console.log('✅ Created Antivirus Alert item');
    }

    // Check if Security Operations support group exists
    let securityGroup = await prisma.supportGroup.findFirst({
      where: { code: 'SECURITY_OPS' }
    });

    if (!securityGroup) {
      securityGroup = await prisma.supportGroup.create({
        data: {
          name: 'Security Operations Center',
          code: 'SECURITY_OPS',
          description: 'Handles security incidents and alerts',
          isActive: true
        }
      });
      console.log('✅ Created Security Operations support group');
    }

    // Check if Antivirus Alert service exists
    const existingService = await prisma.service.findFirst({
      where: { 
        name: 'Antivirus Alert'
      }
    });

    if (!existingService) {
      const antivirusService = await prisma.service.create({
        data: {
          name: 'Antivirus Alert',
          description: 'Service for handling antivirus and malware detection alerts',
          categoryId: serviceCategory.id, // Legacy field
          tier1CategoryId: securityCategory.id,
          tier2SubcategoryId: threatSubcategory.id,
          tier3ItemId: antivirusItem.id,
          supportGroupId: securityGroup.id,
          requiresApproval: false,
          priority: 'HIGH',
          responseHours: 2, // 2 hours
          resolutionHours: 24, // 24 hours
          slaHours: 24,
          isActive: true
        }
      });

      console.log('✅ Created Antivirus Alert service');

      // Create field templates for the service
      const fieldTemplates = [
        {
          name: 'Computer Name',
          label: 'Infected Computer Name',
          type: 'TEXT',
          isRequired: true,
          order: 1,
          placeholder: 'Enter computer name or hostname',
          helpText: 'The name of the computer where the virus was detected'
        },
        {
          name: 'User Name',
          label: 'Affected User',
          type: 'TEXT',
          isRequired: true,
          order: 2,
          placeholder: 'Enter username',
          helpText: 'Username of the person using the infected computer'
        },
        {
          name: 'Virus Name',
          label: 'Virus/Malware Name',
          type: 'TEXT',
          isRequired: true,
          order: 3,
          placeholder: 'Enter virus or malware name',
          helpText: 'Name of the detected virus or malware'
        },
        {
          name: 'File Path',
          label: 'Infected File Path',
          type: 'TEXT',
          isRequired: false,
          order: 4,
          placeholder: 'C:\\path\\to\\infected\\file',
          helpText: 'Full path to the infected file'
        },
        {
          name: 'Detection Time',
          label: 'Detection Date/Time',
          type: 'DATETIME',
          isRequired: true,
          order: 5,
          helpText: 'When was the virus detected'
        },
        {
          name: 'Action Taken',
          label: 'Antivirus Action',
          type: 'SELECT',
          isRequired: true,
          order: 6,
          options: ['Quarantined', 'Deleted', 'Cleaned', 'Access Denied', 'No Action', 'Failed to Clean'],
          helpText: 'Action taken by the antivirus software'
        },
        {
          name: 'Severity',
          label: 'Threat Severity',
          type: 'SELECT',
          isRequired: true,
          order: 7,
          options: ['Critical', 'High', 'Medium', 'Low'],
          defaultValue: 'High',
          helpText: 'Severity level of the threat'
        },
        {
          name: 'Additional Info',
          label: 'Additional Information',
          type: 'TEXTAREA',
          isRequired: false,
          order: 8,
          placeholder: 'Any additional information about the incident',
          helpText: 'Provide any additional context or information'
        }
      ];

      // Create field templates
      for (const template of fieldTemplates) {
        const existingTemplate = await prisma.fieldTemplate.findFirst({
          where: {
            name: template.name
          }
        });

        if (!existingTemplate) {
          await prisma.fieldTemplate.create({
            data: template
          });
          console.log(`  ✅ Created field template: ${template.label}`);
        }
      }

      console.log('✅ Antivirus Alert service setup complete!');
    } else {
      console.log('ℹ️ Antivirus Alert service already exists');
    }

  } catch (error) {
    console.error('❌ Error seeding antivirus service:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedAntivirusService()
  .then(() => {
    console.log('✅ Antivirus seed completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Antivirus seed failed:', error);
    process.exit(1);
  });