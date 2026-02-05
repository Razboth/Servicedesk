import { PrismaClient, DailyChecklistType, ServerChecklistCategory, ChecklistInputType } from '@prisma/client';

const prisma = new PrismaClient();

interface ChecklistTemplateData {
  title: string;
  description?: string;
  category: ServerChecklistCategory;
  checklistType: DailyChecklistType;
  order: number;
  isRequired: boolean;
  unlockTime: string;
  inputType: ChecklistInputType;
}

// Checklist Ops Items (for users WITHOUT server access: A, B_2, D_2)
const checklistOpsTemplates: ChecklistTemplateData[] = [
  // ========== 08:00 ==========
  {
    title: '[08:00] Review Notes Permasalahan Kemarin',
    description: 'Baca dan review catatan permasalahan dari shift sebelumnya',
    category: 'MAINTENANCE',
    checklistType: 'OPS_SIANG',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'CHECKBOX',
  },
  {
    title: '[08:00] Check Pending Tickets',
    description: 'Verifikasi tiket PENDING, PENDING_VENDOR, OPEN yang disetujui 8AM kemarin s.d. 8AM hari ini',
    category: 'MAINTENANCE',
    checklistType: 'OPS_SIANG',
    order: 2,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'PENDING_TICKETS',
  },
  {
    title: '[08:00] Operational Cabang Buka',
    description: 'Catat waktu pembukaan cabang',
    category: 'MAINTENANCE',
    checklistType: 'OPS_SIANG',
    order: 3,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'TIMESTAMP',
  },
  {
    title: '[08:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan (GW724, ATMB, BSGLink, QRIS, BIF-IN, BIF-OUT, BIF-API, WebCMS, Touch-iOS, Touch-Android) - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 4,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[08:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 5,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'APP_STATUS',
  },

  // ========== 10:00 ==========
  {
    title: '[10:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 10,
    isRequired: true,
    unlockTime: '10:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[10:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 11,
    isRequired: true,
    unlockTime: '10:00',
    inputType: 'APP_STATUS',
  },

  // ========== 12:00 ==========
  {
    title: '[12:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 20,
    isRequired: true,
    unlockTime: '12:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[12:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 21,
    isRequired: true,
    unlockTime: '12:00',
    inputType: 'APP_STATUS',
  },

  // ========== 14:00 ==========
  {
    title: '[14:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 30,
    isRequired: true,
    unlockTime: '14:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[14:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 31,
    isRequired: true,
    unlockTime: '14:00',
    inputType: 'APP_STATUS',
  },

  // ========== 16:00 ==========
  {
    title: '[16:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 40,
    isRequired: true,
    unlockTime: '16:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[16:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 41,
    isRequired: true,
    unlockTime: '16:00',
    inputType: 'APP_STATUS',
  },

  // ========== 18:00 ==========
  {
    title: '[18:00] Operational Cabang Tutup',
    description: 'Catat waktu penutupan cabang',
    category: 'MAINTENANCE',
    checklistType: 'OPS_SIANG',
    order: 50,
    isRequired: true,
    unlockTime: '18:00',
    inputType: 'TIMESTAMP',
  },
  {
    title: '[18:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 51,
    isRequired: true,
    unlockTime: '18:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[18:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 52,
    isRequired: true,
    unlockTime: '18:00',
    inputType: 'APP_STATUS',
  },

  // ========== 20:00 ==========
  {
    title: '[20:00] Notes for Handover',
    description: 'Tulis catatan serah terima untuk shift malam',
    category: 'MAINTENANCE',
    checklistType: 'OPS_SIANG',
    order: 60,
    isRequired: true,
    unlockTime: '20:00',
    inputType: 'TEXT_INPUT',
  },
  {
    title: '[20:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 61,
    isRequired: true,
    unlockTime: '20:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[20:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'OPS_SIANG',
    order: 62,
    isRequired: true,
    unlockTime: '20:00',
    inputType: 'APP_STATUS',
  },

  // ========== OPS_MALAM: 06:00 H+1 (D_2 only) ==========
  {
    title: '[06:00] Koordinasi Ibu Maria Pembersihan Ruang Server Samrat',
    description: 'Koordinasi pembersihan ruang server dengan Ibu Maria',
    category: 'MAINTENANCE',
    checklistType: 'OPS_MALAM',
    order: 1,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'CHECKBOX',
  },
];

