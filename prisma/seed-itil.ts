import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedITILCategories() {
  console.log('🌱 Seeding ITIL Categories...');

  // Create main categories
  const hardwareCategory = await prisma.category.create({
    data: {
      name: 'Hardware',
      description: 'Physical equipment and devices',
      order: 1,
    },
  });

  const softwareCategory = await prisma.category.create({
    data: {
      name: 'Software',
      description: 'Applications and system software',
      order: 2,
    },
  });

  const networkCategory = await prisma.category.create({
    data: {
      name: 'Network',
      description: 'Network infrastructure and connectivity',
      order: 3,
    },
  });

  const securityCategory = await prisma.category.create({
    data: {
      name: 'Security',
      description: 'Information security and access control',
      order: 4,
    },
  });

  // Create subcategories for Hardware
  const computerSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: hardwareCategory.id,
      name: 'Computer',
      description: 'Desktop and laptop computers',
      order: 1,
    },
  });

  const printerSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: hardwareCategory.id,
      name: 'Printer',
      description: 'Printing devices',
      order: 2,
    },
  });

  const atmSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: hardwareCategory.id,
      name: 'ATM',
      description: 'Automated Teller Machines',
      order: 3,
    },
  });

  // Create subcategories for Software
  const applicationSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: softwareCategory.id,
      name: 'Application',
      description: 'Business applications',
      order: 1,
    },
  });

  const osSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: softwareCategory.id,
      name: 'Operating System',
      description: 'System software',
      order: 2,
    },
  });

  // Create subcategories for Network
  const connectivitySubcategory = await prisma.subcategory.create({
    data: {
      categoryId: networkCategory.id,
      name: 'Connectivity',
      description: 'Network connection issues',
      order: 1,
    },
  });

  const vpnSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: networkCategory.id,
      name: 'VPN',
      description: 'Virtual Private Network',
      order: 2,
    },
  });

  // Create subcategories for Security
  const accessSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: securityCategory.id,
      name: 'Access Control',
      description: 'User access and permissions',
      order: 1,
    },
  });

  const malwareSubcategory = await prisma.subcategory.create({
    data: {
      categoryId: securityCategory.id,
      name: 'Malware',
      description: 'Virus and malware issues',
      order: 2,
    },
  });

  // Create items for Computer subcategory
  await prisma.item.createMany({
    data: [
      {
        subcategoryId: computerSubcategory.id,
        name: 'Desktop PC',
        description: 'Desktop computer issues',
        order: 1,
      },
      {
        subcategoryId: computerSubcategory.id,
        name: 'Laptop',
        description: 'Laptop computer issues',
        order: 2,
      },
      {
        subcategoryId: computerSubcategory.id,
        name: 'Monitor',
        description: 'Display monitor issues',
        order: 3,
      },
    ],
  });

  // Create items for ATM subcategory
  await prisma.item.createMany({
    data: [
      {
        subcategoryId: atmSubcategory.id,
        name: 'Cash Dispenser',
        description: 'Cash dispensing mechanism',
        order: 1,
      },
      {
        subcategoryId: atmSubcategory.id,
        name: 'Card Reader',
        description: 'Card reading mechanism',
        order: 2,
      },
      {
        subcategoryId: atmSubcategory.id,
        name: 'Receipt Printer',
        description: 'Receipt printing mechanism',
        order: 3,
      },
    ],
  });

  // Create items for Application subcategory
  await prisma.item.createMany({
    data: [
      {
        subcategoryId: applicationSubcategory.id,
        name: 'Core Banking System',
        description: 'Main banking application',
        order: 1,
      },
      {
        subcategoryId: applicationSubcategory.id,
        name: 'Email System',
        description: 'Email application',
        order: 2,
      },
      {
        subcategoryId: applicationSubcategory.id,
        name: 'Office Suite',
        description: 'Microsoft Office or similar',
        order: 3,
      },
    ],
  });

  // Create items for Access Control subcategory
  await prisma.item.createMany({
    data: [
      {
        subcategoryId: accessSubcategory.id,
        name: 'User Account',
        description: 'User account management',
        order: 1,
      },
      {
        subcategoryId: accessSubcategory.id,
        name: 'Password Reset',
        description: 'Password reset requests',
        order: 2,
      },
      {
        subcategoryId: accessSubcategory.id,
        name: 'Permission Request',
        description: 'Access permission requests',
        order: 3,
      },
    ],
  });

  console.log('✅ ITIL Categories seeded successfully!');
}

async function main() {
  try {
    await seedITILCategories();
  } catch (error) {
    console.error('❌ Error seeding ITIL categories:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export default main;