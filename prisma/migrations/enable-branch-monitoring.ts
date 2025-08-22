import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting branch monitoring enablement migration...');
  
  try {
    // Enable monitoring for all active branches
    const updateBranches = await prisma.branch.updateMany({
      where: {
        isActive: true,
        monitoringEnabled: false
      },
      data: {
        monitoringEnabled: true
      }
    });
    
    console.log(`✓ Enabled monitoring for ${updateBranches.count} branches`);
    
    // Add placeholder IP addresses for branches without them
    const branchesWithoutIP = await prisma.branch.findMany({
      where: {
        isActive: true,
        ipAddress: null
      }
    });
    
    let ipCounter = 1;
    for (const branch of branchesWithoutIP) {
      const octet3 = Math.floor(ipCounter / 255) + 1;
      const octet4 = (ipCounter % 255) + 1;
      
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          ipAddress: `10.${octet3}.${octet4}.1`,
          backupIpAddress: `10.${octet3}.${octet4}.2`,
          networkMedia: 'VSAT', // Default network media
          networkVendor: 'Telkom' // Default vendor
        }
      });
      
      console.log(`✓ Added IP address for branch: ${branch.name} (${branch.code})`);
      ipCounter++;
    }
    
    // Add placeholder IP addresses for ATMs without them
    const atmsWithoutIP = await prisma.aTM.findMany({
      where: {
        isActive: true,
        ipAddress: null
      },
      include: {
        branch: true
      }
    });
    
    for (const atm of atmsWithoutIP) {
      // Generate IP based on branch IP if available
      let baseIP = '10.100';
      if (atm.branch?.ipAddress) {
        const parts = atm.branch.ipAddress.split('.');
        baseIP = `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
      
      // Get count of ATMs in this branch to generate unique IP
      const atmCount = await prisma.aTM.count({
        where: { branchId: atm.branchId }
      });
      
      await prisma.aTM.update({
        where: { id: atm.id },
        data: {
          ipAddress: `${baseIP}.${10 + atmCount}`
        }
      });
      
      console.log(`✓ Added IP address for ATM: ${atm.name} (${atm.code})`);
    }
    
    console.log('\nMigration completed successfully!');
    console.log('All active branches now have monitoring enabled and IP addresses assigned.');
    
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });