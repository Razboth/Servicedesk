#!/usr/bin/env node

/**
 * Rollback ManageEngine Migration
 * 
 * This script rolls back (deletes) tickets imported from a specific migration batch
 * 
 * Usage:
 *   node scripts/rollback-migration.js --batch-id BATCH_ID [options]
 * 
 * Options:
 *   --batch-id ID     Migration batch ID to rollback (required)
 *   --confirm         Skip confirmation prompt
 *   --dry-run         Show what would be deleted without actually deleting
 */

const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  batchId: null,
  confirm: false,
  dryRun: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--batch-id':
      options.batchId = args[++i];
      break;
    case '--confirm':
      options.confirm = true;
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--help':
      showHelp();
      process.exit(0);
  }
}

function showHelp() {
  console.log(`
Rollback ManageEngine Migration

This script rolls back (deletes) tickets imported from a specific migration batch.
Use with caution - this action cannot be undone!

Usage:
  node scripts/rollback-migration.js --batch-id BATCH_ID [options]

Options:
  --batch-id ID     Migration batch ID to rollback (required)
  --confirm         Skip confirmation prompt
  --dry-run         Show what would be deleted without actually deleting
  --help            Show this help message

Examples:
  # Dry run to see what would be deleted
  node scripts/rollback-migration.js --batch-id cmfd123... --dry-run

  # Rollback with confirmation prompt
  node scripts/rollback-migration.js --batch-id cmfd123...

  # Rollback without confirmation (use with caution!)
  node scripts/rollback-migration.js --batch-id cmfd123... --confirm
  `);
}

// Validate required options
if (!options.batchId) {
  console.error('❌ Error: --batch-id is required');
  console.log('Use --help for usage information');
  process.exit(1);
}

async function askConfirmation(message) {
  if (options.confirm || options.dryRun) {
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(message + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function rollbackMigration() {
  try {
    console.log('\n🔄 Migration Rollback');
    console.log('====================\n');
    
    // Check if batch exists
    const batch = await prisma.migrationBatch.findUnique({
      where: { id: options.batchId }
    });

    if (!batch) {
      console.error(`❌ Migration batch not found: ${options.batchId}`);
      process.exit(1);
    }

    // Display batch information
    console.log('📦 Migration Batch Details:');
    console.log(`   ID: ${batch.id}`);
    console.log(`   Source: ${batch.source}`);
    console.log(`   Status: ${batch.status}`);
    console.log(`   Created: ${new Date(batch.createdAt).toLocaleString()}`);
    console.log(`   Imported Tickets: ${batch.importedCount || 0}`);
    console.log('');

    // Get tickets to be deleted
    const tickets = await prisma.ticket.findMany({
      where: { importBatchId: batch.id },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        legacyTicketId: true,
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      }
    });

    if (tickets.length === 0) {
      console.log('ℹ️  No tickets found for this batch.');
      process.exit(0);
    }

    // Calculate related data
    const totalComments = tickets.reduce((sum, t) => sum + t._count.comments, 0);
    const totalAttachments = tickets.reduce((sum, t) => sum + t._count.attachments, 0);

    console.log('⚠️  This rollback will delete:');
    console.log(`   - ${tickets.length} tickets`);
    console.log(`   - ${totalComments} comments`);
    console.log(`   - ${totalAttachments} attachment records`);
    console.log('');

    // Show sample tickets
    console.log('Sample tickets to be deleted:');
    tickets.slice(0, 5).forEach(ticket => {
      console.log(`   - ${ticket.ticketNumber}: ${ticket.title}`);
      console.log(`     (ManageEngine ID: ${ticket.legacyTicketId})`);
    });
    if (tickets.length > 5) {
      console.log(`   ... and ${tickets.length - 5} more tickets`);
    }
    console.log('');

    if (options.dryRun) {
      console.log('📝 This is a dry run. No data would be deleted.');
      console.log('Remove --dry-run flag to actually perform the rollback.');
      return;
    }

    // Ask for confirmation
    const confirmed = await askConfirmation(
      '❗ This action cannot be undone. Are you sure you want to proceed?'
    );

    if (!confirmed) {
      console.log('❌ Rollback cancelled by user.');
      process.exit(0);
    }

    // Perform rollback
    console.log('\n🗑️  Deleting tickets...');
    
    const startTime = Date.now();
    let deletedCount = 0;
    
    // Delete in batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);
      const ticketIds = batch.map(t => t.id);
      
      // Delete tickets (comments and attachments cascade delete)
      await prisma.ticket.deleteMany({
        where: { id: { in: ticketIds } }
      });
      
      deletedCount += batch.length;
      process.stdout.write(`\r   Deleted ${deletedCount}/${tickets.length} tickets...`);
    }
    
    console.log('\n');

    // Update migration batch status
    await prisma.migrationBatch.update({
      where: { id: options.batchId },
      data: {
        status: 'ROLLED_BACK',
        completedAt: new Date(),
        metadata: {
          ...batch.metadata,
          rolledBackAt: new Date().toISOString(),
          rolledBackTickets: tickets.length
        }
      }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('✅ Rollback completed successfully!');
    console.log('===================================');
    console.log(`Deleted ${tickets.length} tickets in ${duration} seconds`);
    console.log(`Migration batch ${options.batchId} marked as ROLLED_BACK`);

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the rollback
rollbackMigration();