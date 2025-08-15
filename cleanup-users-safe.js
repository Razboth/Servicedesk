const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupUsersSafely() {
  console.log('🧹 Safely cleaning up users and related data...');

  try {
    // Get users to cleanup (excluding system users)
    const usersToCleanup = await prisma.user.findMany({
      where: {
        email: {
          notIn: ['admin@banksulutgo.co.id', 'system@banksulutgo.co.id', 'security.analyst@banksulutgo.co.id']
        }
      },
      select: { id: true, email: true, name: true }
    });

    console.log(`📊 Found ${usersToCleanup.length} users to clean up`);

    // Delete in correct order to respect foreign key constraints
    for (const user of usersToCleanup) {
      console.log(`\n🔄 Processing user: ${user.name} (${user.email})`);

      // 1. Delete ticket-related data
      const ticketIds = await prisma.ticket.findMany({
        where: {
          OR: [
            { createdById: user.id },
            { assignedToId: user.id }
          ]
        },
        select: { id: true }
      });

      if (ticketIds.length > 0) {
        const ids = ticketIds.map(t => t.id);
        
        // Delete ticket tasks
        await prisma.ticketTask.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted ticket tasks`);

        // Delete ticket field values
        await prisma.ticketFieldValue.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted ticket field values`);

        // Delete ticket comments
        await prisma.ticketComment.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted ticket comments`);

        // Delete ticket attachments
        await prisma.ticketAttachment.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted ticket attachments`);

        // Delete ticket approvals
        await prisma.ticketApproval.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted ticket approvals`);

        // Delete SLA tracking
        await prisma.sLATracking.deleteMany({
          where: { ticketId: { in: ids } }
        });
        console.log(`  ✅ Deleted SLA tracking`);

        // Delete tickets
        await prisma.ticket.deleteMany({
          where: { id: { in: ids } }
        });
        console.log(`  ✅ Deleted ${ticketIds.length} tickets`);
      }

      // 2. Delete other user-related data
      await prisma.ticketComment.deleteMany({
        where: { userId: user.id }
      });

      await prisma.ticketApproval.deleteMany({
        where: { approverId: user.id }
      });

      await prisma.ticketTask.deleteMany({
        where: { completedById: user.id }
      });

      await prisma.auditLog.deleteMany({
        where: { userId: user.id }
      });

      // 3. Finally delete the user
      await prisma.user.delete({
        where: { id: user.id }
      });
      console.log(`  ✅ Deleted user: ${user.name}`);
    }

    console.log('\n✅ User cleanup completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`• Cleaned up ${usersToCleanup.length} users and their related data`);
    console.log(`• Kept system users: admin, system, security.analyst`);
    console.log('\nYou can now run seed-updated-users.js to create fresh users');

  } catch (error) {
    console.error('❌ Error during user cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupUsersSafely()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });