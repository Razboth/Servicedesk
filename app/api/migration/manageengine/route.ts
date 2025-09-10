// ManageEngine Migration API Routes

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ManageEngineClient } from './client'
import { DataMapper } from './mapper'
import { ManageEngineConfig, MigrationConfig } from './types'

// Test connection endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'test-connection') {
      // Get configuration from environment or request
      const config: ManageEngineConfig = {
        baseUrl: searchParams.get('baseUrl') || process.env.MANAGEENGINE_URL || 'https://127.0.0.1:8081',
        apiKey: searchParams.get('apiKey') || process.env.MANAGEENGINE_API_KEY || '',
        technician: searchParams.get('technician') || process.env.MANAGEENGINE_TECHNICIAN || '',
        skipSSLVerification: true // For self-signed certificates
      }

      if (!config.apiKey) {
        return NextResponse.json({ 
          error: 'API key is required. Set MANAGEENGINE_API_KEY environment variable or pass apiKey parameter.' 
        }, { status: 400 })
      }

      try {
        const client = new ManageEngineClient(config)
        const connected = await client.testConnection()

        if (connected) {
          // Get some statistics
          const totalCount = await client.getTotalRequestCount()
          
          return NextResponse.json({
            success: true,
            message: 'Successfully connected to ManageEngine ServiceDesk Plus',
            statistics: {
              totalTickets: totalCount
            },
            config: {
              baseUrl: config.baseUrl,
              hasApiKey: !!config.apiKey
            }
          })
        } else {
          return NextResponse.json({
            success: false,
            message: 'Failed to connect to ManageEngine ServiceDesk Plus. Please check your API key and URL.',
            config: {
              baseUrl: config.baseUrl,
              hasApiKey: !!config.apiKey
            }
          }, { status: 500 })
        }
      } catch (error: any) {
        console.error('Connection test error:', error)
        return NextResponse.json({
          success: false,
          message: error.message || 'Failed to connect to ManageEngine ServiceDesk Plus',
          error: error.toString(),
          config: {
            baseUrl: config.baseUrl,
            hasApiKey: !!config.apiKey
          }
        }, { status: 500 })
      }
    } else if (action === 'preview') {
      // Preview tickets that will be imported
      const config: ManageEngineConfig = {
        baseUrl: searchParams.get('baseUrl') || process.env.MANAGEENGINE_URL || 'https://127.0.0.1:8081',
        apiKey: searchParams.get('apiKey') || process.env.MANAGEENGINE_API_KEY || '',
        technician: searchParams.get('technician') || process.env.MANAGEENGINE_TECHNICIAN || '',
        skipSSLVerification: true
      }

      if (!config.apiKey) {
        return NextResponse.json({ 
          error: 'API key is required' 
        }, { status: 400 })
      }

      const client = new ManageEngineClient(config)
      const response = await client.getRequests(1, 10) // Get first 10 tickets

      return NextResponse.json({
        success: true,
        totalCount: response.list_info?.row_count || 0,
        sample: response.requests || [],
        message: `Found ${response.list_info?.row_count || 0} tickets to import`
      })
    } else if (action === 'status') {
      // Get migration status
      const batchId = searchParams.get('batchId')
      
      if (!batchId) {
        // Get all migration batches
        const batches = await prisma.migrationBatch.findMany({
          where: { source: 'MANAGEENGINE' },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
        
        return NextResponse.json({
          success: true,
          batches
        })
      } else {
        // Get specific batch status
        const batch = await prisma.migrationBatch.findUnique({
          where: { id: batchId },
          include: {
            _count: {
              select: { tickets: true }
            }
          }
        })
        
        if (!batch) {
          return NextResponse.json({ 
            error: 'Batch not found' 
          }, { status: 404 })
        }
        
        return NextResponse.json({
          success: true,
          batch
        })
      }
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use test-connection, preview, or status.' 
    }, { status: 400 })
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// Start migration
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, config: migrationConfig, batchSize = 100 } = body

    if (action === 'start') {
      // Get ManageEngine configuration
      const meConfig: ManageEngineConfig = {
        baseUrl: process.env.MANAGEENGINE_URL || body.baseUrl || 'https://127.0.0.1:8081',
        apiKey: process.env.MANAGEENGINE_API_KEY || body.apiKey || '',
        technician: process.env.MANAGEENGINE_TECHNICIAN || body.technician || '',
        skipSSLVerification: true
      }

      if (!meConfig.apiKey) {
        return NextResponse.json({ 
          error: 'API key is required' 
        }, { status: 400 })
      }

      // Create migration batch
      const batch = await prisma.migrationBatch.create({
        data: {
          source: 'MANAGEENGINE',
          status: 'IN_PROGRESS',
          metadata: {
            config: migrationConfig,
            startedBy: session.user.email
          } as any
        }
      })

      // Start migration in background (for production, use a queue system)
      startMigrationProcess(meConfig, migrationConfig, batch.id, batchSize)
        .catch(error => {
          console.error('Migration process error:', error)
          // Update batch status to failed
          prisma.migrationBatch.update({
            where: { id: batch.id },
            data: {
              status: 'FAILED',
              errorLog: { error: error.message } as any,
              completedAt: new Date()
            }
          }).catch(console.error)
        })

      return NextResponse.json({
        success: true,
        message: 'Migration started',
        batchId: batch.id
      })
    } else if (action === 'cancel') {
      // Cancel migration
      const { batchId } = body
      
      if (!batchId) {
        return NextResponse.json({ 
          error: 'Batch ID is required' 
        }, { status: 400 })
      }

      await prisma.migrationBatch.update({
        where: { id: batchId },
        data: {
          status: 'CANCELLED',
          completedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Migration cancelled'
      })
    } else if (action === 'rollback') {
      // Rollback migration
      const { batchId } = body
      
      if (!batchId) {
        return NextResponse.json({ 
          error: 'Batch ID is required' 
        }, { status: 400 })
      }

      // Delete all tickets from this batch
      const deleted = await prisma.ticket.deleteMany({
        where: { importBatchId: batchId }
      })

      // Update batch status
      await prisma.migrationBatch.update({
        where: { id: batchId },
        data: {
          status: 'CANCELLED',
          metadata: {
            rolledBack: true,
            rolledBackAt: new Date(),
            rolledBackBy: session.user.email
          } as any
        }
      })

      return NextResponse.json({
        success: true,
        message: `Rolled back ${deleted.count} tickets`
      })
    }

    return NextResponse.json({ 
      error: 'Invalid action. Use start, cancel, or rollback.' 
    }, { status: 400 })
  } catch (error) {
    console.error('Migration API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

// Background migration process
async function startMigrationProcess(
  meConfig: ManageEngineConfig,
  migrationConfig: MigrationConfig,
  batchId: string,
  batchSize: number
) {
  const client = new ManageEngineClient(meConfig)
  const mapper = new DataMapper(migrationConfig)

  // Initialize mapper
  await mapper.initialize()

  // Get total count
  const totalCount = await client.getTotalRequestCount()
  
  // Update batch with total count
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      totalCount,
      startedAt: new Date()
    }
  })

  let importedCount = 0
  let errorCount = 0
  const errors: any[] = []

  // Process tickets in batches
  for await (const tickets of client.fetchAllRequests(batchSize)) {
    // Check if batch is cancelled
    const currentBatch = await prisma.migrationBatch.findUnique({
      where: { id: batchId },
      select: { status: true }
    })

    if (currentBatch?.status === 'CANCELLED') {
      break
    }

    // Process each ticket in the batch
    for (const meTicket of tickets) {
      try {
        // Map and create ticket
        const ticketData = await mapper.mapRequestToTicket(meTicket, batchId)
        const createdTicket = await prisma.ticket.create({
          data: ticketData
        })

        // Fetch and create comments
        try {
          const notesResponse = await client.getRequestNotes(meTicket.id)
          if (notesResponse.notes && notesResponse.notes.length > 0) {
            for (const note of notesResponse.notes) {
              const commentData = await mapper.mapNoteToComment(note, createdTicket.id)
              await prisma.ticketComment.create({
                data: commentData
              })
            }
          }
        } catch (error) {
          console.error(`Failed to import comments for ticket ${meTicket.id}:`, error)
        }

        // TODO: Handle attachments if needed

        importedCount++
      } catch (error) {
        errorCount++
        errors.push({
          ticketId: meTicket.id,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        })
        console.error(`Failed to import ticket ${meTicket.id}:`, error)
      }
    }

    // Update batch progress
    await prisma.migrationBatch.update({
      where: { id: batchId },
      data: {
        importedCount,
        errorCount,
        errorLog: errors.length > 0 ? errors as any : undefined
      }
    })

    // Add delay between batches
    if (migrationConfig.delayBetweenBatches) {
      await new Promise(resolve => setTimeout(resolve, migrationConfig.delayBetweenBatches))
    }
  }

  // Mark batch as completed
  await prisma.migrationBatch.update({
    where: { id: batchId },
    data: {
      status: errorCount === totalCount ? 'FAILED' : 'COMPLETED',
      importedCount,
      errorCount,
      completedAt: new Date(),
      errorLog: errors.length > 0 ? errors as any : undefined
    }
  })
}