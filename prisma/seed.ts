import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Function to read and parse CSV data
function parseCSV(filePath: string) {
  const csvContent = fs.readFileSync(filePath, 'utf-8')
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(';')
  
  return lines.slice(1).map(line => {
    const values = line.split(';')
    const obj: any = {}
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || ''
    })
    return obj
  })
}

// Function to parse SLA strings to hours
function parseSlaToHours(slaString: string): number {
  if (!slaString || slaString === '') return 24
  
  if (slaString.includes('Hrs')) {
    return parseInt(slaString.replace(' Hrs', '')) || 24
  } else if (slaString.includes('Day')) {
    return (parseInt(slaString.replace(' Days', '').replace(' Day', '')) || 1) * 24
  } else if (slaString.includes('Hk')) {
    return (parseInt(slaString.replace(' Hk', '')) || 1) * 24
  } else if (slaString.includes('Mins')) {
    return Math.ceil((parseInt(slaString.replace(' Mins', '')) || 30) / 60)
  }
  return 24 // Default to 24 hours
}

// Function to map priority
function mapPriority(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  switch (priority?.toLowerCase()) {
    case 'low': return 'LOW'
    case 'medium': return 'MEDIUM'
    case 'high': return 'HIGH'
    case 'critical': return 'CRITICAL'
    default: return 'MEDIUM'
  }
}

// Function to map ITIL category
function mapItilCategory(category: string): 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST' {
  switch (category?.toLowerCase()) {
    case 'incident': return 'INCIDENT'
    case 'service request': return 'SERVICE_REQUEST'
    case 'change request': return 'CHANGE_REQUEST'
    case 'event request': return 'EVENT_REQUEST'
    case 'problem': return 'INCIDENT' // Map PROBLEM to INCIDENT as fallback
    default: return 'INCIDENT'
  }
}

// Function to map issue classification
function mapIssueClassification(classification: string): 'HUMAN_ERROR' | 'SYSTEM_ERROR' | 'PROCESS_ERROR' | 'EXTERNAL_ERROR' {
  switch (classification?.toLowerCase()) {
    case 'human error': return 'HUMAN_ERROR'
    case 'system error': return 'SYSTEM_ERROR'
    case 'process error': return 'PROCESS_ERROR'
    case 'external error': return 'EXTERNAL_ERROR'
    default: return 'SYSTEM_ERROR'
  }
}