// Checklist Monitoring Items (for users WITH server access: E, B_1, C, D_1)
const checklistMonitoringTemplates: ChecklistTemplateData[] = [
  // ========== 08:00 ==========
  {
    title: '[08:00] Check Extract Staging (Antasena)',
    description: 'Verifikasi extract staging Antasena',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'MONITORING_SIANG',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'CHECKBOX',
  },
  {
    title: '[08:00] Check Extract Report (RPTViewer)',
    description: 'Verifikasi extract report RPTViewer',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'MONITORING_SIANG',
    order: 2,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'CHECKBOX',
  },
  {
    title: '[08:00] Check Backup DB (Pdf Report)',
    description: 'Verifikasi backup database dari PDF report',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'MONITORING_SIANG',
    order: 3,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'CHECKBOX',
  },
  {
    title: '[08:00] Check Server Metrics (PDF Report)',
    description: 'Fetch status server dan generate laporan PDF',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 4,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'SERVER_METRICS',
  },
  {
    title: '[08:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM (±1 menit dari waktu pengecekan)',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 5,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[08:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 6,
    isRequired: true,
    unlockTime: '08:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 10:00 ==========
  {
    title: '[10:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 10,
    isRequired: true,
    unlockTime: '10:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[10:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 11,
    isRequired: true,
    unlockTime: '10:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 12:00 ==========
  {
    title: '[12:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 20,
    isRequired: true,
    unlockTime: '12:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[12:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 21,
    isRequired: true,
    unlockTime: '12:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 14:00 ==========
  {
    title: '[14:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 30,
    isRequired: true,
    unlockTime: '14:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[14:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 31,
    isRequired: true,
    unlockTime: '14:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 16:00 ==========
  {
    title: '[16:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 40,
    isRequired: true,
    unlockTime: '16:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[16:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 41,
    isRequired: true,
    unlockTime: '16:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 18:00 ==========
  {
    title: '[18:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 50,
    isRequired: true,
    unlockTime: '18:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[18:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 51,
    isRequired: true,
    unlockTime: '18:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== 20:00 ==========
  {
    title: '[20:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 60,
    isRequired: true,
    unlockTime: '20:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[20:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_SIANG',
    order: 61,
    isRequired: true,
    unlockTime: '20:00',
    inputType: 'AVAILABILITY_STATUS',
  },

  // ========== MONITORING_MALAM: 22:00, 00:00, 02:00, 04:00, 06:00 ==========
  // 22:00
  {
    title: '[22:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 1,
    isRequired: true,
    unlockTime: '22:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[22:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 2,
    isRequired: true,
    unlockTime: '22:00',
    inputType: 'AVAILABILITY_STATUS',
  },
  {
    title: '[22:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 3,
    isRequired: true,
    unlockTime: '22:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[22:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 4,
    isRequired: true,
    unlockTime: '22:00',
    inputType: 'APP_STATUS',
  },

  // 00:00 H+1
  {
    title: '[00:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 10,
    isRequired: true,
    unlockTime: '00:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[00:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 11,
    isRequired: true,
    unlockTime: '00:00',
    inputType: 'AVAILABILITY_STATUS',
  },
  {
    title: '[00:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 12,
    isRequired: true,
    unlockTime: '00:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[00:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 13,
    isRequired: true,
    unlockTime: '00:00',
    inputType: 'APP_STATUS',
  },

  // 02:00 H+1
  {
    title: '[02:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 20,
    isRequired: true,
    unlockTime: '02:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[02:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 21,
    isRequired: true,
    unlockTime: '02:00',
    inputType: 'AVAILABILITY_STATUS',
  },
  {
    title: '[02:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 22,
    isRequired: true,
    unlockTime: '02:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[02:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 23,
    isRequired: true,
    unlockTime: '02:00',
    inputType: 'APP_STATUS',
  },

  // 04:00 H+1
  {
    title: '[04:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 30,
    isRequired: true,
    unlockTime: '04:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[04:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 31,
    isRequired: true,
    unlockTime: '04:00',
    inputType: 'AVAILABILITY_STATUS',
  },
  {
    title: '[04:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 32,
    isRequired: true,
    unlockTime: '04:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[04:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 33,
    isRequired: true,
    unlockTime: '04:00',
    inputType: 'APP_STATUS',
  },

  // 06:00 H+1
  {
    title: '[06:00] Koordinasi Ibu Maria Pembersihan Ruang Server Samrat',
    description: 'Koordinasi pembersihan ruang server dengan Ibu Maria',
    category: 'MAINTENANCE',
    checklistType: 'MONITORING_MALAM',
    order: 40,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'CHECKBOX',
  },
  {
    title: '[06:00] Status Alert ATM',
    description: 'Fetch dan verifikasi status alert ATM',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 41,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'ATM_ALERT',
  },
  {
    title: '[06:00] Status Operasional/Availability',
    description: 'Verifikasi status koneksi, akses aplikasi, dll',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 42,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'AVAILABILITY_STATUS',
  },
  {
    title: '[06:00] Status Grafik Grafana',
    description: 'Input persentase status 10 layanan - Last 15 Minutes',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 43,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'GRAFANA_STATUS',
  },
  {
    title: '[06:00] Status Aplikasi',
    description: 'Status aplikasi Core, Surrounding, dan Supporting',
    category: 'SERVER_HEALTH',
    checklistType: 'MONITORING_MALAM',
    order: 44,
    isRequired: true,
    unlockTime: '06:00',
    inputType: 'APP_STATUS',
  },
];

async function main() {
  console.log('Seeding checklist templates v2...\n');

  // Clear existing templates for new types only
  const newTypes: DailyChecklistType[] = ['OPS_SIANG', 'OPS_MALAM', 'MONITORING_SIANG', 'MONITORING_MALAM'];

  for (const checklistType of newTypes) {
    const deleted = await prisma.serverAccessChecklistTemplate.deleteMany({
      where: { checklistType },
    });
    console.log(`Deleted ${deleted.count} templates for ${checklistType}`);
  }

  // Insert Checklist Ops templates
  console.log('\nInserting Checklist Ops templates...');
  for (const template of checklistOpsTemplates) {
    await prisma.serverAccessChecklistTemplate.create({
      data: template,
    });
  }
  console.log(`Inserted ${checklistOpsTemplates.length} Checklist Ops templates`);

  // Insert Checklist Monitoring templates
  console.log('\nInserting Checklist Monitoring templates...');
  for (const template of checklistMonitoringTemplates) {
    await prisma.serverAccessChecklistTemplate.create({
      data: template,
    });
  }
  console.log(`Inserted ${checklistMonitoringTemplates.length} Checklist Monitoring templates`);

  console.log('\n=== Summary ===');
  console.log(`Total Checklist Ops items: ${checklistOpsTemplates.length}`);
  console.log(`Total Checklist Monitoring items: ${checklistMonitoringTemplates.length}`);
  console.log(`Grand Total: ${checklistOpsTemplates.length + checklistMonitoringTemplates.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
