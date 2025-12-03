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
    // Find the services to auto-close
    const services = await prisma.service.findMany({
      where: {
        name: {
          in: ['ATM Monitoring Alert', 'ATM - Automatic Report']
        }
      },
      select: { id: true, name: true }
    });

    if (services.length === 0) {
      console.log('❌ No auto-close services found');
      return;
    }

    console.log(`✅ Found ${services.length} services to auto-close:`);
    services.forEach(s => console.log(`   - ${s.name} (${s.id})`));

    const serviceIds = services.map(s => s.id);

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    console.log(`📅 Cutoff date: ${threeDaysAgo.toISOString()}`);

    // Find all open/in-progress tickets for these services older than 3 days
    const ticketsToClose = await prisma.ticket.findMany({
      where: {
        serviceId: { in: serviceIds },
        status: {
          notIn: ['CLOSED', 'CANCELLED']
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
