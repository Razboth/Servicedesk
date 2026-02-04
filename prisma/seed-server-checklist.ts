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
// PERIODIC SERVER ITEMS - Check every 2 hours
// These items are repeated for each time slot
// ============================================
const periodicServerItems = [
  {
    title: 'Status Server',
    description: 'Periksa status server (CPU, Memory, Disk usage). Pastikan semua service berjalan normal.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Koneksi Jaringan',
    description: 'Cek koneksi jaringan utama dan backup. Pastikan latency dalam batas normal.',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Koneksi Host 2 Host',
    description: 'Verifikasi koneksi Host to Host dengan mitra (BI, switching, dll).',
    category: 'SERVER_HEALTH' as const,
    isRequired: true,
  },
  {
    title: 'Status ATM',
    description: 'Cek jumlah alarm ATM di monitoring. Catat jumlah ATM offline/bermasalah.',
    category: 'MAINTENANCE' as const,
    isRequired: true,
  },
]

// Time slots for daytime (SERVER_SIANG)
const daytimeSlots = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']

// Time slots for nighttime (SERVER_MALAM)
const nighttimeSlots = ['20:00', '22:00', '00:00', '02:00', '04:00', '06:00']

// Generate periodic items for a checklist type
function generatePeriodicItems(
  checklistType: 'SERVER_SIANG' | 'SERVER_MALAM',
  timeSlots: string[]
): ChecklistTemplate[] {
  const items: ChecklistTemplate[] = []

  timeSlots.forEach((time, slotIndex) => {
    periodicServerItems.forEach((item, itemIndex) => {
      items.push({
        title: `[${time}] ${item.title}`,
        description: `${item.description} (Pemeriksaan pukul ${time} WITA)`,
        category: item.category,
        checklistType,
        order: slotIndex * 10 + itemIndex + 1,
        isRequired: item.isRequired,
        unlockTime: time,
      })
    })
  })

  return items
}

// ============================================
// SERVER_SIANG - Daytime Server Checklist (08:00 - 20:00)
// ============================================
const serverSiangTemplates: ChecklistTemplate[] = [
  ...generatePeriodicItems('SERVER_SIANG', daytimeSlots),
]

// ============================================
// SERVER_MALAM - Nighttime Server Checklist (20:00 - 07:59)
// ============================================
const serverMalamTemplates: ChecklistTemplate[] = [
  ...generatePeriodicItems('SERVER_MALAM', nighttimeSlots),
  // Backup verification - night shift responsibility
  {
    title: 'Backup Database',
    description: 'Verifikasi backup database harian berhasil. Cek log backup dan ukuran file.',
    category: 'BACKUP_VERIFICATION',
    checklistType: 'SERVER_MALAM',
    order: 100,
    isRequired: true,
    unlockTime: '22:00',
  },
  {
    title: 'Persiapan Serah Terima Pagi',
    description: 'Siapkan catatan kejadian malam untuk handover ke shift pagi.',
    category: 'MAINTENANCE',
    checklistType: 'SERVER_MALAM',
    order: 110,
    isRequired: true,
    unlockTime: '06:00',
  },
]

// ============================================
// HARIAN - Daily Operational Checklist
// PIC: Shift Operasional
// ============================================
const harianTemplates: ChecklistTemplate[] = [
  {
    title: 'Koneksi Touch iOS',
    description: 'Cek koneksi dan fungsi aplikasi mobile banking iOS.',
    category: 'SERVER_HEALTH',
    checklistType: 'HARIAN',
    order: 1,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Koneksi Touch Android',
    description: 'Cek koneksi dan fungsi aplikasi mobile banking Android.',
    category: 'SERVER_HEALTH',
    checklistType: 'HARIAN',
    order: 2,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Koneksi QRIS',
    description: 'Verifikasi koneksi dan transaksi QRIS berjalan normal.',
    category: 'SERVER_HEALTH',
    checklistType: 'HARIAN',
    order: 3,
    isRequired: true,
    unlockTime: '08:00',
  },
  {
    title: 'Grafik Grafana',
    description: 'Monitor dashboard Grafana untuk anomali atau alert.',
    category: 'MAINTENANCE',
    checklistType: 'HARIAN',
    order: 4,
    isRequired: true,
    unlockTime: null,
  },
  {
    title: 'Review Tiket Pending',
    description: 'Tinjau tiket yang masih pending dari hari sebelumnya.',
    category: 'MAINTENANCE',
    checklistType: 'HARIAN',
    order: 5,
    isRequired: false,
    unlockTime: null,
  },
]

// ============================================
// AKHIR_HARI - End of Day Checklist
// PIC: Shift Operasional (before handover)
// ============================================
const akhirHariTemplates: ChecklistTemplate[] = [
  {
    title: 'Daily Server Usage',
    description: 'Dokumentasikan penggunaan resource server hari ini (peak usage, anomali).',
    category: 'SERVER_HEALTH',
    checklistType: 'AKHIR_HARI',
    order: 1,
    isRequired: true,
    unlockTime: '17:00',
  },
  {
    title: 'File Staging',
    description: 'Cek dan bersihkan file staging yang sudah tidak diperlukan.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 2,
    isRequired: true,
    unlockTime: '17:00',
  },
  {
    title: 'Report Harian',
    description: 'Siapkan laporan aktivitas harian untuk dokumentasi.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 3,
    isRequired: true,
    unlockTime: '17:00',
  },
  {
    title: 'Operasional Cabang',
    description: 'Konfirmasi status operasional semua cabang dan catat jika ada kendala.',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 4,
    isRequired: true,
    unlockTime: '16:00',
  },
  {
    title: 'Catatan Serah Terima',
    description: 'Siapkan catatan penting untuk shift malam (pending issues, follow-up needed).',
    category: 'MAINTENANCE',
    checklistType: 'AKHIR_HARI',
    order: 5,
    isRequired: true,
    unlockTime: '18:00',
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

  log.section('=== Templates per Checklist Type ===')
  log.info(`SERVER_SIANG: ${stats.SERVER_SIANG} items (daytime 08:00-18:00, periodic every 2 hours)`)
  log.info(`SERVER_MALAM: ${stats.SERVER_MALAM} items (nighttime 20:00-06:00, periodic + backup)`)
  log.info(`HARIAN: ${stats.HARIAN} items (daily operational)`)
  log.info(`AKHIR_HARI: ${stats.AKHIR_HARI} items (end of day handover)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
