#!/usr/bin/env node

/**
 * Reimport Comments for Existing Legacy Tickets
 * 
 * This script reimports comments for legacy tickets that were already imported
 * but may be missing comments due to previous import issues.
 * 
 * Usage:
 *   node scripts/reimport-legacy-comments.js [options]
 * 
 * Options:
 *   --api-key YOUR_API_KEY    ManageEngine API key (required)
 *   --url URL                 ManageEngine URL (default: https://127.0.0.1:8081)
 *   --batch-size N            Number of tickets per batch (default: 10)
 *   --limit N                 Maximum tickets to process (optional)
 *   --dry-run                 Test without actually importing (default: false)
 *   --verbose                 Show detailed progress (default: false)
 *   --insecure                Disable SSL verification (default: false)
 *   --skip-existing           Skip tickets that already have comments (default: false)
 *   --force                   Reimport even if comments exist (default: false)
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  apiKey: '',
  url: 'https://127.0.0.1:8081',
  batchSize: 10,
  limit: null,
  dryRun: false,
  verbose: false,
  insecure: false,
  skipExisting: true,
  force: false
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
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--insecure':
      options.insecure = true;
      break;
    case '--skip-existing':
      options.skipExisting = true;
      break;
    case '--force':
      options.force = true;
      options.skipExisting = false;
      break;
    case '--help':
      showHelp();
      process.exit(0);
      break;
  }
}

if (!options.apiKey) {
  console.error('❌ API key is required. Use --api-key YOUR_API_KEY');
  process.exit(1);
}

if (options.insecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  console.log('⚠️  SSL certificate verification disabled (--insecure flag)\n');
}

const prisma = new PrismaClient();

// Statistics
const stats = {
  totalTickets: 0,
  processedTickets: 0,
  skippedTickets: 0,
  importedComments: 0,
  errors: 0
};

/**
 * Make API request to ManageEngine
 */
