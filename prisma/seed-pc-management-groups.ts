import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPCManagementGroups() {
  console.log('🖥️  Seeding PC Management Support Groups...\n');

  const supportGroupsData = [
    {
      code: 'TECH_SUPPORT',
      name: 'Technical Support',
      description: 'Technical support for PC assets, licenses, and hardware - Full access to PC Management',
      isActive: true
    },
    {
      code: 'PC_AUDITOR',
      name: 'PC Auditor',
      description: 'Read-only access to PC Management system for audit and compliance purposes',
      isActive: true
    }
  ];

  const results = [];

  for (const groupData of supportGroupsData) {
    const existing = await prisma.supportGroup.findUnique({
      where: { code: groupData.code }
    });

    if (existing) {
      console.log(`   ✓ Support group '${groupData.code}' already exists`);
      results.push(existing);
    } else {
      const group = await prisma.supportGroup.create({ data: groupData });
      console.log(`   ✓ Created support group '${groupData.code}'`);
      results.push(group);
    }
  }

  console.log(`\n✅ PC Management support groups seeding complete!`);
  console.log(`   - TECH_SUPPORT: Full access to PC Management (create, edit, view)`);
  console.log(`   - PC_AUDITOR: Read-only access for auditors\n`);

  return results;
}

seedPCManagementGroups()
  .catch((e) => {
    console.error('Error seeding PC Management groups:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
