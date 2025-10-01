import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deleteOldShiftTypes() {
  console.log('Deleting old shift type assignments...\n');

  try {
    // Check what dates these are
    const oldShifts = await prisma.$queryRaw<any[]>`
      SELECT id, date, "shiftType", "staffProfileId",
             TO_CHAR(date, 'Day') as day_name,
             EXTRACT(DOW FROM date) as day_of_week
      FROM shift_assignments
      WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
      ORDER BY date, "shiftType"
    `;

    console.log('Old shift types found:');
    oldShifts.forEach(s => {
      console.log(`  ${s.date.toISOString().split('T')[0]} (${s.day_name.trim()}) - ${s.shiftType}`);
    });

    if (oldShifts.length === 0) {
      console.log('\n✅ No old shift types found!');
      return;
    }

    console.log(`\nTotal: ${oldShifts.length} shifts with old types`);
    console.log('\nThese appear to be from an older schema version.');
    console.log('Deleting them as they will be regenerated with the new types...\n');

    const deleteResult = await prisma.$executeRaw`
      DELETE FROM shift_assignments
      WHERE "shiftType" IN ('WEEKEND_DAY', 'WEEKEND_NIGHT')
    `;

    console.log(`✅ Deleted ${deleteResult} old shift assignments`);

    // Final check
    const final = await prisma.$queryRaw<any[]>`
      SELECT "shiftType", COUNT(*) as count
      FROM shift_assignments
      GROUP BY "shiftType"
      ORDER BY "shiftType"
    `;

    console.log('\nFinal shift type distribution:');
    final.forEach(s => console.log(`  ${s.shiftType}: ${s.count}`));

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

deleteOldShiftTypes()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
