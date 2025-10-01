import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixShiftMigration() {
  console.log('Fixing weekend shift migration...\n');

  try {
    // Check for duplicates
    const duplicates = await prisma.$queryRaw<any[]>`
      SELECT date, "staffProfileId", COUNT(*) as count,
             ARRAY_AGG("shiftType") as types
      FROM shift_assignments
      WHERE date IN (
        SELECT date FROM shift_assignments
        WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
      )
      AND "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT', 'SATURDAY_DAY', 'SATURDAY_NIGHT', 'SUNDAY_DAY', 'SUNDAY_NIGHT')
      GROUP BY date, "staffProfileId"
      HAVING COUNT(*) > 1
    `;

    console.log(`Found ${duplicates.length} duplicate assignments`);

    if (duplicates.length > 0) {
      console.log('\nRemoving old WEEKEND_DAY and WEEKEND_NIGHT entries where new types exist...');

      const deleteResult = await prisma.$executeRaw`
        DELETE FROM shift_assignments
        WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
        AND EXISTS (
          SELECT 1 FROM shift_assignments sa2
          WHERE sa2.date = shift_assignments.date
            AND sa2."staffProfileId" = shift_assignments."staffProfileId"
            AND sa2."shiftType" IN ('SATURDAY_DAY', 'SATURDAY_NIGHT', 'SUNDAY_DAY', 'SUNDAY_NIGHT')
        )
      `;

      console.log(`Deleted ${deleteResult} duplicate old shift records`);
    }

    // Now update any remaining WEEKEND_DAY/WEEKEND_NIGHT that don't have new counterparts
    console.log('\nUpdating remaining old shift types...');

    const satDayResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SATURDAY_DAY'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_DAY'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 6
    `;
    console.log(`✓ Updated ${satDayResult} Saturday day shifts`);

    const sunDayResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SUNDAY_DAY'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_DAY'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 0
    `;
    console.log(`✓ Updated ${sunDayResult} Sunday day shifts`);

    const satNightResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SATURDAY_NIGHT'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_NIGHT'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 6
    `;
    console.log(`✓ Updated ${satNightResult} Saturday night shifts`);

    const sunNightResult = await prisma.$executeRaw`
      UPDATE shift_assignments
      SET "shiftType" = 'SUNDAY_NIGHT'::"ShiftType"
      WHERE "shiftType" = 'WEEKEND_NIGHT'::"ShiftType"
        AND EXTRACT(DOW FROM date) = 0
    `;
    console.log(`✓ Updated ${sunNightResult} Sunday night shifts`);

    // Final check
    const remaining = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count
      FROM shift_assignments
      WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
    `;

    const remainingCount = parseInt(remaining[0]?.count || '0');
    if (remainingCount > 0) {
      console.warn(`\n⚠️  Warning: ${remainingCount} shifts still using old types`);

      // Show details
      const details = await prisma.$queryRaw<any[]>`
        SELECT id, date, "shiftType", "staffProfileId"
        FROM shift_assignments
        WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
        ORDER BY date
      `;
      console.log('Details:', details);
    } else {
      console.log('\n✅ All shifts successfully migrated to new types');
    }

    console.log('\nFinal shift type distribution:');
    const final = await prisma.$queryRaw<any[]>`
      SELECT "shiftType", COUNT(*) as count
      FROM shift_assignments
      GROUP BY "shiftType"
      ORDER BY "shiftType"
    `;
    final.forEach(s => console.log(`  ${s.shiftType}: ${s.count}`));

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixShiftMigration()
  .then(() => {
    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });
