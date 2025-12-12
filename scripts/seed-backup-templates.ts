import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const backupTemplates = [
  { databaseName: 'Database Core Banking (T24)', description: 'Backup database Core Banking System T24', order: 1 },
  { databaseName: 'Database ATM Switching', description: 'Backup database ATM Switching System', order: 2 },
  { databaseName: 'Database Internet Banking', description: 'Backup database Internet Banking', order: 3 },
  { databaseName: 'Database Mobile Banking', description: 'Backup database Mobile Banking', order: 4 },
  { databaseName: 'Database RTGS/SKN', description: 'Backup database RTGS dan SKN', order: 5 },
  { databaseName: 'Database BI-FAST', description: 'Backup database BI-FAST', order: 6 },
  { databaseName: 'Database ServiceDesk', description: 'Backup database ServiceDesk', order: 7 },
  { databaseName: 'Database Email Server', description: 'Backup database Email Server', order: 8 },
  { databaseName: 'Database Active Directory', description: 'Backup Active Directory', order: 9 },
  { databaseName: 'Database SLIK OJK', description: 'Backup database SLIK OJK', order: 10 },
];

async function main() {
  console.log('Seeding backup templates...');

  for (const template of backupTemplates) {
    const existing = await prisma.shiftBackupTemplate.findUnique({
      where: { databaseName: template.databaseName },
    });

    if (!existing) {
      await prisma.shiftBackupTemplate.create({
        data: template,
      });
      console.log(`Created template: ${template.databaseName}`);
    } else {
      console.log(`Template already exists: ${template.databaseName}`);
    }
  }

  console.log('Backup templates seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
