import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShiftTypes() {
  try {
    const shifts = await prisma.$queryRaw<any[]>`
      SELECT "shiftType", COUNT(*) as count,
             ARRAY_AGG(DISTINCT TO_CHAR(date, 'YYYY-MM-DD')) as dates
      FROM shift_assignments
      GROUP BY "shiftType"
      ORDER BY "shiftType"
    `;

    console.log('\nShift Type Distribution:');
    console.log('========================\n');

    shifts.forEach(shift => {
      console.log(`${shift.shiftType}: ${shift.count} shifts`);
      if (shift.shiftType === 'WEEKEND_DAY' || shift.shiftType === 'WEEKEND_NIGHT') {
        console.log(`  Dates: ${shift.dates.slice(0, 5).join(', ')}${shift.dates.length > 5 ? '...' : ''}`);
      }
    });

    console.log('\n');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkShiftTypes();
