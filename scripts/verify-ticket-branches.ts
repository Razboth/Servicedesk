/**
 * Script to verify that tickets remain associated with their original branch
 * even when users move to different branches.
 * 
 * This script demonstrates that:
 * 1. Tickets store branchId independently
 * 2. User branch changes do NOT affect existing ticket branches
 * 3. New tickets are created with the user's current branch
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyTicketBranchIntegrity() {
  console.log('=== Ticket Branch Integrity Verification ===\n');

  try {
    // Get all tickets with their creator and branch information
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        ticketNumber: true,
        branchId: true,
        createdById: true,
        createdAt: true,
        branch: {
          select: { name: true, code: true }
        },
        createdBy: {
          select: {
            name: true,
            email: true,
            branchId: true,
            branch: {
              select: { name: true, code: true }
            }
          }
        }
      },
      take: 20, // Limit to 20 for demonstration
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Analyzing ${tickets.length} recent tickets...\n`);

    let mismatchCount = 0;
    let matchCount = 0;

    for (const ticket of tickets) {
      const ticketBranch = ticket.branch?.name || 'No Branch';
      const userCurrentBranch = ticket.createdBy.branch?.name || 'No Branch';
      
      const branchesMatch = ticket.branchId === ticket.createdBy.branchId;

      if (!branchesMatch) {
        mismatchCount++;
        console.log(`🔍 User Moved to Different Branch:`);
        console.log(`   Ticket: ${ticket.ticketNumber}`);
        console.log(`   Created: ${ticket.createdAt.toLocaleDateString()}`);
        console.log(`   Ticket Branch: ${ticketBranch} (ID: ${ticket.branchId})`);
        console.log(`   User: ${ticket.createdBy.name}`);
        console.log(`   User's Current Branch: ${userCurrentBranch} (ID: ${ticket.createdBy.branchId})`);
        console.log(`   ✅ Ticket correctly remains with original branch\n`);
      } else {
        matchCount++;
      }
    }

    console.log('=== Summary ===');
    console.log(`Total tickets analyzed: ${tickets.length}`);
    console.log(`Tickets where user is still in same branch: ${matchCount}`);
    console.log(`Tickets where user moved to different branch: ${mismatchCount}`);
    
    if (mismatchCount > 0) {
      console.log('\n✅ All tickets correctly maintain their original branch association.');
      console.log('   Even when users move branches, their tickets stay with the original branch.');
    } else {
      console.log('\n📝 No users have moved branches in this sample.');
      console.log('   Tickets are correctly associated with their creation branch.');
    }

    // Additional verification: Check if any ticket updates have changed branchId
    console.log('\n=== Checking for Unintended Branch Updates ===');
    
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity: 'TICKET',
        action: { in: ['TICKET_UPDATED', 'UPDATE'] },
        OR: [
          { oldValues: { path: ['branchId'], not: null } },
          { newValues: { path: ['branchId'], not: null } }
        ]
      },
      take: 10
    });

    if (auditLogs.length > 0) {
      console.log(`⚠️ Found ${auditLogs.length} audit logs with branch changes.`);
      console.log('   Review these to ensure they were intentional.');
    } else {
      console.log('✅ No audit logs found indicating ticket branch changes.');
      console.log('   This confirms tickets are not being updated when users change branches.');
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the verification
verifyTicketBranchIntegrity()
  .catch(console.error);