/**
 * Script to automatically close ATM Monitoring Alert tickets after 3 days
 * Run with: npx tsx scripts/auto-close-monitoring-tickets.ts
 *
 * Can be scheduled via cron:
 * 0 0 * * * cd /path/to/project && npx tsx scripts/auto-close-monitoring-tickets.ts >> logs/auto-close.log 2>&1
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`\n[${new Date().toISOString()}] Starting auto-close task for ATM Monitoring Alert tickets...\n`);

  try {
    // Find the ATM Monitoring Alert service
    const service = await prisma.service.findFirst({
      where: { name: 'ATM Monitoring Alert' },
      select: { id: true, name: true }
    });

    if (!service) {
      console.log('❌ ATM Monitoring Alert service not found');
      return;
    }

    console.log(`✅ Found service: ${service.name} (${service.id})`);

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log(`📅 Cutoff date: ${threeDaysAgo.toISOString()}`);

    // Find all open/in-progress ATM Monitoring Alert tickets older than 3 days
    const ticketsToClose = await prisma.ticket.findMany({
      where: {
        serviceId: service.id,
        status: {
          in: ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED']
        },
        createdAt: {
          lt: threeDaysAgo
        }
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        createdAt: true
      }
    });

    console.log(`📋 Found ${ticketsToClose.length} tickets to close\n`);

    if (ticketsToClose.length === 0) {
      console.log('✅ No tickets to close. Task completed.');
      return;
    }

    // Get or create a system user for the comment
    let systemUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'system@banksulutgo.co.id' },
          { name: 'System' }
        ]
      }
    });

    // If no system user exists, use the first admin
    if (!systemUser) {
      systemUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
      });
    }

    if (!systemUser) {
      console.log('❌ No system user or admin found to add comments');
      return;
    }

    console.log(`👤 Using user: ${systemUser.name} (${systemUser.email})\n`);

    const closedTickets: string[] = [];
    const errors: string[] = [];
    const now = new Date();

    // Close each ticket with a comment
    for (const ticket of ticketsToClose) {
      try {
        await prisma.$transaction(async (tx) => {
          // Update ticket status to CLOSED
          await tx.ticket.update({
            where: { id: ticket.id },
            data: {
              status: 'CLOSED',
              closedAt: now,
              resolvedAt: ticket.status !== 'RESOLVED' ? now : undefined
            }
          });

          // Add a system comment
          await tx.ticketComment.create({
            data: {
              ticketId: ticket.id,
              userId: systemUser!.id,
              content: 'Closed By System - Auto-closed after 3 days as per ATM Monitoring Alert policy.',
              isInternal: false
            }
          });
        });

        console.log(`✅ Closed: ${ticket.ticketNumber} - ${ticket.title.substring(0, 50)}...`);
        closedTickets.push(ticket.ticketNumber);
      } catch (err) {
        console.error(`❌ Failed to close ticket ${ticket.ticketNumber}:`, err);
        errors.push(ticket.ticketNumber);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully closed: ${closedTickets.length}`);
    if (errors.length > 0) {
      console.log(`   ❌ Failed: ${errors.length} (${errors.join(', ')})`);
    }
    console.log(`\n[${new Date().toISOString()}] Task completed.\n`);

  } catch (error) {
    console.error('❌ Error running auto-close task:', error);
    process.exit(1);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
