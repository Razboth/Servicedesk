import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Seeding PC Management data...');

  // Create Technical Support group
  const techSupportGroup = await prisma.supportGroup.upsert({
    where: { code: 'TECH_SUPPORT' },
    update: {},
    create: {
      code: 'TECH_SUPPORT',
      name: 'Technical Support',
      description: 'Handles PC asset management, hardening, software licensing, and technical infrastructure support',
      isActive: true
    }
  });

  console.log('✅ Created Technical Support group:', techSupportGroup.name);

  // Create IT Infrastructure category
  let itInfraCategory = await prisma.serviceCategory.findFirst({
    where: {
      name: 'IT Infrastructure',
      level: 1
    }
  });

  if (!itInfraCategory) {
    itInfraCategory = await prisma.serviceCategory.create({
      data: {
        name: 'IT Infrastructure',
        description: 'IT infrastructure management and support services',
        level: 1,
        isActive: true
      }
    });
    console.log('✅ Created IT Infrastructure category');
  } else {
    console.log('ℹ️ IT Infrastructure category already exists');
  }

  // Create PC Management subcategory
  let pcMgmtSubcategory = await prisma.serviceCategory.findFirst({
    where: {
      name: 'PC Management',
      level: 2,
      parentId: itInfraCategory.id
    }
  });

  if (!pcMgmtSubcategory) {
    pcMgmtSubcategory = await prisma.serviceCategory.create({
      data: {
        name: 'PC Management',
        description: 'PC asset management and maintenance services',
        level: 2,
        parentId: itInfraCategory.id,
        isActive: true
      }
    });
    console.log('✅ Created PC Management subcategory');
  } else {
    console.log('ℹ️ PC Management subcategory already exists');
  }

  // Create services
  const services = [
    {
      name: 'PC Asset Registration',
      description: 'Register new PC assets in the system',
      helpText: 'Use this service to register new computers, laptops, or workstations',
      defaultTitle: 'New PC Asset Registration',
      slaHours: 4,
      responseHours: 1,
      resolutionHours: 4,
      requiresApproval: false
    },
    {
      name: 'PC Hardening Service',
      description: 'Security hardening for PC systems',
      helpText: 'Request security hardening for Windows, Linux, or Mac systems',
      defaultTitle: 'PC Security Hardening Request',
      slaHours: 24,
      responseHours: 4,
      resolutionHours: 24,
      requiresApproval: true
    },
    {
      name: 'PC Maintenance Log',
      description: 'Log maintenance activities for PC assets',
      helpText: 'Document maintenance, repairs, and upgrades performed on PC assets',
      defaultTitle: 'PC Maintenance Activity',
      slaHours: 8,
      responseHours: 2,
      resolutionHours: 8,
      requiresApproval: false
    },
    {
      name: 'Software License Management',
      description: 'Manage software licenses for PC assets',
      helpText: 'Request new licenses or report license issues',
      defaultTitle: 'Software License Request',
      slaHours: 48,
      responseHours: 8,
      resolutionHours: 48,
      requiresApproval: true
    }
  ];

  for (const serviceData of services) {
    const existingService = await prisma.service.findFirst({
      where: {
        name: serviceData.name,
        categoryId: pcMgmtSubcategory.id
      }
    });

    if (!existingService) {
      const service = await prisma.service.create({
        data: {
          ...serviceData,
          categoryId: pcMgmtSubcategory.id,
          subcategoryId: pcMgmtSubcategory.id,
          priority: 'MEDIUM',
          supportGroupId: techSupportGroup.id,
          isActive: true,
          businessHoursOnly: true,
          defaultItilCategory: 'SERVICE_REQUEST'
        }
      });
      console.log(`✅ Created service: ${service.name}`);
    } else {
      console.log(`ℹ️ Service already exists: ${serviceData.name}`);
    }
  }

  // Create hardening templates
  const existingTemplate = await prisma.hardeningTemplate.findFirst({
    where: { name: 'Windows 11 Security Hardening' }
  });

  if (!existingTemplate) {
    const windowsTemplate = await prisma.hardeningTemplate.create({
      data: {
        name: 'Windows 11 Security Hardening',
      description: 'Comprehensive security hardening checklist for Windows 11',
      osType: 'Windows 11',
      version: '1.0',
      isActive: true,
      checklistItems: {
        create: [
          // User Account Controls
          {
            category: 'USER_ACCOUNTS',
            itemCode: 'UA-001',
            title: 'Remove unnecessary local accounts',
            description: 'Ensure only required local accounts exist',
            isRequired: true,
            order: 1,
            verificationSteps: 'Open Computer Management > Local Users and Groups > Users',
            remediationSteps: 'Delete or disable unnecessary accounts'
          },
          {
            category: 'USER_ACCOUNTS',
            itemCode: 'UA-002',
            title: 'Enforce strong password policy',
            description: 'Minimum 12 characters with complexity requirements',
            isRequired: true,
            order: 2,
            verificationSteps: 'Run secpol.msc > Account Policies > Password Policy',
            remediationSteps: 'Set password policy: Min length 12, complexity enabled, history 24'
          },
          {
            category: 'USER_ACCOUNTS',
            itemCode: 'UA-003',
            title: 'Enable account lockout policy',
            description: 'Lock accounts after failed login attempts',
            isRequired: true,
            order: 3,
            verificationSteps: 'Run secpol.msc > Account Policies > Account Lockout Policy',
            remediationSteps: 'Set lockout threshold: 5 attempts, duration: 30 minutes'
          },
          
          // Network Security
          {
            category: 'NETWORK_SECURITY',
            itemCode: 'NS-001',
            title: 'Enable Windows Firewall',
            description: 'Ensure Windows Defender Firewall is active for all profiles',
            isRequired: true,
            order: 4,
            verificationSteps: 'Windows Security > Firewall & network protection',
            remediationSteps: 'Enable firewall for Domain, Private, and Public networks'
          },
          {
            category: 'NETWORK_SECURITY',
            itemCode: 'NS-002',
            title: 'Disable unnecessary network services',
            description: 'Disable SMBv1 and other vulnerable protocols',
            isRequired: true,
            order: 5,
            verificationSteps: 'PowerShell: Get-WindowsOptionalFeature -Online -FeatureName SMB1Protocol',
            remediationSteps: 'Disable-WindowsOptionalFeature -Online -FeatureName SMB1Protocol'
          },
          
          // System Updates
          {
            category: 'SYSTEM_UPDATES',
            itemCode: 'SU-001',
            title: 'Enable automatic Windows Updates',
            description: 'Configure automatic security updates',
            isRequired: true,
            order: 6,
            verificationSteps: 'Settings > Windows Update > Advanced options',
            remediationSteps: 'Enable automatic updates for security patches'
          },
          {
            category: 'SYSTEM_UPDATES',
            itemCode: 'SU-002',
            title: 'Install latest security patches',
            description: 'System is fully patched with latest updates',
            isRequired: true,
            order: 7,
            verificationSteps: 'Settings > Windows Update > Update history',
            remediationSteps: 'Install all pending updates and restart'
          },
          
          // Antivirus
          {
            category: 'ANTIVIRUS',
            itemCode: 'AV-001',
            title: 'Enable Windows Defender or approved antivirus',
            description: 'Real-time protection must be active',
            isRequired: true,
            order: 8,
            verificationSteps: 'Windows Security > Virus & threat protection',
            remediationSteps: 'Enable real-time protection and cloud-delivered protection'
          },
          {
            category: 'ANTIVIRUS',
            itemCode: 'AV-002',
            title: 'Configure automatic antivirus updates',
            description: 'Ensure virus definitions are updated automatically',
            isRequired: true,
            order: 9,
            verificationSteps: 'Windows Security > Virus & threat protection > Updates',
            remediationSteps: 'Enable automatic definition updates'
          },
          
          // Access Control
          {
            category: 'ACCESS_CONTROL',
            itemCode: 'AC-001',
            title: 'Enable BitLocker drive encryption',
            description: 'Encrypt system drive with BitLocker',
            isRequired: true,
            order: 10,
            verificationSteps: 'Control Panel > BitLocker Drive Encryption',
            remediationSteps: 'Enable BitLocker for C: drive and save recovery key'
          },
          {
            category: 'ACCESS_CONTROL',
            itemCode: 'AC-002',
            title: 'Configure screen lock timeout',
            description: 'Auto-lock screen after 10 minutes of inactivity',
            isRequired: true,
            order: 11,
            verificationSteps: 'Settings > Personalization > Lock screen > Screen timeout',
            remediationSteps: 'Set screen timeout to 10 minutes'
          },
          
          // Audit Logging
          {
            category: 'AUDIT_LOGGING',
            itemCode: 'AL-001',
            title: 'Enable audit logging',
            description: 'Configure Windows audit policy for security events',
            isRequired: true,
            order: 12,
            verificationSteps: 'Run auditpol /get /category:*',
            remediationSteps: 'Enable audit logging for logon events, account management, and policy changes'
          }
        ]
      }
    }
  });

    console.log('✅ Created Windows 11 hardening template with checklist items');
  } else {
    console.log('ℹ️ Windows 11 hardening template already exists');
  }

  // Create field templates for PC asset fields
  const fieldTemplates = [
    {
      name: 'pc_selection',
      label: 'Select PC Asset',
      description: 'Choose the PC asset for this service',
      type: 'SELECT' as const,
      category: 'PC Asset',
      isRequired: true,
      placeholder: 'Select a PC asset',
      helpText: 'Choose the PC that requires service'
    },
    {
      name: 'service_type',
      label: 'Service Type',
      description: 'Type of service being performed',
      type: 'SELECT' as const,
      category: 'Service Specific',
      isRequired: true,
      options: ['Hardening', 'Maintenance', 'Repair', 'Upgrade', 'Installation', 'Audit'],
      placeholder: 'Select service type'
    },
    {
      name: 'findings',
      label: 'Findings',
      description: 'Document findings during service',
      type: 'TEXTAREA' as const,
      category: 'Service Specific',
      isRequired: false,
      placeholder: 'Enter your findings...'
    },
    {
      name: 'service_attachments',
      label: 'Service Documentation',
      description: 'Upload screenshots or documents',
      type: 'FILE' as const,
      category: 'Document',
      isRequired: false,
      helpText: 'Upload evidence, screenshots, or reports'
    }
  ];

  for (const template of fieldTemplates) {
    const existing = await prisma.fieldTemplate.findFirst({
      where: { name: template.name }
    });
    
    if (!existing) {
      await prisma.fieldTemplate.create({
        data: template
      });
      console.log(`✅ Created field template: ${template.label}`);
    } else {
      console.log(`ℹ️ Field template already exists: ${template.label}`);
    }
  }

  console.log('\n🎉 PC Management seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding PC Management data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });