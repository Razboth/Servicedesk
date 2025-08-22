/**
 * Script to enable monitoring for all branches and ATMs
 * Run with: npx tsx scripts/enable-monitoring.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Enabling network monitoring for all branches...\n');
  
  try {
    // 1. Enable monitoring for all active branches
    const result = await prisma.branch.updateMany({
      where: {
        isActive: true
      },
      data: {
        monitoringEnabled: true
      }
    });
    
    console.log(`✅ Enabled monitoring for ${result.count} branches`);
    
    // 2. Set default IP addresses for branches without them
    const branchesWithoutIP = await prisma.branch.findMany({
      where: {
        isActive: true,
        OR: [
          { ipAddress: null },
          { ipAddress: '' }
        ]
      }
    });
    
    console.log(`\n📡 Found ${branchesWithoutIP.length} branches without IP addresses`);
    
    for (let i = 0; i < branchesWithoutIP.length; i++) {
      const branch = branchesWithoutIP[i];
      const subnet = 10 + Math.floor(i / 100);
      const host = (i % 100) + 1;
      
      await prisma.branch.update({
        where: { id: branch.id },
        data: {
          ipAddress: `10.${subnet}.${host}.1`,
          backupIpAddress: `10.${subnet}.${host}.2`,
          networkMedia: branch.networkMedia || 'VSAT',
          networkVendor: branch.networkVendor || 'Telkom'
        }
      });
      
      console.log(`   ✓ ${branch.name}: 10.${subnet}.${host}.1`);
    }
    
    // 3. Set default IP addresses for ATMs without them
    const atmsWithoutIP = await prisma.aTM.findMany({
      where: {
        isActive: true,
        OR: [
          { ipAddress: null },
          { ipAddress: '' }
        ]
      },
      include: {
        branch: true
      }
    });
    
    console.log(`\n🏧 Found ${atmsWithoutIP.length} ATMs without IP addresses`);
    
    const atmsByBranch = new Map<string, number>();
    
    for (const atm of atmsWithoutIP) {
      let baseIP = '10.200.1'; // Default subnet for ATMs
      
      if (atm.branch?.ipAddress) {
        const parts = atm.branch.ipAddress.split('.');
        baseIP = `${parts[0]}.${parts[1]}.${parts[2]}`;
      }
      
      // Track ATM count per branch for unique IPs
      const branchKey = atm.branchId || 'none';
      const atmIndex = (atmsByBranch.get(branchKey) || 0) + 1;
      atmsByBranch.set(branchKey, atmIndex);
      
      const ipAddress = `${baseIP}.${10 + atmIndex}`;
      
      await prisma.aTM.update({
        where: { id: atm.id },
        data: {
          ipAddress: ipAddress
        }
      });
      
      console.log(`   ✓ ${atm.name}: ${ipAddress}`);
    }
    
    // 4. Summary
    const totalBranches = await prisma.branch.count({
      where: { isActive: true, monitoringEnabled: true }
    });
    
    const totalATMs = await prisma.aTM.count({
      where: { 
        isActive: true,
        ipAddress: { not: null }
      }
    });
    
    console.log('\n✨ Migration Summary:');
    console.log(`   - ${totalBranches} branches with monitoring enabled`);
    console.log(`   - ${totalATMs} ATMs with IP addresses`);
    console.log('\n✅ Network monitoring setup complete!');
    
  } catch (error) {
    console.error('❌ Error enabling monitoring:', error);
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