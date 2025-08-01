import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create branches first
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        name: 'Manado Main Branch',
        code: 'MND001',
        address: 'Jl. Sam Ratulangi No. 1',
        city: 'Manado',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Tomohon Branch',
        code: 'TMH001',
        address: 'Jl. Raya Tomohon No. 15',
        city: 'Tomohon',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
    prisma.branch.create({
      data: {
        name: 'Bitung Branch',
        code: 'BTG001',
        address: 'Jl. Pelabuhan Bitung No. 8',
        city: 'Bitung',
        province: 'North Sulawesi',
        isActive: true,
      },
    }),
  ])

  // Create demo users
  const hashedPassword = await bcrypt.hash('password123', 10)
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'admin@banksulutgo.co.id',
        name: 'Super Admin',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@banksulutgo.co.id',
        name: 'Branch Manager',
        password: hashedPassword,
        role: 'MANAGER',
        branchId: branches[0].id, // Assign to Manado Main Branch
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'tech@banksulutgo.co.id',
        name: 'IT Technician',
        password: hashedPassword,
        role: 'TECHNICIAN',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'user@banksulutgo.co.id',
        name: 'Branch Employee',
        password: hashedPassword,
        role: 'USER',
        branchId: branches[0].id, // Assign to same branch as manager
        isActive: true,
      },
    }),
  ])

  // Create service categories
  const categories = await Promise.all([
    prisma.serviceCategory.create({
      data: {
        name: 'Hardware',
        description: 'Hardware related services',
        level: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Software',
        description: 'Software related services',
        level: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Network',
        description: 'Network related services',
        level: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Security',
        description: 'Security related services',
        level: 1,
      },
    }),
    prisma.serviceCategory.create({
      data: {
        name: 'Email',
        description: 'Email related services',
        level: 1,
      },
    }),
  ])

  // Create service catalog items
  const services = await Promise.all([
    prisma.service.create({
      data: {
        name: 'Laptop Request',
        description: 'Request for new laptop',
        categoryId: categories[0].id,
        supportGroup: 'IT_HELPDESK',
        priority: 'MEDIUM',
        estimatedHours: 24,
        slaHours: 48,
        requiresApproval: true,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Software Installation',
        description: 'Install software on workstation',
        categoryId: categories[1].id,
        supportGroup: 'IT_HELPDESK',
        priority: 'LOW',
        estimatedHours: 2,
        slaHours: 8,
        requiresApproval: false,
      },
    }),
    prisma.service.create({
      data: {
        name: 'Printer Setup',
        description: 'Setup new printer',
        categoryId: categories[0].id,
        supportGroup: 'IT_HELPDESK',
        priority: 'MEDIUM',
        estimatedHours: 4,
        slaHours: 24,
        requiresApproval: false,
      },
    }),
  ])

  // Create sample tickets
  const tickets = await Promise.all([
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-001',
        title: 'Laptop not working',
        description: 'My laptop is not turning on',
        serviceId: services[0].id,
        priority: 'HIGH',
        status: 'PENDING_APPROVAL',
        createdById: users[3].id, // Created by regular user
        branchId: branches[0].id, // Assign to branch
        supportGroup: 'IT_HELPDESK',
      },
    }),
    prisma.ticket.create({
      data: {
        ticketNumber: 'TKT-002',
        title: 'Install Microsoft Office',
        description: 'Need Microsoft Office installed on my computer',
        serviceId: services[1].id,
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        createdById: users[3].id, // Created by regular user
        assignedToId: users[2].id, // Assigned to technician
        branchId: branches[0].id, // Assign to branch
        supportGroup: 'IT_HELPDESK',
      },
    }),
  ])

  console.log('Database seeded successfully!')
  console.log(`Created ${branches.length} branches`)
  console.log(`Created ${users.length} users`)
  console.log(`Created ${categories.length} service categories`)
  console.log(`Created ${services.length} services`)
  console.log(`Created ${tickets.length} tickets`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })