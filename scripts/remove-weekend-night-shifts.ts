import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeWeekendNightShifts() {
  console.log('Removing weekend night shift assignments...\n');

  try {
    // Check what weekend night shifts exist
    const weekendNights = await prisma.$queryRaw<any[]>`
      SELECT id, date, "shiftType", "staffProfileId",
             TO_CHAR(date, 'Day') as day_name,
             EXTRACT(DOW FROM date) as day_of_week
      FROM shift_assignments
      WHERE "shiftType" IN ('SATURDAY_NIGHT', 'SUNDAY_NIGHT')
      ORDER BY date, "shiftType"
    `;

    console.log('Weekend night shifts found:');
    weekendNights.forEach(s => {
      console.log(`  ${s.date.toISOString().split('T')[0]} (${s.day_name.trim()}) - ${s.shiftType}`);
    });

    if (weekendNights.length === 0) {
      console.log('\n✅ No weekend night shifts found!');
      return;
    }

    console.log(`\nTotal: ${weekendNights.length} weekend night shifts`);
    console.log('\nRemoving them as per new rules (nights are weekdays only)...\n');

    const deleteResult = await prisma.$executeRaw`
      DELETE FROM shift_assignments
      WHERE "shiftType" IN ('SATURDAY_NIGHT', 'SUNDAY_NIGHT')
    `;

    console.log(`✅ Deleted ${deleteResult} weekend night shift assignments`);

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

removeWeekendNightShifts()
  .then(() => {
    console.log('\n✅ Cleanup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });
