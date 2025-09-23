/**
 * Script to sync defaultTitle with service name for all existing services
 * This ensures consistency between service names and their default titles
 * Run with: npx tsx scripts/sync-service-default-titles.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function syncServiceDefaultTitles() {
  console.log('🔄 Starting service defaultTitle sync...\n');

  try {
    // Get all services
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        defaultTitle: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    console.log(`Found ${services.length} services to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let alreadyMatchedCount = 0;

    for (const service of services) {
      // Check if defaultTitle already matches name
      if (service.defaultTitle === service.name) {
        alreadyMatchedCount++;
        console.log(`✅ Already matched: ${service.name}`);
        continue;
      }

      // Update services where defaultTitle is null, empty, or different from name
      if (!service.defaultTitle || service.defaultTitle !== service.name) {
        try {
          await prisma.service.update({
            where: { id: service.id },
            data: { defaultTitle: service.name }
          });

          updatedCount++;
          console.log(`✨ Updated: ${service.name}`);
          if (service.defaultTitle) {
            console.log(`   Old title: "${service.defaultTitle}"`);
          } else {
            console.log(`   Old title: (empty)`);
          }
          console.log(`   New title: "${service.name}"`);
        } catch (error) {
          console.error(`❌ Failed to update service "${service.name}":`, error);
          skippedCount++;
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total services processed: ${services.length}`);
    console.log(`✨ Updated: ${updatedCount}`);
    console.log(`✅ Already matched: ${alreadyMatchedCount}`);
    if (skippedCount > 0) {
      console.log(`❌ Failed: ${skippedCount}`);
    }
    console.log('='.repeat(60));

    // Verify the update by checking a few samples
    if (updatedCount > 0) {
      console.log('\n🔍 Verification - Checking random samples:');
      const samples = await prisma.service.findMany({
        take: 5,
        select: {
          name: true,
          defaultTitle: true
        },
        orderBy: {
          updatedAt: 'desc'
        }
      });

      samples.forEach(sample => {
        const match = sample.name === sample.defaultTitle ? '✅' : '❌';
        console.log(`${match} ${sample.name} → ${sample.defaultTitle}`);
      });
    }

    console.log('\n✅ Service defaultTitle sync completed successfully!');

  } catch (error) {
    console.error('\n❌ Error during sync:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
syncServiceDefaultTitles()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });