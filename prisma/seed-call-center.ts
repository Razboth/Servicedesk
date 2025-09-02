import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedCallCenter() {
  console.log('🎧 Seeding Call Center support group and agents...');

  try {
    // Create Call Center support group
    const callCenterGroup = await prisma.supportGroup.upsert({
      where: { code: 'CALL_CENTER' },
      update: {
        name: 'Call Center',
        description: 'Call center agents handling transaction claims and customer inquiries across all branches',
        isActive: true
      },
      create: {
        code: 'CALL_CENTER',
        name: 'Call Center',
        description: 'Call center agents handling transaction claims and customer inquiries across all branches',
        isActive: true
      }
    });

    console.log('✅ Created Call Center support group');

    // Get HQ branch for Call Center agents
    const hqBranch = await prisma.branch.findFirst({
      where: { 
        OR: [
          { code: 'HQ' },
          { name: { contains: 'Kantor Pusat' } },
          { name: { contains: 'Head Office' } }
        ]
      }
    });

    if (!hqBranch) {
      console.log('⚠️ HQ branch not found, using first available branch');
    }

    const branchId = hqBranch?.id || (await prisma.branch.findFirst())?.id;

    if (!branchId) {
      throw new Error('No branches found in database');
    }

    // Create Call Center agent users
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    const callCenterAgents = [
      {
        username: 'cc_agent1',
        email: 'cc.agent1@banksulutgo.co.id',
        name: 'Call Center Agent 1',
        role: 'TECHNICIAN' as const  // Using TECHNICIAN role for Call Center agents
      },
      {
        username: 'cc_agent2',
        email: 'cc.agent2@banksulutgo.co.id',
        name: 'Call Center Agent 2',
        role: 'TECHNICIAN' as const
      },
      {
        username: 'cc_supervisor',
        email: 'cc.supervisor@banksulutgo.co.id',
        name: 'Call Center Supervisor',
        role: 'TECHNICIAN' as const
      }
    ];

    for (const agent of callCenterAgents) {
      const user = await prisma.user.upsert({
        where: { username: agent.username },
        update: {
          name: agent.name,
          email: agent.email,
          role: agent.role,
          supportGroupId: callCenterGroup.id,
          branchId: branchId,
          isActive: true
        },
        create: {
          username: agent.username,
          email: agent.email,
          name: agent.name,
          password: hashedPassword,
          role: agent.role,
          supportGroupId: callCenterGroup.id,
          branchId: branchId,
          isActive: true
        }
      });

      console.log(`✅ Created Call Center agent: ${user.name}`);
    }

    // Link transaction-related services to Call Center support group
    // Find all claim-related services
    const claimServices = await prisma.service.findMany({
      where: {
        OR: [
          { name: { contains: 'Claim' } },
          { name: { contains: 'claim' } },
          { name: { contains: 'Transaction' } },
          { name: { contains: 'Dispute' } }
        ]
      }
    });

    console.log(`Found ${claimServices.length} claim-related services to link to Call Center`);

    // Update services to include Call Center support group
    // Note: Services can only have one support group in current schema
    // So we'll create a note about which services Call Center should handle
    
    for (const service of claimServices) {
      // Add a note in the service description if not already present
      if (service.description && !service.description.includes('Call Center')) {
        await prisma.service.update({
          where: { id: service.id },
          data: {
            description: service.description + ' [Call Center handles customer inquiries]'
          }
        });
      }
      console.log(`📞 Marked service for Call Center handling: ${service.name}`);
    }

    // Create audit log entry
    const systemUser = await prisma.user.findFirst({
      where: { username: 'system' }
    });

    if (systemUser) {
      await prisma.auditLog.create({
        data: {
          userId: systemUser.id,
          action: 'SEED_CALL_CENTER',
          entity: 'SUPPORT_GROUP',
          entityId: callCenterGroup.id,
          oldValues: {},
          newValues: {
            supportGroup: 'Call Center',
            agents: callCenterAgents.map(a => a.username)
          }
        }
      });
    }

    console.log('🎉 Call Center setup completed successfully!');

  } catch (error) {
    console.error('Error seeding Call Center:', error);
    throw error;
  }
}

// Run the seed function
if (require.main === module) {
  seedCallCenter()
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default seedCallCenter;