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

function mapPriority(priority) {
  if (!priority) return 'MEDIUM';
  const p = priority.toLowerCase();
  if (p.includes('high') || p.includes('urgent')) return 'HIGH';
  if (p.includes('low')) return 'LOW';
  return 'MEDIUM';
}

function mapItilCategory(category) {
  if (!category) return 'INCIDENT';
  const c = category.toLowerCase();
  if (c.includes('service request')) return 'SERVICE_REQUEST';
  if (c.includes('change request')) return 'CHANGE_REQUEST';
  if (c.includes('problem')) return 'PROBLEM';
  return 'INCIDENT';
}

function mapIssueClassification(classification) {
  if (!classification) return 'SYSTEM_ERROR';
  const c = classification.toLowerCase();
  if (c.includes('human error')) return 'HUMAN_ERROR';
  if (c.includes('system error')) return 'SYSTEM_ERROR';
  if (c.includes('network')) return 'NETWORK_ERROR';
  if (c.includes('hardware')) return 'HARDWARE_ERROR';
  if (c.includes('software')) return 'SOFTWARE_ERROR';
  return 'SYSTEM_ERROR';
}

async function importServices() {
  try {
    console.log('Starting service import from import1.csv...');
    
    // Read and parse CSV
    const content = fs.readFileSync('import1.csv', 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ';'
    });
    
    console.log(`Found ${records.length} records to process`);
    
    let created = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const record of records) {
      try {
        const {
          Tier_1_Category,
          Tier_2_SubCategory,
          Tier_3_Service_Type,
          Title,
          SLA_Days,
          First_Response,
          Resolution_Time,
          ITIL_Category,
          Issue_Classification,
          Priority
        } = record;
        
        if (!Title || !Tier_1_Category || !Tier_2_SubCategory || !Tier_3_Service_Type) {
          console.log(`Skipping record with missing required fields: ${Title}`);
          skipped++;
          continue;
        }
        
        // Find the tier categories
        const tier1Category = await prisma.category.findFirst({
          where: { name: Tier_1_Category }
        });
        
        if (!tier1Category) {
          console.log(`Tier 1 category not found: ${Tier_1_Category}`);
          skipped++;
          continue;
        }
        
        const tier2Subcategory = await prisma.subcategory.findFirst({
          where: {
            name: Tier_2_SubCategory,
            categoryId: tier1Category.id
          }
        });
        
        if (!tier2Subcategory) {
          console.log(`Tier 2 subcategory not found: ${Tier_2_SubCategory} under ${Tier_1_Category}`);
          skipped++;
          continue;
        }
        
        const tier3Item = await prisma.item.findFirst({
          where: {
            name: Tier_3_Service_Type,
            subcategoryId: tier2Subcategory.id
          }
        });
        
        if (!tier3Item) {
          console.log(`Tier 3 item not found: ${Tier_3_Service_Type} under ${Tier_2_SubCategory}`);
          skipped++;
          continue;
        }
        
        // Check if service already exists
        const existingService = await prisma.service.findFirst({
          where: { name: Title }
        });
        
        if (existingService) {
          console.log(`Service already exists: ${Title}`);
          skipped++;
          continue;
        }
        
        // Parse SLA times
        const responseHours = parseSLATime(First_Response);
        const resolutionHours = parseSLATime(Resolution_Time);
        const slaHours = parseSLATime(SLA_Days);
        
        // Create the service
        const service = await prisma.service.create({
          data: {
            name: Title,
            description: `${Tier_1_Category} - ${Tier_2_SubCategory} - ${Tier_3_Service_Type}`,
            categoryId: tier1Category.id,
            subcategoryId: tier2Subcategory.id,
            itemId: tier3Item.id,
            supportGroup: 'IT_HELPDESK',
            priority: mapPriority(Priority),
            estimatedHours: resolutionHours,
            slaHours: slaHours,
            responseHours: responseHours,
            resolutionHours: resolutionHours,
            requiresApproval: mapItilCategory(ITIL_Category) === 'CHANGE_REQUEST',
            defaultItilCategory: mapItilCategory(ITIL_Category),
            defaultIssueClassification: mapIssueClassification(Issue_Classification),
            defaultTitle: Title,
            isActive: true
          }
        });
        
        console.log(`✓ Created service: ${Title} (ID: ${service.id})`);
        created++;
        
      } catch (error) {
        console.error(`Error creating service for ${record.Title}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Created: ${created} services`);
    console.log(`Skipped: ${skipped} services`);
    console.log(`Errors: ${errors} services`);
    console.log('Import completed!');
    
  } catch (error) {
    console.error('Error during import:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importServices();