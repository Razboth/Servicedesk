import { prisma } from '../lib/prisma';

async function checkApiKeys() {
  try {
    const keys = await prisma.apiKey.findMany({
      where: {
        isActive: true
      },
      select: {
        name: true,
        key: true,
        permissions: true,
        createdAt: true,
        expiresAt: true
      }
    });

    // Filter for OMNICHANNEL keys
    const omnichannelKeys = keys.filter(key => {
      const perms = key.permissions as any;
      return perms?.service === 'OMNICHANNEL' ||
             perms?.services?.includes('OMNICHANNEL') ||
             key.name.toLowerCase().includes('omnichannel');
    });

    console.log('Found OMNICHANNEL API Keys:', JSON.stringify(omnichannelKeys, null, 2));

    if (omnichannelKeys.length > 0) {
      console.log('\nActive key to use:', omnichannelKeys[0].key);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKeys();