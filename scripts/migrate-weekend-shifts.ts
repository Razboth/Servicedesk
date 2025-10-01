import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateWeekendShifts() {
  console.log('Starting weekend shift type migration...');

  try {
    // Step 1: Add new enum values to ShiftType
    console.log('\nStep 1: Adding new shift type values...');
    await prisma.$executeRaw`
      ALTER TYPE "ShiftType" ADD VALUE IF NOT EXISTS 'SATURDAY_DAY'
    `;
    await prisma.$executeRaw`
      ALTER TYPE "ShiftType" ADD VALUE IF NOT EXISTS 'SATURDAY_NIGHT'
    `;
    await prisma.$executeRaw`
      ALTER TYPE "ShiftType" ADD VALUE IF NOT EXISTS 'SUNDAY_DAY'
    `;
    await prisma.$executeRaw`
      ALTER TYPE "ShiftType" ADD VALUE IF NOT EXISTS 'SUNDAY_NIGHT'
    `;
    console.log('✓ New shift type values added');

    // Step 2: Migrate WEEKEND_DAY shifts
    console.log('\nStep 2: Migrating WEEKEND_DAY shifts...');

    // Saturday day shifts
    const satDayResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SATURDAY_DAY'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_DAY'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 6
    `;
    console.log(`✓ Migrated ${satDayResult} Saturday day shifts`);

    // Sunday day shifts
    const sunDayResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SUNDAY_DAY'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_DAY'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 0
    `;
    console.log(`✓ Migrated ${sunDayResult} Sunday day shifts`);

    // Step 3: Migrate WEEKEND_NIGHT shifts
    console.log('\nStep 3: Migrating WEEKEND_NIGHT shifts...');

    // Saturday night shifts
    const satNightResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SATURDAY_NIGHT'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_NIGHT'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 6
    `;
    console.log(`✓ Migrated ${satNightResult} Saturday night shifts`);

    // Sunday night shifts
    const sunNightResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SUNDAY_NIGHT'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_NIGHT'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 0
    `;
    console.log(`✓ Migrated ${sunNightResult} Sunday night shifts`);

    // Step 4: Check for any remaining old values
    const remaining = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM shift_assignments
      WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
    `;

    const remainingCount = parseInt(remaining[0]?.count || '0');
    if (remainingCount > 0) {
      console.warn(`\n⚠️  Warning: ${remainingCount} shifts still using old types`);
    } else {
      console.log('\n✓ All shifts successfully migrated');
    }

    console.log('\n✅ Migration complete!');
    console.log(`Total shifts updated: ${Number(satDayResult) + Number(sunDayResult) + Number(satNightResult) + Number(sunNightResult)}`);
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateWeekendShifts()
  .then(() => {
    console.log('\n✅ Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
