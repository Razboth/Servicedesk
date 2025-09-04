import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Parse CSV data
function parseCSV(csvContent: string): any[] {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(';').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(';');
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    data.push(row);
  }
  
  return data;
}

async function updateServicesFromCSV() {
  console.log('🔧 Starting Service Categorization Update from CSV...\n');
  
  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'import2.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvData = parseCSV(csvContent);
    
    console.log(`📊 Found ${csvData.length} service definitions in CSV\n`);
    
    // Step 1: Ensure all tier categories exist
    console.log('📌 Step 1: Creating/Verifying Tier Categories...');
    
    const categoryMap = new Map<string, string>();
    const subcategoryMap = new Map<string, string>();
    const itemMap = new Map<string, string>();
    
    // Group CSV data by tier categories
    const tierStructure = new Map<string, Map<string, Set<string>>>();
    
    for (const row of csvData) {
      const tier1 = row['Tier_1_Category'];
      const tier2 = row['Tier_2_SubCategory'];
      const tier3 = row['Tier_3_Service_Type'];
      
      if (!tier1) continue;
      
      if (!tierStructure.has(tier1)) {
        tierStructure.set(tier1, new Map());
      }
      
      const tier1Map = tierStructure.get(tier1)!;
      if (!tier1Map.has(tier2)) {
        tier1Map.set(tier2, new Set());
      }
      
      tier1Map.get(tier2)!.add(tier3);
    }
    
    // Create categories, subcategories, and items
    for (const [tier1Name, tier2Map] of tierStructure.entries()) {
      // Create or find Tier 1 Category
      let category = await prisma.category.findFirst({
        where: { name: tier1Name }
      });
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: tier1Name,
            description: `${tier1Name} - Service Category`,
            isActive: true
          }
        });
        console.log(`   ✅ Created Category: ${tier1Name}`);
      }
      categoryMap.set(tier1Name, category.id);
      
      // Create Tier 2 Subcategories
      for (const [tier2Name, tier3Set] of tier2Map.entries()) {
        let subcategory = await prisma.subcategory.findFirst({
          where: {
            name: tier2Name,
            categoryId: category.id
          }
        });
        
        if (!subcategory) {
          subcategory = await prisma.subcategory.create({
            data: {
              name: tier2Name,
              description: `${tier2Name} - Service Subcategory`,
              categoryId: category.id,
              isActive: true
            }
          });
          console.log(`   ✅ Created Subcategory: ${tier2Name} under ${tier1Name}`);
        }
        subcategoryMap.set(`${tier1Name}|${tier2Name}`, subcategory.id);
        
        // Create Tier 3 Items
        for (const tier3Name of tier3Set) {
          if (!tier3Name) continue;
          
          let item = await prisma.item.findFirst({
            where: {
              name: tier3Name,
              subcategoryId: subcategory.id
            }
          });
          
          if (!item) {
            item = await prisma.item.create({
              data: {
                name: tier3Name,
                description: `${tier3Name} - Service Item`,
                subcategoryId: subcategory.id,
                isActive: true
              }
            });
            console.log(`   ✅ Created Item: ${tier3Name} under ${tier2Name}`);
          }
          itemMap.set(`${tier1Name}|${tier2Name}|${tier3Name}`, item.id);
        }
      }
    }
    
    // Step 2: Update services based on CSV mappings
    console.log('\n📌 Step 2: Updating Services with Tier Categorization...');
    
    let servicesUpdated = 0;
    let servicesNotFound = 0;
    const updateDetails: any[] = [];
    
    for (const row of csvData) {
      const serviceName = row['Original_Service_Name'];
      const tier1 = row['Tier_1_Category'];
      const tier2 = row['Tier_2_SubCategory'];
      const tier3 = row['Tier_3_Service_Type'];
      const title = row['Title'];
      const priority = row['Priority']?.toUpperCase();
      const itilCategory = row['ITIL_Category'];
      const issueClassification = row['Issue_Classification'];
      
      if (!serviceName || !tier1 || !tier2 || !tier3) {
        console.log(`   ⚠️ Skipping row with incomplete data: ${serviceName || 'unnamed'}`);
        continue;
      }
      
      // Get tier IDs
      const categoryId = categoryMap.get(tier1);
      const subcategoryId = subcategoryMap.get(`${tier1}|${tier2}`);
      const itemId = itemMap.get(`${tier1}|${tier2}|${tier3}`);
      
      if (!categoryId || !subcategoryId || !itemId) {
        console.log(`   ❌ Could not find tier IDs for: ${serviceName}`);
        continue;
      }
      
      // Find and update the service
      const service = await prisma.service.findFirst({
        where: {
          OR: [
            { name: serviceName },
            { name: { contains: serviceName } },
            { defaultTitle: title },
            { defaultTitle: { contains: serviceName } }
          ]
        }
      });
      
      if (service) {
        // Map CSV values to database enums
        const updateData: any = {
          tier1CategoryId: categoryId,
          tier2SubcategoryId: subcategoryId,
          tier3ItemId: itemId
        };
        
        // Update priority if provided
        if (priority) {
          const priorityMap: any = {
            'LOW': 'LOW',
            'MEDIUM': 'MEDIUM',
            'HIGH': 'HIGH',
            'CRITICAL': 'CRITICAL',
            'URGENT': 'URGENT'
          };
          if (priorityMap[priority]) {
            updateData.priority = priorityMap[priority];
          }
        }
        
        // Update ITIL category if provided
        // Note: The database doesn't have 'PROBLEM' in the enum, using 'INCIDENT' as fallback
        if (itilCategory) {
          const itilMap: any = {
            'Incident': 'INCIDENT',
            'Service Request': 'SERVICE_REQUEST',
            'Change Request': 'CHANGE_REQUEST',
            'Problem': 'INCIDENT', // Using INCIDENT as PROBLEM is not in the enum
            'Event Request': 'EVENT_REQUEST'
          };
          if (itilMap[itilCategory]) {
            updateData.defaultItilCategory = itilMap[itilCategory];
          }
        }
        
        // Update issue classification if provided
        if (issueClassification) {
          const classificationMap: any = {
            'Human Error': 'HUMAN_ERROR',
            'System Error': 'SYSTEM_ERROR',
            'Hardware Failure': 'HARDWARE_FAILURE',
            'Network Issue': 'NETWORK_ISSUE'
          };
          if (classificationMap[issueClassification]) {
            updateData.defaultIssueClassification = classificationMap[issueClassification];
          }
        }
        
        // Update default title if provided
        if (title && title !== service.defaultTitle) {
          updateData.defaultTitle = title;
        }
        
        await prisma.service.update({
          where: { id: service.id },
          data: updateData
        });
        
        servicesUpdated++;
        updateDetails.push({
          serviceName: service.name,
          tier1,
          tier2,
          tier3,
          updated: true
        });
        
        console.log(`   ✅ Updated: ${service.name} → ${tier1} / ${tier2} / ${tier3}`);
      } else {
        servicesNotFound++;
        console.log(`   ⚠️ Service not found in database: ${serviceName}`);
        
        // Option to create the service if not found
        const createNewService = true; // Set to false if you don't want to create new services
        
        if (createNewService) {
          // Parse SLA values
          const slaMatch = row['SLA_Days']?.match(/(\d+)\s*(Days?|Hrs?|Hari|HK)/i);
          let slaHours = 24; // Default 1 day
          if (slaMatch) {
            const value = parseInt(slaMatch[1]);
            const unit = slaMatch[2].toLowerCase();
            if (unit.includes('hr')) {
              slaHours = value;
            } else if (unit.includes('hari') || unit === 'hk') {
              slaHours = value * 24;
            } else {
              slaHours = value * 24; // Days
            }
          }
          
          // Parse response time
          const responseMatch = row['First_Response']?.match(/(\d+)\s*(Mins?|Hrs?|Days?)/i);
          let responseHours = 1; // Default 1 hour
          if (responseMatch) {
            const value = parseInt(responseMatch[1]);
            const unit = responseMatch[2].toLowerCase();
            if (unit.includes('min')) {
              responseHours = value / 60;
            } else if (unit.includes('hr')) {
              responseHours = value;
            } else {
              responseHours = value * 24; // Days
            }
          }
          
          // Parse resolution time
          const resolutionMatch = row['Resolution_Time']?.match(/(\d+)\s*(Days?|Hrs?|Hari|HK)/i);
          let resolutionHours = slaHours; // Default to SLA hours
          if (resolutionMatch) {
            const value = parseInt(resolutionMatch[1]);
            const unit = resolutionMatch[2].toLowerCase();
            if (unit.includes('hr')) {
              resolutionHours = value;
            } else if (unit.includes('hari') || unit === 'hk') {
              resolutionHours = value * 24;
            } else {
              resolutionHours = value * 24; // Days
            }
          }
          
          // Get or create a default ServiceCategory (legacy category)
          let serviceCategory = await prisma.serviceCategory.findFirst({
            where: { name: tier1 }
          });
          
          if (!serviceCategory) {
            serviceCategory = await prisma.serviceCategory.create({
              data: {
                name: tier1,
                description: `${tier1} Services`,
                level: 1,
                isActive: true
              }
            });
          }
          
          const newService = await prisma.service.create({
            data: {
              name: serviceName,
              description: `${tier1} - ${tier2} - ${tier3}`,
              defaultTitle: title || serviceName,
              categoryId: serviceCategory.id, // Required legacy category field
              tier1CategoryId: categoryId,
              tier2SubcategoryId: subcategoryId,
              tier3ItemId: itemId,
              priority: priority && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'].includes(priority) 
                ? priority as any 
                : 'MEDIUM',
              slaHours: slaHours,
              responseHours: responseHours,
              resolutionHours: resolutionHours,
              defaultItilCategory: itilCategory ? 
                (itilCategory.replace(' ', '_').toUpperCase() as any) : 'SERVICE_REQUEST',
              defaultIssueClassification: issueClassification ?
                (issueClassification.replace(' ', '_').toUpperCase() as any) : null,
              isActive: true
            }
          });
          
          console.log(`   🆕 Created new service: ${serviceName}`);
          servicesUpdated++;
        }
      }
    }
    
    // Step 3: Summary
    console.log('\n📊 Update Summary:');
    console.log(`   Total CSV rows processed: ${csvData.length}`);
    console.log(`   Services updated: ${servicesUpdated}`);
    console.log(`   Services not found: ${servicesNotFound}`);
    
    // Step 4: Verify all services now have tier categorization
    console.log('\n📌 Step 3: Verifying Service Categorization...');
    
    const totalServices = await prisma.service.count();
    const servicesWithCompleteTiers = await prisma.service.count({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      }
    });
    
    const servicesWithoutTiers = await prisma.service.findMany({
      where: {
        OR: [
          { tier1CategoryId: null },
          { tier2SubcategoryId: null },
          { tier3ItemId: null }
        ]
      },
      select: {
        id: true,
        name: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true
      }
    });
    
    console.log(`\n📊 Final Service Status:`);
    console.log(`   Total Services: ${totalServices}`);
    console.log(`   Services with complete tiers: ${servicesWithCompleteTiers} (${((servicesWithCompleteTiers/totalServices)*100).toFixed(1)}%)`);
    
    if (servicesWithoutTiers.length > 0) {
      console.log(`\n⚠️ Services still missing tier categorization:`);
      servicesWithoutTiers.forEach(s => {
        const missing = [];
        if (!s.tier1CategoryId) missing.push('Tier1');
        if (!s.tier2SubcategoryId) missing.push('Tier2');
        if (!s.tier3ItemId) missing.push('Tier3');
        console.log(`   - ${s.name}: Missing ${missing.join(', ')}`);
      });
    }
    
    console.log('\n✅ Service categorization update completed!');
    console.log('Run the ticket update script next to propagate changes to tickets.');
    
  } catch (error) {
    console.error('❌ Error updating service categorization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateServicesFromCSV()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });