import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeDuplicateFieldSystems() {
  console.log('🧹 Removing duplicate field systems (ServiceField vs ServiceFieldTemplate)...');

  try {
    // Get all services with both fields and fieldTemplates
    const services = await prisma.service.findMany({
      include: {
        fields: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    let totalServicesProcessed = 0;
    let totalFieldsRemoved = 0;

    for (const service of services) {
      if (service.fields.length > 0 && service.fieldTemplates.length > 0) {
        console.log(`\n📋 Service: ${service.name}`);
        console.log(`  Direct fields: ${service.fields.length}`);
        console.log(`  Field templates: ${service.fieldTemplates.length}`);

        // Create a map of field template names for quick lookup
        const templateFieldNames = new Set(
          service.fieldTemplates.map(ft => ft.fieldTemplate.name)
        );

        // Find ServiceField records that have matching ServiceFieldTemplate records
        const duplicateFields = service.fields.filter(field => 
          templateFieldNames.has(field.name)
        );

        if (duplicateFields.length > 0) {
          console.log(`  🔍 Found ${duplicateFields.length} duplicate fields:`);
          
          for (const field of duplicateFields) {
            console.log(`    - ${field.label} (${field.name})`);
          }

          // Remove the duplicate ServiceField records
          await prisma.serviceField.deleteMany({
            where: {
              id: {
                in: duplicateFields.map(f => f.id)
              }
            }
          });

          totalFieldsRemoved += duplicateFields.length;
          console.log(`  ✅ Removed ${duplicateFields.length} duplicate ServiceField records`);
        } else {
          console.log(`  ✅ No duplicates found`);
        }

        totalServicesProcessed++;
      }
    }

    // Final verification
    console.log('\n📊 Final Statistics:');
    console.log(`  Services processed: ${totalServicesProcessed}`);
    console.log(`  ServiceField records removed: ${totalFieldsRemoved}`);

    // Show sample service after cleanup
    const sampleService = await prisma.service.findFirst({
      where: {
        name: "BSG QRIS BI Fast Claim" // The service from the logs
      },
      include: {
        fields: true,
        fieldTemplates: {
          include: {
            fieldTemplate: true
          }
        }
      }
    });

    if (sampleService) {
      console.log(`\n🔍 Sample Service Verification: ${sampleService.name}`);
      console.log(`  Direct fields remaining: ${sampleService.fields.length}`);
      console.log(`  Field templates: ${sampleService.fieldTemplates.length}`);
      console.log(`  Total fields now: ${sampleService.fields.length + sampleService.fieldTemplates.length}`);

      if (sampleService.fields.length > 0) {
        console.log(`  Remaining direct fields:`);
        sampleService.fields.forEach(f => console.log(`    - ${f.label}`));
      }
    }

    console.log(`\n✅ Duplicate field system cleanup completed!`);
    console.log(`   ServiceField records removed: ${totalFieldsRemoved}`);

  } catch (error) {
    console.error('❌ Field system cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Self-executing script
if (require.main === module) {
  removeDuplicateFieldSystems()
    .then(() => {
      console.log('\n🎉 Field system cleanup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Field system cleanup failed:', error);
      process.exit(1);
    });
}

export default removeDuplicateFieldSystems;