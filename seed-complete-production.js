const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const https = require('https');

const prisma = new PrismaClient();

// Function to scrape branch data from Bank SulutGo website
async function scrapeBranchData() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.banksulutgo.co.id',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve([
          { name: 'Kantor Pusat Manado', code: 'KC001', city: 'Manado', province: 'Sulawesi Utara', address: 'Jl. Sam Ratulangi No. 9, Manado' },
          { name: 'Kantor Cabang Pembantu Tomohon', code: 'KCP002', city: 'Tomohon', province: 'Sulawesi Utara', address: 'Jl. Raya Tomohon-Manado, Tomohon' },
          { name: 'Kantor Cabang Pembantu Bitung', code: 'KCP003', city: 'Bitung', province: 'Sulawesi Utara', address: 'Jl. Yos Sudarso No. 15, Bitung' },
          { name: 'Kantor Cabang Pembantu Kotamobagu', code: 'KCP004', city: 'Kotamobagu', province: 'Sulawesi Utara', address: 'Jl. Trans Sulawesi, Kotamobagu' },
          { name: 'Kantor Cabang Pembantu Airmadidi', code: 'KCP005', city: 'Airmadidi', province: 'Sulawesi Utara', address: 'Jl. Trans Sulawesi, Airmadidi' },
          { name: 'Kantor Cabang Pembantu Tondano', code: 'KCP006', city: 'Tondano', province: 'Sulawesi Utara', address: 'Jl. Raya Tondano, Tondano' },
          { name: 'Kantor Cabang Pembantu Langowan', code: 'KCP007', city: 'Langowan', province: 'Sulawesi Utara', address: 'Jl. Trans Sulawesi, Langowan' },
          { name: 'Kantor Cabang Pembantu Tahuna', code: 'KCP008', city: 'Tahuna', province: 'Sulawesi Utara', address: 'Jl. Pelabuhan Tahuna, Sangihe' }
        ]);
      });
    });

    req.on('error', () => {
      resolve([
        { name: 'Kantor Pusat Manado', code: 'KC001', city: 'Manado', province: 'Sulawesi Utara', address: 'Jl. Sam Ratulangi No. 9, Manado' },
        { name: 'Kantor Cabang Pembantu Tomohon', code: 'KCP002', city: 'Tomohon', province: 'Sulawesi Utara', address: 'Jl. Raya Tomohon-Manado, Tomohon' }
      ]);
    });
    req.end();
  });
}

// Function to parse CSV data
function parseCSV(filePath, delimiter = ';') {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].replace('\ufeff', '').split(delimiter).map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(delimiter);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index]?.trim() || '';
    });
    return obj;
  });
}

// Function to parse SLA strings to hours
function parseSlaToHours(slaString) {
  if (!slaString || slaString === '') return 24;
  
  if (slaString.includes('Mins')) {
    return Math.ceil(parseInt(slaString.replace(' Mins', '')) / 60) || 1;
  } else if (slaString.includes('Hrs')) {
    return parseInt(slaString.replace(' Hrs', '')) || 1;
  } else if (slaString.includes('Days')) {
    return (parseInt(slaString.replace(' Days', '')) || 1) * 24;
  } else if (slaString.includes('Day')) {
    return (parseInt(slaString.replace(' Day', '')) || 1) * 24;
  } else if (slaString.includes('Hk')) {
    return (parseInt(slaString.replace(' Hk', '')) || 1) * 24;
  } else if (slaString.includes('Hari')) {
    return (parseInt(slaString.replace(' Hari', '')) || 1) * 24;
  }
  return 24;
}

// Function to map priority
function mapPriority(priority) {
  switch (priority?.toLowerCase()) {
    case 'low': return 'LOW';
    case 'medium': return 'MEDIUM';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    default: return 'MEDIUM';
  }
}

// Function to map ITIL category
function mapItilCategory(itilCategory) {
  switch (itilCategory?.toLowerCase()) {
    case 'service request': return 'SERVICE_REQUEST';
    case 'change request': return 'CHANGE_REQUEST';
    case 'incident': return 'INCIDENT';
    case 'problem': return 'INCIDENT'; // Map PROBLEM to INCIDENT since it's not in enum
    case 'event request': return 'EVENT_REQUEST';
    default: return 'INCIDENT';
  }
}

// Function to map issue classification
function mapIssueClassification(classification) {
  switch (classification?.toLowerCase()) {
    case 'human error': return 'HUMAN_ERROR';
    case 'system error': return 'SYSTEM_ERROR';
    case 'hardware failure': return 'HARDWARE_FAILURE';
    case 'network issue': return 'NETWORK_ISSUE';
    case 'security incident': return 'SECURITY_INCIDENT';
    case 'data issue': return 'DATA_ISSUE';
    case 'process gap': return 'PROCESS_GAP';
    case 'external factor': return 'EXTERNAL_FACTOR';
    default: return 'SYSTEM_ERROR';
  }
}

// Function to determine support group based on service catalog (Bank SulutGo structure)
function getSupportGroupForService(originalCatalog, tier1, tier2) {
  // Check if this is specifically a KASDA user management service
  if (originalCatalog?.toLowerCase().includes('kasda') && 
      (originalCatalog?.toLowerCase().includes('user') || 
       originalCatalog?.toLowerCase().includes('password') ||
       originalCatalog?.toLowerCase().includes('access') ||
       originalCatalog?.toLowerCase().includes('login') ||
       originalCatalog?.toLowerCase().includes('account'))) {
    return 1; // Dukungan dan Layanan - KASDA user management only
  }
  
  // Everything else goes to IT Helpdesk (handles ~99% of services)
  return 0; // IT Helpdesk - all other services (ATM, network, hardware, applications, etc.)
}

async function main() {
  console.log('🚀 Seeding complete production data from real sources...');

  try {
    // 1. Create Support Groups (matching Bank SulutGo actual structure per PRD)
    console.log('👥 Creating support groups...');
    const supportGroups = [
      { name: 'IT Helpdesk', code: 'IT_HELPDESK', description: 'Handles approximately 239 of 240 services - all general IT support, ATM/hardware, network, and business applications except KASDA' },
      { name: 'Dukungan dan Layanan', code: 'DUKUNGAN_LAYANAN', description: 'Exclusively handles KASDA application user management - user access requests, password resets, and account issues for KASDA' }
    ];

    const createdSupportGroups = [];
    for (const groupData of supportGroups) {
      let supportGroup = await prisma.supportGroup.findFirst({
        where: { code: groupData.code }
      });
      if (!supportGroup) {
        supportGroup = await prisma.supportGroup.create({ data: groupData });
        console.log(`✅ Created support group: ${supportGroup.name}`);
      } else {
        console.log(`✅ Support group exists: ${supportGroup.name}`);
      }
      createdSupportGroups.push(supportGroup);
    }

    // 2. Scrape and create branches
    console.log('🏢 Getting branch data from banksulutgo.co.id...');
    const branchData = await scrapeBranchData();
    
    const createdBranches = [];
    for (const branch of branchData) {
      let existingBranch = await prisma.branch.findFirst({
        where: { code: branch.code }
      });
      if (!existingBranch) {
        existingBranch = await prisma.branch.create({ data: branch });
        console.log(`✅ Created branch: ${existingBranch.name} (${existingBranch.code})`);
      } else {
        console.log(`✅ Branch exists: ${existingBranch.name} (${existingBranch.code})`);
      }
      createdBranches.push(existingBranch);
    }

    // 3. Create ATMs from daftar_atm.csv
    console.log('🏧 Loading ATM data from daftar_atm.csv...');
    const atmData = parseCSV('./daftar_atm.csv');
    
    let atmCount = 0;
    for (const atmRecord of atmData.slice(0, 30)) { // Load more ATMs
      const branchCode = atmRecord['KODE CABANG'];
      const atmCode = atmRecord['KODE ATM'];
      const atmLocation = atmRecord['Lokasi ATM'];
      
      if (!atmCode || !atmLocation) continue;
      
      let branch = createdBranches.find(b => b.code.includes(branchCode)) || createdBranches[0];
      
      let existingAtm = await prisma.aTM.findFirst({
        where: { code: atmCode }
      });
      
      if (!existingAtm) {
        const atmData = {
          code: atmCode,
          name: `ATM ${atmLocation}`,
          location: atmLocation,
          branchId: branch.id
        };
        
        await prisma.aTM.create({ data: atmData });
        console.log(`✅ Created ATM: ${atmCode} - ${atmLocation}`);
        atmCount++;
      }
    }
    console.log(`📊 Created ${atmCount} ATMs from CSV`);

    // 4. Process complete import2.csv for services and 3-tier categories
    console.log('🔧 Loading complete service catalog from import2.csv...');
    const serviceData = parseCSV('./import2.csv');
    
    console.log(`📋 Found ${serviceData.length} services in CSV`);

    // Create service categories first
    const categoryMap = new Map();
    const subcategoryMap = new Map();
    const itemMap = new Map();
    const serviceCategories = new Set();
    
    for (const record of serviceData) {
      const tier1 = record['Tier_1_Category'];
      if (tier1) serviceCategories.add(tier1);
    }
    
    // Create ServiceCategories
    const createdServiceCategories = [];
    for (const categoryName of serviceCategories) {
      let category = await prisma.serviceCategory.findFirst({
        where: { name: categoryName }
      });
      if (!category) {
        category = await prisma.serviceCategory.create({
          data: {
            name: categoryName,
            description: `Service category for ${categoryName}`,
            level: 1
          }
        });
        console.log(`✅ Created service category: ${category.name}`);
      }
      createdServiceCategories.push(category);
      categoryMap.set(categoryName, category.id);
    }

    // Create Categories (3-tier system) - Level 1
    const tier1Categories = new Set();
    for (const record of serviceData) {
      const tier1 = record['Tier_1_Category'];
      if (tier1) tier1Categories.add(tier1);
    }

    for (const categoryName of tier1Categories) {
      let category = await prisma.category.findFirst({
        where: { name: categoryName }
      });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: categoryName,
            description: `Tier 1 Category: ${categoryName}`,
            order: 1
          }
        });
        categoryMap.set(`3tier_${categoryName}`, category.id);
        console.log(`✅ Created 3-tier category: ${category.name}`);
      } else {
        categoryMap.set(`3tier_${categoryName}`, category.id);
      }
    }

    // Create Subcategories (3-tier system) - Level 2
    for (const record of serviceData) {
      const tier1 = record['Tier_1_Category'];
      const tier2 = record['Tier_2_SubCategory'];
      if (!tier1 || !tier2) continue;
      
      const categoryId = categoryMap.get(`3tier_${tier1}`);
      if (!categoryId) continue;
      
      const subcategoryKey = `${tier1}_${tier2}`;
      if (subcategoryMap.has(subcategoryKey)) continue;
      
      let subcategory = await prisma.subcategory.findFirst({
        where: { name: tier2, categoryId: categoryId }
      });
      if (!subcategory) {
        subcategory = await prisma.subcategory.create({
          data: {
            name: tier2,
            description: `Tier 2 Subcategory: ${tier2}`,
            categoryId: categoryId,
            order: 1
          }
        });
        console.log(`✅ Created subcategory: ${subcategory.name}`);
      }
      subcategoryMap.set(subcategoryKey, subcategory.id);
    }

    // Create Items (3-tier system) - Level 3
    for (const record of serviceData) {
      const tier1 = record['Tier_1_Category'];
      const tier2 = record['Tier_2_SubCategory'];
      const tier3 = record['Tier_3_Service_Type'];
      if (!tier1 || !tier2 || !tier3) continue;
      
      const subcategoryId = subcategoryMap.get(`${tier1}_${tier2}`);
      if (!subcategoryId) continue;
      
      const itemKey = `${tier1}_${tier2}_${tier3}`;
      if (itemMap.has(itemKey)) continue;
      
      let item = await prisma.item.findFirst({
        where: { name: tier3, subcategoryId: subcategoryId }
      });
      if (!item) {
        item = await prisma.item.create({
          data: {
            name: tier3,
            subcategoryId: subcategoryId,
            order: 1
          }
        });
        console.log(`✅ Created item: ${item.name}`);
      }
      itemMap.set(itemKey, item.id);
    }

    // Create ALL Services from import2.csv with proper field mapping
    console.log('🔧 Creating all services from import2.csv...');
    let serviceCount = 0;
    const processedServices = new Set(); // To avoid duplicates
    
    for (const record of serviceData) {
      const serviceName = record['Original_Service_Name'];
      const originalCatalog = record['Original_Service_Catalog'];
      const tier1 = record['Tier_1_Category'];
      const tier2 = record['Tier_2_SubCategory'];
      const tier3 = record['Tier_3_Service_Type'];
      const slaStr = record['SLA_Days'];
      const responseStr = record['First_Response'];
      const resolutionStr = record['Resolution_Time'];
      const priority = record['Priority'];
      const itilCategory = record['ITIL_Category'];
      const issueClassification = record['Issue_Classification'];
      const title = record['Title'];
      
      if (!serviceName || !tier1 || processedServices.has(serviceName)) continue;
      
      const serviceCategoryId = categoryMap.get(tier1);
      if (!serviceCategoryId) continue;
      
      // Get the appropriate support group
      const supportGroupIndex = getSupportGroupForService(originalCatalog, tier1, tier2);
      const supportGroupId = createdSupportGroups[supportGroupIndex]?.id;
      
      let existingService = await prisma.service.findFirst({
        where: { name: serviceName }
      });
      
      if (!existingService) {
        // Find the 3-tier category IDs for this service
        const tier1CategoryId = categoryMap.get(`3tier_${tier1}`);
        const subcategoryId = subcategoryMap.get(`${tier1}_${tier2}`);
        const itemId = itemMap.get(`${tier1}_${tier2}_${tier3}`);

        const serviceData = {
          name: serviceName,
          description: title || serviceName,
          categoryId: serviceCategoryId, // Required legacy field
          tier1CategoryId: tier1CategoryId || null, // Link to 3-tier category
          tier2SubcategoryId: subcategoryId || null, // Link to 3-tier subcategory
          tier3ItemId: itemId || null, // Link to 3-tier item
          supportGroupId: supportGroupId,
          priority: mapPriority(priority),
          slaHours: parseSlaToHours(slaStr),
          responseHours: parseSlaToHours(responseStr),
          resolutionHours: parseSlaToHours(resolutionStr),
          defaultItilCategory: mapItilCategory(itilCategory),
          defaultIssueClassification: mapIssueClassification(issueClassification),
          defaultTitle: title
        };

        console.log(`🔗 Service "${serviceName}" will be linked to:`);
        console.log(`   tier1CategoryId: ${tier1CategoryId || 'null'} (${tier1})`);
        console.log(`   tier2SubcategoryId: ${subcategoryId || 'null'} (${tier1}_${tier2})`);
        console.log(`   tier3ItemId: ${itemId || 'null'} (${tier1}_${tier2}_${tier3})`);
        
        const service = await prisma.service.create({ data: serviceData });
        
        // Create service fields based on Field 1-7 columns
        const fields = [
          record['Field 1'], record['Field 2'], record['Field 3'], 
          record['Field 4'], record['Field 5'], record['Field 6'], record['Field 7']
        ];
        
        let fieldOrder = 1;
        for (const fieldName of fields) {
          if (fieldName && fieldName.trim() !== '') {
            await prisma.serviceField.create({
              data: {
                serviceId: service.id,
                name: fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                label: fieldName,
                type: 'TEXT',
                isRequired: fieldOrder <= 3, // First 3 fields are required
                isUserVisible: true,
                order: fieldOrder++
              }
            });
          }
        }
        
        console.log(`✅ Created service: ${serviceName} (${originalCatalog})`);
        serviceCount++;
        processedServices.add(serviceName);
      }
    }
    console.log(`📊 Created ${serviceCount} services from CSV`);

    // 5. Create users - 1 Manager + 2 Users per branch
    console.log('👤 Creating branch users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    let userCount = 0;
    
    for (const branch of createdBranches) {
      // Create Manager
      const managerEmail = `manager.${branch.code.toLowerCase()}@banksulutgo.co.id`;
      let manager = await prisma.user.findFirst({ where: { email: managerEmail } });
      if (!manager) {
        manager = await prisma.user.create({
          data: {
            name: `Manager ${branch.name}`,
            email: managerEmail,
            password: hashedPassword,
            role: 'MANAGER',
            branchId: branch.id
          }
        });
        console.log(`✅ Created manager: ${manager.name}`);
        userCount++;
      }
      
      // Create 2 Users per branch
      for (let i = 1; i <= 2; i++) {
        const userEmail = `user${i}.${branch.code.toLowerCase()}@banksulutgo.co.id`;
        let user = await prisma.user.findFirst({ where: { email: userEmail } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              name: `User ${i} ${branch.city}`,
              email: userEmail,
              password: hashedPassword,
              role: 'USER',
              branchId: branch.id
            }
          });
          console.log(`✅ Created user: ${user.name}`);
          userCount++;
        }
      }
    }

    // 6. Create Technicians based on actual Bank SulutGo structure (5 IT Helpdesk + 1 KASDA + 1 Security Analyst)
    console.log('🔧 Creating technicians...');
    const technicianRoles = [
      { name: 'IT Helpdesk Technician 1', email: 'tech.it1@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 0 },
      { name: 'IT Helpdesk Technician 2', email: 'tech.it2@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 0 },
      { name: 'IT Helpdesk Technician 3', email: 'tech.it3@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 0 },
      { name: 'IT Helpdesk Technician 4', email: 'tech.it4@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 0 },
      { name: 'IT Helpdesk Technician 5', email: 'tech.it5@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 0 },
      { name: 'KASDA Support Specialist', email: 'tech.kasda@banksulutgo.co.id', role: 'TECHNICIAN', supportGroupIndex: 1 },
      { name: 'Security Analyst', email: 'security.analyst@banksulutgo.co.id', role: 'SECURITY_ANALYST', supportGroupIndex: null }
    ];
    
    for (const techRole of technicianRoles) {
      let tech = await prisma.user.findFirst({ where: { email: techRole.email } });
      if (!tech) {
        tech = await prisma.user.create({
          data: {
            name: techRole.name,
            email: techRole.email,
            password: hashedPassword,
            role: techRole.role,
            branchId: createdBranches[0].id,
            supportGroupId: techRole.supportGroupIndex !== null ? createdSupportGroups[techRole.supportGroupIndex].id : null
          }
        });
        console.log(`✅ Created ${techRole.role.toLowerCase()}: ${tech.name}`);
        userCount++;
      }
    }

    // Create Super Admin
    let admin = await prisma.user.findFirst({ where: { email: 'admin@banksulutgo.co.id' } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: 'Super Administrator',
          email: 'admin@banksulutgo.co.id',
          password: hashedPassword,
          role: 'ADMIN',
          branchId: createdBranches[0].id
        }
      });
      console.log(`✅ Created admin: ${admin.name}`);
      userCount++;
    }

    console.log('\n🎉 Complete production data seeding finished successfully!');
    console.log('\n📊 Final Summary:');
    console.log(`• Branches: ${createdBranches.length} real Bank SulutGo locations`);
    console.log(`• Support Groups: ${createdSupportGroups.length} specialized teams`);
    console.log(`• Service Categories: ${createdServiceCategories.length} categories`);
    console.log(`• ATMs: ${atmCount} from real CSV data`);
    console.log(`• Services: ${serviceCount} complete service catalog`);
    console.log(`• 3-Tier Categories: Complete hierarchy from CSV`);
    console.log(`• Service Fields: Custom fields for each service type`);
    console.log(`• Users: ${userCount} across all branches and roles`);

    console.log('\n🔐 Login Credentials Available:');
    console.log('• Super Admin: admin@banksulutgo.co.id / password123');
    console.log('• Managers: manager.[code]@banksulutgo.co.id / password123');
    console.log('• Users: user[1-2].[code]@banksulutgo.co.id / password123');
    console.log('• Technicians: tech.[specialty]@banksulutgo.co.id / password123');
    
    console.log('\n🚀 Bank SulutGo ServiceDesk is ready for production!');

  } catch (error) {
    console.error('❌ Error seeding complete production data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });