/**
 * Script to start network monitoring
 * Run with: npx tsx scripts/start-monitoring.ts
 */

import { PrismaClient } from '@prisma/client';
import { networkMonitor } from '../lib/monitoring/network-monitor';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Network Monitoring Manager\n');
  
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  try {
    switch (command) {
      case 'start':
        await startMonitoring();
        break;
      case 'stop':
        stopMonitoring();
        break;
      case 'status':
        await showStatus();
        break;
      case 'check':
        await runSingleCheck();
        break;
      case 'test':
        await testPing();
        break;
      case 'setup':
        await setupMonitoring();
        break;
      default:
        showHelp();
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

async function startMonitoring() {
  console.log('📡 Starting network monitoring service...\n');
  
  // Check if branches and ATMs have IP addresses
  const branchesWithoutIP = await prisma.branch.count({
    where: {
      isActive: true,
      monitoringEnabled: true,
      OR: [
        { ipAddress: null },
        { ipAddress: '' }
      ]
    }
  });
  
  const atmsWithoutIP = await prisma.aTM.count({
    where: {
      isActive: true,
      OR: [
        { ipAddress: null },
        { ipAddress: '' }
      ]
    }
  });
  
  if (branchesWithoutIP > 0 || atmsWithoutIP > 0) {
    console.warn(`⚠️  Warning: Found entities without IP addresses:`);
    console.warn(`   - ${branchesWithoutIP} branches`);
    console.warn(`   - ${atmsWithoutIP} ATMs`);
    console.warn(`   Run "npm run scripts:monitoring setup" to configure IP addresses\n`);
  }
  
  // Start the monitoring service
  await networkMonitor.start();
  
  console.log('\n✅ Monitoring service is running');
  console.log('   Press Ctrl+C to stop\n');
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping monitoring service...');
    networkMonitor.stop();
    process.exit(0);
  });
  
  // Keep the script running
  await new Promise(() => {});
}

function stopMonitoring() {
  console.log('🛑 Stopping network monitoring service...\n');
  networkMonitor.stop();
  console.log('✅ Monitoring service stopped');
}

async function showStatus() {
  console.log('📊 Network Monitoring Status\n');
  
  // Get statistics from database
  const totalBranches = await prisma.branch.count({
    where: { isActive: true, monitoringEnabled: true }
  });
  
  const totalATMs = await prisma.aTM.count({
    where: { isActive: true }
  });
  
  const recentLogs = await prisma.networkMonitoringLog.findMany({
    orderBy: { checkedAt: 'desc' },
    take: 5
  });
  
  const onlineCount = await prisma.networkMonitoringLog.count({
    where: { status: 'ONLINE' }
  });
  
  const offlineCount = await prisma.networkMonitoringLog.count({
    where: { status: 'OFFLINE' }
  });
  
  console.log('📈 Monitoring Statistics:');
  console.log(`   Total Branches: ${totalBranches}`);
  console.log(`   Total ATMs: ${totalATMs}`);
  console.log(`   Online: ${onlineCount}`);
  console.log(`   Offline: ${offlineCount}`);
  
  if (recentLogs.length > 0) {
    console.log('\n📋 Recent Checks:');
    for (const log of recentLogs) {
      const entity = log.entityType === 'BRANCH' 
        ? await prisma.branch.findUnique({ where: { id: log.entityId } })
        : await prisma.aTM.findUnique({ where: { id: log.entityId } });
      
      console.log(`   ${log.entityType} ${entity?.name || 'Unknown'}: ${log.status} (${log.responseTimeMs || 0}ms) - ${log.checkedAt.toLocaleString()}`);
    }
  } else {
    console.log('\n   No monitoring data available yet');
  }
}

async function runSingleCheck() {
  console.log('🔍 Running single network check...\n');
  await networkMonitor.checkAllNetworks();
  console.log('\n✅ Network check completed');
}

async function testPing() {
  console.log('🧪 Testing network connectivity...\n');
  
  // Get a sample of branches and ATMs
  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ipAddress: { not: null }
    },
    take: 3
  });
  
  const atms = await prisma.aTM.findMany({
    where: {
      isActive: true,
      ipAddress: { not: null }
    },
    take: 3
  });
  
  if (branches.length === 0 && atms.length === 0) {
    console.log('No entities with IP addresses found');
    return;
  }
  
  console.log('Testing connectivity to:');
  
  for (const branch of branches) {
    console.log(`   🏢 ${branch.name} (${branch.ipAddress})`);
  }
  
  for (const atm of atms) {
    console.log(`   🏧 ${atm.name} (${atm.ipAddress})`);
  }
  
  console.log('\nNote: Actual ping results will be stored in the database');
  console.log('Check the monitoring dashboard for real-time status');
}

async function setupMonitoring() {
  console.log('🔧 Setting up monitoring configuration...\n');
  
  // Enable monitoring for all branches
  const result = await prisma.branch.updateMany({
    where: { isActive: true },
    data: { monitoringEnabled: true }
  });
  
  console.log(`✅ Enabled monitoring for ${result.count} branches`);
  
  // Check for missing IP addresses
  const branchesWithoutIP = await prisma.branch.findMany({
    where: {
      isActive: true,
      OR: [
        { ipAddress: null },
        { ipAddress: '' }
      ]
    }
  });
  
  if (branchesWithoutIP.length > 0) {
    console.log(`\n⚠️  ${branchesWithoutIP.length} branches need IP addresses`);
    console.log('   Run "npx tsx scripts/enable-monitoring.ts" to auto-configure');
  }
  
  const atmsWithoutIP = await prisma.aTM.findMany({
    where: {
      isActive: true,
      OR: [
        { ipAddress: null },
        { ipAddress: '' }
      ]
    }
  });
  
  if (atmsWithoutIP.length > 0) {
    console.log(`\n⚠️  ${atmsWithoutIP.length} ATMs need IP addresses`);
    console.log('   Run "npx tsx scripts/enable-monitoring.ts" to auto-configure');
  }
  
  console.log('\n✅ Monitoring setup completed');
}

function showHelp() {
  console.log('Usage: npx tsx scripts/start-monitoring.ts [command]\n');
  console.log('Commands:');
  console.log('  start   - Start the monitoring service');
  console.log('  stop    - Stop the monitoring service');
  console.log('  status  - Show monitoring status and statistics');
  console.log('  check   - Run a single network check');
  console.log('  test    - Test network connectivity');
  console.log('  setup   - Configure monitoring settings');
  console.log('  help    - Show this help message');
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