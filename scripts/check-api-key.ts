import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkApiKey() {
  const apiKey = 'sk_live_wTULAFz5FPRmi-WKiOQ_zYiw0ySajV1F';

  console.log('Checking API key:', apiKey);

  const key = await prisma.apiKey.findUnique({
    where: { key: apiKey },
    include: {
      createdBy: {
        select: { name: true, email: true }
      }
    }
  });

  if (key) {
    console.log('\n✅ API Key Found!');
    console.log('ID:', key.id);
    console.log('Name:', key.name);
    console.log('Description:', key.description);
    console.log('Is Active:', key.isActive);
    console.log('Expires At:', key.expiresAt);
    console.log('Permissions:', JSON.stringify(key.permissions, null, 2));
    console.log('Created By:', key.createdBy.name, `(${key.createdBy.email})`);
    console.log('Last Used:', key.lastUsedAt);
    console.log('Usage Count:', key.usageCount);
  } else {
    console.log('\n❌ API Key Not Found!');

    // Check if there are any API keys at all
    const allKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        isActive: true,
        permissions: true
      },
      take: 5
    });

    console.log('\nAvailable API Keys:');
    allKeys.forEach((k, i) => {
      console.log(`\n${i + 1}. ${k.name}`);
      console.log('   Key:', k.key);
      console.log('   Active:', k.isActive);
      console.log('   Permissions:', JSON.stringify(k.permissions, null, 2));
    });
  }

  await prisma.$disconnect();
}

checkApiKey().catch(console.error);
