const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserBranch() {
  try {
    // Find Frigia user with full details
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'frigia', mode: 'insensitive' } },
          { email: { contains: 'frigia', mode: 'insensitive' } }
        ]
      },
      include: {
        branch: true,
        supportGroup: true
      }
    });

    if (user) {
      console.log('User found:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        branchId: user.branchId,
        branchName: user.branch?.name || 'NO BRANCH ASSIGNED',
        supportGroupId: user.supportGroupId,
        supportGroupName: user.supportGroup?.name || 'NO SUPPORT GROUP'
      });

      if (!user.branchId) {
        console.log('\nERROR: User has no branch assigned!');
        console.log('This will cause ticket creation to fail.');

        // Find a suitable branch to assign
        const branches = await prisma.branch.findMany({
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true
          }
        });

        console.log('\nAvailable branches:');
        branches.forEach(b => console.log(`- ${b.id}: ${b.name} (${b.code})`));
      }

      // Check if user can create tickets by looking at recent successful tickets
      const recentTicket = await prisma.ticket.findFirst({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          ticketNumber: true,
          createdById: true,
          branchId: true,
          createdAt: true,
          createdBy: {
            select: {
              username: true,
              branchId: true
            }
          }
        }
      });

      console.log('\nMost recent ticket for reference:');
      console.log({
        ticketNumber: recentTicket?.ticketNumber,
        createdBy: recentTicket?.createdBy?.username,
        createdByBranchId: recentTicket?.createdBy?.branchId,
        ticketBranchId: recentTicket?.branchId,
        createdAt: recentTicket?.createdAt
      });

    } else {
      console.log('User not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserBranch();