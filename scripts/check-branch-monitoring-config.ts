import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBranchMonitoring() {
  console.log('🔍 Checking branch monitoring configuration...\n');

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true
    },
    select: {
      id: true,
      name: true,
      code: true,
      ipAddress: true,
      latitude: true,
      longitude: true,
      monitoringEnabled: true,
      networkMedia: true
    }
  });

  console.log(`Total active branches: ${branches.length}\n`);

  const withMonitoring = branches.filter(b => b.monitoringEnabled);
  const withIP = branches.filter(b => b.ipAddress);
  const withCoordinates = branches.filter(b => b.latitude && b.longitude);
  const readyForMonitoring = branches.filter(b => b.ipAddress && b.monitoringEnabled);

  console.log('📊 Summary:');
  console.log(`   Monitoring enabled: ${withMonitoring.length}`);
  console.log(`   With IP address: ${withIP.length}`);
  console.log(`   With coordinates: ${withCoordinates.length}`);
  console.log(`   Ready for monitoring: ${readyForMonitoring.length}\n`);

  if (readyForMonitoring.length > 0) {
    console.log('✅ Branches ready for monitoring:\n');
    readyForMonitoring.forEach(b => {
      console.log(`   📍 ${b.name} (${b.code})`);
      console.log(`      IP: ${b.ipAddress}`);
      console.log(`      Location: ${b.latitude || 'N/A'}, ${b.longitude || 'N/A'}`);
      console.log(`      Network: ${b.networkMedia || 'N/A'}`);
      console.log('');
    });
  }

  const withIPButNoMonitoring = withIP.filter(b => !b.monitoringEnabled);
  if (withIPButNoMonitoring.length > 0) {
    console.log('⚠️  Branches with IP but monitoring not enabled:\n');
    withIPButNoMonitoring.forEach(b => {
      console.log(`   📍 ${b.name} (${b.code})`);
      console.log(`      IP: ${b.ipAddress}`);
      console.log(`      Monitoring: DISABLED`);
      console.log('');
    });
    console.log('💡 To enable monitoring for these branches:');
    console.log('   npx tsx scripts/start-monitoring.ts setup\n');
  }

  const noIP = branches.filter(b => !b.ipAddress);
  if (noIP.length > 0) {
    console.log(`\n📝 ${noIP.length} branches without IP addresses`);
    console.log('   Add IP addresses via admin panel: /admin/branches\n');
  }

  await prisma.$disconnect();
}

checkBranchMonitoring();
