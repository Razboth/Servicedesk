// Seed script for ATM Monitoring Alert service
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedATMMonitoringService() {
  try {
    console.log('🚀 Starting ATM Monitoring Alert service seed...');

    // Find or create IT Helpdesk support group
    let supportGroup = await prisma.supportGroup.findFirst({
      where: { code: 'IT_HELPDESK' }
    });

    if (!supportGroup) {
      console.log('Creating IT Helpdesk support group...');
      supportGroup = await prisma.supportGroup.create({
        data: {
          code: 'IT_HELPDESK',
          name: 'IT Helpdesk',
          description: 'IT support and infrastructure team',
          email: 'it.helpdesk@banksulutgo.co.id',
          isActive: true
        }
      });
    }

    // Find or create Infrastructure category
    let category = await prisma.serviceCategory.findFirst({
      where: { name: 'Infrastructure' }
    });

    if (!category) {
      console.log('Creating Infrastructure category...');
      category = await prisma.serviceCategory.create({
        data: {
          name: 'Infrastructure',
          description: 'Infrastructure and hardware services',
          level: 1,
          isActive: true
        }
      });
    }

    // Check if ATM Monitoring Alert service already exists
    const existingService = await prisma.service.findFirst({
      where: { name: 'ATM Monitoring Alert' }
    });

    if (existingService) {
      console.log('⚠️ ATM Monitoring Alert service already exists');
      return existingService;
    }

    // Create ATM Monitoring Alert service
    console.log('Creating ATM Monitoring Alert service...');
    const service = await prisma.service.create({
      data: {
        name: 'ATM Monitoring Alert',
        description: 'Automated alerts from ATM monitoring system for network, hardware, software, and security incidents',
        categoryId: category.id,
        supportGroupId: supportGroup.id,
        priority: 'HIGH',
        slaHours: 4, // 4 hours SLA for monitoring alerts
        resolutionHours: 24, // 24 hours to resolve
        responseHours: 1, // 1 hour response time
        requiresApproval: false, // Auto-approved for monitoring alerts
        defaultItilCategory: 'INCIDENT',
        isActive: true
      }
    });

    console.log('✅ ATM Monitoring Alert service created successfully!');
    console.log('Service ID:', service.id);
    console.log('Service Name:', service.name);

    // Create custom field templates for ATM monitoring
    const fieldTemplates = [
      {
        name: 'ATM Code',
        label: 'ATM Code',
        type: 'TEXT',
        isRequired: true,
        description: 'ATM terminal code',
        validation: { pattern: '^ATM-\\d{6}$' }
      },
      {
        name: 'Incident Type',
        label: 'Incident Type',
        type: 'SELECT',
        isRequired: true,
        description: 'Type of ATM incident',
        options: [
          'Network Down',
          'Hardware Failure',
          'Software Error',
          'Maintenance',
          'Security Breach'
        ]
      },
      {
        name: 'Severity Level',
        label: 'Severity Level',
        type: 'SELECT',
        isRequired: true,
        description: 'Incident severity',
        options: ['Low', 'Medium', 'High', 'Critical']
      },
      {
        name: 'External Reference ID',
        label: 'External Reference ID',
        type: 'TEXT',
        isRequired: false,
        description: 'Reference ID from external monitoring system'
      },
      {
        name: 'Downtime Start',
        label: 'Downtime Start',
        type: 'DATETIME',
        isRequired: false,
        description: 'When the incident started'
      },
      {
        name: 'Impact Description',
        label: 'Impact Description',
        type: 'TEXTAREA',
        isRequired: false,
        description: 'Business impact of the incident'
      },
      {
        name: 'Affected Services',
        label: 'Affected Services',
        type: 'CHECKBOX',
        isRequired: false,
        description: 'Services affected by this incident',
        options: [
          'Cash Withdrawal',
          'Balance Inquiry',
          'Mini Statement',
          'Fund Transfer',
          'Bill Payment',
          'Card Services'
        ]
      },
      {
        name: 'Auto-Recovery Attempted',
        label: 'Auto-Recovery Attempted',
        type: 'CHECKBOX',
        isRequired: false,
        description: 'Whether automatic recovery was attempted',
        options: ['Yes']
      }
    ];

    console.log('\n📝 Creating field templates for ATM Monitoring Alert service...');
    
    for (const fieldData of fieldTemplates) {
      // Check if field template exists
      let fieldTemplate = await prisma.fieldTemplate.findFirst({
        where: { name: fieldData.name }
      });

      if (!fieldTemplate) {
        fieldTemplate = await prisma.fieldTemplate.create({
          data: {
            name: fieldData.name,
            label: fieldData.label,
            type: fieldData.type,
            isRequired: fieldData.isRequired,
            description: fieldData.description,
            options: fieldData.options || [],
            validation: fieldData.validation || {},
            isActive: true
          }
        });
        console.log(`  ✅ Created field template: ${fieldData.name}`);
      } else {
        console.log(`  ⚠️ Field template already exists: ${fieldData.name}`);
      }

      // Link field template to service
      const existingLink = await prisma.serviceFieldTemplate.findFirst({
        where: {
          serviceId: service.id,
          fieldTemplateId: fieldTemplate.id
        }
      });

      if (!existingLink) {
        await prisma.serviceFieldTemplate.create({
          data: {
            serviceId: service.id,
            fieldTemplateId: fieldTemplate.id,
            order: fieldTemplates.indexOf(fieldData)
          }
        });
        console.log(`    → Linked to ATM Monitoring Alert service`);
      }
    }

    console.log('\n✅ ATM Monitoring Alert service setup completed successfully!');
    
    return service;

  } catch (error) {
    console.error('❌ Error seeding ATM Monitoring Alert service:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedATMMonitoringService()
  .then(() => {
    console.log('\n🎉 Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });