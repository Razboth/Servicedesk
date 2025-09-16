const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.fieldTemplate.count();
    console.log('Total field templates:', count);
    
    // Get the last 5 field templates
    const latestTemplates = await prisma.fieldTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        name: true,
        label: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log('\nLatest 5 field templates:');
    latestTemplates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name} (${template.label}) - Active: ${template.isActive} - Created: ${template.createdAt.toLocaleString()}`);
    });
    
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);