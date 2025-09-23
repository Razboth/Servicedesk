import { prisma } from '../lib/prisma';

async function createOmniBranch() {
  try {
    // Check if OMNI branch already exists
    const existingBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { code: 'OMNI' },
          { name: 'OMNICHANNEL' }
        ]
      }
    });

    if (existingBranch) {
      console.log('✅ OMNI branch already exists:', existingBranch.id);
      console.log('   Name:', existingBranch.name);
      console.log('   Code:', existingBranch.code);
      return;
    }

    // Create OMNI branch
    const omniBranch = await prisma.branch.create({
      data: {
        name: 'OMNICHANNEL',
        code: 'OMNI',
        address: 'Virtual Branch',
        city: 'Jakarta',
        province: 'DKI Jakarta',
        isActive: true,
        monitoringEnabled: false
      }
    });

    console.log('✅ Created OMNI branch:', omniBranch.id);
    console.log('   Name:', omniBranch.name);
    console.log('   Code:', omniBranch.code);

  } catch (error) {
    console.error('❌ Error creating OMNI branch:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOmniBranch();