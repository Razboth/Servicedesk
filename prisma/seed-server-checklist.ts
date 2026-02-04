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

// ============================================
// SERVER_SIANG - Daytime Server Checklist (08:00 - 20:00)
// PIC: Any staff with server access
// ============================================
const serverSiangTemplates: ChecklistTemplate[] = [
  // Periodic monitoring every 2 hours
  {
    title: 'Pemantauan Server Pukul 08:00',
    description: 'Periksa kondisi server pada jam 08:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Pemantauan Server Pukul 10:00',
    description: 'Periksa kondisi server pada jam 10:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 2,
    isRequired: true,
    unlockTime: '10:00',
  },
  {
    title: 'Pemantauan Server Pukul 12:00',
    description: 'Periksa kondisi server pada jam 12:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 3,
    isRequired: true,
    unlockTime: '12:00',
  },
  {
    title: 'Pemantauan Server Pukul 14:00',
    description: 'Periksa kondisi server pada jam 14:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 4,
    isRequired: true,
    unlockTime: '14:00',
  },
  {
    title: 'Pemantauan Server Pukul 16:00',
    description: 'Periksa kondisi server pada jam 16:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 5,
    isRequired: true,
    unlockTime: '16:00',
  },
  {
    title: 'Pemantauan Server Pukul 18:00',
    description: 'Periksa kondisi server pada jam 18:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_SIANG',
    order: 6,
    isRequired: true,
    unlockTime: '18:00',
  },
  // General daytime tasks
  {
    title: 'Review security logs pagi',
    description: 'Periksa log keamanan untuk aktivitas mencurigakan selama malam sebelumnya',
    category: 'SECURITY_CHECK',
    checklistType: 'SERVER_SIANG',
    order: 10,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Cek status scheduled jobs',
    description: 'Pastikan scheduled jobs berjalan sesuai jadwal',
    category: 'MAINTENANCE',
    checklistType: 'SERVER_SIANG',
    order: 11,
    isRequired: true,
    unlockTime: null,
  },
]

// ============================================
// SERVER_MALAM - Nighttime Server Checklist (20:00 - 07:59)
// PIC: Shift Standby only
// ============================================
const serverMalamTemplates: ChecklistTemplate[] = [
  // Periodic monitoring every 2 hours
  {
    title: 'Pemantauan Server Pukul 20:00',
    description: 'Periksa kondisi server pada jam 20:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 1,
    isRequired: true,
    unlockTime: '20:00',
  },
  {
    title: 'Pemantauan Server Pukul 22:00',
    description: 'Periksa kondisi server pada jam 22:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 2,
    isRequired: true,
    unlockTime: '22:00',
  },
  {
    title: 'Pemantauan Server Pukul 00:00',
    description: 'Periksa kondisi server pada jam 00:00 WITA (tengah malam). Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 3,
    isRequired: true,
    unlockTime: '00:00',
  },
  {
    title: 'Pemantauan Server Pukul 02:00',
    description: 'Periksa kondisi server pada jam 02:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 4,
    isRequired: true,
    unlockTime: '02:00',
  },
  {
    title: 'Pemantauan Server Pukul 04:00',
    description: 'Periksa kondisi server pada jam 04:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 5,
    isRequired: true,
    unlockTime: '04:00',
  },
  {
    title: 'Pemantauan Server Pukul 06:00',
    description: 'Periksa kondisi server pada jam 06:00 WITA. Catat status CPU, memory, disk, dan service penting.',
    category: 'SERVER_HEALTH',
    checklistType: 'SERVER_MALAM',
    order: 6,
    isRequired: true,
    unlockTime: '06:00',
  },
  // Backup verification (night shift responsibility)
  {
    title: 'Verifikasi backup database utama',
    description: 'Pastikan backup database utama berhasil dilakukan dan file backup tersedia',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'SERVER_MALAM',
    order: 10,
    isRequired: true,
    unlockTime: '22:00',
  },
  {
    title: 'Verifikasi backup incremental',
    description: 'Cek status backup incremental harian',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'SERVER_MALAM',
    order: 11,
    isRequired: true,
    unlockTime: '22:30',
  },
  {
    title: 'Cek integritas file backup',
    description: 'Verifikasi bahwa file backup tidak corrupt dan dapat di-restore',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'SERVER_MALAM',
    order: 12,
    isRequired: false,
    unlockTime: null,
  },
  // Morning handover preparation
  {
    title: 'Persiapan serah terima pagi',
    description: 'Siapkan catatan kejadian malam untuk handover ke shift pagi',
    category: 'MAINTENANCE',
    checklistType: 'SERVER_MALAM',
    order: 20,
    isRequired: true,
    unlockTime: '06:00',
  },
]

