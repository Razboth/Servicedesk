const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedTaskTemplates() {
  console.log('Creating sample task templates...')

  try {
    // Get some common services to create templates for
    const services = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'Password Reset' } },
          { name: { contains: 'ATM Technical Issue' } },
          { name: { contains: 'BSGTouch' } },
          { name: { contains: 'Network' } },
          { name: { contains: 'Hardware' } },
          { name: { contains: 'Software Installation' } },
          { name: { contains: 'New User' } },
          { name: { contains: 'Kasda' } }
        ]
      },
      take: 10
    })

    console.log(`Found ${services.length} services to create templates for`)

    // Sample task templates based on ITIL best practices
    const taskTemplates = [
      {
        serviceName: 'Password Reset',
        template: {
          name: 'Standard Password Reset Process',
          description: 'Standardized workflow for password reset requests following security protocols',
          items: [
            {
              title: 'Verify User Identity',
              description: 'Confirm user identity through employee ID, supervisor verification, or security questions',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check User Account Status',
              description: 'Verify account is active and not locked for security reasons',
              estimatedMinutes: 3,
              isRequired: true,
              order: 2
            },
            {
              title: 'Reset Password in System',
              description: 'Use appropriate system (AD, Core Banking, etc.) to reset password',
              estimatedMinutes: 5,
              isRequired: true,
              order: 3
            },
            {
              title: 'Document Reset in Log',
              description: 'Record password reset in security log with timestamp and technician ID',
              estimatedMinutes: 2,
              isRequired: true,
              order: 4
            },
            {
              title: 'Notify User',
              description: 'Inform user of successful reset and provide temporary password if applicable',
              estimatedMinutes: 3,
              isRequired: true,
              order: 5
            },
            {
              title: 'Verify First Login',
              description: 'Confirm user can login successfully and has changed temporary password',
              estimatedMinutes: 5,
              isRequired: false,
              order: 6
            }
          ]
        }
      },
      {
        serviceName: 'ATM Technical Issue',
        template: {
          name: 'ATM Troubleshooting Workflow',
          description: 'Standard procedure for diagnosing and resolving ATM technical issues',
          items: [
            {
              title: 'Remote Diagnostics',
              description: 'Connect to ATM remotely and check system status, error logs, and connectivity',
              estimatedMinutes: 15,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check Network Connectivity',
              description: 'Verify network connection, ping tests, and check for firewall issues',
              estimatedMinutes: 10,
              isRequired: true,
              order: 2
            },
            {
              title: 'Review Transaction Logs',
              description: 'Check recent transaction logs for errors or patterns indicating the issue',
              estimatedMinutes: 10,
              isRequired: true,
              order: 3
            },
            {
              title: 'Contact ATM Vendor Support',
              description: 'If hardware issue suspected, contact vendor support for assistance',
              estimatedMinutes: 20,
              isRequired: false,
              order: 4
            },
            {
              title: 'Schedule On-Site Visit',
              description: 'If remote resolution not possible, coordinate technician visit',
              estimatedMinutes: 10,
              isRequired: false,
              order: 5
            },
            {
              title: 'Test ATM Functionality',
              description: 'Perform test transactions to verify issue is resolved',
              estimatedMinutes: 10,
              isRequired: true,
              order: 6
            },
            {
              title: 'Update ATM Status',
              description: 'Update ATM monitoring system with current status',
              estimatedMinutes: 5,
              isRequired: true,
              order: 7
            }
          ]
        }
      },
      {
        serviceName: 'BSGTouch',
        template: {
          name: 'Mobile Banking Support Process',
          description: 'Standard support process for BSGTouch mobile banking issues',
          items: [
            {
              title: 'Identify Issue Type',
              description: 'Determine if issue is login, registration, transaction, or app functionality',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check User Profile',
              description: 'Verify user mobile banking profile status and registration details',
              estimatedMinutes: 5,
              isRequired: true,
              order: 2
            },
            {
              title: 'Verify Device Compatibility',
              description: 'Check if user device meets minimum requirements (OS version, app version)',
              estimatedMinutes: 3,
              isRequired: true,
              order: 3
            },
            {
              title: 'Reset Mobile Banking Access',
              description: 'If needed, reset user access or re-send activation code',
              estimatedMinutes: 10,
              isRequired: false,
              order: 4
            },
            {
              title: 'Guide Through Troubleshooting',
              description: 'Walk user through app reinstall, cache clearing, or other fixes',
              estimatedMinutes: 15,
              isRequired: false,
              order: 5
            },
            {
              title: 'Test Transaction',
              description: 'Have user perform test transaction to verify functionality',
              estimatedMinutes: 5,
              isRequired: true,
              order: 6
            }
          ]
        }
      },
      {
        serviceName: 'Network',
        template: {
          name: 'Network Issue Resolution',
          description: 'Systematic approach to diagnose and resolve network connectivity issues',
          items: [
            {
              title: 'Identify Affected Scope',
              description: 'Determine if issue affects single user, department, branch, or multiple locations',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check Network Equipment',
              description: 'Verify status of switches, routers, and access points in affected area',
              estimatedMinutes: 10,
              isRequired: true,
              order: 2
            },
            {
              title: 'Perform Connectivity Tests',
              description: 'Run ping, traceroute, and bandwidth tests to isolate issue',
              estimatedMinutes: 10,
              isRequired: true,
              order: 3
            },
            {
              title: 'Check ISP Status',
              description: 'Verify with ISP if there are any known outages or issues',
              estimatedMinutes: 10,
              isRequired: false,
              order: 4
            },
            {
              title: 'Apply Configuration Fix',
              description: 'Make necessary configuration changes to resolve issue',
              estimatedMinutes: 15,
              isRequired: false,
              order: 5
            },
            {
              title: 'Monitor Network Stability',
              description: 'Monitor network for 15-30 minutes to ensure stable connection',
              estimatedMinutes: 20,
              isRequired: true,
              order: 6
            },
            {
              title: 'Document Root Cause',
              description: 'Document the root cause and resolution steps taken',
              estimatedMinutes: 10,
              isRequired: true,
              order: 7
            }
          ]
        }
      },
      {
        serviceName: 'Hardware',
        template: {
          name: 'Hardware Troubleshooting Process',
          description: 'Standard process for diagnosing and resolving hardware issues',
          items: [
            {
              title: 'Initial Diagnostics',
              description: 'Gather symptoms, error messages, and when issue started',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Remote Diagnostics',
              description: 'If possible, run remote diagnostic tools to check hardware status',
              estimatedMinutes: 10,
              isRequired: false,
              order: 2
            },
            {
              title: 'Check Warranty Status',
              description: 'Verify if hardware is under warranty or service contract',
              estimatedMinutes: 5,
              isRequired: true,
              order: 3
            },
            {
              title: 'Backup User Data',
              description: 'If possible, backup critical user data before hardware intervention',
              estimatedMinutes: 30,
              isRequired: false,
              order: 4
            },
            {
              title: 'Hardware Replacement/Repair',
              description: 'Replace faulty component or arrange for repair service',
              estimatedMinutes: 60,
              isRequired: false,
              order: 5
            },
            {
              title: 'Test Hardware Functionality',
              description: 'Run diagnostics to ensure hardware is functioning properly',
              estimatedMinutes: 15,
              isRequired: true,
              order: 6
            },
            {
              title: 'Update Asset Database',
              description: 'Update asset management system with hardware changes',
              estimatedMinutes: 5,
              isRequired: true,
              order: 7
            }
          ]
        }
      },
      {
        serviceName: 'Software Installation',
        template: {
          name: 'Software Installation Procedure',
          description: 'Standardized process for software installation requests',
          items: [
            {
              title: 'Verify Software License',
              description: 'Confirm valid license is available for requested software',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check System Requirements',
              description: 'Verify target computer meets minimum system requirements',
              estimatedMinutes: 5,
              isRequired: true,
              order: 2
            },
            {
              title: 'Manager Approval Check',
              description: 'Confirm manager has approved software installation request',
              estimatedMinutes: 5,
              isRequired: true,
              order: 3
            },
            {
              title: 'Backup System',
              description: 'Create system restore point before installation',
              estimatedMinutes: 10,
              isRequired: true,
              order: 4
            },
            {
              title: 'Install Software',
              description: 'Perform software installation following vendor guidelines',
              estimatedMinutes: 30,
              isRequired: true,
              order: 5
            },
            {
              title: 'Configure Software',
              description: 'Configure software settings according to bank standards',
              estimatedMinutes: 15,
              isRequired: true,
              order: 6
            },
            {
              title: 'Test Functionality',
              description: 'Test basic software functionality with user',
              estimatedMinutes: 10,
              isRequired: true,
              order: 7
            },
            {
              title: 'Update Software Inventory',
              description: 'Record installation in software asset management system',
              estimatedMinutes: 5,
              isRequired: true,
              order: 8
            }
          ]
        }
      },
      {
        serviceName: 'New User',
        template: {
          name: 'New User Account Creation',
          description: 'Complete process for creating new user accounts and access',
          items: [
            {
              title: 'Verify HR Documentation',
              description: 'Confirm new employee documentation and approval from HR',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Create AD Account',
              description: 'Create Active Directory account with appropriate group memberships',
              estimatedMinutes: 10,
              isRequired: true,
              order: 2
            },
            {
              title: 'Create Email Account',
              description: 'Set up email account and configure mailbox settings',
              estimatedMinutes: 10,
              isRequired: true,
              order: 3
            },
            {
              title: 'Core Banking Access',
              description: 'Create user profile in core banking system with appropriate roles',
              estimatedMinutes: 15,
              isRequired: true,
              order: 4
            },
            {
              title: 'Assign Hardware',
              description: 'Allocate and configure computer, phone, and other required hardware',
              estimatedMinutes: 30,
              isRequired: true,
              order: 5
            },
            {
              title: 'Install Required Software',
              description: 'Install standard software package based on user role',
              estimatedMinutes: 45,
              isRequired: true,
              order: 6
            },
            {
              title: 'Security Training Schedule',
              description: 'Schedule mandatory security awareness training',
              estimatedMinutes: 5,
              isRequired: true,
              order: 7
            },
            {
              title: 'Welcome Package',
              description: 'Provide IT welcome package with policies and helpdesk contact',
              estimatedMinutes: 5,
              isRequired: true,
              order: 8
            }
          ]
        }
      },
      {
        serviceName: 'Kasda',
        template: {
          name: 'Kasda Troubleshooting Process',
          description: 'Standard process for resolving Kasda system issues',
          items: [
            {
              title: 'Identify Error Type',
              description: 'Determine specific Kasda error (login, transaction, approval, etc.)',
              estimatedMinutes: 5,
              isRequired: true,
              order: 1
            },
            {
              title: 'Check User Permissions',
              description: 'Verify user has correct roles and permissions in Kasda',
              estimatedMinutes: 5,
              isRequired: true,
              order: 2
            },
            {
              title: 'Token Verification',
              description: 'Check if user token is active and synchronized',
              estimatedMinutes: 5,
              isRequired: true,
              order: 3
            },
            {
              title: 'Clear Browser Cache',
              description: 'Guide user to clear browser cache and cookies',
              estimatedMinutes: 5,
              isRequired: false,
              order: 4
            },
            {
              title: 'Reset User Session',
              description: 'If needed, reset user session in Kasda backend',
              estimatedMinutes: 10,
              isRequired: false,
              order: 5
            },
            {
              title: 'Test Transaction',
              description: 'Perform test transaction to verify issue resolution',
              estimatedMinutes: 10,
              isRequired: true,
              order: 6
            },
            {
              title: 'Escalate to Vendor',
              description: 'If unresolved, escalate to Kasda vendor support',
              estimatedMinutes: 20,
              isRequired: false,
              order: 7
            }
          ]
        }
      }
    ]

    // Create task templates for each service
    for (const { serviceName, template } of taskTemplates) {
      const service = services.find(s => s.name.includes(serviceName))
      
      if (service) {
        console.log(`Creating task template for service: ${service.name}`)
        
        try {
          await prisma.taskTemplate.create({
            data: {
              name: template.name,
              description: template.description,
              serviceId: service.id,
              items: {
                create: template.items
              }
            }
          })
          console.log(`✓ Created template: ${template.name}`)
        } catch (error) {
          console.log(`Template might already exist for ${service.name}, skipping...`)
        }
      }
    }

    console.log('Task template seeding completed!')
  } catch (error) {
    console.error('Error seeding task templates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding
seedTaskTemplates()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })