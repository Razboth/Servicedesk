const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedAntivirusService() {
  try {
    console.log('🦠 Starting Antivirus Alert Service setup...');

    // 1. Find or create Security Operations support group
    let supportGroup = await prisma.supportGroup.findFirst({
      where: { code: 'SECURITY_OPS' }
    });

    if (!supportGroup) {
      supportGroup = await prisma.supportGroup.create({
        data: {
          name: 'Security Operations Center',
          code: 'SECURITY_OPS',
          description: 'Security Operations team handling security incidents and alerts',
          isActive: true
        }
      });
      console.log('✅ Created Security Operations support group');
    }

    // 2. Find or create Security category
    let category = await prisma.serviceCategory.findFirst({
      where: { name: 'Security' }
    });

    if (!category) {
      category = await prisma.serviceCategory.create({
        data: {
          name: 'Security',
          description: 'Security-related services and incidents',
          level: 1,
          isActive: true
        }
      });
      console.log('✅ Created Security category');
    }

    // 3. Check if Antivirus Alert service already exists
    const existingService = await prisma.service.findFirst({
      where: { name: 'Antivirus Alert' }
    });

    if (existingService) {
      console.log('⚠️ Antivirus Alert service already exists');
      return;
    }

    // 4. Create field templates for antivirus alerts
    const fieldTemplates = [
      {
        name: 'av_detection_date',
        label: 'Detection Date',
        type: 'DATE',
        isRequired: true,
        placeholder: 'Select detection date',
        helpText: 'Date when the threat was detected'
      },
      {
        name: 'av_endpoint_hostname',
        label: 'Endpoint / Hostname',
        type: 'TEXT',
        isRequired: true,
        placeholder: 'e.g., DESKTOP-ABC123 or server01.banksulutgo.co.id',
        helpText: 'Computer name or server hostname where threat was detected'
      },
      {
        name: 'av_username',
        label: 'Username',
        type: 'TEXT',
        isRequired: true,
        placeholder: 'e.g., john.doe or domain\\username',
        helpText: 'User account associated with the detection'
      },
      {
        name: 'av_ip_address',
        label: 'IP Address',
        type: 'TEXT',
        isRequired: true,
        placeholder: 'e.g., 192.168.1.100',
        helpText: 'IP address of the affected endpoint',
        validation: {
          pattern: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
          message: 'Please enter a valid IP address'
        }
      },
      {
        name: 'av_threat_type',
        label: 'Threat/Malware Type',
        type: 'TEXT',
        isRequired: true,
        placeholder: 'e.g., Trojan.Win32.Generic, Ransomware, Adware',
        helpText: 'Type or name of the detected threat'
      },
      {
        name: 'av_severity',
        label: 'Severity',
        type: 'SELECT',
        isRequired: true,
        options: ['Low', 'Medium', 'High', 'Critical'],
        defaultValue: 'Medium',
        helpText: 'Severity level of the threat'
      },
      {
        name: 'av_action_taken',
        label: 'Automatic Action by Kaspersky',
        type: 'SELECT',
        isRequired: true,
        options: ['Blocked', 'Quarantined', 'Deleted', 'No Action Taken', 'Other'],
        helpText: 'Action automatically taken by the antivirus software'
      },
      {
        name: 'av_action_other',
        label: 'Other Action (if applicable)',
        type: 'TEXT',
        isRequired: false,
        placeholder: 'Specify if "Other" was selected above',
        helpText: 'Describe the action if "Other" was selected'
      },
      {
        name: 'av_preliminary_analysis',
        label: 'Preliminary Analysis',
        type: 'TEXTAREA',
        isRequired: true,
        placeholder: 'Provide initial analysis of the threat detection...',
        helpText: 'Initial assessment and analysis of the detected threat'
      },
      {
        name: 'av_followup_actions',
        label: 'Required Follow-up Actions',
        type: 'TEXTAREA',
        isRequired: true,
        placeholder: 'List required follow-up actions...',
        helpText: 'Actions needed to fully remediate the threat'
      }
    ];

    // Create field templates
    console.log('📝 Creating field templates...');
    const createdTemplates = [];
    for (const template of fieldTemplates) {
      const created = await prisma.fieldTemplate.create({
        data: template
      });
      createdTemplates.push(created);
      console.log(`  ✅ Created field: ${template.label}`);
    }

    // 5. Create the Antivirus Alert service
    const antivirusService = await prisma.service.create({
      data: {
        name: 'Antivirus Alert',
        description: 'Report and track antivirus/endpoint protection alerts and incidents',
        categoryId: category.id,
        supportGroupId: supportGroup.id,
        priority: 'HIGH',
        estimatedHours: 2,
        slaHours: 4,
        requiresApproval: false,
        isActive: true,
        defaultTitle: 'Antivirus Alert - [Threat Type]',
        defaultItilCategory: 'INCIDENT',
        defaultIssueClassification: 'SECURITY_INCIDENT',
        // Link field templates
        fieldTemplates: {
          create: createdTemplates.map((template, index) => ({
            fieldTemplateId: template.id,
            isRequired: template.isRequired,
            order: index + 1,
            defaultValue: template.defaultValue || null,
            helpText: template.helpText || null
          }))
        }
      }
    });

    console.log('✅ Created Antivirus Alert service');

    // 6. Create ServiceFields for immediate use
    for (let i = 0; i < createdTemplates.length; i++) {
      const template = createdTemplates[i];
      await prisma.serviceField.create({
        data: {
          serviceId: antivirusService.id,
          name: template.name,
          label: template.label,
          type: template.type,
          isRequired: template.isRequired,
          placeholder: template.placeholder,
          helpText: template.helpText,
          defaultValue: template.defaultValue,
          options: template.options || undefined,
          validation: template.validation || undefined,
          order: i + 1,
          isActive: true
        }
      });
    }
    console.log('✅ Created service fields');

    console.log('\n🎉 Antivirus Alert service setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up Antivirus Alert service:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedAntivirusService()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });