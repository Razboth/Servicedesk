import { PrismaClient, ShiftChecklistCategory } from '@prisma/client';

const prisma = new PrismaClient();

const checklistTemplates = [
  // ============================================
  // Pemantauan Sistem (SYSTEM_MONITORING)
  // ============================================
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Periksa dashboard monitoring utama',
    description: 'Pastikan semua sistem monitoring aktif dan tidak ada alert kritis',
    order: 1,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Tinjau dan tangani alert sistem',
    description: 'Periksa notifikasi alert dan tangani yang memerlukan tindakan segera',
    order: 2,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Periksa status jaringan cabang',
    description: 'Verifikasi konektivitas jaringan semua cabang melalui monitoring',
    order: 3,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Periksa status ATM',
    description: 'Monitor status operasional ATM dan identifikasi ATM yang offline',
    order: 4,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Verifikasi backup sistem',
    description: 'Pastikan backup terjadwal berjalan dengan sukses',
    order: 5,
    isRequired: false,
  },
  {
    category: ShiftChecklistCategory.SYSTEM_MONITORING,
    title: 'Periksa kesehatan server',
    description: 'Review metrik server (CPU, RAM, Disk, Network)',
    order: 6,
    isRequired: true,
  },

  // ============================================
  // Manajemen Tiket (TICKET_MANAGEMENT)
  // ============================================
  {
    category: ShiftChecklistCategory.TICKET_MANAGEMENT,
    title: 'Tinjau tiket terbuka yang ditugaskan',
    description: 'Periksa daftar tiket yang ditugaskan kepada Anda',
    order: 1,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.TICKET_MANAGEMENT,
    title: 'Periksa pelanggaran SLA',
    description: 'Identifikasi tiket yang mendekati atau melewati batas SLA',
    order: 2,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.TICKET_MANAGEMENT,
    title: 'Tangani eskalasi tiket',
    description: 'Proses tiket yang dieskalasi dan memerlukan perhatian segera',
    order: 3,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.TICKET_MANAGEMENT,
    title: 'Perbarui status tiket yang dikerjakan',
    description: 'Update progress dan status tiket yang sedang ditangani',
    order: 4,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.TICKET_MANAGEMENT,
    title: 'Dokumentasikan resolusi tiket',
    description: 'Catat solusi dan langkah penyelesaian tiket yang selesai',
    order: 5,
    isRequired: false,
  },

  // ============================================
  // Serah Terima (HANDOVER_TASKS)
  // ============================================
  {
    category: ShiftChecklistCategory.HANDOVER_TASKS,
    title: 'Siapkan catatan serah terima',
    description: 'Dokumentasikan hal-hal penting untuk shift berikutnya',
    order: 1,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.HANDOVER_TASKS,
    title: 'Dokumentasikan masalah yang belum selesai',
    description: 'Catat issue yang masih pending dan perlu dilanjutkan',
    order: 2,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.HANDOVER_TASKS,
    title: 'Briefing ke shift berikutnya',
    description: 'Sampaikan informasi penting kepada teknisi shift berikutnya',
    order: 3,
    isRequired: false,
  },
  {
    category: ShiftChecklistCategory.HANDOVER_TASKS,
    title: 'Perbarui log shift',
    description: 'Lengkapi catatan aktivitas selama shift',
    order: 4,
    isRequired: true,
  },
  {
    category: ShiftChecklistCategory.HANDOVER_TASKS,
    title: 'Lengkapi laporan shift',
    description: 'Finalisasi dan submit laporan shift',
    order: 5,
    isRequired: true,
  },
];

async function main() {
  console.log('Seeding shift checklist templates...');

  // Clear existing templates (optional - comment out if you want to preserve existing)
  const deleted = await prisma.shiftChecklistTemplate.deleteMany({});
  console.log(`Deleted ${deleted.count} existing templates`);

  // Create new templates
  for (const template of checklistTemplates) {
    const created = await prisma.shiftChecklistTemplate.create({
      data: {
        shiftType: null, // Applies to all shift types
        category: template.category,
        title: template.title,
        description: template.description,
        order: template.order,
        isRequired: template.isRequired,
        isActive: true,
      },
    });
    console.log(`Created template: ${created.title}`);
  }

  console.log(`\nSuccessfully seeded ${checklistTemplates.length} checklist templates`);
}

main()
  .catch((e) => {
    console.error('Error seeding templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
