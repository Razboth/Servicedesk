import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

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

interface ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
  suggestions: string[]
}

async function validateDatabase(): Promise<ValidationResult> {
  const result: ValidationResult = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: []
  }
  
  try {
    // Check database connection
    log.section('Checking Database Connection')
    await prisma.$queryRaw`SELECT 1`
    log.success('Database connection successful')
  } catch (error) {
    result.isValid = false
    result.errors.push(`Database connection failed: ${error}`)
    return result
  }
  
  // Check for existing data
  log.section('Checking Existing Data')
  
  const counts = {
    users: await prisma.user.count(),
    branches: await prisma.branch.count(),
    supportGroups: await prisma.supportGroup.count(),
    categories: await prisma.category.count(),
    subcategories: await prisma.subcategory.count(),
    items: await prisma.item.count(),
    services: await prisma.service.count(),
    tickets: await prisma.ticket.count(),
    fieldTemplates: await prisma.fieldTemplate.count(),
  }
  
  // Report existing data
  for (const [model, count] of Object.entries(counts)) {
    if (count > 0) {
      result.warnings.push(`Found ${count} existing ${model}`)
    }
  }
  
  // Check for required CSV files
  log.section('Checking Required Files')
  const csvPath = path.join(process.cwd(), 'import1.csv')
  
  if (!fs.existsSync(csvPath)) {
    result.warnings.push(`CSV file not found at ${csvPath}`)
    result.suggestions.push('Service catalog will not be imported without CSV file')
  } else {
    try {
      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      const lines = csvContent.split('\n').filter(line => line.trim())
      log.success(`Found CSV file with ${lines.length - 1} data rows`)
    } catch (error) {
      result.warnings.push(`Could not read CSV file: ${error}`)
    }
  }
  
  // Check for duplicate key constraints
  log.section('Checking Unique Constraints')
  
  // Check for duplicate branches by code
  const duplicateBranches = await prisma.$queryRaw<any[]>`
    SELECT code, COUNT(*) as count 
    FROM branches 
    GROUP BY code 
    HAVING COUNT(*) > 1
  `
  
  if (duplicateBranches.length > 0) {
    result.errors.push(`Found duplicate branch codes: ${duplicateBranches.map(b => b.code).join(', ')}`)
    result.isValid = false
  }
  
  // Check for duplicate users by email
  const duplicateUsers = await prisma.$queryRaw<any[]>`
    SELECT email, COUNT(*) as count 
    FROM users 
    GROUP BY email 
    HAVING COUNT(*) > 1
  `
  
  if (duplicateUsers.length > 0) {
    result.errors.push(`Found duplicate user emails: ${duplicateUsers.map(u => u.email).join(', ')}`)
    result.isValid = false
  }
  
  // Check for orphaned relationships
  log.section('Checking Data Integrity')
  
  // Check for services without support groups
  const servicesWithoutGroups = await prisma.service.count({
    where: { supportGroupId: null }
  })
  
  if (servicesWithoutGroups > 0) {
    result.warnings.push(`Found ${servicesWithoutGroups} services without support groups`)
    result.suggestions.push('Run seed to assign default support groups to services')
  }
  
  // Check for potential issues with relationships
  const orphanedSubcategories = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) as count 
    FROM subcategories s 
    LEFT JOIN categories c ON s."categoryId" = c.id 
    WHERE c.id IS NULL
  `
  
  if (orphanedSubcategories[0]?.count > 0) {
    result.errors.push(`Found ${orphanedSubcategories[0].count} subcategories without valid categories`)
    result.isValid = false
  }
  
  // Check schema version
  log.section('Checking Schema Status')
  
  try {
    const migrations = await prisma.$queryRaw<any[]>`
      SELECT migration_name, finished_at 
      FROM _prisma_migrations 
      ORDER BY finished_at DESC 
      LIMIT 5
    `
    
    if (migrations.length > 0) {
      log.info(`Latest migration: ${migrations[0].migration_name}`)
    } else {
      result.warnings.push('No migrations found - database might not be initialized')
    }
  } catch (error) {
    result.warnings.push('Could not check migration status')
  }
  
  return result
}

async function main() {
  log.section('Seed Validation Tool')
  log.info('This tool checks your database before running seeds')
  
  const result = await validateDatabase()
  
  // Display results
  log.section('Validation Results')
  
  if (result.errors.length > 0) {
    log.error('ERRORS FOUND:')
    result.errors.forEach(err => log.error(`  - ${err}`))
  }
  
  if (result.warnings.length > 0) {
    log.warning('WARNINGS:')
    result.warnings.forEach(warn => log.warning(`  - ${warn}`))
  }
  
  if (result.suggestions.length > 0) {
    log.info('SUGGESTIONS:')
    result.suggestions.forEach(sug => log.info(`  - ${sug}`))
  }
  
  if (result.isValid) {
    log.success('\nDatabase is ready for seeding!')
    log.info('Run: npm run db:seed:idempotent')
  } else {
    log.error('\nDatabase has errors that must be fixed before seeding!')
    log.info('Fix the errors above and run validation again')
    process.exit(1)
  }
}

main()
  .catch((e) => {
    log.error(`Validation failed: ${e}`)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })