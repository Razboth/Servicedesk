import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

// Logger helper
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
}

// Statistics tracking
const stats = {
  created: 0,
  updated: 0,
  skipped: 0,
  errors: 0,
}

// Function to read and parse CSV data
function parseCSV(filePath: string) {
  try {
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
  } catch (error) {
    log.error(`Failed to read CSV file: ${error}`)
    return []
  }
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
function mapItilCategory(category: string): 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'PROBLEM' {
  switch (category?.toLowerCase()) {
    case 'incident': return 'INCIDENT'
    case 'service request': return 'SERVICE_REQUEST'
    case 'change request': return 'CHANGE_REQUEST'
    case 'problem': return 'PROBLEM'
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

// Idempotent create/update functions
async function upsertBranch(data: any) {
  try {
    const result = await prisma.branch.upsert({
      where: { code: data.code },
      update: {
        name: data.name,
        address: data.address,
        city: data.city,
        province: data.province,
        isActive: data.isActive,
      },
      create: data,
    })
    
    if (result) {
      stats.created++
      log.success(`Branch: ${data.name} (${data.code})`)
    }
    return result
  } catch (error) {
    stats.errors++
    log.error(`Failed to upsert branch ${data.name}: ${error}`)
    return null
  }
}

async function upsertUser(data: any) {
  try {
    const result = await prisma.user.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        role: data.role,
        branchId: data.branchId,
        supportGroupId: data.supportGroupId,
        isActive: data.isActive,
      },
      create: data,
    })
    
    if (result) {
      stats.created++
      log.success(`User: ${data.name} (${data.email}) - Role: ${data.role}`)
    }
    return result
  } catch (error) {
    stats.errors++
    log.error(`Failed to upsert user ${data.email}: ${error}`)
    return null
  }
}

async function upsertSupportGroup(data: any) {
  try {
    const result = await prisma.supportGroup.upsert({
      where: { name: data.name },
      update: {
        description: data.description,
        isActive: data.isActive,
      },
      create: data,
    })
    
    if (result) {
      stats.created++
      log.success(`Support Group: ${data.name}`)
    }
    return result
  } catch (error) {
    stats.errors++
    log.error(`Failed to upsert support group ${data.name}: ${error}`)
    return null
  }
}

async function main() {
  log.section('Starting Idempotent Database Seeding')
  
  const startTime = Date.now()
  
  try {
    // Start transaction
    await prisma.$transaction(async (tx) => {
      // Create Support Groups first
      log.section('Creating Support Groups')
      const supportGroups = new Map()
      
      const supportGroupData = [
        { name: 'IT_HELPDESK', description: 'IT Helpdesk Support', isActive: true },
        { name: 'NETWORK_ADMIN', description: 'Network Administration', isActive: true },
        { name: 'DATABASE_ADMIN', description: 'Database Administration', isActive: true },
        { name: 'APPLICATION_SUPPORT', description: 'Application Support', isActive: true },
        { name: 'INFRASTRUCTURE', description: 'Infrastructure Support', isActive: true },
      ]
      
      for (const sgData of supportGroupData) {
        const sg = await upsertSupportGroup(sgData)
        if (sg) supportGroups.set(sg.name, sg)
      }
      
      // Create branches
      log.section('Creating Branches')
      const branches = []
      
      const branchData = [
        {
          name: 'Manado Main Branch',
          code: 'MND001',
          address: 'Jl. Sam Ratulangi No. 1',
          city: 'Manado',
          province: 'North Sulawesi',
          isActive: true,
        },
        {
          name: 'Tomohon Branch',
          code: 'TMH001',
          address: 'Jl. Raya Tomohon No. 15',
          city: 'Tomohon',
          province: 'North Sulawesi',
          isActive: true,
        },
        {
          name: 'Bitung Branch',
          code: 'BTG001',
          address: 'Jl. Pelabuhan Bitung No. 8',
          city: 'Bitung',
          province: 'North Sulawesi',
          isActive: true,
        },
      ]
      
      for (const bd of branchData) {
        const branch = await upsertBranch(bd)
        if (branch) branches.push(branch)
      }
      
      // Create users
      log.section('Creating Users')
      const hashedPassword = await bcrypt.hash('password123', 10)
      
      const userData = [
        {
          email: 'admin@banksulutgo.co.id',
          name: 'Super Admin',
          password: hashedPassword,
          role: 'ADMIN',
          isActive: true,
        },
        {
          email: 'manager@banksulutgo.co.id',
          name: 'Branch Manager',
          password: hashedPassword,
          role: 'MANAGER',
          branchId: branches[0]?.id,
          isActive: true,
        },
        {
          email: 'tech@banksulutgo.co.id',
          name: 'IT Technician',
          password: hashedPassword,
          role: 'TECHNICIAN',
          supportGroupId: supportGroups.get('IT_HELPDESK')?.id,
          isActive: true,
        },
        {
          email: 'user@banksulutgo.co.id',
          name: 'Branch Employee',
          password: hashedPassword,
          role: 'USER',
          branchId: branches[0]?.id,
          isActive: true,
        },
      ]
      
      const users = []
      for (const ud of userData) {
        const user = await upsertUser(ud)
        if (user) users.push(user)
      }
      
      // Create ATMs
      log.section('Creating ATMs')
      const atmData = [
        { code: 'ATM001', name: 'Manado Main Branch - ATM001', location: 'Main Lobby', branchId: branches[0]?.id },
        { code: 'ATM002', name: 'Manado Main Branch - ATM002', location: 'Drive Through', branchId: branches[0]?.id },
        { code: 'ATM101', name: 'Tomohon Branch - ATM101', location: 'Branch Office', branchId: branches[1]?.id },
        { code: 'ATM201', name: 'Bitung Branch - ATM201', location: 'Branch Office', branchId: branches[2]?.id },
      ]
      
      const atms = []
      for (const atmInfo of atmData) {
        if (atmInfo.branchId) {
          try {
            const atm = await tx.aTM.upsert({
              where: { code: atmInfo.code },
              update: {
                name: atmInfo.name,
                location: atmInfo.location,
                isActive: true,
              },
              create: atmInfo as any,
            })
            atms.push(atm)
            stats.created++
          } catch (error) {
            log.error(`Failed to create ATM ${atmInfo.code}: ${error}`)
            stats.errors++
          }
        }
      }
      
      // Read CSV data for service catalog
      log.section('Processing Service Catalog from CSV')
      const csvPath = path.join(process.cwd(), 'import1.csv')
      
      if (!fs.existsSync(csvPath)) {
        log.warning(`CSV file not found at ${csvPath}, skipping service catalog import`)
      } else {
        const csvData = parseCSV(csvPath)
        log.info(`Loaded ${csvData.length} records from CSV`)
        
        // Process 3-tier categories
        log.section('Processing 3-Tier Categories')
        const tier1Categories = new Map()
        const tier2Categories = new Map()
        const tier3Categories = new Map()
        const legacyCategories = new Map()
        
        // Collect unique categories
        const uniqueTier1 = new Set<string>()
        const uniqueTier2 = new Map<string, { name: string; parent: string }>()
        const uniqueTier3 = new Map<string, { name: string; parent1: string; parent2: string }>()
        
        csvData.forEach(row => {
          const tier1 = row['Tier_1_Category']
          const tier2 = row['Tier_2_SubCategory']
          const tier3 = row['Tier_3_Service_Type']
          
          if (tier1) uniqueTier1.add(tier1)
          if (tier1 && tier2) {
            uniqueTier2.set(`${tier1}|${tier2}`, { name: tier2, parent: tier1 })
          }
          if (tier1 && tier2 && tier3) {
            uniqueTier3.set(`${tier1}|${tier2}|${tier3}`, {
              name: tier3,
              parent1: tier1,
              parent2: tier2
            })
          }
        })
        
        // Create Tier 1 categories
        log.info(`Creating ${uniqueTier1.size} Tier 1 categories...`)
        for (const name of Array.from(uniqueTier1)) {
          try {
            const category = await tx.category.upsert({
              where: { name },
              update: { isActive: true },
              create: {
                name,
                description: `Tier 1 category: ${name}`,
                isActive: true
              }
            })
            tier1Categories.set(name, category)
            
            // Also create legacy ServiceCategory
            const legacyCategory = await tx.serviceCategory.upsert({
              where: { 
                name_level: {
                  name,
                  level: 1
                }
              },
              update: { isActive: true },
              create: {
                name,
                description: `Legacy category: ${name}`,
                level: 1,
                isActive: true
              }
            })
            legacyCategories.set(name, legacyCategory)
            
            stats.created++
          } catch (error) {
            log.error(`Failed to create tier 1 category ${name}: ${error}`)
            stats.errors++
          }
        }
        
        // Create Tier 2 categories
        log.info(`Creating ${uniqueTier2.size} Tier 2 subcategories...`)
        for (const [key, data] of Array.from(uniqueTier2)) {
          const parent = tier1Categories.get(data.parent)
          if (parent) {
            try {
              const subcategory = await tx.subcategory.upsert({
                where: {
                  categoryId_name: {
                    categoryId: parent.id,
                    name: data.name
                  }
                },
                update: { isActive: true },
                create: {
                  categoryId: parent.id,
                  name: data.name,
                  description: `Tier 2 subcategory: ${data.name}`,
                  isActive: true
                }
              })
              tier2Categories.set(key, subcategory)
              stats.created++
            } catch (error) {
              log.error(`Failed to create tier 2 subcategory ${data.name}: ${error}`)
              stats.errors++
            }
          }
        }
        
        // Create Tier 3 categories
        log.info(`Creating ${uniqueTier3.size} Tier 3 items...`)
        for (const [key, data] of Array.from(uniqueTier3)) {
          const parentKey = `${data.parent1}|${data.parent2}`
          const parent = tier2Categories.get(parentKey)
          if (parent) {
            try {
              const item = await tx.item.upsert({
                where: {
                  subcategoryId_name: {
                    subcategoryId: parent.id,
                    name: data.name
                  }
                },
                update: { isActive: true },
                create: {
                  subcategoryId: parent.id,
                  name: data.name,
                  description: `Tier 3 item: ${data.name}`,
                  isActive: true
                }
              })
              tier3Categories.set(key, item)
              stats.created++
            } catch (error) {
              log.error(`Failed to create tier 3 item ${data.name}: ${error}`)
              stats.errors++
            }
          }
        }
        
        // Create services
        log.section('Creating Services')
        const processedServices = new Set<string>()
        
        for (const row of csvData) {
          const tier1 = row['Tier_1_Category']
          const tier2 = row['Tier_2_SubCategory']
          const tier3 = row['Tier_3_Service_Type']
          const title = row['Title'] || `${row['Original_Service_Catalog']} - ${row['Original_Service_Name']}`
          
          // Create unique key for duplicate checking
          const serviceKey = `${tier1}|${tier2}|${tier3}|${title}`
          
          if (processedServices.has(serviceKey)) {
            stats.skipped++
            continue
          }
          
          if (tier1 && tier2 && tier3) {
            const tier3Key = `${tier1}|${tier2}|${tier3}`
            const tier3Category = tier3Categories.get(tier3Key)
            const tier1Category = tier1Categories.get(tier1)
            const tier2Key = `${tier1}|${tier2}`
            const tier2Category = tier2Categories.get(tier2Key)
            const legacyCategory = legacyCategories.get(tier1)
            const supportGroup = supportGroups.get('IT_HELPDESK')
            
            if (tier3Category && tier1Category && legacyCategory && supportGroup) {
              try {
                // Check if service exists with same name and category
                const existing = await tx.service.findFirst({
                  where: {
                    name: title,
                    tier1CategoryId: tier1Category.id,
                    tier3ItemId: tier3Category.id
                  }
                })
                
                if (!existing) {
                  await tx.service.create({
                    data: {
                      name: title,
                      description: `${row['Original_Service_Name']} - ${tier3}`,
                      categoryId: legacyCategory.id,
                      tier1CategoryId: tier1Category.id,
                      tier2SubcategoryId: tier2Category?.id,
                      tier3ItemId: tier3Category.id,
                      supportGroupId: supportGroup.id,
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
                  processedServices.add(serviceKey)
                  stats.created++
                } else {
                  stats.skipped++
                }
              } catch (error) {
                log.error(`Failed to create service ${title}: ${error}`)
                stats.errors++
              }
            }
          }
        }
      }
      
      // Create field templates
      log.section('Creating Field Templates')
      const fieldTemplates = [
        {
          name: 'customer_name',
          label: 'Nama Nasabah',
          type: 'TEXT',
          category: 'Customer Information',
          isRequired: true,
          placeholder: 'Masukkan nama nasabah',
        },
        {
          name: 'account_number',
          label: 'Nomor Rekening',
          type: 'TEXT',
          category: 'Customer Information',
          isRequired: true,
          placeholder: 'Masukkan nomor rekening',
        },
        {
          name: 'phone_number',
          label: 'Nomor Telepon',
          type: 'PHONE',
          category: 'Customer Information',
          isRequired: false,
          placeholder: 'Contoh: 08123456789',
        },
        {
          name: 'issue_description',
          label: 'Deskripsi Masalah',
          type: 'TEXTAREA',
          category: 'Issue Details',
          isRequired: true,
          placeholder: 'Jelaskan masalah yang dialami',
        },
        {
          name: 'error_message',
          label: 'Pesan Error',
          type: 'TEXTAREA',
          category: 'Technical Details',
          isRequired: false,
          placeholder: 'Salin pesan error jika ada',
        },
        {
          name: 'atm_id',
          label: 'ID ATM',
          type: 'TEXT',
          category: 'ATM Information',
          isRequired: true,
          placeholder: 'Masukkan ID ATM',
        },
        {
          name: 'atm_location',
          label: 'Lokasi ATM',
          type: 'TEXT',
          category: 'ATM Information',
          isRequired: true,
          placeholder: 'Masukkan lokasi ATM',
        },
      ]
      
      for (const template of fieldTemplates) {
        try {
          await tx.fieldTemplate.upsert({
            where: { name: template.name },
            update: {
              label: template.label,
              type: template.type as any,
              category: template.category,
              isRequired: template.isRequired,
              placeholder: template.placeholder,
            },
            create: template as any,
          })
          stats.created++
        } catch (error) {
          log.error(`Failed to create field template ${template.name}: ${error}`)
          stats.errors++
        }
      }
    })
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    
    log.section('Seeding Complete!')
    log.success(`Duration: ${duration}s`)
    log.info(`Created: ${stats.created}`)
    log.info(`Updated: ${stats.updated}`)
    log.info(`Skipped: ${stats.skipped}`)
    if (stats.errors > 0) {
      log.error(`Errors: ${stats.errors}`)
    }
    
  } catch (error) {
    log.error(`Transaction failed and rolled back: ${error}`)
    process.exit(1)
  }
}

main()
  .catch((e) => {
    log.error(`Seeding failed: ${e}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })