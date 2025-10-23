import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function enableBranchMonitoring() {
  try {
    // Enable monitoring for AIRMADIDI branch
    const branch = await prisma.branch.update({
      where: {
        code: '017' // CABANG AIRMADIDI
      },
      data: {
        monitoringEnabled: true
      },
      select: {
        id: true,
        name: true,
        code: true,
        monitoringEnabled: true,
        ipAddress: true
      }
    });

    console.log('\n✅ Monitoring enabled for branch:');
    console.log('Name:', branch.name);
    console.log('Code:', branch.code);
    console.log('IP Address:', branch.ipAddress);
    console.log('Monitoring Enabled:', branch.monitoringEnabled);
    console.log('\n🎯 The branch will now be monitored every 2 minutes!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

enableBranchMonitoring();
