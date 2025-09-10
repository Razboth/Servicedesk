#!/usr/bin/env node

/**
 * Check ManageEngine Migration Status
 * 
 * This script checks the status of ongoing or completed migrations
 * 
 * Usage:
 *   node scripts/check-migration-status.js [options]
 * 
 * Options:
 *   --batch-id ID     Check specific batch by ID
 *   --all             Show all migration batches
 *   --recent N        Show N most recent batches (default: 5)
 *   --in-progress     Show only in-progress migrations
 *   --failed          Show only failed migrations
 *   --details         Show detailed information
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchId: null,
  all: false,
  recent: 5,
  inProgress: false,
  failed: false,
  details: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--batch-id':
      options.batchId = args[++i];
      break;
    case '--all':
      options.all = true;
      break;
    case '--recent':
      options.recent = parseInt(args[++i]);
      break;
    case '--in-progress':
      options.inProgress = true;
      break;
    case '--failed':
      options.failed = true;
      break;
    case '--details':
      options.details = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
Check ManageEngine Migration Status

Usage:
  node scripts/check-migration-status.js [options]

Options:
  --batch-id ID     Check specific batch by ID
  --all             Show all migration batches
  --recent N        Show N most recent batches (default: 5)
  --in-progress     Show only in-progress migrations
  --failed          Show only failed migrations
  --details         Show detailed information
  --help            Show this help message

Examples:
  # Check recent migrations
  node scripts/check-migration-status.js

  # Check specific batch
  node scripts/check-migration-status.js --batch-id cmfd123...

  # Show all failed migrations
  node scripts/check-migration-status.js --failed --all
  `);
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function formatDate(date) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleString();
}

function getStatusEmoji(status) {
  switch (status) {
    case 'COMPLETED': return '✅';
    case 'IN_PROGRESS': return '⏳';
    case 'FAILED': return '❌';
    case 'CANCELLED': return '🚫';
    case 'PENDING': return '⏸️';
    default: return '❓';
  }
}

async function checkBatchStatus(batchId) {
  const batch = await prisma.migrationBatch.findUnique({
    where: { id: batchId }
  });

  if (!batch) {
    console.log(`❌ Batch not found: ${batchId}`);
    return;
  }

  console.log('\n📦 Migration Batch Details');
  console.log('============================');
  console.log(`ID: ${batch.id}`);
  console.log(`Status: ${getStatusEmoji(batch.status)} ${batch.status}`);
  console.log(`Source: ${batch.source}`);
  console.log(`Created: ${formatDate(batch.createdAt)}`);
  console.log(`Started: ${formatDate(batch.startedAt)}`);
  console.log(`Completed: ${formatDate(batch.completedAt)}`);
  
  if (batch.startedAt && batch.completedAt) {
    const duration = new Date(batch.completedAt) - new Date(batch.startedAt);
    console.log(`Duration: ${formatDuration(duration)}`);
  }
  
  console.log('\n📊 Statistics');
  console.log('-------------');
  console.log(`Total Tickets: ${batch.totalCount || 0}`);
  console.log(`Imported: ${batch.importedCount || 0}`);
  console.log(`Failed: ${batch.errorCount || 0}`);
  
  if (batch.totalCount > 0) {
    const successRate = ((batch.importedCount / batch.totalCount) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);
  }

  if (options.details && batch.metadata) {
    console.log('\n⚙️  Configuration');
    console.log('--------------');
    const metadata = batch.metadata;
    if (metadata.url) console.log(`URL: ${metadata.url}`);
    if (metadata.options) {
      console.log('Options:');
      Object.entries(metadata.options).forEach(([key, value]) => {
        if (key !== 'apiKey') { // Don't show API key
          console.log(`  ${key}: ${value}`);
        }
      });
    }
  }

  if (options.details && batch.errorLog && batch.errorLog.length > 0) {
    console.log('\n⚠️  Errors');
    console.log('--------');
    const errors = batch.errorLog.slice(0, 10);
    errors.forEach(err => {
      console.log(`- Ticket ${err.ticketId}: ${err.error}`);
    });
    if (batch.errorLog.length > 10) {
      console.log(`... and ${batch.errorLog.length - 10} more errors`);
    }
  }

  // Check for imported tickets
  if (batch.status === 'COMPLETED' || batch.status === 'IN_PROGRESS') {
    const ticketCount = await prisma.ticket.count({
      where: { importBatchId: batch.id }
    });
    
    const recentTickets = await prisma.ticket.findMany({
      where: { importBatchId: batch.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        ticketNumber: true,
        title: true,
        legacyTicketId: true
      }
    });

    if (recentTickets.length > 0) {
      console.log('\n🎫 Recent Imported Tickets');
      console.log('------------------------');
      recentTickets.forEach(ticket => {
        console.log(`${ticket.ticketNumber}: ${ticket.title}`);
        console.log(`  (ManageEngine ID: ${ticket.legacyTicketId})`);
      });
      
      if (ticketCount > 5) {
        console.log(`... and ${ticketCount - 5} more tickets`);
      }
    }
  }
}

async function listBatches() {
  const where = {};
  
  if (options.inProgress) {
    where.status = 'IN_PROGRESS';
  } else if (options.failed) {
    where.status = 'FAILED';
  }

  const batches = await prisma.migrationBatch.findMany({
    where: {
      source: 'MANAGEENGINE',
      ...where
    },
    orderBy: { createdAt: 'desc' },
    take: options.all ? undefined : options.recent
  });

  if (batches.length === 0) {
    console.log('No migration batches found');
    return;
  }

  console.log('\n📋 Migration Batches');
  console.log('====================\n');

  batches.forEach((batch, index) => {
    const duration = batch.startedAt && batch.completedAt
      ? formatDuration(new Date(batch.completedAt) - new Date(batch.startedAt))
      : 'N/A';
    
    const successRate = batch.totalCount > 0
      ? ((batch.importedCount / batch.totalCount) * 100).toFixed(1)
      : '0';

    console.log(`${index + 1}. ${getStatusEmoji(batch.status)} ${batch.status}`);
    console.log(`   ID: ${batch.id}`);
    console.log(`   Created: ${formatDate(batch.createdAt)}`);
    console.log(`   Tickets: ${batch.importedCount || 0}/${batch.totalCount || 0} (${successRate}% success)`);
    console.log(`   Duration: ${duration}`);
    
    if (batch.errorCount > 0) {
      console.log(`   ⚠️  Errors: ${batch.errorCount}`);
    }
    console.log('');
  });

  // Summary statistics
  const totalImported = batches.reduce((sum, b) => sum + (b.importedCount || 0), 0);
  const totalFailed = batches.reduce((sum, b) => sum + (b.errorCount || 0), 0);
  const inProgressCount = batches.filter(b => b.status === 'IN_PROGRESS').length;

  console.log('📊 Summary');
  console.log('----------');
  console.log(`Total Batches: ${batches.length}`);
  console.log(`Total Imported: ${totalImported} tickets`);
  console.log(`Total Failed: ${totalFailed} tickets`);
  
  if (inProgressCount > 0) {
    console.log(`⏳ In Progress: ${inProgressCount} batch(es)`);
  }
}

async function main() {
  try {
    if (options.batchId) {
      await checkBatchStatus(options.batchId);
    } else {
      await listBatches();
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();