async function main() {
  console.log('Starting database seeding...')
  
  // Read CSV data
  const csvPath = path.join(process.cwd(), 'import1.csv')
  const csvData = parseCSV(csvPath)
  
  console.log(`Loaded ${csvData.length} records from CSV`)
  
  // Create or update branches
  console.log('Creating/updating branches...')
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: 'MND001' },
      update: {},
      create: {
        name: 'Manado Main Branch',
        code: 'MND001',
        address: 'Jl. Sam Ratulangi No. 1',
        city: 'Manado',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
    prisma.branch.upsert({
      where: { code: 'TMH001' },
      update: {},
      create: {
        name: 'Tomohon Branch',
        code: 'TMH001',
        address: 'Jl. Raya Tomohon No. 15',
        city: 'Tomohon',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
    prisma.branch.upsert({
      where: { code: 'BTG001' },
      update: {},
      create: {
        name: 'Bitung Branch',
        code: 'BTG001',
        address: 'Jl. Pelabuhan Bitung No. 8',
        city: 'Bitung',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
  ])

  // Create or update demo users
  console.log('Creating/updating users...')
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@banksulutgo.co.id' },
      update: {
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        // Reset authentication security fields
        loginAttempts: 0,
        lockedAt: null,
        lastLoginAttempt: null,
        lastActivity: new Date(),
      },
      create: {
        email: 'admin@banksulutgo.co.id',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'manager@banksulutgo.co.id' },
      update: {
        name: 'Branch Manager',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[0].id,
        isActive: true,
        // Reset authentication security fields
        loginAttempts: 0,
        lockedAt: null,
        lastLoginAttempt: null,
        lastActivity: new Date(),
      },
      create: {
        email: 'manager@banksulutgo.co.id',
        name: 'Branch Manager',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[0].id,
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'tech@banksulutgo.co.id' },
      update: {
        name: 'IT Technician',
        password: hashedPassword,
        role: 'TECHNICIAN',
        isActive: true,
        // Reset authentication security fields
        loginAttempts: 0,
        lockedAt: null,
        lastLoginAttempt: null,
        lastActivity: new Date(),
      },
      create: {
        email: 'tech@banksulutgo.co.id',
        name: 'IT Technician',
        password: hashedPassword,
        role: 'TECHNICIAN',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { email: 'user@banksulutgo.co.id' },
      update: {
        name: 'Branch Employee',
        password: hashedPassword,
        role: 'USER',
        branchId: branches[0].id,
        isActive: true,
        // Reset authentication security fields
        loginAttempts: 0,
        lockedAt: null,
        lastLoginAttempt: null,
        lastActivity: new Date(),
      },
      create: {
        email: 'user@banksulutgo.co.id',
        name: 'Branch Employee',
        password: hashedPassword,
        role: 'USER',
        branchId: branches[0].id,
        isActive: true,
      },
    }),
  ])

  // Extract unique categories from CSV data
  console.log('Processing 3-tier categories...')
  const tier1Categories = new Map<string, string>()
  const tier2Categories = new Map<string, { name: string; parent: string }>()
  const tier3Categories = new Map<string, { name: string; parent1: string; parent2: string }>()

  // First pass: collect unique categories
  csvData.forEach(row => {
    const tier1 = row['Tier_1_Category']
    const tier2 = row['Tier_2_SubCategory']
    const tier3 = row['Tier_3_Service_Type']
    
    if (tier1) tier1Categories.set(tier1, tier1)
    if (tier1 && tier2) {
      tier2Categories.set(`${tier1}|${tier2}`, {
        name: tier2,
        parent: tier1
      })
    }
    if (tier1 && tier2 && tier3) {
      tier3Categories.set(`${tier1}|${tier2}|${tier3}`, {
        name: tier3,
        parent1: tier1,
        parent2: tier2
      })
    }
  })

  // Create or find Tier 1 categories
  console.log(`Creating/finding ${tier1Categories.size} Tier 1 categories...`)
  const createdTier1 = new Map()
  for (const [key, name] of tier1Categories) {
    let category = await prisma.category.findFirst({
      where: { name }
    })
    
    if (!category) {
      category = await prisma.category.create({
        data: {
          name,
          description: `Tier 1 category: ${name}`,
          isActive: true
        }
      })
    }
    createdTier1.set(name, category)
  }

  // Create or update Tier 2 categories (subcategories)
  console.log(`Creating/updating ${tier2Categories.size} Tier 2 subcategories...`)
  const createdTier2 = new Map()
  for (const [key, data] of tier2Categories) {
    const parent = createdTier1.get(data.parent)
    if (parent) {
      // Find existing subcategory by name and parent
      const existing = await prisma.subcategory.findFirst({
        where: {
          name: data.name,
          categoryId: parent.id
        }
      })
      
      const subcategory = existing || await prisma.subcategory.create({
        data: {
          categoryId: parent.id,
          name: data.name,
          description: `Tier 2 subcategory: ${data.name}`,
          isActive: true
        }
      })
      createdTier2.set(key, subcategory)
    }
  }

  // Create or update Tier 3 categories (items)
  console.log(`Creating/updating ${tier3Categories.size} Tier 3 items...`)
  const createdTier3 = new Map()
  for (const [key, data] of tier3Categories) {
    const parentKey = `${data.parent1}|${data.parent2}`
    const parent = createdTier2.get(parentKey)
    if (parent) {
      // Find existing item by name and parent
      const existing = await prisma.item.findFirst({
        where: {
          name: data.name,
          subcategoryId: parent.id
        }
      })
      
      const item = existing || await prisma.item.create({
        data: {
          subcategoryId: parent.id,
          name: data.name,
          description: `Tier 3 item: ${data.name}`,
          isActive: true
        }
      })
      createdTier3.set(key, item)
    }
  }

  // Create or find legacy ServiceCategory entries for backward compatibility
  console.log('Creating/finding legacy service categories...')
  const legacyCategories = new Map()
  for (const [key, name] of tier1Categories) {
    let legacyCategory = await prisma.serviceCategory.findFirst({
      where: { name }
    })
    
    if (!legacyCategory) {
      legacyCategory = await prisma.serviceCategory.create({
        data: {
          name,
          description: `Legacy category: ${name}`,
          level: 1,
          isActive: true
        }
      })
    }
    legacyCategories.set(name, legacyCategory)
  }

  // Create support groups first
  console.log('Creating/updating support groups...')
  const supportGroups = await Promise.all([
    prisma.supportGroup.upsert({
      where: { code: 'IT_HELPDESK' },
      update: {},
      create: {
        name: 'IT Helpdesk',
        description: 'General IT support and troubleshooting',
        code: 'IT_HELPDESK',
        isActive: true
      }
    }),
    prisma.supportGroup.upsert({
      where: { code: 'DUKUNGAN_LAYANAN' },
      update: {},
      create: {
        name: 'Dukungan dan Layanan',
        description: 'Customer service and KASDA support',
        code: 'DUKUNGAN_LAYANAN',
        isActive: true
      }
    })
  ])

  // Create or update services based on CSV data  
  console.log(`Creating/updating ${csvData.length} services...`)
  const services = []
  for (const row of csvData) {
    const tier1 = row['Tier_1_Category']
    const tier2 = row['Tier_2_SubCategory']
    const tier3 = row['Tier_3_Service_Type']
    const title = row['Title'] || `${row['Original_Service_Catalog']} - ${row['Original_Service_Name']}`
    
    if (tier1 && tier2 && tier3) {
      const tier3Key = `${tier1}|${tier2}|${tier3}`
      const tier3Category = createdTier3.get(tier3Key)
      const tier1Category = createdTier1.get(tier1)
      const tier2Key = `${tier1}|${tier2}`
      const tier2Category = createdTier2.get(tier2Key)
      const legacyCategory = legacyCategories.get(tier1)
      
      if (tier3Category && tier1Category && legacyCategory) {
        try {
          // Check if service already exists
          const existing = await prisma.service.findFirst({
            where: { name: title }
          })

          if (!existing) {
            const service = await prisma.service.create({
              data: {
                name: title,
                description: `${row['Original_Service_Name']} - ${tier3}`,
                categoryId: legacyCategory.id, // Legacy category field
                tier1CategoryId: tier1Category.id,
                tier2SubcategoryId: tier2Category?.id,
                tier3ItemId: tier3Category.id,
                supportGroupId: supportGroups[0].id, // Default to IT Helpdesk
                priority: mapPriority(row['Priority']),
                estimatedHours: parseSlaToHours(row['Resolution_Time']),
                slaHours: parseSlaToHours(row['Resolution_Time']),
                responseHours: parseSlaToHours(row['First_Response']),
                resolutionHours: parseSlaToHours(row['Resolution_Time']),
                requiresApproval: mapItilCategory(row['ITIL_Category']) === 'CHANGE_REQUEST',
                defaultItilCategory: mapItilCategory(row['ITIL_Category']),
                defaultIssueClassification: mapIssueClassification(row['Issue_Classification']),
                defaultTitle: title
              }
            })
            services.push(service)
          } else {
            services.push(existing)
          }
        } catch (error) {
          console.warn(`Failed to create service for ${title}:`, error.message)
        }
      }
    }
  }

  // Create sample tickets
  console.log('Creating sample tickets...')
  const tickets = []
  if (services.length > 0) {
    const sampleTickets = await Promise.all([
      prisma.ticket.upsert({
        where: { ticketNumber: 'TKT-001' },
        update: {},
        create: {
          ticketNumber: 'TKT-001',
          title: 'ATM Terminal Registration Request',
          description: 'Request for new ATM terminal registration at branch location',
          serviceId: services[0].id,
          priority: 'MEDIUM',
          status: 'PENDING_APPROVAL',
          createdById: users[3].id,
          branchId: branches[0].id,
          supportGroupId: supportGroups[0].id,
        },
      }),
      prisma.ticket.upsert({
        where: { ticketNumber: 'TKT-002' },
        update: {},
        create: {
          ticketNumber: 'TKT-002',
          title: 'Application Error Report',
          description: 'Application experiencing errors during operation',
          serviceId: services[Math.min(1, services.length - 1)].id,
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          createdById: users[3].id,
          assignedToId: users[2].id,
          branchId: branches[0].id,
          supportGroupId: supportGroups[0].id,
        },
      }),
    ])
    tickets.push(...sampleTickets)
  }

  console.log('Database seeded successfully!')
  console.log(`Created ${branches.length} branches`)
  console.log(`Created ${users.length} users`)
  console.log(`Created ${createdTier1.size} Tier 1 categories`)
  console.log(`Created ${createdTier2.size} Tier 2 subcategories`)
  console.log(`Created ${createdTier3.size} Tier 3 items`)
  console.log(`Created ${services.length} services`)
  console.log(`Created ${tickets.length} sample tickets`)
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })