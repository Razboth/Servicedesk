import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting column rename migration...');

  try {
    // Rename canWorkNight to canWorkType1
    await prisma.$executeRawUnsafe('ALTER TABLE staff_shift_profiles RENAME COLUMN "canWorkNight" TO "canWorkType1"');
    console.log('✓ Renamed canWorkNight to canWorkType1');

    // Rename canWorkDayWeekend to canWorkType2
    await prisma.$executeRawUnsafe('ALTER TABLE staff_shift_profiles RENAME COLUMN "canWorkDayWeekend" TO "canWorkType2"');
    console.log('✓ Renamed canWorkDayWeekend to canWorkType2');

    // Add canWorkType3
    await prisma.$executeRawUnsafe('ALTER TABLE staff_shift_profiles ADD COLUMN IF NOT EXISTS "canWorkType3" BOOLEAN NOT NULL DEFAULT false');
    console.log('✓ Added canWorkType3');

    // Rename canStandbyOnCall to canWorkType4
    await prisma.$executeRawUnsafe('ALTER TABLE staff_shift_profiles RENAME COLUMN "canStandbyOnCall" TO "canWorkType4"');
    console.log('✓ Renamed canStandbyOnCall to canWorkType4');

    // Rename canStandbyBranch to canWorkType5
    await prisma.$executeRawUnsafe('ALTER TABLE staff_shift_profiles RENAME COLUMN "canStandbyBranch" TO "canWorkType5"');
    console.log('✓ Renamed canStandbyBranch to canWorkType5');

    // Drop old index
    await prisma.$executeRawUnsafe('DROP INDEX IF EXISTS "staff_shift_profiles_canWorkNight_hasServerAccess_idx"');
    console.log('✓ Dropped old index');

    // Create new index
    await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "staff_shift_profiles_canWorkType1_hasServerAccess_idx" ON "staff_shift_profiles"("canWorkType1", "hasServerAccess")');
    console.log('✓ Created new index');

    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
