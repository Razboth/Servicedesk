import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addLocationColumns() {
  try {
    console.log('🔧 Adding latitude and longitude columns to branches table...\n');

    // Check if columns already exist
    const existingColumns: any = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'branches'
      AND column_name IN ('latitude', 'longitude')
    `;

    if (existingColumns.length === 2) {
      console.log('✅ Columns already exist!');
      return;
    }

    // Add latitude column if missing
    if (!existingColumns.find((c: any) => c.column_name === 'latitude')) {
      console.log('Adding latitude column...');
      await prisma.$executeRaw`
        ALTER TABLE "branches"
        ADD COLUMN "latitude" DOUBLE PRECISION
      `;
      console.log('✅ latitude column added');
    } else {
      console.log('✓ latitude column already exists');
    }

    // Add longitude column if missing
    if (!existingColumns.find((c: any) => c.column_name === 'longitude')) {
      console.log('Adding longitude column...');
      await prisma.$executeRaw`
        ALTER TABLE "branches"
        ADD COLUMN "longitude" DOUBLE PRECISION
      `;
      console.log('✅ longitude column added');
    } else {
      console.log('✓ longitude column already exists');
    }

    console.log('\n═'.repeat(80));
    console.log('✅ MIGRATION COMPLETED');
    console.log('═'.repeat(80));
    console.log('\nBranches table now has latitude and longitude columns');
    console.log('The admin/branches page should now load correctly\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addLocationColumns();
