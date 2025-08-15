import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedEnhancedNetworkTemplates() {
  try {
    console.log('🚀 Creating enhanced network incident templates...\n');

    // Ensure Network Infrastructure support group exists
    let networkSupportGroup = await prisma.supportGroup.upsert({
      where: { code: 'NETWORK_INFRASTRUCTURE' },
      create: {
        name: 'Network Infrastructure Team',
        code: 'NETWORK_INFRASTRUCTURE',
        description: 'Specialized team for network connectivity, infrastructure, and telecommunications support'
      },
      update: {
        name: 'Network Infrastructure Team',
        description: 'Specialized team for network connectivity, infrastructure, and telecommunications support'
      }
    });

    // Create Network Operations Center support group
    let nocSupportGroup = await prisma.supportGroup.upsert({
      where: { code: 'NETWORK_OPERATIONS_CENTER' },
      create: {
        name: 'Network Operations Center (NOC)',
        code: 'NETWORK_OPERATIONS_CENTER', 
        description: '24/7 network monitoring and incident response team'
      },
      update: {
        name: 'Network Operations Center (NOC)',
        description: '24/7 network monitoring and incident response team'
      }
    });

    console.log('✅ Created support groups: Network Infrastructure, NOC');

    // Create main category and subcategories
    let networkCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Network Infrastructure' }
    });
    
    if (!networkCategory) {
      networkCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Network Infrastructure',
          description: 'Network connectivity, telecommunications, and infrastructure services',
          level: 1,
          isActive: true
        }
      });
    } else {
      // Update existing category
      networkCategory = await prisma.serviceCategory.update({
        where: { id: networkCategory.id },
        data: {
          description: 'Network connectivity, telecommunications, and infrastructure services'
        }
      });
    }

    let connectivitySubcategory = await prisma.serviceCategory.findFirst({
      where: { 
        name: 'Network Connectivity',
        parentId: networkCategory.id
      }
    });
    
    if (!connectivitySubcategory) {
      connectivitySubcategory = await prisma.serviceCategory.create({
        data: {
          name: 'Network Connectivity',
          description: 'Internet connectivity, network access, and connection issues',
          level: 2,
          parentId: networkCategory.id,
          isActive: true
        }
      });
    } else {
      // Update existing subcategory
      connectivitySubcategory = await prisma.serviceCategory.update({
        where: { id: connectivitySubcategory.id },
        data: {
          description: 'Internet connectivity, network access, and connection issues'
        }
      });
    }

    let performanceSubcategory = await prisma.serviceCategory.findFirst({
      where: { 
        name: 'Network Performance',
        parentId: networkCategory.id
      }
    });
    
    if (!performanceSubcategory) {
      performanceSubcategory = await prisma.serviceCategory.create({
        data: {
          name: 'Network Performance', 
          description: 'Network speed, latency, and performance optimization',
          level: 2,
          parentId: networkCategory.id,
          isActive: true
        }
      });
    } else {
      // Update existing subcategory
      performanceSubcategory = await prisma.serviceCategory.update({
        where: { id: performanceSubcategory.id },
        data: {
          description: 'Network speed, latency, and performance optimization'
        }
      });
    }

    console.log('✅ Created categories: Network Infrastructure, Connectivity, Performance');

    // Enhanced Field Templates for Network Incidents
    const networkFieldTemplates = [
      // === INCIDENT IDENTIFICATION FIELDS ===
      {
        name: 'Incident Severity Level',
        fieldType: 'SELECT',
        isRequired: true,
        options: [
          'Critical - Complete outage affecting business operations',
          'High - Significant impact with degraded service',
          'Medium - Moderate impact with workarounds available', 
          'Low - Minor impact with minimal business effect'
        ],
        helpText: 'Select the business impact severity of this network incident',
        displayOrder: 1
      },
      {
        name: 'Network Incident Type',
        fieldType: 'SELECT',
        isRequired: true,
        options: [
          'Complete Network Outage',
          'Intermittent Connectivity Loss',
          'Slow Network Performance',
          'High Latency/Packet Loss',
          'DNS Resolution Issues',
          'DHCP Assignment Problems',
          'VPN Connection Failures',
          'Wireless Network Issues',
          'Equipment Hardware Failure'
        ],
        helpText: 'Categorize the specific type of network problem',
        displayOrder: 2
      },

      // === LOCATION AND EQUIPMENT FIELDS ===
      {
        name: 'Affected Network Equipment',
        fieldType: 'MULTISELECT',
        isRequired: true,
        options: [
          'Core Router',
          'Distribution Switch',
          'Access Switch',
          'Wireless Access Point',
          'Firewall',
          'Load Balancer',
          'VSAT Terminal',
          'M2M/Cellular Modem',
          'Fiber Equipment',
          'UPS/Power Equipment',
          'Network Cables',
          'Unknown/Multiple Devices'
        ],
        helpText: 'Select all network equipment involved in this incident',
        displayOrder: 3
      },
      {
        name: 'Network Media Type',
        fieldType: 'SELECT',
        isRequired: true,
        options: ['VSAT Satellite', 'M2M Cellular', 'Fiber Optic (FO)', 'Cable/DSL', 'Wireless', 'Hybrid Connection', 'Unknown'],
        helpText: 'Select the primary network connection type',
        displayOrder: 4
      },
      {
        name: 'Service Provider/Vendor',
        fieldType: 'SELECT', 
        isRequired: false,
        options: [
          'Telkomsat (VSAT)',
          'Telkom Indonesia',
          'Telkomsel',
          'Indosat Ooredoo',
          'XL Axiata',
          'Smartfren',
          'First Media',
          'Biznet Networks',
          'MNC Play',
          'Other ISP',
          'Internal Network'
        ],
        helpText: 'Select the network service provider or equipment vendor',
        displayOrder: 5
      },

      // === TECHNICAL DIAGNOSTIC FIELDS ===
      {
        name: 'Primary IP Address',
        fieldType: 'TEXT',
        isRequired: true,
        helpText: 'Enter the main IP address of the affected device or network segment',
        displayOrder: 6
      },
      {
        name: 'Secondary/Backup IP Address',
        fieldType: 'TEXT',
        isRequired: false,
        helpText: 'Enter backup or alternative IP address (if applicable)',
        displayOrder: 7
      },
      {
        name: 'Last Successful Response Time',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Last known good response time in milliseconds (e.g., 45)',
        displayOrder: 8
      },
      {
        name: 'Current Response Time',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Current measured response time in milliseconds (if available)',
        displayOrder: 9
      },
      {
        name: 'Packet Loss Percentage',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Measured packet loss percentage (0-100)',
        displayOrder: 10
      },
      {
        name: 'Network Speed Test Results',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Include download/upload speeds, latency measurements, and test timestamps',
        displayOrder: 11
      },

      // === INCIDENT TIMELINE FIELDS ===
      {
        name: 'Incident First Detected',
        fieldType: 'DATETIME',
        isRequired: true,
        helpText: 'When was this network incident first noticed or reported?',
        displayOrder: 12
      },
      {
        name: 'Last Known Working Time',
        fieldType: 'DATETIME', 
        isRequired: false,
        helpText: 'When was the network last confirmed to be working properly?',
        displayOrder: 13
      },
      {
        name: 'Estimated Downtime Duration',
        fieldType: 'SELECT',
        isRequired: false,
        options: [
          '0-15 minutes',
          '15-30 minutes', 
          '30-60 minutes',
          '1-2 hours',
          '2-4 hours',
          '4-8 hours',
          '8-24 hours',
          'More than 24 hours',
          'Unknown/Ongoing'
        ],
        helpText: 'Estimate how long the network has been affected',
        displayOrder: 14
      },

      // === USER IMPACT FIELDS ===
      {
        name: 'Number of Users Affected',
        fieldType: 'SELECT',
        isRequired: true,
        options: [
          '1-5 users',
          '6-20 users',
          '21-50 users', 
          '51-100 users',
          '101-500 users',
          'More than 500 users',
          'Entire branch/location',
          'Multiple locations'
        ],
        helpText: 'Estimate the number of users impacted by this incident',
        displayOrder: 15
      },
      {
        name: 'Business Services Impacted',
        fieldType: 'MULTISELECT',
        isRequired: true,
        options: [
          'Core Banking System Access',
          'ATM Transaction Processing',
          'Customer Service Operations',
          'Branch Teller Operations',
          'Internet Banking Services',
          'Email and Communications',
          'File Sharing and Storage',
          'Printing Services',
          'Security/Surveillance Systems',
          'POS/Payment Systems',
          'Internal Applications',
          'External Customer Services'
        ],
        helpText: 'Select all business services affected by this network issue',
        displayOrder: 16
      },
      {
        name: 'Current Workaround Status',
        fieldType: 'SELECT',
        isRequired: true,
        options: [
          'No workaround available - complete outage',
          'Partial workaround implemented',
          'Full workaround in place',
          'Backup connection activated',
          'Manual processes implemented',
          'Service temporarily suspended',
          'Alternative access method provided'
        ],
        helpText: 'Describe any temporary solutions currently in place',
        displayOrder: 17
      },

      // === DIAGNOSTIC AND ERROR FIELDS ===
      {
        name: 'Error Messages and Codes',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Copy any error messages, codes, or diagnostic information from network equipment',
        displayOrder: 18
      },
      {
        name: 'Network Diagnostic Results',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Include ping results, traceroute, nslookup, or other network diagnostic outputs',
        displayOrder: 19
      },
      {
        name: 'Equipment Status Indicators',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Describe LED indicators, display messages, or equipment status from network devices',
        displayOrder: 20
      },

      // === ENVIRONMENTAL AND EXTERNAL FACTORS ===
      {
        name: 'Weather Conditions',
        fieldType: 'SELECT',
        isRequired: false,
        options: [
          'Clear/Normal weather',
          'Heavy rain/storms',
          'Strong winds',
          'Snow/ice conditions',
          'Fog/low visibility',
          'Extreme heat',
          'Weather not a factor',
          'Unknown/Not applicable'
        ],
        helpText: 'Current weather conditions that might affect network connectivity',
        displayOrder: 21
      },
      {
        name: 'Recent Network Changes',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Describe any recent network configuration changes, equipment upgrades, or maintenance activities',
        displayOrder: 22
      },
      {
        name: 'Power Status',
        fieldType: 'SELECT',
        isRequired: false,
        options: [
          'Normal power supply',
          'Running on UPS/backup power',
          'Partial power loss',
          'Complete power outage',
          'Power fluctuations/instability',
          'Generator power active',
          'Unknown power status'
        ],
        helpText: 'Current power status of network equipment and location',
        displayOrder: 23
      },

      // === VENDOR AND ESCALATION FIELDS ===
      {
        name: 'Vendor Notification Status',
        fieldType: 'SELECT',
        isRequired: false,
        options: [
          'Vendor not yet contacted',
          'Vendor contacted - awaiting response',
          'Vendor acknowledged issue',
          'Vendor dispatched technician',
          'Vendor working on resolution',
          'Vendor escalation required',
          'Internal issue - no vendor needed'
        ],
        helpText: 'Current status of vendor communication and involvement',
        displayOrder: 24
      },
      {
        name: 'Vendor Ticket Reference',
        fieldType: 'TEXT',
        isRequired: false,
        helpText: 'Enter vendor ticket number or reference ID (if applicable)',
        displayOrder: 25
      }
    ];

    console.log('📋 Creating enhanced field templates...');

    // Create all field templates
    const createdFieldTemplates = [];
    for (const templateData of networkFieldTemplates) {
      const existingTemplate = await prisma.fieldTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (!existingTemplate) {
        const template = await prisma.fieldTemplate.create({
          data: {
            name: templateData.name,
            label: templateData.name, // Use name as label
            type: templateData.fieldType as any,
            isRequired: templateData.isRequired,
            options: templateData.options || [],
            helpText: templateData.helpText,
            isActive: true
          }
        });
        createdFieldTemplates.push(template);
        console.log(`  ✅ Created field template: ${template.name}`);
      } else {
        createdFieldTemplates.push(existingTemplate);
        console.log(`  ⚪ Field template already exists: ${templateData.name}`);
      }
    }

    // Enhanced Network Services
    const networkServices = [
      // === CRITICAL OUTAGE SERVICES ===
      {
        name: 'Critical Network Outage - Branch Complete Failure',
        description: 'Complete network connectivity failure at branch location - all systems offline',
        helpText: 'Use when entire branch has lost all network connectivity affecting all business operations. This is the highest priority network incident.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'CRITICAL',
        slaHours: 2,
        estimatedHours: 3,
        supportGroupId: nocSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type', 
          'Affected Network Equipment',
          'Network Media Type',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Secondary/Backup IP Address',
          'Incident First Detected',
          'Last Known Working Time',
          'Number of Users Affected',
          'Business Services Impacted',
          'Current Workaround Status',
          'Error Messages and Codes',
          'Network Diagnostic Results',
          'Equipment Status Indicators',
          'Weather Conditions',
          'Power Status',
          'Vendor Notification Status'
        ]
      },
      {
        name: 'ATM Network Outage - Transaction Processing Failure',
        description: 'ATM unable to process transactions due to network connectivity issues',
        helpText: 'Use when ATM cannot connect to banking network for transaction processing. High priority due to customer impact.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'HIGH',
        slaHours: 1,
        estimatedHours: 2,
        supportGroupId: nocSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type',
          'Affected Network Equipment', 
          'Network Media Type',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Incident First Detected',
          'Last Known Working Time',
          'Business Services Impacted',
          'Current Workaround Status',
          'Error Messages and Codes',
          'Equipment Status Indicators',
          'Vendor Notification Status'
        ]
      },

      // === INTERMITTENT CONNECTION SERVICES ===
      {
        name: 'Intermittent Network Connectivity Issues',
        description: 'Network connection dropping frequently or unstable connectivity patterns',
        helpText: 'Use for networks that connect and disconnect repeatedly, causing service interruptions but not complete outages.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'HIGH',
        slaHours: 4,
        estimatedHours: 3,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type',
          'Affected Network Equipment',
          'Network Media Type', 
          'Service Provider/Vendor',
          'Primary IP Address',
          'Last Successful Response Time',
          'Current Response Time',
          'Packet Loss Percentage',
          'Incident First Detected',
          'Estimated Downtime Duration',
          'Number of Users Affected',
          'Business Services Impacted',
          'Current Workaround Status',
          'Network Diagnostic Results',
          'Weather Conditions',
          'Recent Network Changes'
        ]
      },

      // === PERFORMANCE DEGRADATION SERVICES ===
      {
        name: 'Severe Network Performance Degradation',
        description: 'Network operating but with severely degraded performance affecting productivity',
        helpText: 'Use when network is functional but response times are unacceptably slow, impacting business operations.',
        categoryId: networkCategory.id,
        subcategoryId: performanceSubcategory.id,
        priority: 'HIGH',
        slaHours: 6,
        estimatedHours: 4,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type',
          'Network Media Type',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Last Successful Response Time',
          'Current Response Time',
          'Packet Loss Percentage',
          'Network Speed Test Results',
          'Incident First Detected',
          'Number of Users Affected',
          'Business Services Impacted',
          'Current Workaround Status',
          'Network Diagnostic Results',
          'Recent Network Changes'
        ]
      },
      {
        name: 'Moderate Network Slowness',
        description: 'Noticeable network performance issues but services remain functional',
        helpText: 'Use when network speed is slower than normal but not severely impacting operations.',
        categoryId: networkCategory.id,
        subcategoryId: performanceSubcategory.id,
        priority: 'MEDIUM',
        slaHours: 12,
        estimatedHours: 2,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Network Incident Type',
          'Network Media Type',
          'Service Provider/Vendor',
          'Last Successful Response Time',
          'Current Response Time',
          'Network Speed Test Results',
          'Incident First Detected',
          'Number of Users Affected',
          'Business Services Impacted',
          'Current Workaround Status',
          'Recent Network Changes'
        ]
      },

      // === VENDOR-SPECIFIC SERVICES ===
      {
        name: 'VSAT Satellite Network Issues',
        description: 'Issues specific to VSAT satellite network connectivity and performance',
        helpText: 'Use for problems specifically related to VSAT satellite network connections, including weather-related issues.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'HIGH',
        slaHours: 4,
        estimatedHours: 6,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type',
          'Affected Network Equipment',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Current Response Time',
          'Packet Loss Percentage',
          'Incident First Detected',
          'Business Services Impacted',
          'Error Messages and Codes',
          'Equipment Status Indicators',
          'Weather Conditions',
          'Power Status',
          'Vendor Notification Status',
          'Vendor Ticket Reference'
        ]
      },
      {
        name: 'M2M Cellular Network Issues',
        description: 'Issues specific to M2M cellular network connectivity and data transmission',
        helpText: 'Use for problems specifically related to M2M cellular network connections and mobile data services.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'HIGH',
        slaHours: 3,
        estimatedHours: 4,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level',
          'Network Incident Type',
          'Affected Network Equipment',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Current Response Time',
          'Incident First Detected',
          'Business Services Impacted',
          'Error Messages and Codes',
          'Equipment Status Indicators',
          'Power Status',
          'Vendor Notification Status',
          'Vendor Ticket Reference'
        ]
      },
      {
        name: 'Fiber Optic Network Issues', 
        description: 'Issues specific to fiber optic network infrastructure and connectivity',
        helpText: 'Use for problems specifically related to fiber optic network connections and infrastructure.',
        categoryId: networkCategory.id,
        subcategoryId: connectivitySubcategory.id,
        priority: 'HIGH',
        slaHours: 3,
        estimatedHours: 5,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false,
        applicableFieldTemplates: [
          'Incident Severity Level', 
          'Network Incident Type',
          'Affected Network Equipment',
          'Service Provider/Vendor',
          'Primary IP Address',
          'Current Response Time',
          'Incident First Detected',
          'Business Services Impacted',
          'Error Messages and Codes',
          'Equipment Status Indicators',
          'Recent Network Changes',
          'Vendor Notification Status',
          'Vendor Ticket Reference'
        ]
      }
    ];

    console.log('\n🔧 Creating enhanced network services...');

    // Create all network services
    for (const serviceData of networkServices) {
      const existingService = await prisma.service.findFirst({
        where: { 
          name: serviceData.name,
          categoryId: serviceData.categoryId
        }
      });

      if (!existingService) {
        const service = await prisma.service.create({
          data: {
            name: serviceData.name,
            description: serviceData.description,
            helpText: serviceData.helpText,
            categoryId: serviceData.categoryId,
            subcategoryId: serviceData.subcategoryId,
            priority: serviceData.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'URGENT',
            slaHours: serviceData.slaHours,
            estimatedHours: serviceData.estimatedHours,
            supportGroupId: serviceData.supportGroupId,
            requiresApproval: serviceData.requiresApproval,
            isConfidential: serviceData.isConfidential,
            isActive: true
          }
        });

        console.log(`  ✅ Created service: ${service.name}`);

        // Create actual ServiceField entries for backward compatibility with current ticket system
        let displayOrder = 1;
        for (const templateName of serviceData.applicableFieldTemplates) {
          const fieldTemplate = createdFieldTemplates.find(ft => ft.name === templateName);
          if (fieldTemplate) {
            // Check if ServiceField already exists
            const existingServiceField = await prisma.serviceField.findFirst({
              where: {
                serviceId: service.id,
                name: fieldTemplate.name
              }
            });

            if (!existingServiceField) {
              await prisma.serviceField.create({
                data: {
                  serviceId: service.id,
                  name: fieldTemplate.name,
                  label: fieldTemplate.label || fieldTemplate.name,
                  type: fieldTemplate.type,
                  isRequired: fieldTemplate.isRequired,
                  isUserVisible: true,
                  helpText: fieldTemplate.helpText,
                  defaultValue: fieldTemplate.defaultValue,
                  options: fieldTemplate.options || [],
                  order: displayOrder++,
                  isActive: true
                }
              });
            }

            // Also create the template link for future use
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
                  isRequired: fieldTemplate.isRequired,
                  order: displayOrder
                }
              });
            }
          }
        }

        console.log(`    📋 Linked ${serviceData.applicableFieldTemplates.length} field templates`);
      } else {
        console.log(`  ⚪ Service already exists: ${serviceData.name}`);
      }
    }

    // Create Task Templates for Network Troubleshooting
    console.log('\n📝 Creating network troubleshooting task templates...');

    const taskTemplates = [
      {
        serviceName: 'Critical Network Outage - Branch Complete Failure',
        templateName: 'Critical Network Outage Response',
        tasks: [
          { title: 'Initial Assessment', description: 'Verify the scope and severity of the network outage', estimatedMinutes: 15, order: 1 },
          { title: 'Check Physical Connections', description: 'Inspect all cable connections, power status, and equipment indicators', estimatedMinutes: 20, order: 2 },
          { title: 'Power Cycle Network Equipment', description: 'Restart routers, switches, and modems in proper sequence', estimatedMinutes: 15, order: 3 },
          { title: 'Contact ISP/Vendor', description: 'Report outage to internet service provider and obtain ticket reference', estimatedMinutes: 20, order: 4 },
          { title: 'Implement Backup Connection', description: 'Activate backup internet connection if available', estimatedMinutes: 30, order: 5 },
          { title: 'Test Core Services', description: 'Verify banking system connectivity and ATM functionality', estimatedMinutes: 20, order: 6 },
          { title: 'Update Stakeholders', description: 'Notify management and affected users of status and ETA', estimatedMinutes: 10, order: 7 },
          { title: 'Monitor Resolution', description: 'Continuously monitor vendor progress and test connectivity', estimatedMinutes: 60, order: 8 }
        ]
      },
      {
        serviceName: 'Severe Network Performance Degradation',
        templateName: 'Network Performance Investigation',
        tasks: [
          { title: 'Document Performance Metrics', description: 'Record current speeds, latency, and response times', estimatedMinutes: 15, order: 1 },
          { title: 'Run Network Diagnostics', description: 'Execute ping, traceroute, and speed tests to multiple targets', estimatedMinutes: 25, order: 2 },
          { title: 'Check Bandwidth Utilization', description: 'Monitor network traffic and identify bandwidth-heavy applications', estimatedMinutes: 20, order: 3 },
          { title: 'Review QoS Settings', description: 'Verify Quality of Service configurations and priorities', estimatedMinutes: 15, order: 4 },
          { title: 'Analyze Equipment Performance', description: 'Check CPU, memory usage on network devices', estimatedMinutes: 20, order: 5 },
          { title: 'Contact ISP for Line Testing', description: 'Request provider to test line quality and throughput', estimatedMinutes: 30, order: 6 },
          { title: 'Implement Temporary Optimization', description: 'Apply traffic shaping or priority adjustments', estimatedMinutes: 25, order: 7 }
        ]
      }
    ];

    for (const templateData of taskTemplates) {
      const service = await prisma.service.findFirst({
        where: { name: templateData.serviceName }
      });

      if (service) {
        const existingTemplate = await prisma.taskTemplate.findFirst({
          where: { 
            serviceId: service.id,
            name: templateData.templateName
          }
        });

        if (!existingTemplate) {
          const taskTemplate = await prisma.taskTemplate.create({
            data: {
              serviceId: service.id,
              name: templateData.templateName,
              description: `Standardized troubleshooting steps for ${service.name}`,
              isActive: true
            }
          });

          for (const task of templateData.tasks) {
            await prisma.taskTemplateItem.create({
              data: {
                taskTemplateId: taskTemplate.id,
                title: task.title,
                description: task.description,
                estimatedMinutes: task.estimatedMinutes,
                order: task.order,
                isRequired: true,
                isActive: true
              }
            });
          }

          console.log(`  ✅ Created task template: ${templateData.templateName} (${templateData.tasks.length} tasks)`);
        }
      }
    }

    // Print comprehensive summary
    console.log('\n🎯 ENHANCED NETWORK TEMPLATES SUMMARY:');
    console.log('=====================================');
    
    const totalServices = await prisma.service.count({
      where: { categoryId: networkCategory.id }
    });
    const totalFieldTemplates = await prisma.fieldTemplate.count({
      where: { name: { in: networkFieldTemplates.map(t => t.name) } }
    });
    const totalTaskTemplates = await prisma.taskTemplate.count({
      where: { service: { categoryId: networkCategory.id } }
    });

    console.log(`📊 Services Created: ${totalServices}`);
    console.log(`📋 Field Templates: ${totalFieldTemplates} (25 comprehensive fields)`);
    console.log(`📝 Task Templates: ${totalTaskTemplates} with detailed troubleshooting steps`);
    console.log(`👥 Support Groups: Network Infrastructure Team, NOC`);
    console.log(`📂 Categories: Network Infrastructure → Connectivity & Performance`);
    
    console.log('\n🔧 SERVICE PRIORITIES & SLAs:');
    console.log('  🚨 Critical Outage: 2hr SLA');
    console.log('  🔥 ATM Outage: 1hr SLA');
    console.log('  ⚡ Severe Performance: 6hr SLA');
    console.log('  📶 Vendor-specific: 3-4hr SLA');

    console.log('\n📋 COMPREHENSIVE FIELD COVERAGE:');
    console.log('  • Incident identification & classification');
    console.log('  • Equipment & infrastructure details');
    console.log('  • Technical diagnostics & measurements');
    console.log('  • Timeline & impact assessment');
    console.log('  • User & business impact tracking');
    console.log('  • Environmental factors (weather, power)');
    console.log('  • Vendor communication & escalation');

    console.log('\n✅ All network incident templates created successfully!');
    console.log('🚀 Ready for comprehensive network incident management!');

  } catch (error) {
    console.error('❌ Error creating enhanced network templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedEnhancedNetworkTemplates();