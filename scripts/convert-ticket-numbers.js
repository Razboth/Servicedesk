const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function convertTicketNumbers() {
  try {
    // Find all tickets with old format (containing 'TKT-')
    const oldFormatTickets = await prisma.ticket.findMany({
      where: {
        ticketNumber: {
          contains: 'TKT-'
        }
      },
      select: {
        id: true,
        ticketNumber: true
      }
    });

    console.log(`Found ${oldFormatTickets.length} tickets with old format`);

    if (oldFormatTickets.length === 0) {
      console.log('No tickets to convert');
      return;
    }

    // Convert each ticket
    let converted = 0;
    let failed = 0;

    for (const ticket of oldFormatTickets) {
      try {
        // Extract the sequential number from old format
        // Old format: TKT-2025-007244 -> New format: 7244
        const match = ticket.ticketNumber.match(/TKT-\d{4}-(\d+)/);

        if (match && match[1]) {
          // Remove leading zeros
          const newNumber = String(parseInt(match[1], 10));

          // Check if this new number already exists
          const exists = await prisma.ticket.findFirst({
            where: {
              ticketNumber: newNumber,
              id: { not: ticket.id }
            }
          });

          if (exists) {
            console.log(`⚠️  Cannot convert ${ticket.ticketNumber} to ${newNumber} - number already exists`);
            failed++;
            continue;
          }

          // Update the ticket number
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { ticketNumber: newNumber }
          });

          console.log(`✅ Converted ${ticket.ticketNumber} -> ${newNumber}`);
          converted++;
        } else {
          console.log(`⚠️  Cannot parse ticket number: ${ticket.ticketNumber}`);
          failed++;
        }
      } catch (error) {
        console.error(`❌ Failed to convert ticket ${ticket.id}:`, error.message);
        failed++;
      }
    }

    console.log(`\n📊 Conversion Summary:`);
    console.log(`   Total tickets found: ${oldFormatTickets.length}`);
    console.log(`   Successfully converted: ${converted}`);
    console.log(`   Failed/Skipped: ${failed}`);

  } catch (error) {
    console.error('Error during conversion:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the conversion
console.log('🔄 Starting ticket number conversion...\n');
convertTicketNumbers();