// ============================================
// HARIAN - Daily Operational Checklist (08:00 - branch closed)
// PIC: Shift Operasional
// ============================================
const harianTemplates: ChecklistTemplate[] = [
  {
    title: 'Cek status sistem utama',
    description: 'Verifikasi semua sistem utama berjalan normal',
    category: 'SERVER_HEALTH',
    checklistType: 'HARIAN',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Review tiket pending',
    description: 'Tinjau tiket yang masih pending dari hari sebelumnya',
    category: 'MAINTENANCE',
    checklistType: 'HARIAN',
    order: 2,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Koordinasi dengan tim cabang',
    description: 'Konfirmasi status operasional dengan tim cabang',
    category: 'MAINTENANCE',
    checklistType: 'HARIAN',
    order: 3,
    isRequired: false,
    unlockTime: null,
  },
  // Placeholder - user will provide actual items
  {
    title: '[Placeholder] Tugas harian 1',
    description: 'Item placeholder - akan diganti dengan tugas harian sebenarnya',
    category: 'MAINTENANCE',
    checklistType: 'HARIAN',
    order: 100,
    isRequired: false,
    unlockTime: null,
  },
]

// ============================================
// AKHIR_HARI - End of Day Checklist (before handover ~18:00-20:00)
// PIC: Shift Operasional
// ============================================
const akhirHariTemplates: ChecklistTemplate[] = [
  {
    title: 'Rangkuman aktivitas hari ini',
    description: 'Buat ringkasan aktivitas dan kejadian penting selama shift',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 1,
    isRequired: true,
    unlockTime: '17:00',
  },
  {
    title: 'Update status tiket',
    description: 'Pastikan semua tiket yang dikerjakan sudah di-update statusnya',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 2,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Catatan serah terima',
    description: 'Siapkan catatan penting untuk shift malam',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 3,
    isRequired: true,
    unlockTime: '18:00',
  },
  {
    title: 'Verifikasi final sistem',
    description: 'Pastikan semua sistem dalam kondisi stabil sebelum handover',
    category: 'SERVER_HEALTH',
    checklistType: 'AKHIR_HARI',
    order: 4,
    isRequired: true,
    unlockTime: '19:00',
  },
  // Placeholder - user will provide actual items
  {
    title: '[Placeholder] Tugas akhir hari 1',
    description: 'Item placeholder - akan diganti dengan tugas akhir hari sebenarnya',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 100,
    isRequired: false,
    unlockTime: null,
  },
]

// Combine all templates
const allTemplates: ChecklistTemplate[] = [
  ...serverSiangTemplates,
  ...serverMalamTemplates,
  ...harianTemplates,
  ...akhirHariTemplates,
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
  let skipped = 0
  let updated = 0

  const stats: Record<string, number> = {
    SERVER_SIANG: 0,
    SERVER_MALAM: 0,
    HARIAN: 0,
    AKHIR_HARI: 0,
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
  log.info(`Skipped: ${skipped}`)

  log.section('=== Templates per Checklist Type ===')
  log.info(`SERVER_SIANG: ${stats.SERVER_SIANG} items (daytime 08:00-20:00)`)
  log.info(`SERVER_MALAM: ${stats.SERVER_MALAM} items (nighttime 20:00-07:59)`)
  log.info(`HARIAN: ${stats.HARIAN} items (daily ops)`)
  log.info(`AKHIR_HARI: ${stats.AKHIR_HARI} items (end of day)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
