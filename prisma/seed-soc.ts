import { PrismaClient, FieldType } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSOC() {
  console.log('🔒 Starting SOC seed...');

  try {
    // 1. Create or get SECURITY_OPS support group
    console.log('Creating SOC support group...');
    let supportGroup = await prisma.supportGroup.findUnique({
      where: { code: 'SECURITY_OPS' }
    });

    if (!supportGroup) {
      supportGroup = await prisma.supportGroup.create({
        data: {
          code: 'SECURITY_OPS',
          name: 'Security Operations Center',
          description: '24/7 security monitoring and incident response team',
          isActive: true
        }
      });
      console.log('✅ Created SECURITY_OPS support group');
    } else {
      console.log('✅ SECURITY_OPS support group already exists');
    }

    // 2. Create 3-tier category structure
    console.log('Creating SOC category structure...');

    // Level 1 - Main Category
    let mainCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Security Operations Center (SOC)', level: 1 }
    });

    if (!mainCategory) {
      mainCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Security Operations Center (SOC)',
          description: 'Security monitoring, incident detection, and threat response',
          level: 1,
          isActive: true
        }
      });
      console.log('✅ Created main SOC category');
    }

    // Level 2 - Subcategories
    const subcategories = [
      { name: 'Endpoint Detection', description: 'ENDS alerts and endpoint security' },
      { name: 'Network Security', description: 'Network-based threats and anomalies' },
      { name: 'Identity & Access', description: 'Authentication and authorization issues' },
      { name: 'Data Security', description: 'Data protection and privacy incidents' },
      { name: 'Application Security', description: 'Application-level threats' }
    ];

    const createdSubcategories: any = {};

    for (const subcat of subcategories) {
      let subcategory = await prisma.serviceCategory.findFirst({
        where: { name: subcat.name, level: 2, parentId: mainCategory.id }
      });

      if (!subcategory) {
        subcategory = await prisma.serviceCategory.create({
          data: {
            ...subcat,
            level: 2,
            parentId: mainCategory.id,
            isActive: true
          }
        });
        console.log(`✅ Created subcategory: ${subcat.name}`);
      }
      createdSubcategories[subcat.name] = subcategory;
    }

    // Level 3 - Items
    const items = {
      'Endpoint Detection': [
        { name: 'Linux Security Events', code: 'LIN' },
        { name: 'Windows Security Events', code: 'WIN' },
        { name: 'Mac Security Events', code: 'MAC' },
        { name: 'Mobile Device Security', code: 'MOB' }
      ],
      'Network Security': [
        { name: 'Firewall Alerts', code: 'FW' },
        { name: 'Intrusion Detection', code: 'IDS' },
        { name: 'DDoS Attacks', code: 'DDOS' },
        { name: 'Suspicious Traffic', code: 'TRAFFIC' }
      ],
      'Identity & Access': [
        { name: 'Privilege Escalation', code: 'PE-TA0004' },
        { name: 'Unauthorized Access', code: 'UA' },
        { name: 'Account Compromise', code: 'AC' },
        { name: 'Authentication Anomaly', code: 'AUTH' }
      ],
      'Data Security': [
        { name: 'Data Exfiltration', code: 'EXFIL' },
        { name: 'Data Loss Prevention', code: 'DLP' },
        { name: 'Encryption Violations', code: 'ENCRYPT' },
        { name: 'Sensitive Data Exposure', code: 'SDE' }
      ],
      'Application Security': [
        { name: 'Web Application Attacks', code: 'WAF' },
        { name: 'API Security', code: 'API' },
        { name: 'Code Injection', code: 'INJECT' },
        { name: 'Application Vulnerabilities', code: 'VULN' }
      ]
    };

    let linuxSecurityItem: any;

    for (const [subcatName, itemList] of Object.entries(items)) {
      const parentSubcat = createdSubcategories[subcatName];
      
      for (const item of itemList) {
        let categoryItem = await prisma.serviceCategory.findFirst({
          where: { 
            name: item.name, 
            level: 3, 
            parentId: parentSubcat.id 
          }
        });

        if (!categoryItem) {
          categoryItem = await prisma.serviceCategory.create({
            data: {
              name: item.name,
              description: `${item.name} (${item.code})`,
              level: 3,
              parentId: parentSubcat.id,
              isActive: true
            }
          });
          console.log(`✅ Created item: ${item.name}`);
        }

        // Save Linux Security Events for later use
        if (item.name === 'Linux Security Events') {
          linuxSecurityItem = categoryItem;
        }
      }
    }

    // 3. Create Field Templates
    console.log('Creating SOC field templates...');

    const fieldTemplates = [
      {
        name: 'soc_date_time',
        label: 'Date/Time of Incident',
        type: FieldType.TEXT,
        isRequired: true,
        placeholder: 'DD/MM/YYYY HH:MM:SS',
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_severity',
        label: 'Severity',
        type: FieldType.SELECT,
        isRequired: true,
        options: ['Critical', 'High', 'Medium', 'Low', 'Informational'],
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_first_action',
        label: 'First Action Needed',
        type: FieldType.SELECT,
        isRequired: true,
        options: ['Validasi', 'Isolasi', 'Investigasi', 'Mitigasi', 'Monitoring'],
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_case_id_lr',
        label: 'Case ID LR',
        type: FieldType.TEXT,
        isRequired: false,
        placeholder: 'Leave blank if not applicable',
        category: 'SOC Reference IDs'
      },
      {
        name: 'soc_ultima_id',
        label: 'Ultima ID',
        type: FieldType.TEXT,
        isRequired: true,
        placeholder: 'ABC-DEF-MMYYYY-XXXXX',
        category: 'SOC Reference IDs'
      },
      {
        name: 'soc_incident_type',
        label: 'Incident Type',
        type: FieldType.TEXT,
        isRequired: true,
        placeholder: 'e.g., ENDS: LIN: PE-TA0004: Description',
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_ip_host_origin',
        label: 'IP/Host Origin',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Network Details'
      },
      {
        name: 'soc_user_origin',
        label: 'User Origin',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC User Details'
      },
      {
        name: 'soc_ip_host_impacted',
        label: 'IP/Host Impacted',
        type: FieldType.TEXT,
        isRequired: true,
        category: 'SOC Network Details'
      },
      {
        name: 'soc_user_impacted',
        label: 'User Impacted',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC User Details'
      },
      {
        name: 'soc_log_source',
        label: 'Log Source',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Technical Details'
      },
      {
        name: 'soc_status_ticket',
        label: 'Status Ticket',
        type: FieldType.SELECT,
        isRequired: true,
        options: ['New', 'In Progress', 'Validated', 'False Positive', 'Resolved'],
        defaultValue: 'New',
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_port',
        label: 'Port',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Network Details'
      },
      {
        name: 'soc_classification',
        label: 'Classification',
        type: FieldType.SELECT,
        isRequired: true,
        options: ['Activity', 'Attack', 'Vulnerability', 'Policy Violation', 'Anomaly'],
        category: 'SOC Incident Details'
      },
      {
        name: 'soc_url',
        label: 'URL',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Network Details'
      },
      {
        name: 'soc_file_process',
        label: 'File/Process',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Technical Details'
      },
      {
        name: 'soc_file_path',
        label: 'File Path',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Technical Details'
      },
      {
        name: 'soc_action',
        label: 'Action',
        type: FieldType.TEXT,
        isRequired: false,
        category: 'SOC Technical Details'
      },
      {
        name: 'soc_description',
        label: 'Description',
        type: FieldType.TEXTAREA,
        isRequired: true,
        placeholder: 'Detailed description of the security incident',
        category: 'SOC Incident Description'
      },
      {
        name: 'soc_recommendations',
        label: 'Recommendations',
        type: FieldType.TEXTAREA,
        isRequired: true,
        placeholder: 'List recommended actions numbered 1, 2, 3...',
        category: 'SOC Response'
      }
    ];

    const createdFieldTemplates: any[] = [];

    for (const template of fieldTemplates) {
      let fieldTemplate = await prisma.fieldTemplate.findUnique({
        where: { name: template.name }
      });

      if (!fieldTemplate) {
        fieldTemplate = await prisma.fieldTemplate.create({
          data: {
            name: template.name,
            label: template.label,
            description: `SOC Field: ${template.label}`,
            type: template.type,
            isRequired: template.isRequired,
            placeholder: template.placeholder,
            options: template.options,
            defaultValue: template.defaultValue,
            category: template.category,
            isActive: true
          }
        });
        console.log(`✅ Created field template: ${template.name}`);
      }
      createdFieldTemplates.push(fieldTemplate);
    }

    // 4. Create SOC Service
    console.log('Creating SOC service...');

    let socService = await prisma.service.findFirst({
      where: { name: 'SOC Security Incident' }
    });

    if (!socService) {
      socService = await prisma.service.create({
        data: {
          name: 'SOC Security Incident',
          description: 'Security incidents detected by SOC monitoring tools',
          helpText: 'This service is for security incidents detected by the Security Operations Center. All incidents are confidential and handled by the security team.',
          categoryId: linuxSecurityItem.id,
          supportGroupId: supportGroup.id,
          priority: 'HIGH',
          estimatedHours: 4,
          slaHours: 1, // 1 hour for high priority
          requiresApproval: false,
          isConfidential: true,
          defaultTitle: 'SOC Alert: [Incident Type]',
          defaultItilCategory: 'INCIDENT',
          defaultIssueClassification: 'SECURITY_INCIDENT',
          isActive: true
        }
      });
      console.log('✅ Created SOC service');
    }

    // 5. Link field templates to service
    console.log('Linking field templates to SOC service...');

    let order = 0;
    for (const fieldTemplate of createdFieldTemplates) {
      const existingLink = await prisma.serviceFieldTemplate.findUnique({
        where: {
          serviceId_fieldTemplateId: {
            serviceId: socService.id,
            fieldTemplateId: fieldTemplate.id
          }
        }
      });

      if (!existingLink) {
        await prisma.serviceFieldTemplate.create({
          data: {
            serviceId: socService.id,
            fieldTemplateId: fieldTemplate.id,
            order: order++,
            isRequired: fieldTemplate.isRequired,
            isUserVisible: false, // Only visible to security analysts
          }
        });
        console.log(`✅ Linked field: ${fieldTemplate.name}`);
      }
    }

    // 6. Create Task Template
    console.log('Creating SOC incident response task template...');

    let taskTemplate = await prisma.taskTemplate.findFirst({
      where: { name: 'SOC Incident Response Playbook' }
    });

    if (!taskTemplate) {
      taskTemplate = await prisma.taskTemplate.create({
        data: {
          name: 'SOC Incident Response Playbook',
          description: 'Standard operating procedure for SOC security incidents',
          serviceId: socService.id,
          isActive: true
        }
      });

      // Create task items
      const tasks = [
        { title: 'Initial Alert Validation', description: 'Verify the alert is legitimate and not a false positive', estimatedMinutes: 15 },
        { title: 'Asset Identification', description: 'Identify and document all affected systems/users', estimatedMinutes: 10 },
        { title: 'Threat Classification', description: 'Classify the threat type and attack vector', estimatedMinutes: 20 },
        { title: 'Initial Containment', description: 'Implement immediate containment measures if needed', estimatedMinutes: 30 },
        { title: 'Evidence Collection', description: 'Collect logs, screenshots, and forensic data', estimatedMinutes: 45 },
        { title: 'Impact Analysis', description: 'Assess the scope and impact of the incident', estimatedMinutes: 30 },
        { title: 'Remediation Actions', description: 'Execute remediation based on SOC recommendations', estimatedMinutes: 60 },
        { title: 'User Communication', description: 'Notify affected users and stakeholders', estimatedMinutes: 15 },
        { title: 'Security Hardening', description: 'Implement additional security measures', estimatedMinutes: 45 },
        { title: 'Documentation & Closure', description: 'Complete incident report and update knowledge base', estimatedMinutes: 30 }
      ];

      for (let i = 0; i < tasks.length; i++) {
        await prisma.taskTemplateItem.create({
          data: {
            ...tasks[i],
            taskTemplateId: taskTemplate.id,
            isRequired: true,
            order: i
          }
        });
      }
      console.log('✅ Created SOC task template with 10 items');
    }

    // 7. Optional: Create a sample security analyst user
    const existingAnalyst = await prisma.user.findUnique({
      where: { email: 'soc.analyst@banksulutgo.co.id' }
    });

    if (!existingAnalyst) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('SecureP@ss2025!', 10);

      await prisma.user.create({
        data: {
          email: 'soc.analyst@banksulutgo.co.id',
          name: 'SOC Analyst',
          password: hashedPassword,
          role: 'SECURITY_ANALYST',
          supportGroupId: supportGroup.id,
          isActive: true
        }
      });
      console.log('✅ Created sample SOC analyst user');
    }

    console.log('\n🎉 SOC seed completed successfully!');
    console.log('\nSOC System Summary:');
    console.log('- Support Group: SECURITY_OPS');
    console.log('- Categories: 5 subcategories, 20 items');
    console.log('- Field Templates: 20 custom fields');
    console.log('- Service: SOC Security Incident');
    console.log('- Task Template: 10-step incident response playbook');
    console.log('- Sample User: soc.analyst@banksulutgo.co.id');

  } catch (error) {
    console.error('❌ Error during SOC seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedSOC()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });