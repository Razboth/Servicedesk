const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addManagerITSupportGroup() {
  try {
    console.log('🔍 Checking for existing MANAGER_IT support group...');

    // Check if MANAGER_IT support group already exists
    const existingGroup = await prisma.supportGroup.findUnique({
      where: { code: 'MANAGER_IT' }
    });

    if (existingGroup) {
      console.log('✅ MANAGER_IT support group already exists');
      return;
    }

    // Create MANAGER_IT support group
    const managerITGroup = await prisma.supportGroup.create({
      data: {
        name: 'IT Manager',
        code: 'MANAGER_IT',
        description: 'IT Management team responsible for overseeing IT operations and escalations',
        isActive: true
      }
    });

    console.log('✅ Created MANAGER_IT support group:', managerITGroup.name);

    // Find users with MANAGER role who might be IT managers
    const managers = await prisma.user.findMany({
      where: {
        role: 'MANAGER',
        isActive: true,
        OR: [
          { email: { contains: 'it' } },
          { name: { contains: 'IT' } },
          { supportGroupId: null }
        ]
      }
    });

    if (managers.length > 0) {
      console.log(`🔍 Found ${managers.length} potential IT managers`);

      // Optionally assign managers to the group
      for (const manager of managers) {
        if (manager.email.toLowerCase().includes('it') || manager.name.toLowerCase().includes('it')) {
          await prisma.user.update({
            where: { id: manager.id },
            data: { supportGroupId: managerITGroup.id }
          });
          console.log(`  ✓ Assigned ${manager.name} to MANAGER_IT group`);
        }
      }
    }

    // Create or update services that might need IT manager escalation
    const servicesNeedingITManager = [
      'System Access Request',
      'Hardware Request',
      'Software Installation',
      'Network Configuration',
      'Security Incident'
    ];

    for (const serviceName of servicesNeedingITManager) {
      const service = await prisma.service.findFirst({
        where: { name: serviceName }
      });

      if (service && !service.escalationGroupId) {
        await prisma.service.update({
          where: { id: service.id },
          data: { escalationGroupId: managerITGroup.id }
        });
        console.log(`  ✓ Set MANAGER_IT as escalation group for ${serviceName}`);
      }
    }

    console.log('✅ MANAGER_IT support group setup completed successfully');

  } catch (error) {
    console.error('❌ Error adding MANAGER_IT support group:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addManagerITSupportGroup()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });