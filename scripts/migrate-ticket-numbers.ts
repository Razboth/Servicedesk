import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Extract numeric portion from old ticket number format
 * Examples:
 * - TKT-2025-000050 → 50
 * - TKT-2025-002345 → 2345
 * - TKT-2025-030520 → 30520
 * - LEG2025000001 → LEG2025000001 (legacy tickets unchanged)
 */
function extractTicketNumber(oldNumber: string): string {
  // Only process tickets that match the TKT-YYYY-XXXXXX pattern
  if (oldNumber.startsWith('TKT-')) {
    const parts = oldNumber.split('-');
    if (parts.length === 3) {
      // Extract the numeric part and remove leading zeros
      const numericPart = parseInt(parts[2], 10);
      if (!isNaN(numericPart)) {
        return numericPart.toString();
      }
    }
  }

  // Return unchanged for legacy tickets or other formats
  return oldNumber;
}

async function createBackupTable() {
  try {
    // Create backup table for rollback capability
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS ticket_number_backup (
        id TEXT PRIMARY KEY,
        original_number TEXT NOT NULL,
        new_number TEXT NOT NULL,
        migrated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Backup table created');
  } catch (error) {
    console.error('Error creating backup table:', error);
    throw error;
  }
}

async function migrateTicketNumbers() {
  console.log('🚀 Starting ticket number migration...');

  try {
    // Create backup table first
    await createBackupTable();

    // Fetch all tickets
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        ticketNumber: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Found ${tickets.length} tickets to process`);

    let migratedCount = 0;
    let skippedCount = 0;
    const errors: Array<{id: string, number: string, error: string}> = [];

    // Process tickets in batches to avoid overwhelming the database
    const batchSize = 100;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, Math.min(i + batchSize, tickets.length));

      await prisma.$transaction(async (tx) => {
        for (const ticket of batch) {
          const newNumber = extractTicketNumber(ticket.ticketNumber);

          if (newNumber !== ticket.ticketNumber) {
            try {
              // Store backup
              await tx.$executeRaw`
                INSERT INTO ticket_number_backup (id, original_number, new_number)
                VALUES (${ticket.id}, ${ticket.ticketNumber}, ${newNumber})
              `;

              // Update ticket
              await tx.ticket.update({
                where: { id: ticket.id },
                data: { ticketNumber: newNumber }
              });

              migratedCount++;
              console.log(`✓ Migrated: ${ticket.ticketNumber} → ${newNumber}`);
            } catch (error) {
              // Handle unique constraint violations
              if (error instanceof Error && error.message.includes('Unique constraint')) {
                errors.push({
                  id: ticket.id,
                  number: ticket.ticketNumber,
                  error: `Number ${newNumber} already exists`
                });
                console.error(`✗ Conflict: ${ticket.ticketNumber} → ${newNumber} (already exists)`);
              } else {
                throw error;
              }
            }
          } else {
            skippedCount++;
            console.log(`- Skipped: ${ticket.ticketNumber} (no change needed)`);
          }
        }
      });

      console.log(`Progress: ${Math.min(i + batchSize, tickets.length)}/${tickets.length}`);
    }

    // Print summary
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migratedCount} tickets`);
    console.log(`⏭️  Skipped (no change): ${skippedCount} tickets`);

    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length} tickets`);
      console.log('\nTickets with errors:');
      errors.forEach(err => {
        console.log(`  - ${err.number}: ${err.error}`);
      });
    }

    return {
      total: tickets.length,
      migrated: migratedCount,
      skipped: skippedCount,
      errors: errors.length
    };

  } catch (error) {
    console.error('Fatal error during migration:', error);
    throw error;
  }
}

async function rollbackMigration() {
  console.log('🔄 Starting rollback...');

  try {
    // Check if backup table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'ticket_number_backup'
      )
    ` as any;

    if (!tableExists[0].exists) {
      console.log('No backup table found. Nothing to rollback.');
      return;
    }

    // Get all backup entries
    const backups = await prisma.$queryRaw`
      SELECT id, original_number, new_number
      FROM ticket_number_backup
    ` as any[];

    console.log(`Found ${backups.length} tickets to rollback`);

    // Rollback in transaction
    await prisma.$transaction(async (tx) => {
      for (const backup of backups) {
        await tx.ticket.update({
          where: { id: backup.id },
          data: { ticketNumber: backup.original_number }
        });
        console.log(`✓ Rolled back: ${backup.new_number} → ${backup.original_number}`);
      }
    });

    // Clean up backup table
    await prisma.$executeRaw`DROP TABLE IF EXISTS ticket_number_backup`;
    console.log('✅ Rollback completed and backup table removed');

  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === '--rollback') {
      await rollbackMigration();
    } else if (command === '--dry-run') {
      // Dry run - just show what would be changed
      const tickets = await prisma.ticket.findMany({
        select: {
          id: true,
          ticketNumber: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      console.log('🔍 Dry run - showing changes without applying them:\n');
      let changeCount = 0;

      tickets.forEach(ticket => {
        const newNumber = extractTicketNumber(ticket.ticketNumber);
        if (newNumber !== ticket.ticketNumber) {
          console.log(`  ${ticket.ticketNumber} → ${newNumber}`);
          changeCount++;
        }
      });

      console.log(`\n📊 Would migrate ${changeCount} out of ${tickets.length} tickets`);
    } else {
      // Run the actual migration
      const result = await migrateTicketNumbers();
      console.log('\n✅ Migration completed successfully!');
      console.log('To rollback, run: npm run migrate:tickets:rollback');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();