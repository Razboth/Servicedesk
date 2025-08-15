const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateSupportGroups() {
  try {
    console.log('Starting support groups migration...');

    // Define default support groups based on the previous enum
    const supportGroups = [
      {
        code: 'IT_HELPDESK',
        name: 'IT Helpdesk',
        description: 'Main IT support team handling general technical issues'
      },
      {
        code: 'DUKUNGAN_DAN_LAYANAN',
        name: 'Dukungan dan Layanan',
        description: 'Service and support team for business applications'
      },
      {
        code: 'SECURITY',
        name: 'Security Team',
        description: 'Information security and compliance team'
      },
      {
        code: 'NETWORK',
        name: 'Network Team',
        description: 'Network infrastructure and connectivity support'
      }
    ];

    // Create support groups
    console.log('Creating support groups...');
    for (const group of supportGroups) {
      const existing = await prisma.supportGroup.findUnique({
        where: { code: group.code }
      });

      if (!existing) {
        await prisma.supportGroup.create({
          data: {
            code: group.code,
            name: group.name,
            description: group.description,
            isActive: true
          }
        });
        console.log(`Created support group: ${group.name}`);
      } else {
        console.log(`Support group already exists: ${group.name}`);
      }
    }

    // Get IT_HELPDESK support group for default assignment
    const defaultGroup = await prisma.supportGroup.findUnique({
      where: { code: 'IT_HELPDESK' }
    });

    if (!defaultGroup) {
      throw new Error('Default support group IT_HELPDESK not found');
    }

    // Update services that don't have a supportGroupId
    console.log('\nUpdating services without support group...');
    const servicesUpdated = await prisma.service.updateMany({
      where: { supportGroupId: null },
      data: { supportGroupId: defaultGroup.id }
    });
    console.log(`Updated ${servicesUpdated.count} services with default support group`);

    // Update tickets that don't have a supportGroupId
    console.log('\nUpdating tickets without support group...');
    const ticketsUpdated = await prisma.ticket.updateMany({
      where: { supportGroupId: null },
      data: { supportGroupId: defaultGroup.id }
    });
    console.log(`Updated ${ticketsUpdated.count} tickets with default support group`);

    // Assign technicians to IT_HELPDESK by default
    console.log('\nAssigning technicians to default support group...');
    const techniciansUpdated = await prisma.user.updateMany({
      where: {
        role: 'TECHNICIAN',
        supportGroupId: null
      },
      data: { supportGroupId: defaultGroup.id }
    });
    console.log(`Updated ${techniciansUpdated.count} technicians with default support group`);

    console.log('\n✓ Support groups migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateSupportGroups()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });