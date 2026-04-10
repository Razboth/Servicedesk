import { PrismaClient, ChecklistType, ChecklistRole, ChecklistShiftType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Get current date in WITA timezone (UTC+8) - returns date at midnight UTC
function getWITADate(): Date {
  const now = new Date()
  // Get WITA time
  const utcTime = now.getTime() + now.getTimezoneOffset() * 60 * 1000
  const witaTime = new Date(utcTime + 8 * 60 * 60 * 1000)
  // Extract year, month, day from WITA time and create UTC midnight date
  const year = witaTime.getFullYear()
  const month = witaTime.getMonth()
  const day = witaTime.getDate()
  // Create a date at midnight UTC for this WITA date
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0))
}

async function main() {
  console.log('🌱 Seeding Checklist V2 Test Data...\n')

  const hashedPassword = await bcrypt.hash('Test123!', 10)
  const today = getWITADate()
  console.log(`📅 Using WITA date: ${today.toISOString().split('T')[0]}\n`)

  // Test users configuration for 3 checklist types
  const testUsers = [
    // IT Infrastructure team
    { username: 'staff_it_1', name: 'Budi Santoso', checklistType: 'IT_INFRASTRUKTUR', checklistRole: 'STAFF' },
    { username: 'staff_it_2', name: 'Andi Wijaya', checklistType: 'IT_INFRASTRUKTUR', checklistRole: 'STAFF' },
    { username: 'spv_it', name: 'Dewi Lestari', checklistType: 'IT_INFRASTRUKTUR', checklistRole: 'SUPERVISOR' },
    // Keamanan Siber (KKS) team
    { username: 'staff_kks_1', name: 'Rudi Hartono', checklistType: 'KEAMANAN_SIBER', checklistRole: 'STAFF' },
    { username: 'staff_kks_2', name: 'Siti Rahayu', checklistType: 'KEAMANAN_SIBER', checklistRole: 'STAFF' },
    { username: 'spv_kks', name: 'Ahmad Fauzi', checklistType: 'KEAMANAN_SIBER', checklistRole: 'SUPERVISOR' },
    // Fraud & Compliance team
    { username: 'staff_fraud_1', name: 'Dian Permata', checklistType: 'FRAUD_COMPLIANCE', checklistRole: 'STAFF' },
    { username: 'staff_fraud_2', name: 'Eko Prasetyo', checklistType: 'FRAUD_COMPLIANCE', checklistRole: 'STAFF' },
    { username: 'spv_fraud', name: 'Fitri Handayani', checklistType: 'FRAUD_COMPLIANCE', checklistRole: 'SUPERVISOR' },
  ]

  // Step 1: Create users
  const createdUsers: Array<{
    id: string
    username: string
    name: string
    checklistType: string
    checklistRole: string
  }> = []

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: { name: userData.name, isActive: true },
      create: {
        username: userData.username,
        email: `${userData.username}@test.banksulutgo.co.id`,
        name: userData.name,
        password: hashedPassword,
        role: 'TECHNICIAN',
        isActive: true,
        mustChangePassword: false,
        isFirstLogin: false,
      },
    })
    createdUsers.push({
      id: user.id,
      username: user.username,
      name: user.name,
      checklistType: userData.checklistType,
      checklistRole: userData.checklistRole,
    })
    console.log(`✅ User: ${user.name} (${user.username})`)
  }

  // Get admin user for addedById
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!adminUser) throw new Error('No admin user found. Please create an admin user first.')

  // Step 2: Add to standby pool
  console.log('\n📋 Adding to standby pool...')
  for (const user of createdUsers) {
    await prisma.checklistStandbyV2.upsert({
      where: { userId: user.id },
      update: { checklistType: user.checklistType as ChecklistType, isActive: true },
      create: {
        userId: user.id,
        checklistType: user.checklistType as ChecklistType,
        canBePrimary: true,
        canBeBuddy: true,
        addedById: adminUser.id,
      },
    })
    console.log(`   ${user.name} → ${user.checklistType}`)
  }

  // Step 3: Create checklists and assignments for each type and shift
  const shifts: Array<{ checklistType: ChecklistType; shiftType: ChecklistShiftType }> = [
    { checklistType: 'IT_INFRASTRUKTUR' as ChecklistType, shiftType: 'SHIFT_SIANG' as ChecklistShiftType },
    { checklistType: 'KEAMANAN_SIBER' as ChecklistType, shiftType: 'SHIFT_SIANG' as ChecklistShiftType },
    { checklistType: 'FRAUD_COMPLIANCE' as ChecklistType, shiftType: 'SHIFT_SIANG' as ChecklistShiftType },
    { checklistType: 'IT_INFRASTRUKTUR' as ChecklistType, shiftType: 'SHIFT_MALAM' as ChecklistShiftType },
  ]

  for (const shift of shifts) {
    // Get templates for this shift
    const templates = await prisma.checklistTemplateV2.findMany({
      where: { checklistType: shift.checklistType, shiftType: shift.shiftType, isActive: true },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    })

    if (templates.length === 0) {
      console.log(`\n⚠️  No templates found for ${shift.checklistType} - ${shift.shiftType}. Skipping...`)
      continue
    }

    // Check if checklist already exists
    const existingChecklist = await prisma.dailyChecklistV2.findUnique({
      where: { date_checklistType_shiftType: { date: today, checklistType: shift.checklistType, shiftType: shift.shiftType } },
    })

    let checklist
    if (existingChecklist) {
      checklist = existingChecklist
      console.log(`\n📅 Checklist exists: ${shift.checklistType} - ${shift.shiftType}`)
    } else {
      checklist = await prisma.dailyChecklistV2.create({
        data: {
          date: today,
          checklistType: shift.checklistType,
          shiftType: shift.shiftType,
          status: 'PENDING',
          items: {
            create: templates.map((t) => ({
              templateId: t.id,
              section: t.section,
              sectionTitle: t.sectionTitle,
              itemNumber: t.itemNumber,
              title: t.title,
              description: t.description,
              toolSystem: t.toolSystem,
              timeSlot: t.timeSlot,
              isRequired: t.isRequired,
              order: t.order,
              status: 'PENDING',
            })),
          },
        },
      })
      console.log(`\n📅 Created checklist: ${shift.checklistType} - ${shift.shiftType} (${templates.length} items)`)
    }

    // Assign users
    const usersForShift = createdUsers.filter((u) => u.checklistType === shift.checklistType)
    for (const user of usersForShift) {
      await prisma.checklistAssignmentV2.upsert({
        where: { checklistId_userId: { checklistId: checklist.id, userId: user.id } },
        update: { role: user.checklistRole as ChecklistRole },
        create: {
          checklistId: checklist.id,
          userId: user.id,
          role: user.checklistRole as ChecklistRole,
        },
      })
      console.log(`   👤 ${user.name} → ${user.checklistRole}`)
    }
  }

  console.log('\n✨ Seed completed!')
  console.log('\n📝 Test credentials:')
  console.log('   IT Infrastructure: staff_it_1, staff_it_2, spv_it')
  console.log('   Keamanan Siber:    staff_kks_1, staff_kks_2, spv_kks')
  console.log('   Fraud & Compliance: staff_fraud_1, staff_fraud_2, spv_fraud')
  console.log('   Password: Test123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