async function makeManageEngineRequest(endpoint, params = {}) {
  const url = `${options.url}/${endpoint}`;
  const postData = new URLSearchParams({
    authtoken: options.apiKey,
    ...params
  }).toString();

  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      },
      rejectUnauthorized: !options.insecure
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.response_status && response.response_status.status === 'failed') {
            reject(new Error(`API Error: ${response.response_status.status_code || 'failed'}`));
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(new Error(`JSON Parse Error: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * Import comments for a legacy ticket
 */
async function importCommentsForTicket(legacyTicket) {
  if (options.dryRun) {
    console.log(`  🔍 [DRY RUN] Would import comments for ${legacyTicket.ticketNumber}`);
    return;
  }

  try {
    // Use the v3 API endpoint for notes
    const inputData = {
      list_info: {
        row_count: 100,
        start_index: 1,
        sort_field: 'created_time',
        sort_order: 'asc'
      }
    };

    const response = await makeManageEngineRequest(
      `api/v3/requests/${legacyTicket.originalTicketId}/notes`,
      { input_data: JSON.stringify(inputData) }
    );

    if (response.notes && response.notes.length > 0) {
      let importedCount = 0;
      
      for (const note of response.notes) {
        // Extract author name from the created_by object or use display_name
        const authorName = note.created_by?.name || note.created_by?.display_name || 'Unknown User';
        const createdAt = new Date(parseInt(note.created_time?.value || Date.now()));
        const originalCreatedAt = createdAt;

        // Check if comment already exists (by content and creation time)
        const existingComment = await prisma.legacyTicketComment.findFirst({
          where: {
            legacyTicketId: legacyTicket.id,
            content: note.description || 'No content available',
            originalCreatedAt: originalCreatedAt
          }
        });

        if (existingComment && !options.force) {
          if (options.verbose) {
            console.log(`    ⏭️  Comment already exists, skipping`);
          }
          continue;
        }

        // Delete existing comment if force mode
        if (existingComment && options.force) {
          await prisma.legacyTicketComment.delete({
            where: { id: existingComment.id }
          });
          if (options.verbose) {
            console.log(`    🔄 Replaced existing comment`);
          }
        }

        // Create the legacy ticket comment with proper fields
        await prisma.legacyTicketComment.create({
          data: {
            content: note.description || 'No content available',
            isInternal: note.is_public === false, // Convert to internal flag
            originalAuthor: authorName,
            originalData: note, // Store the entire note object for reference
            createdAt,
            originalCreatedAt,
            legacyTicketId: legacyTicket.id
          }
        });

        importedCount++;
        stats.importedComments++;
      }

      if (options.verbose) {
        console.log(`    💬 Imported ${importedCount} comments`);
      }
    } else {
      if (options.verbose) {
        console.log(`    💬 No comments found for ticket ${legacyTicket.originalTicketId}`);
      }
    }
  } catch (error) {
    stats.errors++;
    console.error(`    ⚠️  Failed to import comments for ticket ${legacyTicket.ticketNumber}: ${error.message}`);
    if (options.verbose) {
      console.error(`    Debug info: endpoint used was api/v3/requests/${legacyTicket.originalTicketId}/notes`);
    }
  }
}

/**
 * Main import function
 */
async function reimportComments() {
  console.log('🔄 Legacy Ticket Comments Reimport');
  console.log('==================================');
  console.log(`URL: ${options.url}`);
  console.log(`API Key: ${options.apiKey.substring(0, 10)}...`);
  console.log(`Batch Size: ${options.batchSize}`);
  console.log(`Skip Existing: ${options.skipExisting}`);
  console.log(`Force Reimport: ${options.force}`);
  console.log(`Dry Run: ${options.dryRun}`);
  console.log();

  try {
    // Get all legacy tickets
    let whereClause = {
      originalSystem: 'MANAGEENGINE'
    };

    // If skip existing is enabled, only get tickets without comments
    if (options.skipExisting) {
      whereClause.comments = {
        none: {}
      };
    }

    const legacyTickets = await prisma.legacyTicket.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            comments: true
          }
        }
      },
      orderBy: {
        importedAt: 'asc'
      },
      take: options.limit || undefined
    });

    stats.totalTickets = legacyTickets.length;

    console.log(`📊 Found ${stats.totalTickets} legacy tickets to process`);
    if (options.skipExisting) {
      console.log(`   (Only tickets without comments)`);
    }
    if (options.force) {
      console.log(`   (Force mode: will replace existing comments)`);
    }
    console.log();

    if (stats.totalTickets === 0) {
      console.log('✅ No tickets need comment import');
      return;
    }

    // Process tickets in batches
    for (let i = 0; i < legacyTickets.length; i += options.batchSize) {
      const batch = legacyTickets.slice(i, i + options.batchSize);
      const batchNumber = Math.floor(i / options.batchSize) + 1;
      const totalBatches = Math.ceil(legacyTickets.length / options.batchSize);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} tickets)`);

      for (const ticket of batch) {
        stats.processedTickets++;
        
        console.log(`  🎫 ${ticket.ticketNumber} (ME: ${ticket.originalTicketId}) - ${ticket._count.comments} existing comments`);

        try {
          await importCommentsForTicket(ticket);
        } catch (error) {
          stats.errors++;
          console.error(`  ❌ Error processing ticket ${ticket.ticketNumber}: ${error.message}`);
        }

        // Progress indicator
        if (!options.verbose && stats.processedTickets % 10 === 0) {
          console.log(`   📈 Progress: ${stats.processedTickets}/${stats.totalTickets} tickets processed`);
        }
      }

      // Add delay between batches to avoid overwhelming the API
      if (i + options.batchSize < legacyTickets.length) {
        console.log(`   ⏳ Waiting 2 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Final summary
    console.log('\n📋 Import Summary:');
    console.log(`✅ Total Tickets: ${stats.totalTickets}`);
    console.log(`✅ Processed: ${stats.processedTickets}`);
    console.log(`💬 Comments Imported: ${stats.importedComments}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log(`⏭️  Skipped: ${stats.skippedTickets}`);

    if (stats.errors > 0) {
      console.log('\n⚠️  Some errors occurred during import. Check the logs above for details.');
    } else {
      console.log('\n🎉 Comment reimport completed successfully!');
    }

  } catch (error) {
    console.error('❌ Fatal error during comment reimport:', error);
    process.exit(1);
  }
}

function showHelp() {
  console.log('Legacy Comments Reimport Tool\n');
  console.log('Usage: node scripts/reimport-legacy-comments.js [options]\n');
  console.log('Options:');
  console.log('  --api-key KEY         ManageEngine API key (required)');
  console.log('  --url URL             ManageEngine URL (default: https://127.0.0.1:8081)');
  console.log('  --batch-size N        Number of tickets per batch (default: 10)');
  console.log('  --limit N             Maximum tickets to process (optional)');
  console.log('  --dry-run             Test without actually importing');
  console.log('  --verbose             Show detailed progress');
  console.log('  --insecure            Disable SSL verification');
  console.log('  --skip-existing       Skip tickets that already have comments (default)');
  console.log('  --force               Force reimport, replace existing comments');
  console.log('  --help                Show this help message\n');
  console.log('Examples:');
  console.log('  # Reimport comments for tickets without any comments');
  console.log('  node scripts/reimport-legacy-comments.js --api-key YOUR_KEY --insecure');
  console.log('');
  console.log('  # Force reimport all comments (replace existing)');
  console.log('  node scripts/reimport-legacy-comments.js --api-key YOUR_KEY --force --insecure');
  console.log('');
  console.log('  # Test run for first 50 tickets');
  console.log('  node scripts/reimport-legacy-comments.js --api-key YOUR_KEY --limit 50 --dry-run --verbose --insecure');
}

// Run the reimport
reimportComments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());