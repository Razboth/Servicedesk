import { PrismaClient, NetworkMedia } from '@prisma/client';

const prisma = new PrismaClient();

async function seedNetworkInfo() {
  try {
    console.log('Adding network information to branches and ATMs...');

    // Update some branches with network info
    const branches = await prisma.branch.findMany({
      take: 10,
      where: { isActive: true }
    });

    const networkConfigs = [
      { media: 'VSAT' as NetworkMedia, vendor: 'Telkomsat' },
      { media: 'M2M' as NetworkMedia, vendor: 'Telkomsel' },
      { media: 'FO' as NetworkMedia, vendor: 'Telkom' },
      { media: 'VSAT' as NetworkMedia, vendor: 'Indosat' },
      { media: 'M2M' as NetworkMedia, vendor: 'XL Axiata' }
    ];

    for (let i = 0; i < branches.length; i++) {
      const config = networkConfigs[i % networkConfigs.length];
      
      await prisma.branch.update({
        where: { id: branches[i].id },
        data: {
          ipAddress: branches[i].ipAddress || `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1`,
          backupIpAddress: `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.2`,
          networkMedia: config.media,
          networkVendor: config.vendor,
          monitoringEnabled: true
        }
      });

      console.log(`Updated branch ${branches[i].name} with ${config.media} (${config.vendor})`);
    }

    // Update ATMs with network info
    const atms = await prisma.aTM.findMany({
      take: 20,
      where: { isActive: true }
    });

    for (let i = 0; i < atms.length; i++) {
      const config = networkConfigs[i % networkConfigs.length];
      
      await prisma.aTM.update({
        where: { id: atms[i].id },
        data: {
          ipAddress: atms[i].ipAddress || `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          networkMedia: config.media,
          networkVendor: config.vendor
        }
      });

      console.log(`Updated ATM ${atms[i].code} with ${config.media} (${config.vendor})`);
    }

    // Create some sample ping results for demonstration
    console.log('\nCreating sample ping results...');
    
    const sampleBranch = branches[0];
    if (sampleBranch) {
      // Create successful ping
      await prisma.networkPingResult.create({
        data: {
          entityType: 'BRANCH',
          entityId: sampleBranch.id,
          branch: {
            connect: { id: sampleBranch.id }
          },
          ipAddress: sampleBranch.ipAddress!,
          ipType: 'PRIMARY',
          networkMedia: 'FO',
          networkVendor: 'Telkom',
          status: 'ONLINE',
          responseTimeMs: 45,
          packetLoss: 0,
          minRtt: 42.5,
          maxRtt: 48.2,
          avgRtt: 45.1,
          packetsTransmitted: 4,
          packetsReceived: 4
        }
      });

      // Create slow connection ping
      const secondBranch = branches[1] || sampleBranch;
      await prisma.networkPingResult.create({
        data: {
          entityType: 'BRANCH',
          entityId: secondBranch.id,
          branch: {
            connect: { id: secondBranch.id }
          },
          ipAddress: secondBranch.ipAddress || '10.0.0.2',
          ipType: 'PRIMARY',
          networkMedia: 'VSAT',
          networkVendor: 'Telkomsat',
          status: 'SLOW',
          responseTimeMs: 850,
          packetLoss: 5,
          minRtt: 820,
          maxRtt: 890,
          avgRtt: 850,
          packetsTransmitted: 4,
          packetsReceived: 4
        }
      });
    }

    const sampleATM = atms[0];
    if (sampleATM) {
      // Create offline ping
      await prisma.networkPingResult.create({
        data: {
          entityType: 'ATM',
          entityId: sampleATM.id,
          atm: {
            connect: { id: sampleATM.id }
          },
          ipAddress: sampleATM.ipAddress!,
          ipType: 'PRIMARY',
          networkMedia: 'M2M',
          networkVendor: 'Telkomsel',
          status: 'OFFLINE',
          packetLoss: 100,
          packetsTransmitted: 4,
          packetsReceived: 0,
          errorMessage: 'Host unreachable'
        }
      });
    }

    console.log('\nNetwork information seeding completed!');
  } catch (error) {
    console.error('Error seeding network info:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedNetworkInfo();