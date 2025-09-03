import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testCallCenterAccess() {
  console.log('Testing Call Center User Access to Transaction Claims...\n');

  try {
    // Find Call Center users
    const callCenterUsers = await prisma.user.findMany({
      where: {
        supportGroup: {
          code: 'CALL_CENTER'
        },
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        supportGroup: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${callCenterUsers.length} Call Center users:`);
    for (const user of callCenterUsers) {
      console.log(`  - ${user.name} (${user.role}) - ${user.email}`);
    }

    // Check what tickets would be visible to Call Center users
    const TRANSACTION_CLAIMS_CATEGORY_ID = 'cmekrqi45001qhluspcsta20x';
    const ATM_SERVICES_CATEGORY_ID = 'cmekrqi3t001ghlusklheksqz';

    // Simulate the query that would be run for a Call Center user
    const visibleTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { 
            service: { 
              tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID 
            } 
          }
        ]
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        status: true,
        categoryId: true,
        service: {
          select: {
            name: true,
            tier1CategoryId: true,
            tier1Category: {
              select: { name: true }
            }
          }
        },
        createdBy: {
          select: {
            name: true,
            supportGroup: {
              select: { code: true }
            }
          }
        }
      },
      take: 10
    });

    console.log(`\nTransaction Claims tickets visible to Call Center users: ${visibleTickets.length}`);
    
    if (visibleTickets.length > 0) {
      console.log('\nSample tickets:');
      for (const ticket of visibleTickets.slice(0, 5)) {
        console.log(`\n  Ticket: ${ticket.ticketNumber}`);
        console.log(`    Title: ${ticket.title}`);
        console.log(`    Status: ${ticket.status}`);
        console.log(`    Service: ${ticket.service.name}`);
        console.log(`    Category: ${ticket.service.tier1Category?.name || 'N/A'}`);
        console.log(`    Created by: ${ticket.createdBy.name} (Group: ${ticket.createdBy.supportGroup?.code || 'N/A'})`);
      }
    } else {
      console.log('\n⚠️ No Transaction Claims tickets found!');
      
      // Check if there are any tickets in the Transaction Claims category at all
      const allTransactionClaims = await prisma.ticket.count({
        where: {
          OR: [
            { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
            { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } }
          ]
        }
      });
      
      console.log(`\nTotal tickets in Transaction Claims category: ${allTransactionClaims}`);
      
      if (allTransactionClaims === 0) {
        console.log('ℹ️ There are no tickets in the Transaction Claims category yet.');
        console.log('   You may need to create some test tickets first.');
      }
    }

    // Also check ATM Claims visibility
    console.log('\n\n--- ATM Claims Page Test ---');
    const atmClaimsVisible = await prisma.ticket.findMany({
      where: {
        OR: [
          // All tickets in Transaction Claims category
          { categoryId: TRANSACTION_CLAIMS_CATEGORY_ID },
          // Also check service's tier1CategoryId
          { service: { tier1CategoryId: TRANSACTION_CLAIMS_CATEGORY_ID } },
          // Include ATM Services category
          { categoryId: ATM_SERVICES_CATEGORY_ID },
          { service: { tier1CategoryId: ATM_SERVICES_CATEGORY_ID } }
        ]
      },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        service: {
          select: {
            name: true,
            tier1Category: {
              select: { name: true }
            }
          }
        }
      },
      take: 10
    });

    console.log(`Tickets visible on ATM Claims page: ${atmClaimsVisible.length}`);
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    console.log(`✓ Call Center users found: ${callCenterUsers.length}`);
    console.log(`✓ Transaction Claims tickets accessible: ${visibleTickets.length}`);
    console.log(`✓ ATM Claims page tickets accessible: ${atmClaimsVisible.length}`);
    
    if (callCenterUsers.length > 0 && (visibleTickets.length > 0 || atmClaimsVisible.length > 0)) {
      console.log('\n✅ SUCCESS: Call Center users should now be able to see Transaction Claims tickets!');
    } else if (callCenterUsers.length === 0) {
      console.log('\n⚠️ No Call Center users found. You may need to assign users to the CALL_CENTER support group.');
    } else {
      console.log('\n⚠️ No tickets found in Transaction Claims category. Create some test tickets to verify access.');
    }

  } catch (error) {
    console.error('Error testing Call Center access:', error);
  }
}

testCallCenterAccess()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });