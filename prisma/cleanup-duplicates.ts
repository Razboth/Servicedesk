import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
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

async function cleanupDuplicates() {
  log.section('Duplicate Cleanup Tool')
  log.warning('This tool removes duplicate records keeping only the first occurrence')
  
  try {
    await prisma.$transaction(async (tx) => {
      // Clean duplicate categories by name
      log.section('Cleaning Duplicate Categories')
      const duplicateCategories = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt") as rn
          FROM categories
        )
        DELETE FROM categories
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name
      `
      
      if (duplicateCategories.length > 0) {
        log.success(`Removed ${duplicateCategories.length} duplicate categories`)
      }
      
      // Clean duplicate service categories by name and level
      log.section('Cleaning Duplicate Service Categories')
      const duplicateServiceCategories = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, name, level, ROW_NUMBER() OVER (PARTITION BY name, level ORDER BY "createdAt") as rn
          FROM service_categories
        )
        DELETE FROM service_categories
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name, level
      `
      
      if (duplicateServiceCategories.length > 0) {
        log.success(`Removed ${duplicateServiceCategories.length} duplicate service categories`)
      }
      
      // Clean duplicate subcategories by categoryId and name
      log.section('Cleaning Duplicate Subcategories')
      const duplicateSubcategories = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, "categoryId", name, ROW_NUMBER() OVER (PARTITION BY "categoryId", name ORDER BY "createdAt") as rn
          FROM subcategories
        )
        DELETE FROM subcategories
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name
      `
      
      if (duplicateSubcategories.length > 0) {
        log.success(`Removed ${duplicateSubcategories.length} duplicate subcategories`)
      }
      
      // Clean duplicate items by subcategoryId and name
      log.section('Cleaning Duplicate Items')
      const duplicateItems = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, "subcategoryId", name, ROW_NUMBER() OVER (PARTITION BY "subcategoryId", name ORDER BY "createdAt") as rn
          FROM items
        )
        DELETE FROM items
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name
      `
      
      if (duplicateItems.length > 0) {
        log.success(`Removed ${duplicateItems.length} duplicate items`)
      }
      
      // Clean duplicate field templates by name
      log.section('Cleaning Duplicate Field Templates')
      const duplicateFieldTemplates = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt") as rn
          FROM field_templates
        )
        DELETE FROM field_templates
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name
      `
      
      if (duplicateFieldTemplates.length > 0) {
        log.success(`Removed ${duplicateFieldTemplates.length} duplicate field templates`)
      }
      
      // Clean duplicate support groups by name
      log.section('Cleaning Duplicate Support Groups')
      const duplicateSupportGroups = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, name, ROW_NUMBER() OVER (PARTITION BY name ORDER BY "createdAt") as rn
          FROM support_groups
        )
        DELETE FROM support_groups
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING name
      `
      
      if (duplicateSupportGroups.length > 0) {
        log.success(`Removed ${duplicateSupportGroups.length} duplicate support groups`)
      }
      
      // Clean duplicate service field templates
      log.section('Cleaning Duplicate Service Field Templates')
      const duplicateServiceFieldTemplates = await tx.$queryRaw<any[]>`
        WITH duplicates AS (
          SELECT id, "serviceId", "fieldTemplateId", 
                 ROW_NUMBER() OVER (PARTITION BY "serviceId", "fieldTemplateId" ORDER BY id) as rn
          FROM service_field_templates
        )
        DELETE FROM service_field_templates
        WHERE id IN (SELECT id FROM duplicates WHERE rn > 1)
        RETURNING id
      `
      
      if (duplicateServiceFieldTemplates.length > 0) {
        log.success(`Removed ${duplicateServiceFieldTemplates.length} duplicate service field templates`)
      }
      
      // Report on services that might have duplicate names
      log.section('Checking Service Duplicates')
      const duplicateServices = await tx.$queryRaw<any[]>`
        SELECT name, COUNT(*) as count
        FROM services
        GROUP BY name
        HAVING COUNT(*) > 1
        ORDER BY count DESC
        LIMIT 10
      `
      
      if (duplicateServices.length > 0) {
        log.warning(`Found ${duplicateServices.length} service names with duplicates:`)
        duplicateServices.forEach(s => {
          log.info(`  - "${s.name}" appears ${s.count} times`)
        })
        log.info('Services are not automatically cleaned as they may be valid duplicates in different categories')
      }
    })
    
    log.section('Cleanup Complete!')
    log.success('All duplicates have been removed')
    log.info('You can now run the idempotent seed safely')
    
  } catch (error) {
    log.error(`Cleanup failed: ${error}`)
    log.info('Transaction rolled back - no changes were made')
    process.exit(1)
  }
}

// Add confirmation prompt
async function main() {
  console.log('\n⚠️  WARNING: This will permanently delete duplicate records!')
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
  
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await cleanupDuplicates()
}

main()
  .catch((e) => {
    log.error(`Script failed: ${e}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })