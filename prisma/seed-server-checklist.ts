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
}

// Logger helper
const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  section: (msg: string) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
}

// Server Access Checklist Templates
// These are for users with hasServerAccess = true
const serverChecklistTemplates = [
  // ============================================
  // BACKUP_VERIFICATION - Verifikasi Backup
  // ============================================
  {
    title: 'Verifikasi backup database utama',
    description: 'Pastikan backup database utama berhasil dilakukan dan file backup tersedia',
    category: 'BACKUP_VERIFICATION',
    order: 1,
    isRequired: true,
    unlockTime: '22:00', // Available after 10 PM
  },
  {
    title: 'Verifikasi backup incremental',
    description: 'Cek status backup incremental harian',
    category: 'BACKUP_VERIFICATION',
    order: 2,
    isRequired: true,
    unlockTime: '22:30',
  },
  {
    title: 'Cek integritas file backup',
    description: 'Verifikasi bahwa file backup tidak corrupt dan dapat di-restore',
    category: 'BACKUP_VERIFICATION',
    order: 3,
    isRequired: false,
    unlockTime: null,
  },

  // ============================================
  // SERVER_HEALTH - Kesehatan Server
  // ============================================
  {
    title: 'Cek CPU dan memory usage',
    description: 'Pastikan penggunaan CPU dan memory dalam batas normal (<80%)',
    category: 'SERVER_HEALTH',
    order: 1,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Cek disk space',
    description: 'Pastikan kapasitas disk mencukupi (>20% tersedia)',
    category: 'SERVER_HEALTH',
    order: 2,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Verifikasi service kritis',
    description: 'Pastikan semua service penting berjalan dengan baik',
    category: 'SERVER_HEALTH',
    order: 3,
    isRequired: true,
    unlockTime: null,
  },

  // ============================================
  // SECURITY_CHECK - Pemeriksaan Keamanan
  // ============================================
  {
    title: 'Review security logs',
    description: 'Periksa log keamanan untuk aktivitas mencurigakan',
    category: 'SECURITY_CHECK',
    order: 1,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Cek failed login attempts',
    description: 'Monitor percobaan login yang gagal',
    category: 'SECURITY_CHECK',
    order: 2,
    isRequired: true,
    unlockTime: null,
  },

  // ============================================
  // MAINTENANCE - Pemeliharaan
  // ============================================
  {
    title: 'Cek antrian job terjadwal',
    description: 'Pastikan scheduled jobs berjalan sesuai jadwal',
    category: 'MAINTENANCE',
    order: 1,
    isRequired: true,
    unlockTime: '07:00', // Available after 7 AM
  },
  {
    title: 'Verifikasi scheduled tasks',
    description: 'Cek status task-task yang dijadwalkan',
    category: 'MAINTENANCE',
    order: 2,
    isRequired: false,
    unlockTime: null,
  },

  // ============================================
  // PERIODIC - Pemantauan Berkala (10:00, 12:00, 14:00, 16:00 WITA)
  // ============================================
  // 10:00 WITA Checks
  {
    title: 'Pemantauan Server Pukul 10:00',
    description: 'Periksa kondisi server pada jam 10:00 WITA. Catat status CPU, memory, dan service penting.',
    category: 'SERVER_HEALTH',
    order: 10,
    isRequired: true,
    unlockTime: '10:00',
  },
  // 12:00 WITA Checks
  {
    title: 'Pemantauan Server Pukul 12:00',
    description: 'Periksa kondisi server pada jam 12:00 WITA. Catat status CPU, memory, dan service penting.',
    category: 'SERVER_HEALTH',
    order: 11,
    isRequired: true,
    unlockTime: '12:00',
  },
  // 14:00 WITA Checks
  {
    title: 'Pemantauan Server Pukul 14:00',
    description: 'Periksa kondisi server pada jam 14:00 WITA. Catat status CPU, memory, dan service penting.',
    category: 'SERVER_HEALTH',
    order: 12,
    isRequired: true,
    unlockTime: '14:00',
  },
  // 16:00 WITA Checks
  {
    title: 'Pemantauan Server Pukul 16:00',
    description: 'Periksa kondisi server pada jam 16:00 WITA. Catat status CPU, memory, dan service penting.',
    category: 'SERVER_HEALTH',
    order: 13,
    isRequired: true,
    unlockTime: '16:00',
  },
]

async function main() {
  log.section('=== SEED: Server Access Checklist Templates ===')

  let created = 0
  let skipped = 0

  for (const template of serverChecklistTemplates) {
    // Check if template already exists by title
    const existing = await prisma.serverAccessChecklistTemplate.findFirst({
      where: { title: template.title },
    })

    if (existing) {
      log.warning(`Template "${template.title}" already exists, skipping...`)
      skipped++
      continue
    }

    await prisma.serverAccessChecklistTemplate.create({
      data: {
        title: template.title,
        description: template.description,
        category: template.category as 'BACKUP_VERIFICATION' | 'SERVER_HEALTH' | 'SECURITY_CHECK' | 'MAINTENANCE',
        order: template.order,
        isRequired: template.isRequired,
        isActive: true,
        unlockTime: template.unlockTime,
      },
    })

    log.success(`Created template: ${template.title}`)
    created++
  }

  log.section('=== Seed Complete ===')
  log.info(`Created: ${created}`)
  log.info(`Skipped: ${skipped}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
