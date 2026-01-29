import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing shift-related FK constraint issues...');

  // Delete orphaned shift_checklist_items
  const result1 = await prisma.$executeRaw`
    DELETE FROM shift_checklist_items
    WHERE "shiftReportId" NOT IN (SELECT id FROM shift_reports)
  `;
  console.log(`Deleted ${result1} orphaned shift_checklist_items records`);

  // Delete orphaned shift_backup_checklist
  const result2 = await prisma.$executeRaw`
    DELETE FROM shift_backup_checklist
    WHERE "shiftReportId" NOT IN (SELECT id FROM shift_reports)
  `;
  console.log(`Deleted ${result2} orphaned shift_backup_checklist records`);

  // Delete orphaned shift_notes
  const result3 = await prisma.$executeRaw`
    DELETE FROM shift_notes
    WHERE "shiftReportId" NOT IN (SELECT id FROM shift_reports)
  `;
  console.log(`Deleted ${result3} orphaned shift_notes records`);

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
