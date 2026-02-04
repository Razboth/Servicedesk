import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
}

// Logger helper
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
}

// Template type definition
interface ChecklistTemplate {
  title: string
  description: string
  category: 'BACKUP_VERIFICATION' | 'SERVER_HEALTH' | 'SECURITY_CHECK' | 'MAINTENANCE'
  checklistType: 'HARIAN' | 'SERVER_SIANG' | 'SERVER_MALAM' | 'AKHIR_HARI'
  order: number
  isRequired: boolean
  unlockTime: string | null
}

// Time slots
const daytimeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
const nighttimeSlots = ['20:00', '22:00', '00:00', '02:00', '04:00', '06:00']

// ============================================
// HARIAN - Shift Operasional (08:00 - branch close)
// PIC: STANDBY_BRANCH
// ============================================

// Non-periodic HARIAN items
const harianNonPeriodicItems: Omit<ChecklistTemplate, 'checklistType'>[] = [
  {
    title: 'Verifikasi Ticket Pending H-1',
    description: 'Verifikasi semua ticket berstatus PENDING, PENDING_VENDOR, dan OPEN dari hari sebelumnya (H-1 WITA). Pastikan semua ticket sudah ditindaklanjuti.',
    category: 'MAINTENANCE',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Review Catatan Serah Terima',
    description: 'Review dan terima notes serah terima dari shift malam. Catat masalah yang masih berjalan dan perlu ditindaklanjuti.',
    category: 'MAINTENANCE',
    order: 2,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Status Cabang Buka',
    description: 'Catat status operasional semua cabang: jam berapa cabang buka, apakah ada kendala saat pembukaan.',
    category: 'MAINTENANCE',
    order: 3,
    isRequired: true,
    unlockTime: '08:00',
  },
]

// Periodic HARIAN items (08:00 - 18:00 every 2 hours)
const harianPeriodicItems = [
  {
    title: 'Grafik Grafana',
    description: 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Masalah Operasional',
    description: 'Cek dan catat masalah operasional yang terjadi: jaringan, aplikasi, hardware, dll.',
    category: 'MAINTENANCE' as const,
    isRequired: true,
  },
  {
    title: 'Koneksi Aplikasi',
    description: 'Verifikasi koneksi aplikasi: Touch iOS, Touch Android, QRIS. Pastikan semua berjalan normal.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
]

// Generate HARIAN templates
const harianTemplates: ChecklistTemplate[] = [
  // Non-periodic items
  ...harianNonPeriodicItems.map(item => ({ ...item, checklistType: 'HARIAN' as const })),
  // Periodic items
  ...daytimeSlots.flatMap((time, slotIndex) =>
    harianPeriodicItems.map((item, itemIndex) => ({
      title: `[${time}] ${item.title}`,
      description: `${item.description} (Pemeriksaan pukul ${time} WITA)`,
      category: item.category,
      checklistType: 'HARIAN' as const,
      order: 10 + slotIndex * 10 + itemIndex + 1,
      isRequired: item.isRequired,
      unlockTime: time,
    }))
  ),
]

// ============================================
// AKHIR_HARI - End of Day for Shift Operasional
// PIC: STANDBY_BRANCH (before handover)
// ============================================
const akhirHariTemplates: ChecklistTemplate[] = [
  {
    title: 'Status Cabang Tutup',
    description: 'Catat status operasional cabang tutup: jam berapa cabang tutup, apakah ada kendala saat penutupan.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 1,
    isRequired: true,
    unlockTime: '15:00',
  },
  {
    title: 'Rekap Masalah Hari Ini',
    description: 'Buat rekap semua masalah yang terjadi hari ini: yang sudah selesai dan yang masih pending.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 2,
    isRequired: true,
    unlockTime: '17:00',
  },
  {
    title: 'Catatan Serah Terima ke Malam',
    description: 'Siapkan catatan serah terima untuk shift malam: pending issues, follow-up yang diperlukan, informasi penting lainnya.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 3,
    isRequired: true,
    unlockTime: '18:00',
  },
]

// ============================================
// SERVER_SIANG - Server Monitoring (08:00 - 20:00)
// PIC: Any staff with server access
// ============================================

// Non-periodic SERVER_SIANG items
const serverSiangNonPeriodicItems: Omit<ChecklistTemplate, 'checklistType'>[] = [
  {
    title: 'Status Reporting',
    description: 'Cek status sistem reporting: apakah semua report berjalan normal, ada error atau pending.',
    category: 'SERVER_HEALTH',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Status Staging',
    description: 'Cek status file staging: apakah ada file yang perlu diproses, error, atau backlog.',
    category: 'MAINTENANCE',
    order: 2,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Usage Metrics',
    description: 'Review usage metrics server: CPU, Memory, Disk usage. Catat jika ada anomali.',
    category: 'SERVER_HEALTH',
    order: 3,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Status Backup',
    description: 'Verifikasi status backup: apakah backup semalam berhasil, cek log dan ukuran file backup.',
    category: 'BACKUP_VERIFICATION',
    order: 4,
    isRequired: true,
    unlockTime: '08:00',
  },
]

// Periodic SERVER_SIANG items (08:00 - 18:00 every 2 hours)
const serverSiangPeriodicItems = [
  {
    title: 'Status Aplikasi Critical',
    description: 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status Aplikasi Surrounding',
    description: 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status Alert ATM',
    description: 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah.',
    category: 'MAINTENANCE' as const,
    isRequired: true,
  },
]

// Generate SERVER_SIANG templates
const serverSiangTemplates: ChecklistTemplate[] = [
  // Non-periodic items
  ...serverSiangNonPeriodicItems.map(item => ({ ...item, checklistType: 'SERVER_SIANG' as const })),
  // Periodic items
  ...daytimeSlots.flatMap((time, slotIndex) =>
    serverSiangPeriodicItems.map((item, itemIndex) => ({
      title: `[${time}] ${item.title}`,
      description: `${item.description} (Pemeriksaan pukul ${time} WITA)`,
      category: item.category,
      checklistType: 'SERVER_SIANG' as const,
      order: 10 + slotIndex * 10 + itemIndex + 1,
      isRequired: item.isRequired,
      unlockTime: time,
    }))
  ),
]

// ============================================
// SERVER_MALAM - Night Monitoring (20:00 - 07:59)
// PIC: Standby shift with server access
// ============================================

// Non-periodic SERVER_MALAM items (Harian malam)
const serverMalamNonPeriodicItems: Omit<ChecklistTemplate, 'checklistType'>[] = [
  {
    title: 'Status Permasalahan untuk Serah Terima',
    description: 'Catat status semua permasalahan yang terjadi malam ini untuk diserahterimakan ke shift pagi.',
    category: 'MAINTENANCE',
    order: 1,
    isRequired: true,
    unlockTime: '06:00',
  },
  {
    title: 'List Kegiatan Malam',
    description: 'Catat semua kegiatan yang dilakukan malam ini: update sistem, backup manual, maintenance, dll.',
    category: 'MAINTENANCE',
    order: 2,
    isRequired: true,
    unlockTime: '06:00',
  },
]

// Periodic SERVER_MALAM items (20:00 - 06:00 every 2 hours)
const serverMalamPeriodicItems = [
  {
    title: 'Status Aplikasi Critical',
    description: 'Cek status aplikasi critical: Core Banking, Switching, Channel. Pastikan semua UP dan berjalan normal.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status Aplikasi Surrounding',
    description: 'Cek status aplikasi surrounding: CMS, Internet Banking, Mobile Banking backend, dll.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status Alert ATM',
    description: 'Cek status alert ATM dari monitoring (/monitoring/atm). Catat jumlah ATM offline/bermasalah.',
    category: 'MAINTENANCE' as const,
    isRequired: true,
  },
  {
    title: 'Status Grafana',
    description: 'Monitor dashboard Grafana. Catat status: hijau semua atau ada yang merah. Jika merah, catat detail alertnya.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status Operasional',
    description: 'Cek dan catat status operasional: jaringan, koneksi aplikasi, hardware, dll.',
    category: 'MAINTENANCE' as const,
    isRequired: true,
  },
]

// Generate SERVER_MALAM templates
const serverMalamTemplates: ChecklistTemplate[] = [
  // Non-periodic items
  ...serverMalamNonPeriodicItems.map(item => ({ ...item, checklistType: 'SERVER_MALAM' as const })),
  // Periodic items
  ...nighttimeSlots.flatMap((time, slotIndex) =>
    serverMalamPeriodicItems.map((item, itemIndex) => ({
      title: `[${time}] ${item.title}`,
      description: `${item.description} (Pemeriksaan pukul ${time} WITA)`,
      category: item.category,
      checklistType: 'SERVER_MALAM' as const,
      order: 10 + slotIndex * 10 + itemIndex + 1,
      isRequired: item.isRequired,
      unlockTime: time,
    }))
  ),
]

// Combine all templates
const allTemplates: ChecklistTemplate[] = [
  ...harianTemplates,
  ...akhirHariTemplates,
  ...serverSiangTemplates,
  ...serverMalamTemplates,
]

async function main() {
  log.section('=== SEED: Daily Checklist Templates (4 Types) ===')

  // First, clear existing templates if requested
  const clearExisting = process.argv.includes('--clear')
  if (clearExisting) {
    log.warning('Clearing existing templates...')
    await prisma.serverAccessChecklistTemplate.deleteMany({})
    log.success('Existing templates cleared')
  }

  let created = 0
  let updated = 0

  const stats: Record<string, number> = {
    HARIAN: 0,
    AKHIR_HARI: 0,
    SERVER_SIANG: 0,
    SERVER_MALAM: 0,
  }

  for (const template of allTemplates) {
    // Check if template already exists by title and checklistType
    const existing = await prisma.serverAccessChecklistTemplate.findFirst({
      where: {
        title: template.title,
        checklistType: template.checklistType,
      },
    })

    if (existing) {
      // Update existing template
      await prisma.serverAccessChecklistTemplate.update({
        where: { id: existing.id },
        data: {
          description: template.description,
          category: template.category,
          order: template.order,
          isRequired: template.isRequired,
          unlockTime: template.unlockTime,
          isActive: true,
        },
      })
      log.warning(`Updated: [${template.checklistType}] ${template.title}`)
      updated++
      stats[template.checklistType]++
      continue
    }

    // Create new template
    await prisma.serverAccessChecklistTemplate.create({
      data: {
        title: template.title,
        description: template.description,
        category: template.category,
        checklistType: template.checklistType,
        order: template.order,
        isRequired: template.isRequired,
        isActive: true,
        unlockTime: template.unlockTime,
      },
    })

    log.success(`Created: [${template.checklistType}] ${template.title}`)
    created++
    stats[template.checklistType]++
  }

  log.section('=== Seed Complete ===')
  log.info(`Created: ${created}`)
  log.info(`Updated: ${updated}`)

  log.section('=== Templates per Checklist Type ===')
  log.info(`HARIAN: ${stats.HARIAN} items (Shift Operasional 08:00-close, periodic every 2 hours)`)
  log.info(`AKHIR_HARI: ${stats.AKHIR_HARI} items (End of day handover)`)
  log.info(`SERVER_SIANG: ${stats.SERVER_SIANG} items (Server access daytime 08:00-20:00)`)
  log.info(`SERVER_MALAM: ${stats.SERVER_MALAM} items (Night monitoring 20:00-07:59)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
