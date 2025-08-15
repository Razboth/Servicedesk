import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspectDatabase() {
  try {
    console.log('🔍 Inspecting database for duplicate custom fields...');

    // 1. Check ServiceFieldTemplate duplicates
    const serviceFieldTemplates = await prisma.serviceFieldTemplate.groupBy({
      by: ['serviceId', 'fieldTemplateId'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });

    console.log(`\n📊 Found ${serviceFieldTemplates.length} duplicate service-field template combinations`);

    if (serviceFieldTemplates.length > 0) {
      console.log('\n❌ Duplicate ServiceFieldTemplate entries:');
      for (const duplicate of serviceFieldTemplates.slice(0, 5)) {
        const details = await prisma.serviceFieldTemplate.findMany({
          where: {
            serviceId: duplicate.serviceId,
            fieldTemplateId: duplicate.fieldTemplateId
          },
          include: {
            service: { select: { name: true, defaultTitle: true } },
            fieldTemplate: { select: { name: true, label: true } }
          }
        });
        
        console.log(`  Service: ${details[0].service.name}`);
        console.log(`  Field: ${details[0].fieldTemplate.label}`);
        console.log(`  Duplicate count: ${duplicate._count.id}`);
        console.log(`  Record IDs: ${details.map(d => d.id).join(', ')}`);
        console.log('  ---');
      }
    }

    // 2. Check ServiceField duplicates
    const serviceFields = await prisma.serviceField.groupBy({
      by: ['serviceId', 'name'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });

    console.log(`\n📊 Found ${serviceFields.length} duplicate service field combinations`);

    if (serviceFields.length > 0) {
      console.log('\n❌ Duplicate ServiceField entries:');
      for (const duplicate of serviceFields.slice(0, 5)) {
        const details = await prisma.serviceField.findMany({
          where: {
            serviceId: duplicate.serviceId,
            name: duplicate.name
          },
          include: {
            service: { select: { name: true } }
          }
        });
        
        console.log(`  Service: ${details[0].service.name}`);
        console.log(`  Field name: ${details[0].name}`);
        console.log(`  Field label: ${details[0].label}`);
        console.log(`  Duplicate count: ${duplicate._count.id}`);
        console.log(`  Record IDs: ${details.map(d => d.id).join(', ')}`);
        console.log('  ---');
      }
    }

    // 3. Check total counts
    const totalServiceFieldTemplates = await prisma.serviceFieldTemplate.count();
    const totalServiceFields = await prisma.serviceField.count();
    const totalServices = await prisma.service.count();

    console.log(`\n📈 Database Statistics:`);
    console.log(`  Total Services: ${totalServices}`);
    console.log(`  Total ServiceFieldTemplates: ${totalServiceFieldTemplates}`);
    console.log(`  Total ServiceFields: ${totalServiceFields}`);

    // 4. Sample service with field templates
    const sampleService = await prisma.service.findFirst({
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: { select: { name: true, label: true } }
          }
        },
        fields: { select: { name: true, label: true } }
      }
    });

    if (sampleService) {
      console.log(`\n🔍 Sample Service: ${sampleService.name}`);
      console.log(`  Field Templates: ${sampleService.fieldTemplates.length}`);
      console.log(`  Direct Fields: ${sampleService.fields.length}`);
      
      if (sampleService.fieldTemplates.length > 0) {
        console.log('  Field Templates:');
        sampleService.fieldTemplates.slice(0, 3).forEach(ft => {
          console.log(`    - ${ft.fieldTemplate.label} (${ft.fieldTemplate.name})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Database inspection error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectDatabase();