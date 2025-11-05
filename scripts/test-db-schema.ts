import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSchema() {
  try {
    console.log('🔍 Testing database schema...\n');

    // Test branches table
    console.log('Testing branches table with latitude/longitude...');
    const branch = await prisma.branch.findFirst({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        ipAddress: true
      }
    });
    console.log('✅ Branches query successful');
    console.log('Sample branch:', branch);
    console.log('');

    // Test ATMs table
    console.log('Testing ATMs table with latitude/longitude...');
    const atm = await prisma.aTM.findFirst({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        ipAddress: true
      }
    });
    console.log('✅ ATMs query successful');
    console.log('Sample ATM:', atm);
    console.log('');

    console.log('✅ All schema tests passed!');
  } catch (error) {
    console.error('❌ Schema test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSchema();
