import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deduplicateServiceFields() {
  console.log('🧹 Starting deduplication of service field relationships...');

  try {
    // 1. Find and remove duplicate ServiceFieldTemplate records
    console.log('\n📋 Phase 1: Deduplicating ServiceFieldTemplate records...');
    
    // Get all ServiceFieldTemplate records grouped by unique combination
    const serviceFieldTemplateDuplicates = await prisma.serviceFieldTemplate.groupBy({
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

    console.log(`Found ${serviceFieldTemplateDuplicates.length} duplicate ServiceFieldTemplate combinations`);

    let totalDeletedSFT = 0;
    for (const duplicate of serviceFieldTemplateDuplicates) {
      // Get all records for this combination
      const allRecords = await prisma.serviceFieldTemplate.findMany({
        where: {
          serviceId: duplicate.serviceId,
          fieldTemplateId: duplicate.fieldTemplateId
        },
        orderBy: { createdAt: 'asc' }, // Keep the oldest one
        include: {
          service: { select: { name: true } },
          fieldTemplate: { select: { name: true, label: true } }
        }
      });

      if (allRecords.length > 1) {
        // Keep the first (oldest) record, delete the rest
        const toDelete = allRecords.slice(1);
        const toKeep = allRecords[0];
        
        console.log(`  Service: ${toKeep.service.name}`);
        console.log(`  Field: ${toKeep.fieldTemplate.label}`);
        console.log(`  Keeping ID: ${toKeep.id}, Deleting: ${toDelete.map(r => r.id).join(', ')}`);

        await prisma.serviceFieldTemplate.deleteMany({
          where: {
            id: {
              in: toDelete.map(r => r.id)
            }
          }
        });

        totalDeletedSFT += toDelete.length;
      }
    }

    console.log(`✅ Deleted ${totalDeletedSFT} duplicate ServiceFieldTemplate records`);

    // 2. Find and remove duplicate ServiceField records
    console.log('\n📋 Phase 2: Deduplicating ServiceField records...');
    
    const serviceFieldDuplicates = await prisma.serviceField.groupBy({
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

    console.log(`Found ${serviceFieldDuplicates.length} duplicate ServiceField combinations`);

    let totalDeletedSF = 0;
    for (const duplicate of serviceFieldDuplicates) {
      // Get all records for this combination
      const allRecords = await prisma.serviceField.findMany({
        where: {
          serviceId: duplicate.serviceId,
          name: duplicate.name
        },
        orderBy: { createdAt: 'asc' }, // Keep the oldest one
        include: {
          service: { select: { name: true } }
        }
      });

      if (allRecords.length > 1) {
        // Keep the first (oldest) record, delete the rest
        const toDelete = allRecords.slice(1);
        const toKeep = allRecords[0];
        
        console.log(`  Service: ${toKeep.service.name}`);
        console.log(`  Field: ${toKeep.label} (${toKeep.name})`);
        console.log(`  Keeping ID: ${toKeep.id}, Deleting: ${toDelete.map(r => r.id).join(', ')}`);

        await prisma.serviceField.deleteMany({
          where: {
            id: {
              in: toDelete.map(r => r.id)
            }
          }
        });

        totalDeletedSF += toDelete.length;
      }
    }

    console.log(`✅ Deleted ${totalDeletedSF} duplicate ServiceField records`);

    // 3. Generate summary report
    console.log('\n📊 Final Database State:');
    
    const finalCounts = {
      services: await prisma.service.count(),
      fieldTemplates: await prisma.fieldTemplate.count(),
      serviceFieldTemplates: await prisma.serviceFieldTemplate.count(),
      serviceFields: await prisma.serviceField.count()
    };

    console.log(`  Services: ${finalCounts.services}`);
    console.log(`  Field Templates: ${finalCounts.fieldTemplates}`);
    console.log(`  Service-Field Template Links: ${finalCounts.serviceFieldTemplates}`);
    console.log(`  Service Fields: ${finalCounts.serviceFields}`);

    // 4. Sample verification - check a service with many fields
    const sampleService = await prisma.service.findFirst({
      include: {
        fieldTemplates: {
          include: {
            fieldTemplate: { select: { name: true, label: true } }
          }
        },
        fields: { select: { name: true, label: true } }
      },
      where: {
        OR: [
          { fieldTemplates: { some: {} } },
          { fields: { some: {} } }
        ]
      }
    });

    if (sampleService) {
      console.log(`\n🔍 Sample Service Verification: ${sampleService.name}`);
      console.log(`  Field Templates: ${sampleService.fieldTemplates.length}`);
      console.log(`  Direct Fields: ${sampleService.fields.length}`);
      
      if (sampleService.fieldTemplates.length > 0) {
        console.log('  Field Templates:');
        sampleService.fieldTemplates.slice(0, 3).forEach(ft => {
          console.log(`    - ${ft.fieldTemplate.label}`);
        });
      }

      if (sampleService.fields.length > 0) {
        console.log('  Direct Fields:');
        sampleService.fields.slice(0, 3).forEach(f => {
          console.log(`    - ${f.label}`);
        });
      }
    }

    console.log(`\n✅ Deduplication completed successfully!`);
    console.log(`   Total records removed: ${totalDeletedSFT + totalDeletedSF}`);
    console.log(`   ServiceFieldTemplate duplicates removed: ${totalDeletedSFT}`);
    console.log(`   ServiceField duplicates removed: ${totalDeletedSF}`);

  } catch (error) {
    console.error('❌ Deduplication failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing script
if (require.main === module) {
  deduplicateServiceFields()
    .then(() => {
      console.log('\n🎉 Deduplication script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Deduplication script failed:', error);
      process.exit(1);
    });
}

export default deduplicateServiceFields;