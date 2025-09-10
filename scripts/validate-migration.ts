// Migration Validation Script for ManageEngine ServiceDesk Plus
// Run with: npx tsx scripts/validate-migration.ts

import { PrismaClient } from '@prisma/client'
import { ManageEngineClient } from '../app/api/migration/manageengine/client'
import { DataMapper } from '../app/api/migration/manageengine/mapper'
import type { ManageEngineConfig } from '../app/api/migration/manageengine/types'
import * as dotenv from 'dotenv'
import { createReadStream } from 'fs'
import { join } from 'path'

dotenv.config()

const prisma = new PrismaClient()

// Configuration
const config: ManageEngineConfig = {
  baseUrl: process.env.MANAGEENGINE_URL || 'https://127.0.0.1:8081',
  apiKey: process.env.MANAGEENGINE_API_KEY || '',
  technician: process.env.MANAGEENGINE_TECHNICIAN || '',
  skipSSLVerification: true
}

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60))
  log(title, colors.bright + colors.cyan)
  console.log('='.repeat(60))
}

async function testConnection() {
  logSection('Testing Connection to ManageEngine')
  
  if (!config.apiKey) {
    log('❌ MANAGEENGINE_API_KEY not set in environment variables', colors.red)
    log('Please set the following in your .env file:', colors.yellow)
    log('MANAGEENGINE_URL=https://127.0.0.1:8081', colors.yellow)
    log('MANAGEENGINE_API_KEY=your_api_key_here', colors.yellow)
    log('MANAGEENGINE_TECHNICIAN=your_technician_name', colors.yellow)
    return false
  }

  const client = new ManageEngineClient(config)
  
  try {
    const connected = await client.testConnection()
    if (connected) {
      log('✅ Successfully connected to ManageEngine ServiceDesk Plus', colors.green)
      
      // Get statistics
      const totalCount = await client.getTotalRequestCount()
      log(`📊 Total tickets found: ${totalCount}`, colors.cyan)
      
      return true
    } else {
      log('❌ Failed to connect to ManageEngine', colors.red)
      return false
    }
  } catch (error) {
    log(`❌ Connection error: ${error}`, colors.red)
    return false
  }
}

async function previewTickets(count: number = 5) {
  logSection(`Preview First ${count} Tickets`)
  
  const client = new ManageEngineClient(config)
  
  try {
    const response = await client.getRequests(1, count)
    
    if (response.requests && response.requests.length > 0) {
      log(`\nShowing ${response.requests.length} tickets:\n`, colors.cyan)
      
      response.requests.forEach((ticket, index) => {
        console.log(`${index + 1}. Ticket #${ticket.id}`)
        console.log(`   Subject: ${ticket.subject}`)
        console.log(`   Status: ${ticket.status?.name || 'N/A'}`)
        console.log(`   Priority: ${ticket.priority?.name || 'N/A'}`)
        console.log(`   Requester: ${ticket.requester?.name || 'N/A'}`)
        console.log(`   Created: ${ticket.created_time?.display_value || 'N/A'}`)
        console.log(`   Category: ${ticket.category?.name || 'N/A'}`)
        if (ticket.subcategory) {
          console.log(`   Subcategory: ${ticket.subcategory.name}`)
        }
        console.log('')
      })
      
      return response.requests
    } else {
      log('No tickets found', colors.yellow)
      return []
    }
  } catch (error) {
    log(`❌ Error fetching tickets: ${error}`, colors.red)
    return []
  }
}

async function testMigration(ticketId?: string) {
  logSection('Test Migration')
  
  const client = new ManageEngineClient(config)
  const mapper = new DataMapper({
    createPlaceholderUsers: true,
    createPlaceholderBranches: true,
    skipExisting: true
  })
  
  try {
    // Initialize mapper
    log('Initializing data mapper...', colors.cyan)
    await mapper.initialize()
    log('✅ Mapper initialized', colors.green)
    
    // Get a single ticket to test
    let testTicket
    if (ticketId) {
      log(`Fetching ticket ${ticketId}...`, colors.cyan)
      const response = await client.getRequest(ticketId)
      testTicket = response.request
    } else {
      log('Fetching first available ticket...', colors.cyan)
      const response = await client.getRequests(1, 1)
      testTicket = response.requests?.[0]
    }
    
    if (!testTicket) {
      log('❌ No ticket found for testing', colors.red)
      return
    }
    
    log(`\n📋 Testing with ticket #${testTicket.id}: ${testTicket.subject}`, colors.bright)
    
    // Create a test batch
    const batch = await prisma.migrationBatch.create({
      data: {
        source: 'MANAGEENGINE',
        status: 'IN_PROGRESS',
        totalCount: 1,
        metadata: { test: true } as any
      }
    })
    
    // Map the ticket
    log('Mapping ticket data...', colors.cyan)
    const mappedTicket = await mapper.mapRequestToTicket(testTicket, batch.id)
    
    // Display mapped data
    console.log('\n📊 Mapped Data:')
    console.log('   Title:', mappedTicket.title)
    console.log('   Status:', mappedTicket.status)
    console.log('   Priority:', mappedTicket.priority)
    console.log('   Legacy ID:', mappedTicket.legacyTicketId)
    console.log('   Service ID:', mappedTicket.service.connect?.id)
    console.log('   Created By ID:', mappedTicket.createdBy.connect?.id)
    
    // Create the ticket
    log('\nCreating ticket in database...', colors.cyan)
    const createdTicket = await prisma.ticket.create({
      data: mappedTicket,
      include: {
        service: true,
        createdBy: true,
        assignedTo: true,
        branch: true
      }
    })
    
    log('✅ Ticket created successfully!', colors.green)
    console.log('\n📄 Created Ticket Details:')
    console.log('   ID:', createdTicket.id)
    console.log('   Number:', createdTicket.ticketNumber)
    console.log('   Service:', createdTicket.service.name)
    console.log('   Created By:', createdTicket.createdBy.name)
    console.log('   Is Legacy:', createdTicket.isLegacy)
    
    // Try to fetch comments
    log('\nFetching ticket comments...', colors.cyan)
    const notesResponse = await client.getRequestNotes(testTicket.id)
    if (notesResponse.notes && notesResponse.notes.length > 0) {
      log(`Found ${notesResponse.notes.length} comments`, colors.cyan)
      
      for (const note of notesResponse.notes.slice(0, 3)) {
        const mappedComment = await mapper.mapNoteToComment(note, createdTicket.id)
        const createdComment = await prisma.ticketComment.create({
          data: mappedComment
        })
        console.log(`   ✅ Comment created: ${createdComment.content.substring(0, 50)}...`)
      }
    } else {
      log('No comments found for this ticket', colors.yellow)
    }
    
    // Update batch status
    await prisma.migrationBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        importedCount: 1,
        completedAt: new Date()
      }
    })
    
    log('\n✅ Test migration completed successfully!', colors.green)
    log(`View the ticket at: /tickets/${createdTicket.id}`, colors.cyan)
    
    return createdTicket
  } catch (error) {
    log(`❌ Migration error: ${error}`, colors.red)
    console.error(error)
    return null
  }
}

