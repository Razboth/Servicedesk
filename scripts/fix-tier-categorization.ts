import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTierCategorization() {
  console.log('🔧 Starting Tier Categorization Fix...\n');
  
  try {
    // Step 1: Clear all invalid tier references
    console.log('📌 Step 1: Clearing invalid tier references in services...');
    
    // Get all valid tier IDs - using the correct models: Category, Subcategory, Item
    const validTier1Ids = (await prisma.category.findMany({
      select: { id: true }
    })).map(c => c.id);
    
    const validTier2Ids = (await prisma.subcategory.findMany({
      select: { id: true }
    })).map(c => c.id);
    
    const validTier3Ids = (await prisma.item.findMany({
      select: { id: true }
    })).map(c => c.id);
    
    console.log(`   Found ${validTier1Ids.length} valid categories, ${validTier2Ids.length} valid subcategories, ${validTier3Ids.length} valid items`);
    
    // Clear invalid tier1 references
    const tier1Cleared = await prisma.service.updateMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier1CategoryId: { notIn: validTier1Ids.length > 0 ? validTier1Ids : ['dummy'] } }
        ]
      },
      data: { 
        tier1CategoryId: null,
        tier2SubcategoryId: null,
        tier3ItemId: null
      }
    });
    console.log(`   ✅ Cleared ${tier1Cleared.count} services with invalid tier1 references`);
    
    // Clear invalid tier2 references
    if (validTier2Ids.length > 0) {
      const tier2Cleared = await prisma.service.updateMany({
        where: {
          AND: [
            { tier2SubcategoryId: { not: null } },
            { tier2SubcategoryId: { notIn: validTier2Ids } }
          ]
        },
        data: { 
          tier2SubcategoryId: null,
          tier3ItemId: null
        }
      });
      console.log(`   ✅ Cleared ${tier2Cleared.count} services with invalid tier2 references`);
    }
    
    // Clear invalid tier3 references
    if (validTier3Ids.length > 0) {
      const tier3Cleared = await prisma.service.updateMany({
        where: {
          AND: [
            { tier3ItemId: { not: null } },
            { tier3ItemId: { notIn: validTier3Ids } }
          ]
        },
        data: { tier3ItemId: null }
      });
      console.log(`   ✅ Cleared ${tier3Cleared.count} services with invalid tier3 references`);
    }
    
    // Step 2: Create default tier structure if missing
    console.log('\n📌 Step 2: Ensuring default tier structure exists...');
    
    // Create default category if none exist
    let defaultCategory = await prisma.category.findFirst({
      where: { 
        name: 'General Services'
      }
    });
    
    if (!defaultCategory) {
      defaultCategory = await prisma.category.create({
        data: {
          name: 'General Services',
          description: 'Default category for uncategorized services',
          isActive: true
        }
      });
      console.log('   ✅ Created default General Services category');
    }
    
    // Create default subcategory
    let defaultSubcategory = await prisma.subcategory.findFirst({
      where: {
        name: 'General Requests',
        categoryId: defaultCategory.id
      }
    });
    
    if (!defaultSubcategory) {
      defaultSubcategory = await prisma.subcategory.create({
        data: {
          name: 'General Requests',
          description: 'Default subcategory for general service requests',
          categoryId: defaultCategory.id,
          isActive: true
        }
      });
      console.log('   ✅ Created default General Requests subcategory');
    }
    
    // Create default item
    let defaultItem = await prisma.item.findFirst({
      where: {
        name: 'General Service Item',
        subcategoryId: defaultSubcategory.id
      }
    });
    
    if (!defaultItem) {
      defaultItem = await prisma.item.create({
        data: {
          name: 'General Service Item',
          description: 'Default item for general services',
          subcategoryId: defaultSubcategory.id,
          isActive: true
        }
      });
      console.log('   ✅ Created default General Service Item');
    }
    
    // Step 3: Auto-categorize services based on name patterns
    console.log('\n📌 Step 3: Auto-categorizing services based on patterns...');
    
    // Define category mappings based on service name patterns
    const categoryMappings = [
      { pattern: /ATM/i, categoryName: 'ATM Services', subcategoryName: 'ATM Operations', itemName: 'ATM Management' },
      { pattern: /BSGTouch|BSG Touch/i, categoryName: 'Digital Banking', subcategoryName: 'Mobile Banking', itemName: 'BSGTouch Services' },
      { pattern: /BSG QRIS|QRIS/i, categoryName: 'Digital Banking', subcategoryName: 'QRIS Services', itemName: 'QRIS Operations' },
      { pattern: /OLIBs/i, categoryName: 'Core Banking', subcategoryName: 'OLIBs Services', itemName: 'OLIBs Operations' },
      { pattern: /Kasda/i, categoryName: 'Government Banking', subcategoryName: 'Kasda Services', itemName: 'Kasda Operations' },
      { pattern: /Error|Gagal|Fault/i, categoryName: 'Incident Management', subcategoryName: 'System Errors', itemName: 'Error Resolution' },
      { pattern: /User|Password|Blokir|Akses/i, categoryName: 'Access Management', subcategoryName: 'User Administration', itemName: 'User Management' },
      { pattern: /Network|LAN|WAN|Internet/i, categoryName: 'Infrastructure', subcategoryName: 'Network Services', itemName: 'Network Management' },
      { pattern: /Pembayaran|Payment|Transfer/i, categoryName: 'Transaction Services', subcategoryName: 'Payment Services', itemName: 'Payment Processing' },
      { pattern: /Klaim|Claim/i, categoryName: 'Transaction Services', subcategoryName: 'Claims Processing', itemName: 'Claim Management' },
      { pattern: /Penarikan Tunai/i, categoryName: 'ATM Services', subcategoryName: 'ATM Claims', itemName: 'Cash Withdrawal Claims' },
      { pattern: /SMS Banking/i, categoryName: 'Digital Banking', subcategoryName: 'SMS Banking', itemName: 'SMS Banking Services' },
      { pattern: /Report|Laporan/i, categoryName: 'Reporting', subcategoryName: 'Report Services', itemName: 'Report Management' },
      { pattern: /Maintenance|Pemeliharaan/i, categoryName: 'Infrastructure', subcategoryName: 'Maintenance', itemName: 'System Maintenance' },
      { pattern: /Security|Keamanan/i, categoryName: 'Security', subcategoryName: 'Security Operations', itemName: 'Security Management' }
    ];
    
    // Create categories and map services
    for (const mapping of categoryMappings) {
      // Find or create category
      let category = await prisma.category.findFirst({
        where: { name: mapping.categoryName }
      });
      
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: mapping.categoryName,
            description: `Category for ${mapping.categoryName}`,
            isActive: true
          }
        });
      }
      
      // Find or create subcategory
      let subcategory = await prisma.subcategory.findFirst({
        where: { 
          name: mapping.subcategoryName,
          categoryId: category.id
        }
      });
      
      if (!subcategory) {
        subcategory = await prisma.subcategory.create({
          data: {
            name: mapping.subcategoryName,
            description: `Subcategory for ${mapping.subcategoryName}`,
            categoryId: category.id,
            isActive: true
          }
        });
      }
      
      // Find or create item
      let item = await prisma.item.findFirst({
        where: {
          name: mapping.itemName,
          subcategoryId: subcategory.id
        }
      });
      
      if (!item) {
        item = await prisma.item.create({
          data: {
            name: mapping.itemName,
            description: `Item for ${mapping.itemName}`,
            subcategoryId: subcategory.id,
            isActive: true
          }
        });
      }
      
      // Update matching services - get services without tier categorization
      const services = await prisma.service.findMany({
        where: {
          AND: [
            { name: { contains: mapping.pattern.source.replace(/[\\\/i]/g, ''), mode: 'insensitive' } },
            { tier1CategoryId: null }
          ]
        },
        select: { id: true, name: true }
      });
      
      if (services.length > 0) {
        const updated = await prisma.service.updateMany({
          where: {
            id: { in: services.map(s => s.id) }
          },
          data: {
            tier1CategoryId: category.id,
            tier2SubcategoryId: subcategory.id,
            tier3ItemId: item.id
          }
        });
        
        console.log(`   ✅ Categorized ${updated.count} services matching "${mapping.pattern.source}" → ${mapping.categoryName}`);
      }
    }
    
    // Step 4: Assign default categorization to remaining uncategorized services
    console.log('\n📌 Step 4: Assigning default categorization to remaining services...');
    
    const uncategorizedUpdated = await prisma.service.updateMany({
      where: {
        OR: [
          { tier1CategoryId: null },
          { tier2SubcategoryId: null },
          { tier3ItemId: null }
        ]
      },
      data: {
        tier1CategoryId: defaultCategory.id,
        tier2SubcategoryId: defaultSubcategory.id,
        tier3ItemId: defaultItem.id
      }
    });
    
    console.log(`   ✅ Assigned default categorization to ${uncategorizedUpdated.count} remaining services`);
    
    // Step 5: Update tickets to inherit service categorization
    console.log('\n📌 Step 5: Updating tickets to inherit service categorization...');
    
    // Get all services with their tier categories
    const servicesWithTiers = await prisma.service.findMany({
      where: {
        AND: [
          { tier1CategoryId: { not: null } },
          { tier2SubcategoryId: { not: null } },
          { tier3ItemId: { not: null } }
        ]
      },
      select: {
        id: true,
        tier1CategoryId: true,
        tier2SubcategoryId: true,
        tier3ItemId: true
      }
    });
    
    // Update tickets in batches
    let ticketsUpdated = 0;
    for (const service of servicesWithTiers) {
      const result = await prisma.ticket.updateMany({
        where: {
          serviceId: service.id,
          OR: [
            { categoryId: null },
            { subcategoryId: null },
            { itemId: null }
          ]
        },
        data: {
          categoryId: service.tier1CategoryId,
          subcategoryId: service.tier2SubcategoryId,
          itemId: service.tier3ItemId
        }
      });
      ticketsUpdated += result.count;
    }
    
    console.log(`   ✅ Updated ${ticketsUpdated} tickets with proper tier categorization`);
    
    // Step 6: Final summary
    console.log('\n📊 Final Summary:');
    
    const finalStats = {
      totalServices: await prisma.service.count(),
      servicesWithCompleteTiers: await prisma.service.count({
        where: {
          AND: [
            { tier1CategoryId: { not: null } },
            { tier2SubcategoryId: { not: null } },
            { tier3ItemId: { not: null } }
          ]
        }
      }),
      totalTickets: await prisma.ticket.count(),
      ticketsWithCompleteTiers: await prisma.ticket.count({
        where: {
          AND: [
            { tier1CategoryId: { not: null } },
            { tier2SubcategoryId: { not: null } },
            { tier3ItemId: { not: null } }
          ]
        }
      }),
      totalCategories: await prisma.category.count(),
      totalSubcategories: await prisma.subcategory.count(),
      totalItems: await prisma.item.count()
    };
    
    console.log(`   Services: ${finalStats.servicesWithCompleteTiers}/${finalStats.totalServices} have complete tier categorization`);
    console.log(`   Tickets: ${finalStats.ticketsWithCompleteTiers}/${finalStats.totalTickets} have complete tier categorization`);
    console.log(`   Available Tiers: ${finalStats.totalCategories} categories, ${finalStats.totalSubcategories} subcategories, ${finalStats.totalItems} items`);
    
    console.log('\n✅ Tier categorization fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing tier categorization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixTierCategorization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });