const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function assignSupportGroups() {
  try {
    // Find or create IT_HELPDESK support group
    let itHelpdesk = await prisma.supportGroup.findFirst({
      where: { code: 'IT_HELPDESK' }
    });

    if (!itHelpdesk) {
      console.log('Creating IT_HELPDESK support group...');
      itHelpdesk = await prisma.supportGroup.create({
        data: {
          code: 'IT_HELPDESK',
          name: 'IT Helpdesk',
          description: 'Main IT support team handling general technical issues',
          isActive: true
        }
      });
      console.log('✅ Created IT_HELPDESK support group');
    } else {
      console.log('✅ IT_HELPDESK support group exists');
    }

    // Find technicians mentioned by the user: frigia.pasla and brayend.tamusa
    const technicianUsernames = ['frigia.pasla', 'brayend.tamusa', 'razaan.botutihe'];
    
    for (const username of technicianUsernames) {
      const user = await prisma.user.findFirst({
        where: { 
          username: username,
          role: 'TECHNICIAN'
        },
        include: {
          supportGroup: true
        }
      });

      if (user) {
        if (!user.supportGroupId) {
          // Assign to IT_HELPDESK
          await prisma.user.update({
            where: { id: user.id },
            data: { supportGroupId: itHelpdesk.id }
          });
          console.log(`✅ Assigned ${user.username} to IT_HELPDESK support group`);
        } else {
          console.log(`ℹ️ ${user.username} already has support group: ${user.supportGroup?.name}`);
        }
      } else {
        console.log(`⚠️ User ${username} not found or not a TECHNICIAN`);
      }
    }

    // Also find all technicians without a support group and assign them to IT_HELPDESK
    const unassignedTechnicians = await prisma.user.findMany({
      where: {
        role: 'TECHNICIAN',
        supportGroupId: null
      }
    });

    if (unassignedTechnicians.length > 0) {
      console.log(`\nFound ${unassignedTechnicians.length} unassigned technicians. Assigning to IT_HELPDESK...`);
      
      for (const tech of unassignedTechnicians) {
        await prisma.user.update({
          where: { id: tech.id },
          data: { supportGroupId: itHelpdesk.id }
        });
        console.log(`✅ Assigned ${tech.username} to IT_HELPDESK`);
      }
    } else {
      console.log('\n✅ All technicians already have support groups assigned');
    }

    console.log('\n🎉 Support group assignment completed!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assignSupportGroups();