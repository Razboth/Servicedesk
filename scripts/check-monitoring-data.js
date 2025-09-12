const { PrismaClient } = require('@prisma/client');

async function checkMonitoringData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Network Monitoring Data Check ===\n');
    
    // Check monitoring logs
    const logCount = await prisma.networkMonitoringLog.count();
    console.log(`Network monitoring logs: ${logCount}`);
    
    if (logCount > 0) {
      const recentLogs = await prisma.networkMonitoringLog.findMany({
        take: 5,
        orderBy: { checkedAt: 'desc' }
      });
      console.log('\nRecent monitoring logs:');
      recentLogs.forEach(log => {
        console.log(`  - ${log.entityType} ${log.entityId}: ${log.status} (${log.checkedAt})`);
      });
    }
    
    // Check incidents
    const incidentCount = await prisma.networkIncident.count();
    console.log(`\nNetwork incidents: ${incidentCount}`);
    
    if (incidentCount > 0) {
      const activeIncidents = await prisma.networkIncident.count({
        where: { status: 'OPEN' }
      });
      console.log(`  Active incidents: ${activeIncidents}`);
    }
    
    // Check branches with monitoring
    const branchesWithMonitoring = await prisma.branch.count({
      where: {
        monitoringEnabled: true,
        ipAddress: { not: null }
      }
    });
    console.log(`\nBranches with monitoring enabled: ${branchesWithMonitoring}`);
    
    // Check ATMs with IP
    const atmsWithIP = await prisma.aTM.count({
      where: {
        ipAddress: { not: null }
      }
    });
    console.log(`ATMs with IP addresses: ${atmsWithIP}`);
    
    // Check if monitoring service created any data today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysLogs = await prisma.networkMonitoringLog.count({
      where: {
        checkedAt: { gte: today }
      }
    });
    console.log(`\nMonitoring logs created today: ${todaysLogs}`);
    
    // Check sample/test data indicators
    const sampleBranches = await prisma.branch.findMany({
      where: {
        OR: [
          { ipAddress: { contains: '192.168' } },
          { ipAddress: { contains: '10.0' } },
          { ipAddress: { startsWith: '8.8' } }
        ]
      },
      select: { name: true, ipAddress: true }
    });
    
    if (sampleBranches.length > 0) {
      console.log('\n⚠️  Branches with sample/test IP addresses:');
      sampleBranches.forEach(branch => {
        console.log(`  - ${branch.name}: ${branch.ipAddress}`);
      });
    }
    
    // Summary
    console.log('\n=== Summary ===');
    if (logCount === 0) {
      console.log('❌ No monitoring logs found - monitoring service may not be running');
    } else if (todaysLogs === 0) {
      console.log('⚠️  No monitoring activity today - service may be stopped');
    } else {
      console.log('✅ Active monitoring data found');
    }
    
    if (branchesWithMonitoring === 0 && atmsWithIP === 0) {
      console.log('❌ No entities configured for monitoring');
    } else {
      console.log(`✅ ${branchesWithMonitoring + atmsWithIP} entities configured for monitoring`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMonitoringData();