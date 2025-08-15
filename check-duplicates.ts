import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDuplicates() {
  console.log('🔍 Checking for duplicate service field relationships...');

  try {
    // Check duplicate service field templates
    const serviceFieldTemplates = await prisma.serviceFieldTemplate.findMany({
      include: {
        service: { select: { id: true, name: true } },
        fieldTemplate: { select: { id: true, name: true, label: true } }
      }
    });

    console.log(`\n📊 Total ServiceFieldTemplate records: ${serviceFieldTemplates.length}`);

    // Group by service and field template
    const duplicateGroups = new Map<string, any[]>();
    
    serviceFieldTemplates.forEach(sft => {
      const key = `${sft.serviceId}-${sft.fieldTemplateId}`;
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(sft);
    });

    // Find duplicates
    const duplicates = Array.from(duplicateGroups.entries())
      .filter(([key, records]) => records.length > 1);

    if (duplicates.length > 0) {
      console.log(`\n❌ Found ${duplicates.length} duplicate service-field combinations:`);
      duplicates.slice(0, 10).forEach(([key, records]) => {
        const sample = records[0];
        console.log(`  Service: ${sample.service.name}`);
        console.log(`  Field: ${sample.fieldTemplate.label}`);
        console.log(`  Duplicate count: ${records.length}`);
        console.log(`  IDs: ${records.map(r => r.id).join(', ')}`);
        console.log('---');
      });
    } else {
      console.log('\n✅ No duplicate service-field template relationships found');
    }

    // Check duplicate services
    const services = await prisma.service.findMany({
      select: { id: true, name: true, defaultTitle: true }
    });

    const serviceNames = new Map<string, any[]>();
    services.forEach(service => {
      const name = service.name;
      if (!serviceNames.has(name)) {
        serviceNames.set(name, []);
      }
      serviceNames.get(name)!.push(service);
    });

    const duplicateServices = Array.from(serviceNames.entries())
      .filter(([name, services]) => services.length > 1);

    if (duplicateServices.length > 0) {
      console.log(`\n❌ Found ${duplicateServices.length} duplicate service names:`);
      duplicateServices.slice(0, 5).forEach(([name, services]) => {
        console.log(`  Service name: ${name}`);
        console.log(`  Duplicate count: ${services.length}`);
        console.log(`  IDs: ${services.map(s => s.id).join(', ')}`);
        console.log('---');
      });
    } else {
      console.log('\n✅ No duplicate service names found');
    }

    // Check field template usage statistics
    const fieldTemplateUsage = await prisma.fieldTemplate.findMany({
      include: {
        _count: {
          select: { serviceFieldTemplates: true }
        }
      }
    });

    console.log('\n📈 Field Template Usage:');
    fieldTemplateUsage
      .sort((a, b) => b._count.serviceFieldTemplates - a._count.serviceFieldTemplates)
      .slice(0, 10)
      .forEach(ft => {
        console.log(`  ${ft.label}: used in ${ft._count.serviceFieldTemplates} services`);
      });

  } catch (error) {
    console.error('❌ Error checking duplicates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();