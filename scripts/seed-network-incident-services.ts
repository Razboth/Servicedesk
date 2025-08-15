import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNetworkIncidentServices() {
  try {
    console.log('Creating network incident service categories and items...');

    // Find or create IT Support support group
    let itSupportGroup = await prisma.supportGroup.findUnique({
      where: { code: 'IT_SUPPORT' }
    });

    if (!itSupportGroup) {
      itSupportGroup = await prisma.supportGroup.create({
        data: {
          name: 'IT Support',
          code: 'IT_SUPPORT',
          description: 'General IT Support and Infrastructure'
        }
      });
      console.log('Created IT Support support group');
    }

    // Find or create Network Infrastructure support group
    let networkSupportGroup = await prisma.supportGroup.findUnique({
      where: { code: 'NETWORK_INFRASTRUCTURE' }
    });

    if (!networkSupportGroup) {
      networkSupportGroup = await prisma.supportGroup.create({
        data: {
          name: 'Network Infrastructure',
          code: 'NETWORK_INFRASTRUCTURE',
          description: 'Network Infrastructure and Connectivity Support'
        }
      });
      console.log('Created Network Infrastructure support group');
    }

    // Create main category: Network Infrastructure
    let networkCategory = await prisma.serviceCategory.findFirst({
      where: { name: 'Network Infrastructure', level: 1 }
    });

    if (!networkCategory) {
      networkCategory = await prisma.serviceCategory.create({
        data: {
          name: 'Network Infrastructure',
          description: 'Network connectivity and infrastructure services',
          level: 1,
          isActive: true
        }
      });
      console.log('Created Network Infrastructure category');
    }

    // Create subcategory: Network Incidents
    let incidentSubcategory = await prisma.serviceCategory.findFirst({
      where: { 
        name: 'Network Incidents', 
        level: 2,
        parentId: networkCategory.id 
      }
    });

    if (!incidentSubcategory) {
      incidentSubcategory = await prisma.serviceCategory.create({
        data: {
          name: 'Network Incidents',
          description: 'Network connectivity issues and outages',
          level: 2,
          parentId: networkCategory.id,
          isActive: true
        }
      });
      console.log('Created Network Incidents subcategory');
    }

    // Create service items for different types of network incidents
    const networkServices = [
      {
        name: 'Branch Network Outage',
        description: 'Complete network outage at branch location - no connectivity',
        helpText: 'Use this service when a branch has completely lost network connectivity and cannot access any systems.',
        priority: 'HIGH',
        slaHours: 4,
        estimatedHours: 2,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'ATM Network Outage',
        description: 'ATM unable to connect to network - transaction failures',
        helpText: 'Use this service when an ATM cannot establish network connection and is unable to process transactions.',
        priority: 'HIGH',
        slaHours: 2,
        estimatedHours: 1,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'Slow Network Performance',
        description: 'Network connectivity is available but experiencing slow response times',
        helpText: 'Use this service when network is functional but experiencing degraded performance (high latency, slow responses).',
        priority: 'MEDIUM',
        slaHours: 8,
        estimatedHours: 2,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'Intermittent Network Issues',
        description: 'Network connectivity dropping intermittently - unstable connection',
        helpText: 'Use this service when network connection is unstable with frequent disconnections or timeouts.',
        priority: 'MEDIUM',
        slaHours: 8,
        estimatedHours: 3,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'VSAT Network Issues',
        description: 'Issues specific to VSAT satellite network connectivity',
        helpText: 'Use this service for problems specifically related to VSAT satellite network connections.',
        priority: 'HIGH',
        slaHours: 6,
        estimatedHours: 4,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'M2M Network Issues',
        description: 'Issues specific to M2M cellular network connectivity',
        helpText: 'Use this service for problems specifically related to M2M cellular network connections.',
        priority: 'HIGH',
        slaHours: 4,
        estimatedHours: 2,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      },
      {
        name: 'Fiber Optic Network Issues',
        description: 'Issues specific to fiber optic network connectivity',
        helpText: 'Use this service for problems specifically related to fiber optic network connections.',
        priority: 'HIGH',
        slaHours: 4,
        estimatedHours: 3,
        supportGroupId: networkSupportGroup.id,
        requiresApproval: false,
        isConfidential: false
      }
    ];

    for (const serviceData of networkServices) {
      // Check if service already exists
      const existingService = await prisma.service.findFirst({
        where: { 
          name: serviceData.name,
          categoryId: networkCategory.id
        }
      });

      if (!existingService) {
        const service = await prisma.service.create({
          data: {
            ...serviceData,
            categoryId: networkCategory.id,
            subcategoryId: incidentSubcategory.id,
            priority: serviceData.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
            isActive: true
          }
        });
        console.log(`Created service: ${service.name}`);
      } else {
        console.log(`Service already exists: ${serviceData.name}`);
      }
    }

    // Create field templates for network incident tickets
    console.log('\nCreating field templates for network incident services...');
    
    const fieldTemplates = [
      {
        name: 'Network Equipment Type',
        fieldType: 'SELECT',
        isRequired: true,
        options: ['Router', 'Switch', 'Modem', 'VSAT Terminal', 'M2M Device', 'Fiber Equipment', 'Unknown'],
        helpText: 'Select the type of network equipment involved in the incident',
        displayOrder: 1
      },
      {
        name: 'Network Media',
        fieldType: 'SELECT',
        isRequired: true,
        options: ['VSAT', 'M2M', 'Fiber Optic (FO)', 'Unknown'],
        helpText: 'Select the type of network connection media',
        displayOrder: 2
      },
      {
        name: 'Network Vendor',
        fieldType: 'SELECT',
        isRequired: false,
        options: ['Telkomsat', 'Telkom', 'Telkomsel', 'Indosat', 'XL Axiata', 'Other'],
        helpText: 'Select the network service provider',
        displayOrder: 3
      },
      {
        name: 'IP Address',
        fieldType: 'TEXT',
        isRequired: true,
        helpText: 'Enter the IP address of the affected device',
        displayOrder: 4
      },
      {
        name: 'Last Known Response Time',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Last recorded response time in milliseconds (if available)',
        displayOrder: 5
      },
      {
        name: 'Packet Loss Percentage',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Packet loss percentage (0-100)',
        displayOrder: 6
      },
      {
        name: 'Error Details',
        fieldType: 'TEXTAREA',
        isRequired: false,
        helpText: 'Detailed error messages or diagnostic information',
        displayOrder: 7
      },
      {
        name: 'Business Impact',
        fieldType: 'SELECT',
        isRequired: true,
        options: ['Critical - Branch/ATM completely down', 'High - Significant service degradation', 'Medium - Minor impact on operations', 'Low - No immediate business impact'],
        helpText: 'Select the business impact of this network incident',
        displayOrder: 8
      },
      {
        name: 'Users Affected',
        fieldType: 'NUMBER',
        isRequired: false,
        helpText: 'Estimated number of users affected by this incident',
        displayOrder: 9
      },
      {
        name: 'Incident First Detected',
        fieldType: 'DATETIME',
        isRequired: true,
        helpText: 'When was this network incident first detected?',
        displayOrder: 10
      }
    ];

    for (const templateData of fieldTemplates) {
      // Check if template already exists
      const existingTemplate = await prisma.fieldTemplate.findFirst({
        where: { name: templateData.name }
      });

      if (!existingTemplate) {
        const template = await prisma.fieldTemplate.create({
          data: {
            name: templateData.name,
            fieldType: templateData.fieldType as any,
            isRequired: templateData.isRequired,
            options: templateData.options || [],
            helpText: templateData.helpText,
            displayOrder: templateData.displayOrder,
            isActive: true
          }
        });
        console.log(`Created field template: ${template.name}`);
        
        // Link this field template to all network incident services
        const networkServices = await prisma.service.findMany({
          where: {
            categoryId: networkCategory.id
          }
        });

        for (const service of networkServices) {
          // Check if link already exists
          const existingLink = await prisma.serviceField.findFirst({
            where: {
              serviceId: service.id,
              fieldTemplateId: template.id
            }
          });

          if (!existingLink) {
            await prisma.serviceField.create({
              data: {
                serviceId: service.id,
                fieldTemplateId: template.id,
                isRequired: template.isRequired,
                displayOrder: template.displayOrder
              }
            });
          }
        }
      } else {
        console.log(`Field template already exists: ${templateData.name}`);
      }
    }

    console.log('\n✅ Network incident services and field templates created successfully!');

    // Print summary
    const totalNetworkServices = await prisma.service.count({
      where: { categoryId: networkCategory.id }
    });
    const totalFieldTemplates = await prisma.fieldTemplate.count();

    console.log(`\n📊 Summary:`);
    console.log(`- Network services created: ${totalNetworkServices}`);
    console.log(`- Total field templates: ${totalFieldTemplates}`);
    console.log(`- Support groups: IT Support, Network Infrastructure`);
    console.log(`- Category: Network Infrastructure`);
    console.log(`- Subcategory: Network Incidents`);

  } catch (error) {
    console.error('Error seeding network incident services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNetworkIncidentServices();