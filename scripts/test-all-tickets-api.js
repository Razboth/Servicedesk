const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAllTicketsAPI() {
  try {
    console.log('Testing All Tickets Report API logic...\n');
    
    // Simulate the API query
    const whereClause = {};
    
    // Get total count
    const totalCount = await prisma.ticket.count({ where: whereClause });
    console.log('Total tickets count:', totalCount);
    
    // Try to fetch tickets with the same include structure (but without the problematic fields)
    console.log('\nTrying to fetch tickets with includes...');
    
    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      take: 5,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            branch: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        service: {
          select: {
            id: true,
            name: true,
            supportGroup: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        approvals: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            createdAt: true,
            approver: {
              select: {
                name: true
              }
            }
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        attachments: {
          select: {
            id: true
          }
        }
      }
    });
    
    console.log('Successfully fetched', tickets.length, 'tickets');
    
    // Display first ticket details
    if (tickets.length > 0) {
      const firstTicket = tickets[0];
      console.log('\nFirst ticket details:');
      console.log('- Number:', firstTicket.ticketNumber);
      console.log('- Title:', firstTicket.title);
      console.log('- Status:', firstTicket.status);
      console.log('- Priority:', firstTicket.priority);
      console.log('- Created by:', firstTicket.createdBy?.name || 'Unknown');
      console.log('- Service:', firstTicket.service?.name || 'Unknown');
      console.log('- Comments:', firstTicket.comments.length);
      console.log('- Attachments:', firstTicket.attachments.length);
      
      // Check the categoryId fields
      console.log('\n3-tier category IDs (raw fields):');
      console.log('- categoryId:', firstTicket.categoryId || 'null');
      console.log('- subcategoryId:', firstTicket.subcategoryId || 'null');
      console.log('- itemId:', firstTicket.itemId || 'null');
    }
    
    // Calculate statistics
    const stats = {
      total: totalCount,
      open: await prisma.ticket.count({ where: { ...whereClause, status: 'OPEN' } }),
      inProgress: await prisma.ticket.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
      resolved: await prisma.ticket.count({ where: { ...whereClause, status: 'RESOLVED' } }),
      closed: await prisma.ticket.count({ where: { ...whereClause, status: 'CLOSED' } }),
      pending: await prisma.ticket.count({ 
        where: { 
          ...whereClause, 
          status: { in: ['PENDING', 'PENDING_APPROVAL', 'PENDING_VENDOR'] } 
        } 
      })
    };
    
    console.log('\nStatistics:');
    console.log('- Total:', stats.total);
    console.log('- Open:', stats.open);
    console.log('- In Progress:', stats.inProgress);
    console.log('- Resolved:', stats.resolved);
    console.log('- Closed:', stats.closed);
    console.log('- Pending:', stats.pending);
    
  } catch (error) {
    console.error('Error testing API:', error);
    console.error('Error details:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testAllTicketsAPI();