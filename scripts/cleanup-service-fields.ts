import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CleanupOptions {
  serviceId?: string;
  serviceName?: string;
  dryRun?: boolean;
  removeServiceFields?: boolean;
  removeFieldTemplates?: boolean;
  removeAll?: boolean;
}

async function cleanupServiceFields(options: CleanupOptions = {}) {
  const {
    serviceId,
    serviceName,
    dryRun = false,
    removeServiceFields = true,
    removeFieldTemplates = true,
    removeAll = false
  } = options;

  console.log('🧹 Service Fields Cleanup Tool');
  console.log('===============================');

  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made');
  }

  try {
    let services: any[] = [];

    // Find services to clean
    if (removeAll) {
      console.log('📋 Finding all services...');
      services = await prisma.service.findMany({
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              fields: true,
              fieldTemplates: true
            }
          }
        }
      });
    } else if (serviceId) {
      console.log(`📋 Finding service by ID: ${serviceId}...`);
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              fields: true,
              fieldTemplates: true
            }
          }
        }
      });
      if (service) services = [service];
    } else if (serviceName) {
      console.log(`📋 Finding service by name: ${serviceName}...`);
      const service = await prisma.service.findFirst({
        where: {
          name: {
            contains: serviceName,
            mode: 'insensitive'
          }
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              fields: true,
              fieldTemplates: true
            }
          }
        }
      });
      if (service) services = [service];
    }

    if (services.length === 0) {
      console.log('❌ No services found matching criteria');
      return;
    }

    console.log(`\n📊 Found ${services.length} service(s) to process:\n`);

    for (const service of services) {
      console.log(`🔧 Processing: ${service.name}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   Direct Fields: ${service._count.fields}`);
      console.log(`   Field Templates: ${service._count.fieldTemplates}`);

      if (service._count.fields === 0 && service._count.fieldTemplates === 0) {
        console.log(`   ✅ Service already clean, skipping\n`);
        continue;
      }

      // Clean ServiceFields (direct custom fields)
      if (removeServiceFields && service._count.fields > 0) {
        console.log(`   🗑️  Removing ${service._count.fields} direct ServiceFields...`);

        if (!dryRun) {
          // First, get the field IDs to track related data
          const fieldsToDelete = await prisma.serviceField.findMany({
            where: { serviceId: service.id },
            select: { id: true, name: true }
          });

          // Count related ticket field values before deletion
          const relatedFieldValues = await prisma.ticketFieldValue.count({
            where: {
              fieldId: { in: fieldsToDelete.map(f => f.id) }
            }
          });

          if (relatedFieldValues > 0) {
            console.log(`   📊 Found ${relatedFieldValues} related ticket field values`);
          }

          // Delete ServiceFields (CASCADE will automatically delete TicketFieldValues)
          const deletedFields = await prisma.serviceField.deleteMany({
            where: { serviceId: service.id }
          });

          console.log(`   ✅ Deleted ${deletedFields.count} ServiceFields`);
          if (relatedFieldValues > 0) {
            console.log(`   ✅ Cascade deleted ${relatedFieldValues} ticket field values`);
          }

          // Verify complete removal
          const remainingFields = await prisma.serviceField.count({
            where: { serviceId: service.id }
          });
          if (remainingFields > 0) {
            console.log(`   ⚠️  Warning: ${remainingFields} ServiceFields still remain`);
          }
        } else {
          // In dry run, show what would be affected
          const fieldsToDelete = await prisma.serviceField.findMany({
            where: { serviceId: service.id },
            select: { id: true, name: true }
          });

          const relatedFieldValues = await prisma.ticketFieldValue.count({
            where: {
              fieldId: { in: fieldsToDelete.map(f => f.id) }
            }
          });

          console.log(`   📝 Would delete ${service._count.fields} ServiceFields:`);
          fieldsToDelete.forEach(field => {
            console.log(`      - ${field.name} (${field.id})`);
          });

          if (relatedFieldValues > 0) {
            console.log(`   📝 Would cascade delete ${relatedFieldValues} ticket field values`);
          }
        }
      }

      // Clean ServiceFieldTemplates (template links)
      if (removeFieldTemplates && service._count.fieldTemplates > 0) {
        console.log(`   🗑️  Removing ${service._count.fieldTemplates} ServiceFieldTemplate links...`);

        if (!dryRun) {
          const deletedTemplates = await prisma.serviceFieldTemplate.deleteMany({
            where: { serviceId: service.id }
          });
          console.log(`   ✅ Deleted ${deletedTemplates.count} ServiceFieldTemplate links`);
        } else {
          console.log(`   📝 Would delete ${service._count.fieldTemplates} ServiceFieldTemplate links`);
        }
      }

      console.log(`   ✨ Service "${service.name}" cleanup complete\n`);
    }

    // Summary
    const totalFields = services.reduce((sum, s) => sum + s._count.fields, 0);
    const totalTemplates = services.reduce((sum, s) => sum + s._count.fieldTemplates, 0);

    console.log('📊 Cleanup Summary:');
    console.log(`   Services processed: ${services.length}`);
    console.log(`   Total ServiceFields ${dryRun ? 'would be' : ''} removed: ${totalFields}`);
    console.log(`   Total ServiceFieldTemplates ${dryRun ? 'would be' : ''} removed: ${totalTemplates}`);

    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN - no actual changes were made');
      console.log('   To execute the cleanup, run without --dry-run flag');
    } else {
      console.log('\n✅ Cleanup completed successfully!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI argument parsing
const args = process.argv.slice(2);
const options: CleanupOptions = {};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '--service-id':
      options.serviceId = args[++i];
      break;
    case '--service-name':
      options.serviceName = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--all':
      options.removeAll = true;
      break;
    case '--only-direct-fields':
      options.removeServiceFields = true;
      options.removeFieldTemplates = false;
      break;
    case '--only-templates':
      options.removeServiceFields = false;
      options.removeFieldTemplates = true;
      break;
    case '--help':
      console.log(`
Service Fields Cleanup Tool

Usage:
  npx tsx scripts/cleanup-service-fields.ts [options]

Options:
  --service-id <id>        Clean specific service by ID
  --service-name <name>    Clean specific service by name (partial match)
  --all                    Clean ALL services (use with caution)
  --dry-run               Show what would be deleted without making changes
  --only-direct-fields    Only remove ServiceFields (direct custom fields)
  --only-templates        Only remove ServiceFieldTemplate links
  --help                  Show this help message

Examples:
  # Dry run for all services
  npx tsx scripts/cleanup-service-fields.ts --all --dry-run

  # Clean specific service
  npx tsx scripts/cleanup-service-fields.ts --service-name "ATM Klaim"

  # Clean by service ID
  npx tsx scripts/cleanup-service-fields.ts --service-id "clm123..."

  # Only remove direct fields, keep templates
  npx tsx scripts/cleanup-service-fields.ts --service-name "ATM" --only-direct-fields
`);
      process.exit(0);
  }
}

// Validation
if (!options.serviceId && !options.serviceName && !options.removeAll) {
  console.error('❌ Error: Must specify --service-id, --service-name, or --all');
  console.log('   Use --help for usage information');
  process.exit(1);
}

if (options.removeAll && !options.dryRun) {
  console.log('⚠️  WARNING: You are about to remove fields from ALL services!');
  console.log('   This action cannot be undone.');
  console.log('   Run with --dry-run first to see what would be affected.');

  // Simple confirmation for --all without dry run
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('Type "CONFIRM" to proceed with cleanup of ALL services: ', (answer: string) => {
    rl.close();
    if (answer === 'CONFIRM') {
      cleanupServiceFields(options);
    } else {
      console.log('❌ Cleanup cancelled');
      process.exit(0);
    }
  });
} else {
  // Run cleanup
  cleanupServiceFields(options)
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}