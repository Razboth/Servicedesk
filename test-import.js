const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

function parseSLATime(timeStr) {
  if (!timeStr || timeStr.trim() === '') return 24; // Default 24 hours
  
  const str = timeStr.toLowerCase().trim();
  
  // Handle different time formats
  if (str.includes('day') || str.includes('hk')) {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) * 24 : 24; // Convert days to hours
  } else if (str.includes('hr') || str.includes('hour')) {
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : 24;
  } else if (str.includes('min')) {
    const match = str.match(/\d+/);
    return match ? Math.max(1, Math.ceil(parseInt(match[0]) / 60)) : 1; // Convert minutes to hours, minimum 1
  }
  
  // Try to extract number and assume hours
  const match = str.match(/\d+/);
  return match ? parseInt(match[0]) : 24;
}

async function testImport() {
  try {
    console.log('Testing CSV import process...');
    
    // Read and parse CSV
    const content = fs.readFileSync('import.csv', 'utf-8');
    console.log('CSV content length:', content.length);
    console.log('First 200 characters:', content.substring(0, 200));
    
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';'
    });
    
    console.log('\nParsed records count:', records.length);
    console.log('First record:', records[0]);
    console.log('Column names:', Object.keys(records[0]));
    
    // Test processing first few records
    let processed = 0;
    let created = 0;
    let skipped = 0;
    
    for (const [index, row] of records.slice(0, 5).entries()) {
      processed++;
      
      const serviceCatalog = row['SERVICE CATALOG']?.trim();
      let serviceName = row['SERVICE NAME']?.trim();
      const slaStr = row['SLA']?.trim();
      const responseTimeStr = row['RESPONSE TIME']?.trim();
      const resolutionTimeStr = row['RESOLUTION TIME']?.trim();
      
      console.log(`\nProcessing row ${index + 1}:`);
      console.log(`  Service Catalog: '${serviceCatalog}'`);
      console.log(`  Service Name: '${serviceName}'`);
      console.log(`  SLA: '${slaStr}'`);
      console.log(`  Response Time: '${responseTimeStr}'`);
      console.log(`  Resolution Time: '${resolutionTimeStr}'`);
      
      if (!serviceCatalog) {
        console.log('  -> SKIPPED: Missing service catalog');
        skipped++;
        continue;
      }
      
      if (!serviceName) {
        console.log('  -> SKIPPED: Missing service name');
        skipped++;
        continue;
      }
      
      // Parse SLA times
      const responseHours = parseSLATime(responseTimeStr);
      const resolutionHours = parseSLATime(resolutionTimeStr);
      const slaHours = parseSLATime(slaStr);
      
      console.log(`  Parsed times - Response: ${responseHours}h, Resolution: ${resolutionHours}h, SLA: ${slaHours}h`);
      
      // Check if category exists
      let category = await prisma.serviceCategory.findFirst({
        where: {
          name: serviceCatalog,
          level: 1
        }
      });
      
      if (!category) {
        console.log(`  -> Creating new category: ${serviceCatalog}`);
        category = await prisma.serviceCategory.create({
          data: {
            name: serviceCatalog,
            description: `Imported category: ${serviceCatalog}`,
            level: 1,
            isActive: true
          }
        });
      } else {
        console.log(`  -> Found existing category: ${category.name}`);
      }
      
      // Check if service exists
      const existingService = await prisma.service.findFirst({
        where: {
          name: serviceName,
          categoryId: category.id
        }
      });
      
      if (existingService) {
        console.log(`  -> Service already exists: ${existingService.name}`);
      } else {
        console.log(`  -> Would create new service: ${serviceName}`);
        created++;
      }
    }
    
    console.log(`\nTest Summary:`);
    console.log(`- Processed: ${processed}`);
    console.log(`- Would create: ${created}`);
    console.log(`- Skipped: ${skipped}`);
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testImport();