async function validateMigration() {
  logSection('Validating Migrated Data')
  
  try {
    // Count legacy tickets
    const legacyCount = await prisma.ticket.count({
      where: { isLegacy: true }
    })
    
    const manageEngineCount = await prisma.ticket.count({
      where: { legacySystem: 'MANAGEENGINE' }
    })
    
    // Get migration batches
    const batches = await prisma.migrationBatch.findMany({
      where: { source: 'MANAGEENGINE' },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    // Get sample legacy tickets
    const sampleTickets = await prisma.ticket.findMany({
      where: { isLegacy: true },
      take: 5,
      include: {
        service: true,
        createdBy: true,
        _count: {
          select: { comments: true }
        }
      }
    })
    
    console.log('\n📊 Migration Statistics:')
    console.log(`   Total Legacy Tickets: ${legacyCount}`)
    console.log(`   ManageEngine Tickets: ${manageEngineCount}`)
    console.log(`   Migration Batches: ${batches.length}`)
    
    if (batches.length > 0) {
      console.log('\n📦 Recent Migration Batches:')
      batches.forEach((batch, index) => {
        console.log(`   ${index + 1}. Batch ${batch.id.slice(-6)}`)
        console.log(`      Status: ${batch.status}`)
        console.log(`      Imported: ${batch.importedCount}/${batch.totalCount}`)
        console.log(`      Errors: ${batch.errorCount}`)
        console.log(`      Date: ${batch.createdAt.toLocaleString()}`)
      })
    }
    
    if (sampleTickets.length > 0) {
      console.log('\n📋 Sample Migrated Tickets:')
      sampleTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ${ticket.title}`)
        console.log(`      Legacy ID: ${ticket.legacyTicketId}`)
        console.log(`      Service: ${ticket.service.name}`)
        console.log(`      Comments: ${ticket._count.comments}`)
        console.log(`      Created: ${ticket.createdAt.toLocaleString()}`)
      })
    }
    
    // Validate data integrity
    console.log('\n✅ Data Validation:')
    
    // Check for duplicate legacy IDs
    const duplicates = await prisma.ticket.groupBy({
      by: ['legacyTicketId'],
      where: {
        legacyTicketId: { not: null },
        legacySystem: 'MANAGEENGINE'
      },
      _count: true,
      having: {
        legacyTicketId: {
          _count: { gt: 1 }
        }
      }
    })
    
    if (duplicates.length > 0) {
      log(`   ⚠️ Found ${duplicates.length} duplicate legacy IDs`, colors.yellow)
    } else {
      log('   ✅ No duplicate legacy IDs found', colors.green)
    }
    
    // Check for missing required fields
    const incomplete = await prisma.ticket.count({
      where: {
        isLegacy: true,
        OR: [
          { title: null },
          { serviceId: null },
          { createdById: null }
        ]
      }
    })
    
    if (incomplete > 0) {
      log(`   ⚠️ Found ${incomplete} tickets with missing required fields`, colors.yellow)
    } else {
      log('   ✅ All tickets have required fields', colors.green)
    }
    
    return true
  } catch (error) {
    log(`❌ Validation error: ${error}`, colors.red)
    return false
  }
}

async function cleanupTestData() {
  logSection('Cleanup Test Data')
  
  const confirm = process.argv.includes('--cleanup')
  
  if (!confirm) {
    log('ℹ️ To cleanup test data, run with --cleanup flag', colors.yellow)
    return
  }
  
  try {
    // Find test batches
    const testBatches = await prisma.migrationBatch.findMany({
      where: {
        source: 'MANAGEENGINE',
        metadata: {
          path: ['test'],
          equals: true
        }
      }
    })
    
    if (testBatches.length === 0) {
      log('No test data found to cleanup', colors.yellow)
      return
    }
    
    log(`Found ${testBatches.length} test batches to cleanup`, colors.cyan)
    
    for (const batch of testBatches) {
      // Delete tickets from this batch
      const deleted = await prisma.ticket.deleteMany({
        where: { importBatchId: batch.id }
      })
      
      // Delete the batch
      await prisma.migrationBatch.delete({
        where: { id: batch.id }
      })
      
      log(`   ✅ Deleted batch ${batch.id.slice(-6)} with ${deleted.count} tickets`, colors.green)
    }
    
    log('✅ Test data cleaned up successfully', colors.green)
  } catch (error) {
    log(`❌ Cleanup error: ${error}`, colors.red)
  }
}

async function main() {
  log('\n🚀 ManageEngine Migration Validator\n', colors.bright + colors.cyan)
  
  const args = process.argv.slice(2)
  const command = args[0] || 'all'
  
  try {
    switch (command) {
      case 'test':
        await testConnection()
        break
      
      case 'preview':
        const count = parseInt(args[1]) || 5
        await testConnection() && await previewTickets(count)
        break
      
      case 'migrate':
        const ticketId = args[1]
        if (await testConnection()) {
          await testMigration(ticketId)
        }
        break
      
      case 'validate':
        await validateMigration()
        break
      
      case 'cleanup':
        await cleanupTestData()
        break
      
      case 'all':
      default:
        if (await testConnection()) {
          await previewTickets(3)
          await testMigration()
          await validateMigration()
        }
        break
    }
    
    log('\n✅ Validation completed', colors.green)
  } catch (error) {
    log(`\n❌ Fatal error: ${error}`, colors.red)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
main()
  .catch(console.error)
  .finally(() => process.exit(0))