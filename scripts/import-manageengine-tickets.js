#!/usr/bin/env node

/**
 * ManageEngine ServiceDesk Plus Ticket Import Script
 * 
 * This script imports tickets from ManageEngine ServiceDesk Plus into our system
 * including tickets, comments/notes, and attachment metadata.
 * 
 * Usage:
 *   node scripts/import-manageengine-tickets.js [options]
 * 
 * Options:
 *   --api-key YOUR_API_KEY    ManageEngine API key (required)
 *   --url URL                 ManageEngine URL (default: https://127.0.0.1:8081)
 *   --batch-size N            Number of tickets per batch (default: 50)
 *   --limit N                 Maximum tickets to import (optional)
 *   --skip-existing          Skip tickets already imported (default: true)
 *   --import-comments        Import ticket comments/notes (default: true)
 *   --import-attachments     Import attachment metadata (default: true)
 *   --dry-run                Test without actually importing (default: false)
 *   --start-from N           Start from ticket index N (default: 1)
 *   --filter STATUS          Only import tickets with status (e.g., "Open", "Closed")
 *   --date-from YYYY-MM-DD   Only import tickets created after this date
 *   --date-to YYYY-MM-DD     Only import tickets created before this date
 *   --verbose                Show detailed progress (default: false)
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  apiKey: '',
  url: 'https://127.0.0.1:8081',
  batchSize: 50,
  limit: null,
  skipExisting: true,
  importComments: true,
  importAttachments: true,
  dryRun: false,
  startFrom: 1,
  filter: null,
  dateFrom: null,
  dateTo: null,
  verbose: false
};

// Parse arguments
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--api-key':
      options.apiKey = args[++i];
      break;
    case '--url':
      options.url = args[++i];
      break;
    case '--batch-size':
      options.batchSize = parseInt(args[++i]);
      break;
    case '--limit':
      options.limit = parseInt(args[++i]);
      break;
    case '--skip-existing':
      options.skipExisting = args[++i] !== 'false';
      break;
    case '--import-comments':
      options.importComments = args[++i] !== 'false';
      break;
    case '--import-attachments':
      options.importAttachments = args[++i] !== 'false';
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--start-from':
      options.startFrom = parseInt(args[++i]);
      break;
    case '--filter':
      options.filter = args[++i];
      break;
    case '--date-from':
      options.dateFrom = args[++i];
      break;
    case '--date-to':
      options.dateTo = args[++i];
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
ManageEngine ServiceDesk Plus Ticket Import Script

Usage:
  node scripts/import-manageengine-tickets.js --api-key YOUR_API_KEY [options]

Options:
  --api-key YOUR_API_KEY    ManageEngine API key (required)
  --url URL                 ManageEngine URL (default: https://127.0.0.1:8081)
  --batch-size N            Number of tickets per batch (default: 50)
  --limit N                 Maximum tickets to import (optional)
  --skip-existing          Skip tickets already imported (default: true)
  --import-comments        Import ticket comments/notes (default: true)
  --import-attachments     Import attachment metadata (default: true)
  --dry-run                Test without actually importing (default: false)
  --start-from N           Start from ticket index N (default: 1)
  --filter STATUS          Only import tickets with status (e.g., "Open", "Closed")
  --date-from YYYY-MM-DD   Only import tickets created after this date
  --date-to YYYY-MM-DD     Only import tickets created before this date
  --verbose                Show detailed progress (default: false)
  --help                   Show this help message

Examples:
  # Import all tickets
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY

  # Import only open tickets with comments
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --filter Open

  # Dry run to see what would be imported
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --dry-run --limit 10

  # Import tickets created in 2025
  node scripts/import-manageengine-tickets.js --api-key YOUR_KEY --date-from 2025-01-01
  `);
}

// Validate required options
if (!options.apiKey) {
  console.error('❌ Error: API key is required');
  console.log('Use --help for usage information');
  process.exit(1);
}

// Initialize Prisma client
const prisma = new PrismaClient();

// Disable SSL verification for self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Statistics tracking
const stats = {
  totalTickets: 0,
  importedTickets: 0,
  skippedTickets: 0,
  failedTickets: 0,
  totalComments: 0,
  importedComments: 0,
  totalAttachments: 0,
  startTime: new Date(),
  errors: []
};

// Status mapping from ManageEngine to our system
const STATUS_MAPPING = {
  'Open': 'OPEN',
  'Pending': 'PENDING',
  'In Progress': 'IN_PROGRESS',
  'On Hold': 'PENDING',
  'Resolved': 'RESOLVED',
  'Closed': 'CLOSED',
  'Cancelled': 'CANCELLED',
  'New': 'OPEN',
  'Assigned': 'OPEN',
  'Waiting for Customer': 'PENDING',
  'Waiting for Third Party': 'PENDING_VENDOR',
  'Completed': 'RESOLVED'
};

// Priority mapping
const PRIORITY_MAPPING = {
  'Low': 'LOW',
  'Normal': 'MEDIUM',
  'Medium': 'MEDIUM',
  'High': 'HIGH',
  'Urgent': 'CRITICAL',
  'Critical': 'EMERGENCY',
  '1': 'LOW',
  '2': 'MEDIUM',
  '3': 'HIGH',
  '4': 'CRITICAL',
  '5': 'EMERGENCY'
};

// Cache for users, branches, and services
const cache = {
  users: new Map(),
  branches: new Map(),
  services: new Map(),
  defaultUserId: null,
  defaultBranchId: null,
  defaultServiceId: null
};

/**
 * Make API request to ManageEngine
 */
async function makeManageEngineRequest(endpoint, params = {}) {
  const url = new URL(`${options.url}/api/v3/${endpoint}`);
  url.searchParams.append('TECHNICIAN_KEY', options.apiKey);
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  return new Promise((resolve, reject) => {
    https.get(url.toString(), (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          
          // Check for API errors
          const statusObj = Array.isArray(json.response_status) 
            ? json.response_status[0] 
            : json.response_status;
            
          if (statusObj && statusObj.status_code !== 2000) {
            reject(new Error(`API Error: ${statusObj.status || 'Unknown error'}`));
          } else {
            resolve(json);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Get or create user
 */
async function getOrCreateUser(meUser) {
  if (!meUser) return cache.defaultUserId;
  
  const cacheKey = meUser.id || meUser.email || meUser.name;
  if (cache.users.has(cacheKey)) {
    return cache.users.get(cacheKey);
  }

  // Try to find existing user
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: meUser.email },
        { username: meUser.email?.split('@')[0] },
        { name: meUser.name }
      ]
    }
  });

  if (!user && !options.dryRun) {
    // Create placeholder user
    user = await prisma.user.create({
      data: {
        username: `me_user_${meUser.id}`,
        email: meUser.email || `legacy_${meUser.id}@system.local`,
        name: meUser.name || 'Legacy User',
        role: 'USER',
        isActive: false,
        password: null,
        mustChangePassword: false
      }
    });
    if (options.verbose) {
      console.log(`  Created user: ${user.name}`);
    }
  }

  const userId = user?.id || cache.defaultUserId;
  cache.users.set(cacheKey, userId);
  return userId;
}

/**
 * Get or create branch
 */
async function getOrCreateBranch(meSite) {
  if (!meSite) return cache.defaultBranchId;
  
  if (cache.branches.has(meSite.name)) {
    return cache.branches.get(meSite.name);
  }

  let branch = await prisma.branch.findFirst({
    where: {
      OR: [
        { name: meSite.name },
        { code: meSite.name.toUpperCase().replace(/\s+/g, '_') }
      ]
    }
  });

  if (!branch && !options.dryRun) {
    branch = await prisma.branch.create({
      data: {
        code: `ME_${meSite.id}`,
        name: meSite.name,
        address: 'Imported from ManageEngine',
        city: 'Unknown',
        isActive: true
      }
    });
    if (options.verbose) {
      console.log(`  Created branch: ${branch.name}`);
    }
  }

  const branchId = branch?.id || cache.defaultBranchId;
  cache.branches.set(meSite.name, branchId);
  return branchId;
}

/**
 * Get or create service
 */
async function getOrCreateService(category, subcategory, item) {
  const cacheKey = `${category?.name}_${subcategory?.name}_${item?.name}`;
  if (cache.services.has(cacheKey)) {
    return cache.services.get(cacheKey);
  }

  // Try to find matching service
  let service = await prisma.service.findFirst({
    where: {
      OR: [
        { name: { contains: item?.name || subcategory?.name || category?.name || 'General' } },
        { description: { contains: category?.name || 'General' } }
      ]
    }
  });

  if (!service) {
    service = await prisma.service.findFirst({
      where: { isActive: true }
    });
  }

  const serviceId = service?.id || cache.defaultServiceId;
  cache.services.set(cacheKey, serviceId);
  return serviceId;
}

/**
 * Initialize cache with defaults
 */
async function initializeCache() {
  // Get or create default user
  let defaultUser = await prisma.user.findFirst({
    where: { username: 'legacy_system' }
  });
  
  if (!defaultUser && !options.dryRun) {
    defaultUser = await prisma.user.create({
      data: {
        username: 'legacy_system',
        email: 'legacy@system.local',
        name: 'Legacy System User',
        role: 'USER',
        isActive: false,
        password: null,
        mustChangePassword: false
      }
    });
  }
  cache.defaultUserId = defaultUser?.id;

  // Get default branch
  const defaultBranch = await prisma.branch.findFirst({
    where: { isActive: true }
  });
  cache.defaultBranchId = defaultBranch?.id;

  // Get default service
  const defaultService = await prisma.service.findFirst({
    where: { isActive: true }
  });
  cache.defaultServiceId = defaultService?.id;

  console.log('✅ Cache initialized');
}

/**
 * Import a single ticket
 */
async function importTicket(meTicket, batchId) {
  // Check if already imported
  if (options.skipExisting) {
    const existing = await prisma.ticket.findFirst({
      where: {
        legacySystem: 'MANAGEENGINE',
        legacyTicketId: meTicket.id
      }
    });
    
    if (existing) {
      stats.skippedTickets++;
      if (options.verbose) {
        console.log(`  ⏭️  Skipped ticket ${meTicket.id} (already imported)`);
      }
      return null;
    }
  }

  // Map data
  const createdById = await getOrCreateUser(meTicket.requester);
  const assignedToId = meTicket.technician ? await getOrCreateUser(meTicket.technician) : null;
  const branchId = await getOrCreateBranch(meTicket.site);
  const serviceId = await getOrCreateService(meTicket.category, meTicket.subcategory, meTicket.item);

  // Parse dates
  const createdAt = new Date(parseInt(meTicket.created_time.value));
  const dueAt = meTicket.due_by_time ? new Date(parseInt(meTicket.due_by_time.value)) : null;
  const resolvedAt = meTicket.resolved_time ? new Date(parseInt(meTicket.resolved_time.value)) : null;
  const closedAt = meTicket.closed_time ? new Date(parseInt(meTicket.closed_time.value)) : null;

  // Build legacy data
  const legacyData = {
    originalId: meTicket.id,
    subject: meTicket.subject,
    description: meTicket.description,
    status: meTicket.status,
    priority: meTicket.priority,
    requester: meTicket.requester,
    technician: meTicket.technician,
    site: meTicket.site,
    category: meTicket.category,
    subcategory: meTicket.subcategory,
    item: meTicket.item,
    resolution: meTicket.resolution,
    udf_fields: meTicket.udf_fields,
    created_time: meTicket.created_time,
    due_by_time: meTicket.due_by_time,
    resolved_time: meTicket.resolved_time,
    closed_time: meTicket.closed_time
  };

  const ticketData = {
    title: meTicket.subject || 'No Subject',
    description: meTicket.description || 'No description provided',
    status: STATUS_MAPPING[meTicket.status.name] || 'OPEN',
    priority: PRIORITY_MAPPING[meTicket.priority.name] || 'MEDIUM',
    category: 'INCIDENT',
    createdAt,
    dueAt,
    resolvedAt,
    closedAt,
    resolutionNotes: meTicket.resolution,
    
    // Legacy fields
    isLegacy: true,
    legacySystem: 'MANAGEENGINE',
    legacyTicketId: meTicket.id,
    legacyData,
    importedAt: new Date(),
    importBatchId: batchId,
    
    // Relations
    serviceId,
    createdById,
    assignedToId,
    branchId
  };

  if (options.dryRun) {
    console.log(`  🔍 Would import ticket: ${meTicket.id} - ${meTicket.subject}`);
    return { id: 'dry-run-' + meTicket.id };
  }

  const createdTicket = await prisma.ticket.create({
    data: ticketData
  });

  stats.importedTickets++;
  if (options.verbose) {
    console.log(`  ✅ Imported ticket: ${createdTicket.ticketNumber} (ME ID: ${meTicket.id})`);
  }

  return createdTicket;
}

/**
 * Import comments for a ticket
 */
async function importComments(meTicketId, ticketId) {
  if (!options.importComments || options.dryRun) return;

  try {
    const inputData = {
      list_info: {
        row_count: 100,
        start_index: 1,
        sort_field: 'created_time',
        sort_order: 'asc'
      }
    };

    const response = await makeManageEngineRequest(
      `requests/${meTicketId}/notes`,
      { input_data: JSON.stringify(inputData) }
    );

    if (response.notes && response.notes.length > 0) {
      for (const note of response.notes) {
        const userId = await getOrCreateUser(note.created_by);
        const createdAt = new Date(parseInt(note.created_time.value));

        await prisma.ticketComment.create({
          data: {
            content: note.description,
            isInternal: !note.is_public,
            createdAt,
            ticketId,
            userId
          }
        });

        stats.importedComments++;
      }

      if (options.verbose) {
        console.log(`    💬 Imported ${response.notes.length} comments`);
      }
    }
  } catch (error) {
    console.error(`    ⚠️  Failed to import comments: ${error.message}`);
  }
}

/**
 * Import attachment metadata for a ticket
 */
async function importAttachments(meTicketId, ticketId) {
  if (!options.importAttachments || options.dryRun) return;

  try {
    const response = await makeManageEngineRequest(`requests/${meTicketId}/attachments`);

    if (response.attachments && response.attachments.length > 0) {
      for (const attachment of response.attachments) {
        // Store attachment metadata in legacyData
        const ticket = await prisma.ticket.findUnique({
          where: { id: ticketId }
        });

        const legacyData = ticket.legacyData || {};
        if (!legacyData.attachments) {
          legacyData.attachments = [];
        }

        legacyData.attachments.push({
          id: attachment.id,
          name: attachment.name,
          size: attachment.size,
          content_type: attachment.content_type,
          created_time: attachment.created_time,
          manageEngineUrl: `${options.url}/api/v3/requests/${meTicketId}/attachments/${attachment.id}/download`
        });

        await prisma.ticket.update({
          where: { id: ticketId },
          data: { legacyData }
        });

        stats.totalAttachments++;
      }

      if (options.verbose) {
        console.log(`    📎 Found ${response.attachments.length} attachments (metadata stored)`);
      }
    }
  } catch (error) {
    console.error(`    ⚠️  Failed to get attachments: ${error.message}`);
  }
}

/**
 * Main import function
 */
async function runImport() {
  console.log('\n🚀 ManageEngine Ticket Import');
  console.log('================================');
  console.log(`URL: ${options.url}`);
  console.log(`API Key: ${options.apiKey.substring(0, 10)}...`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Skip Existing: ${options.skipExisting}`);
  console.log(`Import Comments: ${options.importComments}`);
  console.log(`Import Attachments: ${options.importAttachments}`);
  console.log(`Dry Run: ${options.dryRun}`);
  
  if (options.limit) {
    console.log(`Limit: ${options.limit} tickets`);
  }
  if (options.filter) {
    console.log(`Filter: ${options.filter}`);
  }
  if (options.dateFrom || options.dateTo) {
    console.log(`Date Range: ${options.dateFrom || 'any'} to ${options.dateTo || 'any'}`);
  }
  console.log('');

  try {
    // Initialize cache
    await initializeCache();

    // Create migration batch
    let batchId = null;
    if (!options.dryRun) {
      const batch = await prisma.migrationBatch.create({
        data: {
          source: 'MANAGEENGINE',
          status: 'IN_PROGRESS',
          metadata: {
            url: options.url,
            options: options
          }
        }
      });
      batchId = batch.id;
      console.log(`📦 Migration batch created: ${batchId}\n`);
    }

    // Build filter for API request
    const filters = {};
    if (options.filter) {
      filters.status = { name: options.filter };
    }
    if (options.dateFrom) {
      filters.created_time = { from: new Date(options.dateFrom).getTime() };
    }
    if (options.dateTo) {
      if (!filters.created_time) filters.created_time = {};
      filters.created_time.to = new Date(options.dateTo).getTime();
    }

    // Get total count
    const countInputData = {
      list_info: {
        row_count: 1,
        start_index: 1
      }
    };
    if (Object.keys(filters).length > 0) {
      countInputData.search_fields = filters;
    }

    const countResponse = await makeManageEngineRequest('requests', {
      input_data: JSON.stringify(countInputData)
    });
    
    const totalCount = countResponse.list_info?.row_count || 0;
    stats.totalTickets = options.limit ? Math.min(totalCount, options.limit) : totalCount;
    
    console.log(`📊 Found ${totalCount} tickets to import`);
    if (options.limit) {
      console.log(`   (Limited to ${options.limit} tickets)`);
    }
    console.log('');

    // Import tickets in batches
    let startIndex = options.startFrom;
    let processedCount = 0;
    const progressInterval = setInterval(() => {
      const elapsed = (Date.now() - stats.startTime) / 1000;
      const rate = stats.importedTickets / (elapsed / 60);
      process.stdout.write(`\r⏳ Progress: ${processedCount}/${stats.totalTickets} | Imported: ${stats.importedTickets} | Skipped: ${stats.skippedTickets} | Failed: ${stats.failedTickets} | Rate: ${rate.toFixed(1)}/min`);
    }, 1000);

    while (processedCount < stats.totalTickets) {
      const batchInputData = {
        list_info: {
          row_count: Math.min(options.batchSize, stats.totalTickets - processedCount),
          start_index: startIndex,
          sort_field: 'created_time',
          sort_order: 'desc'
        }
      };
      if (Object.keys(filters).length > 0) {
        batchInputData.search_fields = filters;
      }

      const batchResponse = await makeManageEngineRequest('requests', {
        input_data: JSON.stringify(batchInputData)
      });

      if (!batchResponse.requests || batchResponse.requests.length === 0) {
        break;
      }

      // Process each ticket
      for (const meTicket of batchResponse.requests) {
        try {
          const createdTicket = await importTicket(meTicket, batchId);
          
          if (createdTicket && createdTicket.id !== 'dry-run-' + meTicket.id) {
            // Import comments
            await importComments(meTicket.id, createdTicket.id);
            
            // Import attachment metadata
            await importAttachments(meTicket.id, createdTicket.id);
          }
        } catch (error) {
          stats.failedTickets++;
          stats.errors.push({
            ticketId: meTicket.id,
            error: error.message
          });
          
          if (options.verbose) {
            console.error(`\n  ❌ Failed to import ticket ${meTicket.id}: ${error.message}`);
          }
        }
        
        processedCount++;
        if (options.limit && processedCount >= options.limit) {
          break;
        }
      }

      // Update batch progress
      if (batchId && !options.dryRun) {
        await prisma.migrationBatch.update({
          where: { id: batchId },
          data: {
            totalCount: stats.totalTickets,
            importedCount: stats.importedTickets,
            errorCount: stats.failedTickets,
            errorLog: stats.errors.length > 0 ? stats.errors : undefined
          }
        });
      }

      startIndex += options.batchSize;
      
      // Add delay between batches to avoid overloading API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    clearInterval(progressInterval);
    console.log('\n');

    // Update batch as completed
    if (batchId && !options.dryRun) {
      await prisma.migrationBatch.update({
        where: { id: batchId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalCount: stats.totalTickets,
          importedCount: stats.importedTickets,
          errorCount: stats.failedTickets
        }
      });
    }

    // Print summary
    const duration = (Date.now() - stats.startTime) / 1000;
    console.log('\n✅ Import Complete!');
    console.log('================================');
    console.log(`Duration: ${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s`);
    console.log(`Total Tickets: ${stats.totalTickets}`);
    console.log(`Imported: ${stats.importedTickets}`);
    console.log(`Skipped: ${stats.skippedTickets}`);
    console.log(`Failed: ${stats.failedTickets}`);
    console.log(`Comments Imported: ${stats.importedComments}`);
    console.log(`Attachments Found: ${stats.totalAttachments}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.slice(0, 10).forEach(err => {
        console.log(`  - Ticket ${err.ticketId}: ${err.error}`);
      });
      if (stats.errors.length > 10) {
        console.log(`  ... and ${stats.errors.length - 10} more errors`);
      }
    }

    if (options.dryRun) {
      console.log('\n📝 This was a dry run. No data was actually imported.');
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
runImport().catch(console.error);