import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function backupTicketCategories() {
  try {
    console.log('💾 Creating backup of ticket categories...\n');

    // Find "General Services" category ID
    const generalServicesCategory = await prisma.category.findFirst({
      where: {
        name: {
          contains: 'General',
          mode: 'insensitive'
        }
      }
    });

    if (!generalServicesCategory) {
      console.log('❌ General Services category not found');
      return;
    }

    // Get all tickets with this category
    const tickets = await prisma.ticket.findMany({
      where: {
        categoryId: generalServicesCategory.id
      },
      select: {
        id: true,
        ticketNumber: true,
        categoryId: true
      }
    });

    console.log(`📊 Found ${tickets.length} tickets to backup\n`);

    // Create backup data
    const backup = {
      timestamp: new Date().toISOString(),
      generalServicesCategoryId: generalServicesCategory.id,
      totalTickets: tickets.length,
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        categoryId: t.categoryId
      }))
    };

    // Save to file
    const backupDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `ticket-categories-backup-${Date.now()}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    console.log('✅ Backup created successfully!');
    console.log(`   File: ${filepath}`);
    console.log(`   Tickets backed up: ${tickets.length}`);
    console.log(`\n💡 To rollback, run: npx tsx scripts/rollback-ticket-categories.ts ${filename}\n`);

    return filepath;

  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupTicketCategories();
