const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUserAndTickets() {
  try {
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { contains: 'Frigia', mode: 'insensitive' } },
          { username: { contains: 'Pasla', mode: 'insensitive' } },
          { email: { contains: 'Frigia', mode: 'insensitive' } },
          { email: { contains: 'Pasla', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            name: true
          }
        }
      }
    });

    if (user) {
      console.log('User found:', JSON.stringify(user, null, 2));

      // Check recent tickets by this user
      const recentTickets = await prisma.ticket.findMany({
        where: {
          createdById: user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          createdAt: true
        }
      });

      console.log('\nRecent tickets by this user:');
      console.log(JSON.stringify(recentTickets, null, 2));

      // Check if user has required relations
      if (!user.branchId) {
        console.log('\nWARNING: User has no branch assigned!');
      }

    } else {
      console.log('User not found with name containing Frigia or Pasla');

      // List all users to help find the correct one
      const allUsers = await prisma.user.findMany({
        select: {
          username: true,
          email: true,
          role: true
        },
        orderBy: {
          username: 'asc'
        }
      });

      console.log('\nAll users in system:');
      allUsers.forEach(u => console.log(`- ${u.username} (${u.role})`));
    }

    // Check recent ticket creation errors in audit logs
    const recentErrors = await prisma.auditLog.findMany({
      where: {
        AND: [
          { action: { contains: 'ticket', mode: 'insensitive' } },
          { details: { contains: 'error', mode: 'insensitive' } }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5,
      select: {
        userId: true,
        action: true,
        details: true,
        createdAt: true,
        user: {
          select: {
            username: true
          }
        }
      }
    });

    if (recentErrors.length > 0) {
      console.log('\nRecent ticket errors in audit logs:');
      console.log(JSON.stringify(recentErrors, null, 2));
    }

  } catch (error) {
    console.error('Error checking user and tickets:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserAndTickets();