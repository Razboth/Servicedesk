const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DAY_TIME_SLOTS = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];
const NIGHT_TIME_SLOTS = ['20:00', '22:00', '00:00', '02:00', '04:00', '06:00', '08:00'];

async function main() {
  console.log('Seeding P20T IT Checklist Templates...');

  // Clear existing IT data
  await prisma.p20TChecklistItem.deleteMany({
    where: { checklist: { category: 'IT' } },
  });

  await prisma.p20TDailyChecklist.deleteMany({
    where: { category: 'IT' },
  });

  await prisma.p20TChecklistTemplate.deleteMany({
    where: { category: 'IT' },
  });

  const templates = [];

  // IT DAY SHIFT - Section A
  templates.push({
    category: 'IT', shift: 'DAY', section: 'A', orderIndex: 1,
    title: 'Report Collega - Samrat',
    description: 'Cek report Collega datacenter Samrat',
    inputType: 'CHECKBOX',
  });
  templates.push({
    category: 'IT', shift: 'DAY', section: 'A', orderIndex: 2,
    title: 'Report Collega - Tekno',
    description: 'Cek report Collega datacenter Tekno',
    inputType: 'CHECKBOX',
  });
  templates.push({
    category: 'IT', shift: 'DAY', section: 'A', orderIndex: 3,
    title: 'Report Collega - Syno KP',
    description: 'Cek report Collega datacenter Syno KP',
    inputType: 'CHECKBOX',
  });
  templates.push({
    category: 'IT', shift: 'DAY', section: 'A', orderIndex: 4,
    title: 'Staging Collega - Samrat',
    description: 'Cek staging Collega datacenter Samrat',
    inputType: 'CHECKBOX',
  });
  templates.push({
    category: 'IT', shift: 'DAY', section: 'A', orderIndex: 5,
    title: 'Staging Collega - Tekno',
    description: 'Cek staging Collega datacenter Tekno',
    inputType: 'CHECKBOX',
  });

  // IT DAY SHIFT - Section B (Periodic)
  let dayOrderIndex = 1;
  for (const timeSlot of DAY_TIME_SLOTS) {
    templates.push({
      category: 'IT', shift: 'DAY', section: 'B', orderIndex: dayOrderIndex++,
      title: `[${timeSlot}] Server Metrics - Cautions`,
      description: 'Cek /reports/server-metrics/ - catat yang Cautions',
      inputType: 'TEXT', timeSlot, autoFetchType: 'SERVER_METRICS',
    });
    templates.push({
      category: 'IT', shift: 'DAY', section: 'B', orderIndex: dayOrderIndex++,
      title: `[${timeSlot}] Device Status - Down`,
      description: 'Cek /reports/device-status/ - catat yang Down',
      inputType: 'TEXT', timeSlot, autoFetchType: 'DEVICE_STATUS',
    });
    templates.push({
      category: 'IT', shift: 'DAY', section: 'B', orderIndex: dayOrderIndex++,
      title: `[${timeSlot}] ATM Status - Total Alarm`,
      description: 'Cek /monitoring/atm/ - catat total alarm ATM',
      inputType: 'TEXT', timeSlot, autoFetchType: 'ATM_ALARM',
    });
  }

  // IT DAY SHIFT - Section C
  templates.push({
    category: 'IT', shift: 'DAY', section: 'C', orderIndex: 1,
    title: 'Notes Permasalahan',
    description: 'Catatan permasalahan yang terjadi selama shift',
    inputType: 'TEXT',
  });

  // IT NIGHT SHIFT - Section A
  templates.push({
    category: 'IT', shift: 'NIGHT', section: 'A', orderIndex: 1,
    title: 'Report EOD Collega',
    description: 'Cek Report End of Day Collega',
    inputType: 'CHECKBOX',
  });

  // IT NIGHT SHIFT - Section B (Periodic)
  let nightOrderIndex = 1;
  for (const timeSlot of NIGHT_TIME_SLOTS) {
    templates.push({
      category: 'IT', shift: 'NIGHT', section: 'B', orderIndex: nightOrderIndex++,
      title: `[${timeSlot}] Server Metrics - Cautions`,
      description: 'Cek /reports/server-metrics/ - catat yang Cautions',
      inputType: 'TEXT', timeSlot, autoFetchType: 'SERVER_METRICS',
    });
    templates.push({
      category: 'IT', shift: 'NIGHT', section: 'B', orderIndex: nightOrderIndex++,
      title: `[${timeSlot}] Device Status - Down`,
      description: 'Cek /reports/device-status/ - catat yang Down',
      inputType: 'TEXT', timeSlot, autoFetchType: 'DEVICE_STATUS',
    });
    templates.push({
      category: 'IT', shift: 'NIGHT', section: 'B', orderIndex: nightOrderIndex++,
      title: `[${timeSlot}] ATM Status - Total Alarm`,
      description: 'Cek /monitoring/atm/ - catat total alarm ATM',
      inputType: 'TEXT', timeSlot, autoFetchType: 'ATM_ALARM',
    });
  }

  // IT NIGHT SHIFT - Section C
  templates.push({
    category: 'IT', shift: 'NIGHT', section: 'C', orderIndex: 1,
    title: 'Notes Permasalahan',
    description: 'Catatan permasalahan yang terjadi selama shift',
    inputType: 'TEXT',
  });

  for (const template of templates) {
    await prisma.p20TChecklistTemplate.create({ data: template });
  }

  console.log(`Created ${templates.length} IT checklist templates`);
  console.log('');
  console.log('=== IT DAY SHIFT ===');
  console.log('Section A: 5 items (Report Collega x3, Staging Collega x2)');
  console.log('Section B: 21 items (7 time slots x 3 monitoring types)');
  console.log('Section C: 1 item (Notes Permasalahan)');
  console.log('');
  console.log('=== IT NIGHT SHIFT ===');
  console.log('Section A: 1 item (Report EOD Collega)');
  console.log('Section B: 21 items (7 time slots x 3 monitoring types)');
  console.log('Section C: 1 item (Notes Permasalahan)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
