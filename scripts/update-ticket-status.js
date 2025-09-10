// Script to update ticket status
// Usage: node scripts/update-ticket-status.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateTicketStatus() {
  const ticketNumber = 'TKT-2025-001107';
  const newStatus = 'IN_PROGRESS'; // Change this to desired status
  
  try {
    // First, find the ticket by ticket number
    console.log(`\n🔍 Finding ticket ${ticketNumber}...`);
    const ticket = await prisma.ticket.findUnique({
      where: { ticketNumber },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        assignedTo: {
          select: { name: true, email: true }
        },
        createdBy: {
          select: { name: true, email: true }
        }
      }
    });

    if (!ticket) {
      console.error(`❌ Ticket ${ticketNumber} not found`);
      return;
    }

    console.log('\n📋 Current ticket details:');
    console.log(`  ID: ${ticket.id}`);
    console.log(`  Number: ${ticket.ticketNumber}`);
    console.log(`  Title: ${ticket.title}`);
    console.log(`  Current Status: ${ticket.status}`);
    console.log(`  Created By: ${ticket.createdBy?.name || 'Unknown'}`);
    console.log(`  Assigned To: ${ticket.assignedTo?.name || 'Unassigned'}`);

    // Update the ticket status
    console.log(`\n🔄 Updating status from ${ticket.status} to ${newStatus}...`);
    
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      select: {
        id: true,
        ticketNumber: true,
        status: true,
        updatedAt: true
      }
    });

    console.log('\n✅ Ticket updated successfully!');
    console.log(`  New Status: ${updatedTicket.status}`);
    console.log(`  Updated At: ${updatedTicket.updatedAt}`);

    // Show example API calls
    console.log('\n📡 To update this ticket via API, you can use:');
    console.log('\n1. Using cURL (with session cookie):');
    console.log(`curl -X PUT https://localhost:443/api/tickets/${ticket.id}/status \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-session-cookie" \\
  -d '{
    "status": "${newStatus}",
    "reason": "Starting work on this ticket"
  }'`);

    console.log('\n2. Using cURL (with API key):');
    console.log(`curl -X PATCH https://localhost:443/api/tickets/${ticket.id}/status \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: your-api-key" \\
  -d '{
    "status": "${newStatus}",
    "reason": "Starting work on this ticket"
  }'`);

    console.log('\n3. Using JavaScript (from within the app):');
    console.log(`const response = await fetch('/api/tickets/${ticket.id}/status', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: '${newStatus}',
    reason: 'Starting work on this ticket'
  })
});`);

    console.log('\n4. Using the existing PUT endpoint for full ticket update:');
    console.log(`curl -X PUT https://localhost:443/api/tickets/${ticket.id} \\
  -H "Content-Type: application/json" \\
  -H "Cookie: your-session-cookie" \\
  -d '{
    "status": "${newStatus}"
  }'`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateTicketStatus();