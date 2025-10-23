import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranchCoordinates() {
  try {
    // Find the AIRMADIDI branch
    const branch = await prisma.branch.findFirst({
      where: {
        name: {
          contains: 'AIRMADIDI',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        code: true,
        latitude: true,
        longitude: true,
        ipAddress: true,
        monitoringEnabled: true,
        isActive: true
      }
    });

    if (!branch) {
      console.log('❌ Branch AIRMADIDI not found');
      return;
    }

    console.log('\n📍 Branch Details:');
    console.log('Name:', branch.name);
    console.log('Code:', branch.code);
    console.log('Latitude:', branch.latitude);
    console.log('Longitude:', branch.longitude);
    console.log('IP Address:', branch.ipAddress);
    console.log('Monitoring Enabled:', branch.monitoringEnabled);
    console.log('Is Active:', branch.isActive);

    if (branch.latitude && branch.longitude) {
      console.log('\n✅ Coordinates are saved in database');
    } else {
      console.log('\n⚠️  Coordinates are missing');
    }

    // Check all branches with coordinates
    const branchesWithCoords = await prisma.branch.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null }
      },
      select: {
        name: true,
        latitude: true,
        longitude: true
      }
    });

    console.log(`\n📊 Total branches with coordinates: ${branchesWithCoords.length}`);
    branchesWithCoords.forEach(b => {
      console.log(`  - ${b.name}: (${b.latitude}, ${b.longitude})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBranchCoordinates();
