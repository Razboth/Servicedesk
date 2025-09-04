const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSystemTickets() {
  try {
    // Check if system user exists
    const systemUser = await prisma.user.findFirst({
      where: { email: 'system@banksulutgo.co.id' }
    });
    
    console.log('System User:', systemUser ? {
      id: systemUser.id,
      username: systemUser.username,
      email: systemUser.email,
      role: systemUser.role,
      branchId: systemUser.branchId
    } : 'NOT FOUND');

    // Check recent tickets created by system user
    if (systemUser) {
      const systemTickets = await prisma.ticket.findMany({
        where: { createdById: systemUser.id },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          createdAt: true,
          branchId: true,
          supportGroupId: true,
          service: {
            select: {
              name: true,
              supportGroupId: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      
      console.log('\nRecent System Tickets:', systemTickets.length);
      systemTickets.forEach(ticket => {
        console.log(`- ${ticket.ticketNumber}: ${ticket.title}`);
        console.log(`  Status: ${ticket.status}, Branch: ${ticket.branchId}`);
        console.log(`  Support Group: ${ticket.supportGroupId || ticket.service?.supportGroupId || 'NONE'}`);
      });
    }

    // Check last 5 tickets regardless of creator
    const recentTickets = await prisma.ticket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        ticketNumber: true,
        title: true,
        createdBy: {
          select: {
            email: true,
            role: true
          }
        }
      }
    });
    
    console.log('\nLast 5 Tickets (any creator):');
    recentTickets.forEach(ticket => {
      console.log(`- ${ticket.ticketNumber}: ${ticket.title}`);
      console.log(`  Created by: ${ticket.createdBy?.email || 'MISSING USER'} (${ticket.createdBy?.role || 'NO ROLE'})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSystemTickets();