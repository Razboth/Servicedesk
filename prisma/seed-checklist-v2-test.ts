import { PrismaClient, ChecklistUnit, ChecklistRole, ChecklistShiftType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Checklist V2 Test Data...\n')

  const hashedPassword = await bcrypt.hash('Test123!', 10)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Test users configuration
  const testUsers = [
    { username: 'staff_itops_1', name: 'Budi Santoso', unit: 'IT_OPERATIONS', checklistRole: 'STAFF' },
    { username: 'staff_itops_2', name: 'Andi Wijaya', unit: 'IT_OPERATIONS', checklistRole: 'STAFF' },
    { username: 'spv_itops', name: 'Dewi Lestari', unit: 'IT_OPERATIONS', checklistRole: 'SUPERVISOR' },
    { username: 'staff_mon_1', name: 'Rudi Hartono', unit: 'MONITORING', checklistRole: 'STAFF' },
    { username: 'staff_mon_2', name: 'Siti Rahayu', unit: 'MONITORING', checklistRole: 'STAFF' },
    { username: 'spv_mon', name: 'Ahmad Fauzi', unit: 'MONITORING', checklistRole: 'SUPERVISOR' },
  ]

  // Step 1: Create users
  const createdUsers: Array<{
    id: string
    username: string
    name: string
    unit: string
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
      unit: userData.unit,
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
      update: { unit: user.unit as ChecklistUnit, isActive: true },
      create: {
        userId: user.id,
        unit: user.unit as ChecklistUnit,
        addedById: adminUser.id,
      },
    })
    console.log(`   ${user.name} → ${user.unit}`)
  }

  // Step 3: Create checklists and assignments
  const shifts = [
    { unit: 'IT_OPERATIONS' as ChecklistUnit, shiftType: 'HARIAN_KANTOR' as ChecklistShiftType },
    { unit: 'MONITORING' as ChecklistUnit, shiftType: 'SHIFT_MALAM' as ChecklistShiftType },
  ]

  for (const shift of shifts) {
    // Get templates for this shift
    const templates = await prisma.checklistTemplateV2.findMany({
      where: { unit: shift.unit, shiftType: shift.shiftType, isActive: true },
      orderBy: [{ section: 'asc' }, { order: 'asc' }],
    })

    // Check if checklist already exists
    const existingChecklist = await prisma.dailyChecklistV2.findUnique({
      where: { date_unit_shiftType: { date: today, unit: shift.unit, shiftType: shift.shiftType } },
    })

    let checklist
    if (existingChecklist) {
      checklist = existingChecklist
      console.log(`\n📅 Checklist exists: ${shift.unit} - ${shift.shiftType}`)
    } else {
      checklist = await prisma.dailyChecklistV2.create({
        data: {
          date: today,
          unit: shift.unit,
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
      console.log(`\n📅 Created checklist: ${shift.unit} - ${shift.shiftType} (${templates.length} items)`)
    }

    // Assign users
    const usersForShift = createdUsers.filter((u) => u.unit === shift.unit)
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
  console.log('   Username: staff_itops_1, staff_itops_2, spv_itops')
  console.log('   Username: staff_mon_1, staff_mon_2, spv_mon')
  console.log('   Password: Test123!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
