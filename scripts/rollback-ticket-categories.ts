import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function rollbackTicketCategories() {
  try {
    const backupFilename = process.argv[2];

    if (!backupFilename) {
      console.log('❌ Usage: npx tsx scripts/rollback-ticket-categories.ts <backup-filename>');
      console.log('\nExample: npx tsx scripts/rollback-ticket-categories.ts ticket-categories-backup-1234567890.json');
      return;
    }

    const backupPath = path.join(process.cwd(), 'backups', backupFilename);

    if (!fs.existsSync(backupPath)) {
      console.log(`❌ Backup file not found: ${backupPath}`);
      return;
    }

    console.log('🔄 Rolling back ticket categories...\n');
    console.log(`📂 Reading backup: ${backupFilename}\n`);

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    console.log(`📊 Backup info:`);
    console.log(`   Created: ${backupData.timestamp}`);
    console.log(`   Total tickets: ${backupData.totalTickets}`);
    console.log(`   Category ID: ${backupData.generalServicesCategoryId}\n`);

    console.log('🚀 Restoring categories...\n');

    let restored = 0;
    const batchSize = 50;

    for (let i = 0; i < backupData.tickets.length; i += batchSize) {
      const batch = backupData.tickets.slice(i, i + batchSize);

      for (const ticket of batch) {
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { categoryId: ticket.categoryId }
        });
      }

      restored += batch.length;
      console.log(`   ✓ Restored ${restored}/${backupData.totalTickets} tickets...`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ROLLBACK COMPLETED');
    console.log('='.repeat(80));
    console.log(`\nRestored ${restored} tickets to their original categoryId\n`);

  } catch (error) {
    console.error('Error during rollback:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

rollbackTicketCategories();
