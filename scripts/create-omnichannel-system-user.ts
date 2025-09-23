import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';

async function createOmnichannelSystemUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        username: 'omnichannel_system'
      }
    });

    if (existingUser) {
      console.log('✅ Omnichannel system user already exists:', existingUser.id);
      return;
    }

    // Get main branch
    const mainBranch = await prisma.branch.findFirst({
      where: {
        OR: [
          { code: '001' },
          { name: { contains: 'Cabang Utama', mode: 'insensitive' } }
        ],
        isActive: true
      }
    });

    if (!mainBranch) {
      throw new Error('Main branch not found');
    }

    // Create system user
    const hashedPassword = await bcrypt.hash('SystemUser2025!', 10);

    const systemUser = await prisma.user.create({
      data: {
        username: 'omnichannel_system',
        email: 'omnichannel@system.local',
        name: 'Omnichannel System',
        role: 'USER',
        branchId: mainBranch.id,
        password: hashedPassword,
        isActive: true
      }
    });

    console.log('✅ Created omnichannel system user:', systemUser.id);
    console.log('   Username:', systemUser.username);
    console.log('   Branch:', mainBranch.name);

  } catch (error) {
    console.error('❌ Error creating system user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createOmnichannelSystemUser();