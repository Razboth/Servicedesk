#!/usr/bin/env node
/**
 * Seed test network entities for testing network monitoring system
 * Usage: node scripts/seed-test-network-entities.js
 */

const { PrismaClient } = require('@prisma/client');
const config = require('../network-monitor/config');

const prisma = new PrismaClient();

async function seedTestNetworkEntities() {
  try {
    console.log('🌱 Seeding test network entities...');

    // First, get a default branch to associate ATMs with
    let defaultBranch = await prisma.branch.findFirst({
      where: { isActive: true }
    });

    if (!defaultBranch) {
      console.log('Creating default branch for test ATMs...');
      defaultBranch = await prisma.branch.create({
        data: {
          name: 'Default Test Branch',
          code: 'DEFAULT-TEST',
          city: 'Test City',
          province: 'Test Province',
          isActive: true
        }
      });
    }

    // Seed test branches with real internet IPs
    const testBranches = config.testMode.testEntities.branches;
    console.log(`Creating ${testBranches.length} test branches...`);

    for (const branchData of testBranches) {
      // Check if branch already exists
      const existingBranch = await prisma.branch.findUnique({
        where: { code: branchData.code }
      });

      if (existingBranch) {
        console.log(`✓ Branch ${branchData.code} already exists, updating...`);
        await prisma.branch.update({
          where: { code: branchData.code },
          data: {
            name: branchData.name,
            ipAddress: branchData.ipAddress,
            backupIpAddress: branchData.backupIpAddress,
            networkMedia: branchData.networkMedia,
            monitoringEnabled: true,
            isActive: true
          }
        });
      } else {
        console.log(`➕ Creating branch ${branchData.code}...`);
        await prisma.branch.create({
          data: {
            name: branchData.name,
            code: branchData.code,
            ipAddress: branchData.ipAddress,
            backupIpAddress: branchData.backupIpAddress,
            networkMedia: branchData.networkMedia,
            monitoringEnabled: true,
            city: 'Test City',
            province: 'Test Province',
            address: `Test Address for ${branchData.name}`,
            isActive: true
          }
        });
      }
    }

    // Seed test ATMs with real internet IPs
    const testATMs = config.testMode.testEntities.atms;
    console.log(`Creating ${testATMs.length} test ATMs...`);

    for (const atmData of testATMs) {
      // Check if ATM already exists
      const existingATM = await prisma.aTM.findUnique({
        where: { code: atmData.code }
      });

      if (existingATM) {
        console.log(`✓ ATM ${atmData.code} already exists, updating...`);
        await prisma.aTM.update({
          where: { code: atmData.code },
          data: {
            name: atmData.name,
            ipAddress: atmData.ipAddress,
            networkMedia: atmData.networkMedia,
            isActive: true
          }
        });
      } else {
        console.log(`➕ Creating ATM ${atmData.code}...`);
        await prisma.aTM.create({
          data: {
            name: atmData.name,
            code: atmData.code,
            branchId: defaultBranch.id,
            ipAddress: atmData.ipAddress,
            location: `Test Location for ${atmData.name}`,
            networkMedia: atmData.networkMedia,
            isActive: true
          }
        });
      }
    }

    // Create a network monitoring system user if it doesn't exist
    const monitoringUser = await prisma.user.findFirst({
      where: { 
        email: 'network-monitoring@banksulutgo.co.id'
      }
    });

    if (!monitoringUser) {
      console.log('Creating network monitoring system user...');
      await prisma.user.create({
        data: {
          username: 'network.monitoring',
          email: 'network-monitoring@banksulutgo.co.id',
          name: 'Network Monitoring System',
          role: 'TECHNICIAN',
          branchId: defaultBranch.id,
          isActive: true,
          password: 'system-generated' // This won't be used for login
        }
      });
    }

    console.log('✅ Test network entities seeded successfully!');
    console.log(`
📊 Summary:
- ${testBranches.length} test branches created/updated
- ${testATMs.length} test ATMs created/updated
- Network monitoring system user created
- All entities configured with real internet IPs for testing

🧪 Test IPs configured:
- Google DNS: 8.8.8.8, 8.8.4.4 (reliable, fast)
- Cloudflare DNS: 1.1.1.1, 1.0.0.1 (reliable, fast)  
- Quad9 DNS: 9.9.9.9 (reliable)
- OpenDNS: 208.67.222.222 (may have higher latency)
- Unreachable: 192.0.2.1, 198.51.100.1, 10.255.255.1 (test offline scenarios)

🚀 To start testing:
1. Run the network monitoring service: cd network-monitor && node monitor.js start
2. Check the monitoring dashboard: http://localhost:3000/monitoring/atms
3. Observe auto-ticket creation and resolution
    `);

  } catch (error) {
    console.error('❌ Error seeding test network entities:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedTestNetworkEntities()
    .then(() => {
      console.log('🎉 Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedTestNetworkEntities };