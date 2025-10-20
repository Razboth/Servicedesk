import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function restore() {
  const service = await prisma.service.findFirst({
    where: { name: 'ARS73 - Error Aplikasi' }
  });

  const fieldTemplate = await prisma.fieldTemplate.findFirst({
    where: { name: 'file_surat_memo' }
  });

  if (!service || !fieldTemplate) {
    console.log('❌ Service or FieldTemplate not found');
    await prisma.$disconnect();
    return;
  }

  console.log('Restoring link between:');
  console.log('  Service:', service.name);
  console.log('  FieldTemplate:', fieldTemplate.label);

  const link = await prisma.serviceFieldTemplate.create({
    data: {
      serviceId: service.id,
      fieldTemplateId: fieldTemplate.id,
      order: 1,
      isRequired: false,
      isUserVisible: true
    }
  });

  console.log('✅ Link restored!');
  console.log('   Link ID:', link.id);

  await prisma.$disconnect();
}

restore().catch(console.error);
