const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSupportGroupData() {
  try {
    console.log('🔍 Checking Support Group Data...\n');
    
    // Check support groups
    const supportGroups = await prisma.supportGroup.findMany({
      include: {
        services: { select: { name: true } },
        users: { 
          select: { 
            name: true, 
            role: true, 
            isActive: true,
            _count: {
              select: {
                assignedTickets: true
              }
            }
          } 
        },
        _count: {
          select: { 
            services: true, 
            users: true 
          }
        }
      }
    });

    console.log(`📊 Total Support Groups: ${supportGroups.length}`);
    
    if (supportGroups.length === 0) {
      console.log('❌ No support groups found in database!');
      return;
    }

    supportGroups.forEach((group, index) => {
      console.log(`\n${index + 1}. Support Group: ${group.name}`);
      console.log(`   Description: ${group.description || 'N/A'}`);
      console.log(`   Services: ${group._count.services}`);
      console.log(`   Users: ${group._count.users}`);
      console.log(`   Active Users: ${group.users.filter(u => u.isActive).length}`);
      
      if (group.services.length > 0) {
        console.log(`   Service Names: ${group.services.map(s => s.name).join(', ')}`);
      }
      
      if (group.users.length > 0) {
        console.log(`   User Names: ${group.users.map(u => `${u.name} (${u.role})`).join(', ')}`);
      }
    });

    // Check tickets with support group relationships
    console.log('\n🎫 Checking Ticket-Support Group Relationships...\n');
    
    const ticketsWithGroups = await prisma.ticket.findMany({
      select: {
        id: true,
        ticketNumber: true,
        priority: true,
        status: true,
        service: {
          select: {
            name: true,
            supportGroupId: true,
            supportGroup: {
              select: { name: true }
            }
          }
        },
        assignedTo: {
          select: {
            name: true,
            supportGroupId: true,
            supportGroup: {
              select: { name: true }
            }
          }
        }
      },
      take: 10
    });

    console.log(`📋 Sample Tickets with Support Group Data: ${ticketsWithGroups.length}`);
    
    ticketsWithGroups.forEach((ticket, index) => {
      console.log(`\n${index + 1}. Ticket ${ticket.ticketNumber}`);
      console.log(`   Service: ${ticket.service?.name || 'N/A'}`);
      console.log(`   Service Group: ${ticket.service?.supportGroup?.name || 'N/A'}`);
      console.log(`   Assigned To: ${ticket.assignedTo?.name || 'Unassigned'}`);
      console.log(`   Assignee Group: ${ticket.assignedTo?.supportGroup?.name || 'N/A'}`);
      console.log(`   Status: ${ticket.status} | Priority: ${ticket.priority}`);
    });

    // Check branches/departments
    console.log('\n🏢 Checking Branch/Department Data...\n');
    
    const branches = await prisma.branch.findMany({
      include: {
        users: {
          select: {
            name: true,
            role: true,
            isActive: true
          }
        },
        tickets: {
          select: {
            ticketNumber: true,
            status: true,
            priority: true
          },
          take: 3
        },
        _count: {
          select: {
            users: true,
            tickets: true,
            atms: true
          }
        }
      }
    });

    console.log(`🏢 Total Branches: ${branches.length}`);
    
    if (branches.length === 0) {
      console.log('❌ No branches found in database!');
      return;
    }

    branches.slice(0, 5).forEach((branch, index) => {
      console.log(`\n${index + 1}. Branch: ${branch.name} (${branch.code})`);
      console.log(`   Address: ${branch.address || 'N/A'}`);
      console.log(`   Users: ${branch._count.users} | Tickets: ${branch._count.tickets} | ATMs: ${branch._count.atms}`);
      console.log(`   Active Users: ${branch.users.filter(u => u.isActive).length}`);
      
      if (branch.users.length > 0) {
        console.log(`   User Roles: ${branch.users.map(u => u.role).join(', ')}`);
      }
      
      if (branch.tickets.length > 0) {
        console.log(`   Sample Tickets: ${branch.tickets.map(t => `${t.ticketNumber} (${t.status})`).join(', ')}`);
      }
    });

    // Check ticket distribution
    console.log('\n📈 Ticket Distribution Summary...\n');
    
    const totalTickets = await prisma.ticket.count();
    const ticketsByStatus = await prisma.ticket.groupBy({
      by: ['status'],
      _count: true
    });
    const ticketsByPriority = await prisma.ticket.groupBy({
      by: ['priority'],
      _count: true
    });

    console.log(`Total Tickets: ${totalTickets}`);
    console.log('By Status:');
    ticketsByStatus.forEach(item => {
      console.log(`  ${item.status}: ${item._count}`);
    });
    
    console.log('By Priority:');
    ticketsByPriority.forEach(item => {
      console.log(`  ${item.priority}: ${item._count}`);
    });

    // Check if tickets have proper relationships
    const ticketsWithoutServiceGroup = await prisma.ticket.count({
      where: {
        service: {
          supportGroupId: null
        }
      }
    });

    const ticketsWithoutAssigneeGroup = await prisma.ticket.count({
      where: {
        assignedTo: {
          supportGroupId: null
        }
      }
    });

    console.log('\n⚠️  Data Quality Issues:');
    console.log(`Tickets without Service Support Group: ${ticketsWithoutServiceGroup}`);
    console.log(`Tickets without Assignee Support Group: ${ticketsWithoutAssigneeGroup}`);

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSupportGroupData();