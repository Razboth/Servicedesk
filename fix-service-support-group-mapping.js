const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixServiceSupportGroupMapping() {
  try {
    console.log('🔧 Fixing service-support group mappings based on categories...');
    
    // Get all support groups
    const supportGroups = await prisma.supportGroup.findMany();
    const supportGroupMap = new Map();
    supportGroups.forEach(group => {
      supportGroupMap.set(group.code, group);
    });
    
    // Define category to support group mapping
    const categoryMappings = {
      // ATM related
      'ATM Services': 'ATM_SERVICES',
      'ATM': 'ATM_SERVICES',
      
      // Claims related
      'Transaction Claims': 'CLAIMS',
      'Claims': 'CLAIMS',
      'Card Services': 'CLAIMS', // Card issues often involve claims
      
      // Network related
      'Network Services': 'NETWORK',
      'Network': 'NETWORK',
      'Network Infrastructure': 'NETWORK',
      
      // User Management
      'User Management': 'USER_MGMT',
      'User': 'USER_MGMT',
      'Account Management': 'USER_MGMT',
      
      // Core Banking
      'Core Banking': 'CORE_BANKING',
      'Banking': 'CORE_BANKING',
      'Transaction': 'CORE_BANKING',
      
      // Security
      'Information Security': 'SECURITY',
      'Security': 'SECURITY',
      'Cybersecurity': 'SECURITY',
      
      // Hardware
      'Hardware & Software': 'HARDWARE',
      'Hardware': 'HARDWARE',
      'Device': 'HARDWARE',
      'Printer': 'HARDWARE',
      'Computer': 'HARDWARE',
      
      // Software
      'Application Errors': 'SOFTWARE',
      'Software': 'SOFTWARE',
      'Application': 'SOFTWARE',
      'System': 'SOFTWARE',
      
      // Service Requests - can go to general IT or specific groups
      'Service Requests': 'IT_HELPDESK'
    };
    
    // Get all services with their categories
    const services = await prisma.service.findMany({
      include: {
        category: true,
        tier1Category: true,
        supportGroup: true
      }
    });
    
    console.log(`\n📊 Processing ${services.length} services...`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const service of services) {
      const categoryName = service.tier1Category?.name || service.category?.name;
      
      if (!categoryName) {
        console.log(`⚠️  Service "${service.name}" has no category, skipping...`);
        skipped++;
        continue;
      }
      
      // Find matching support group
      let targetSupportGroupCode = null;
      
      // Direct match first
      if (categoryMappings[categoryName]) {
        targetSupportGroupCode = categoryMappings[categoryName];
      } else {
        // Partial match
        for (const [pattern, groupCode] of Object.entries(categoryMappings)) {
          if (categoryName.toLowerCase().includes(pattern.toLowerCase()) || 
              pattern.toLowerCase().includes(categoryName.toLowerCase())) {
            targetSupportGroupCode = groupCode;
            break;
          }
        }
      }
      
      // Default to IT_HELPDESK if no match found
      if (!targetSupportGroupCode) {
        targetSupportGroupCode = 'IT_HELPDESK';
      }
      
      const targetSupportGroup = supportGroupMap.get(targetSupportGroupCode);
      
      if (!targetSupportGroup) {
        console.log(`❌ Support group "${targetSupportGroupCode}" not found for service "${service.name}"`);
        skipped++;
        continue;
      }
      
      // Update if different
      if (service.supportGroupId !== targetSupportGroup.id) {
        try {
          await prisma.service.update({
            where: { id: service.id },
            data: { supportGroupId: targetSupportGroup.id }
          });
          
          console.log(`✅ Updated "${service.name}" (${categoryName}) → ${targetSupportGroup.name}`);
          updated++;
        } catch (error) {
          console.error(`❌ Failed to update service "${service.name}":`, error.message);
          skipped++;
        }
      } else {
        skipped++;
      }
    }
    
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Updated: ${updated} services`);
    console.log(`   ⏭️  Skipped: ${skipped} services`);
    
    // Show final distribution
    console.log('\n📊 Final distribution by support group:');
    const finalServices = await prisma.service.findMany({
      include: { supportGroup: true }
    });
    
    const distribution = new Map();
    finalServices.forEach(service => {
      const groupName = service.supportGroup?.name || 'Unassigned';
      distribution.set(groupName, (distribution.get(groupName) || 0) + 1);
    });
    
    for (const [groupName, count] of distribution) {
      console.log(`   • ${groupName}: ${count} services`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing service mappings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixServiceSupportGroupMapping();