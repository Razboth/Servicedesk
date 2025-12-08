import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Function to read and parse CSV data
function parseCSV(filePath: string) {
  const csvContent = fs.readFileSync(filePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';');
  
  return lines.slice(1).map(line => {
    const values = line.split(';');
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() || '';
    });
    return obj;
  });
}

// Function to parse SLA strings to hours
function parseSlaToHours(slaString: string): number {
  if (!slaString || slaString === '') return 24;
  
  if (slaString.includes('Hrs')) {
    return parseInt(slaString.replace(' Hrs', '')) || 24;
  } else if (slaString.includes('Day')) {
    return (parseInt(slaString.replace(' Days', '').replace(' Day', '')) || 1) * 24;
  } else if (slaString.includes('Hk')) {
    return (parseInt(slaString.replace(' Hk', '')) || 1) * 24;
  } else if (slaString.includes('Mins')) {
    return Math.ceil((parseInt(slaString.replace(' Mins', '')) || 30) / 60);
  }
  return 24; // Default to 24 hours
}

// Function to map priority
function mapPriority(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'EMERGENCY' {
  switch (priority?.toLowerCase()) {
    case 'low': return 'LOW';
    case 'medium': return 'MEDIUM';
    case 'high': return 'HIGH';
    case 'critical': return 'CRITICAL';
    case 'emergency': return 'EMERGENCY';
    default: return 'MEDIUM';
  }
}

// Function to map ITIL category
function mapItilCategory(category: string): 'INCIDENT' | 'SERVICE_REQUEST' | 'CHANGE_REQUEST' | 'EVENT_REQUEST' {
  switch (category?.toLowerCase()) {
    case 'incident': return 'INCIDENT';
    case 'service request': return 'SERVICE_REQUEST';
    case 'change request': return 'CHANGE_REQUEST';
    case 'problem':
    case 'event request': return 'EVENT_REQUEST';
    default: return 'INCIDENT';
  }
}

// Function to map issue classification
function mapIssueClassification(classification: string): 'HUMAN_ERROR' | 'SYSTEM_ERROR' | 'HARDWARE_FAILURE' | 'NETWORK_ISSUE' | 'SECURITY_INCIDENT' | 'DATA_ISSUE' | 'PROCESS_GAP' | 'EXTERNAL_FACTOR' {
  switch (classification?.toLowerCase()) {
    case 'human error': return 'HUMAN_ERROR';
    case 'system error': return 'SYSTEM_ERROR';
    case 'process error': return 'PROCESS_GAP';
    case 'external error': return 'EXTERNAL_FACTOR';
    case 'hardware failure': return 'HARDWARE_FAILURE';
    case 'network issue': return 'NETWORK_ISSUE';
    case 'security incident': return 'SECURITY_INCIDENT';
    case 'data issue': return 'DATA_ISSUE';
    default: return 'SYSTEM_ERROR';
  }
}

// Common field templates
const commonFieldTemplates = {
  // Customer Information Fields
  customerInfo: {
    category: 'Customer Information',
    fields: [
      { name: 'customer_name', label: 'Nama Nasabah', type: 'TEXT', isRequired: true },
      { name: 'account_number', label: 'Nomor Rekening', type: 'TEXT', isRequired: true },
      { name: 'card_number', label: 'Nomor Kartu', type: 'TEXT', isRequired: false },
      { name: 'phone_number', label: 'Nomor HP', type: 'PHONE', isRequired: false }
    ]
  },
  
  // ATM Specific Fields
  atmInfo: {
    category: 'ATM Information',
    fields: [
      { name: 'atm_id', label: 'ID ATM', type: 'TEXT', isRequired: true },
      { name: 'atm_location', label: 'Nama/Lokasi ATM', type: 'TEXT', isRequired: true },
      { name: 'serial_number', label: 'SN (Serial Number)', type: 'TEXT', isRequired: false },
      { name: 'machine_type', label: 'Tipe Mesin', type: 'TEXT', isRequired: false },
      { name: 'pic_name', label: 'Nama PIC ATM', type: 'TEXT', isRequired: false },
      { name: 'pic_phone', label: 'No HP PIC', type: 'PHONE', isRequired: false },
      { name: 'error_list', label: 'Daftar Error ATM', type: 'TEXTAREA', isRequired: false }
    ]
  },
  
  // User Account Fields
  userAccount: {
    category: 'User Account',
    fields: [
      { name: 'user_name', label: 'Nama User', type: 'TEXT', isRequired: true },
      { name: 'user_code', label: 'Kode User', type: 'TEXT', isRequired: true },
      { name: 'user_email', label: 'Email User', type: 'EMAIL', isRequired: false },
      { name: 'user_phone', label: 'Nomor HP', type: 'PHONE', isRequired: false },
      { name: 'position', label: 'Jabatan', type: 'TEXT', isRequired: false },
      { name: 'origin_unit', label: 'Asal Instansi', type: 'TEXT', isRequired: false },
      { name: 'transfer_from', label: 'Mutasi Dari', type: 'TEXT', isRequired: false },
      { name: 'transfer_to', label: 'Mutasi Ke', type: 'TEXT', isRequired: false }
    ]
  },
  
  // Transaction Fields
  transactionInfo: {
    category: 'Transaction Information',
    fields: [
      { name: 'transaction_amount', label: 'Nominal Transaksi', type: 'NUMBER', isRequired: true },
      { name: 'transaction_date', label: 'Tanggal Transaksi', type: 'DATETIME', isRequired: true },
      { name: 'transaction_id', label: 'ID Transaksi', type: 'TEXT', isRequired: false },
      { name: 'archive_number', label: 'Nomor Arsip', type: 'TEXT', isRequired: false },
      { name: 'payment_code', label: 'Kode Bayar / ID Pelanggan', type: 'TEXT', isRequired: false }
    ]
  },
  
  // Error Information Fields
  errorInfo: {
    category: 'Error Information',
    fields: [
      { name: 'error_description', label: 'Keterangan Error', type: 'TEXTAREA', isRequired: true },
      { name: 'error_chronology', label: 'Kronologi Terjadi Error', type: 'TEXTAREA', isRequired: false }
    ]
  },
  
  // Location Fields
  locationInfo: {
    category: 'Location Information',
    fields: [
      { name: 'location', label: 'Lokasi', type: 'TEXT', isRequired: true },
      { name: 'complaint', label: 'Keluhan', type: 'TEXTAREA', isRequired: true }
    ]
  },
  
  // Approval Fields
  approvalInfo: {
    category: 'Approval Information',
    fields: [
      { name: 'approval_date', label: 'Tanggal Approve', type: 'DATE', isRequired: false }
    ]
  },
  
  // ATM Reconciliation Fields
  atmReconciliation: {
    category: 'ATM Reconciliation',
    fields: [
      { name: 'atm_list', label: 'Daftar ATM', type: 'TEXTAREA', isRequired: true },
      { name: 'discrepancy_type', label: 'Jenis Selisih', type: 'TEXT', isRequired: true },
      { name: 'reconciliation', label: 'Rekonsiliasi', type: 'TEXT', isRequired: false },
      { name: 'journal_log', label: 'Log Jurnal', type: 'TEXT', isRequired: false },
      { name: 'rc_file', label: 'File RC', type: 'FILE', isRequired: false }
    ]
  }
};

async function main() {
  console.log('===========================================');
  console.log('CONSOLIDATED DATABASE SEEDING - FULL STATE');
  console.log('===========================================\n');
  
  try {
    // 1. SUPPORT GROUPS - Essential foundation
    console.log('1. Creating Support Groups...');
    const supportGroups = await seedSupportGroups();
    console.log(`   ✓ Created ${supportGroups.length} support groups\n`);
    
    // 2. BRANCHES AND ATMS
    console.log('2. Creating Branches and ATMs...');
    const { branches, atms } = await seedBranchesAndATMs();
    console.log(`   ✓ Created ${branches.length} branches`);
    console.log(`   ✓ Created ${atms.length} ATMs\n`);
    
    // 3. USERS
    console.log('3. Creating Users...');
    const users = await seedUsers(branches, supportGroups);
    console.log(`   ✓ Created ${users.length} users\n`);
    
    // 4. TASK TEMPLATES
    console.log('4. Creating Task Templates...');
    const taskTemplates = await seedTaskTemplates();
    console.log(`   ✓ Created ${taskTemplates.length} task templates\n`);
    
    // 5. FIELD TEMPLATES
    console.log('5. Creating Field Templates...');
    const fieldTemplates = await seedFieldTemplates();
    console.log(`   ✓ Created ${fieldTemplates.length} field templates\n`);
    
    // 6. CATEGORIES (3-TIER STRUCTURE)
    console.log('6. Processing 3-Tier Categories from CSV...');
    const { 
      tier1Categories, 
      tier2Categories, 
      tier3Categories, 
      legacyCategories 
    } = await seed3TierCategories();
    console.log(`   ✓ Created ${tier1Categories.size} Tier 1 categories`);
    console.log(`   ✓ Created ${tier2Categories.size} Tier 2 subcategories`);
    console.log(`   ✓ Created ${tier3Categories.size} Tier 3 items`);
    console.log(`   ✓ Created ${legacyCategories.size} legacy service categories\n`);
    
    // 7. SERVICES
    console.log('7. Creating Services from CSV...');
    const services = await seedServices(
      tier1Categories,
      tier2Categories,
      tier3Categories,
      legacyCategories,
      supportGroups[0] // Default support group
    );
    console.log(`   ✓ Created ${services.length} services\n`);
    
    // 8. SERVICE FIELD MAPPINGS
    console.log('8. Mapping Field Templates to Services...');
    await mapFieldTemplatesToServices(services, fieldTemplates);
    console.log(`   ✓ Field templates mapped to services\n`);
    
    // 9. SAMPLE TICKETS
    console.log('9. Creating Sample Tickets...');
    const tickets = await seedSampleTickets(services, users, branches, supportGroups[0]);
    console.log(`   ✓ Created ${tickets.length} sample tickets\n`);
    
    console.log('===========================================');
    console.log('SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================');
    console.log('\nSummary:');
    console.log(`- ${supportGroups.length} support groups`);
    console.log(`- ${branches.length} branches`);
    console.log(`- ${atms.length} ATMs`);
    console.log(`- ${users.length} users`);
    console.log(`- ${taskTemplates.length} task templates`);
    console.log(`- ${fieldTemplates.length} field templates`);
    console.log(`- ${tier1Categories.size + tier2Categories.size + tier3Categories.size} category items`);
    console.log(`- ${services.length} services`);
    console.log(`- ${tickets.length} sample tickets`);
    
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  }
}

// Individual seeding functions

async function seedSupportGroups() {
  const supportGroupsData = [
    {
      code: 'IT_HELPDESK',
      name: 'IT Helpdesk',
      description: 'General IT support and helpdesk services',
      isActive: true
    },
    {
      code: 'NETWORK_ADMIN',
      name: 'Network Administration',
      description: 'Network infrastructure and connectivity support',
      isActive: true
    },
    {
      code: 'APP_SUPPORT',
      name: 'Application Support',
      description: 'Business application support and maintenance',
      isActive: true
    },
    {
      code: 'SECURITY_OPS',
      name: 'Security Operations',
      description: 'Information security and compliance',
      isActive: true
    },
    {
      code: 'DATABASE_ADMIN',
      name: 'Database Administration',
      description: 'Database management and optimization',
      isActive: true
    },
    {
      code: 'HARDWARE_SUPPORT',
      name: 'Hardware Support',
      description: 'Hardware maintenance and troubleshooting',
      isActive: true
    },
    {
      code: 'TECH_SUPPORT',
      name: 'Technical Support',
      description: 'Technical support for PC assets, licenses, and hardware',
      isActive: true
    },
    {
      code: 'PC_AUDITOR',
      name: 'PC Auditor',
      description: 'Read-only access to PC Management system for audit purposes',
      isActive: true
    }
  ];

  const supportGroups = [];
  for (const groupData of supportGroupsData) {
    const existing = await prisma.supportGroup.findUnique({
      where: { code: groupData.code }
    });
    
    if (existing) {
      supportGroups.push(existing);
    } else {
      const group = await prisma.supportGroup.create({ data: groupData });
      supportGroups.push(group);
    }
  }
  
  return supportGroups;
}

async function seedBranchesAndATMs() {
  const branchesData = [
    {
      name: 'Manado Main Branch',
      code: 'MND001',
      address: 'Jl. Sam Ratulangi No. 1, Wenang',
      city: 'Manado',
      province: 'North Sulawesi',
      phone: '0431-851001',
      email: 'manado.main@banksulutgo.co.id',
      isActive: true,
      monitoringEnabled: true,
      ipAddress: '10.1.1.1',
      backupIpAddress: '10.1.1.2',
      networkMedia: 'FO',
      networkVendor: 'Telkom',
      atms: [
        { code: 'ATM001', location: 'Main Lobby', status: 'OPERATIONAL', ipAddress: '10.1.1.10' },
        { code: 'ATM002', location: 'Drive Through', status: 'OPERATIONAL', ipAddress: '10.1.1.11' }
      ]
    },
    {
      name: 'Tomohon Branch',
      code: 'TMH001',
      address: 'Jl. Raya Tomohon No. 15',
      city: 'Tomohon',
      province: 'North Sulawesi',
      phone: '0431-351001',
      email: 'tomohon@banksulutgo.co.id',
      isActive: true,
      monitoringEnabled: true,
      ipAddress: '10.1.2.1',
      backupIpAddress: '10.1.2.2',
      networkMedia: 'VSAT',
      networkVendor: 'Indosat',
      atms: [
        { code: 'ATM101', location: 'Branch Office', status: 'OPERATIONAL', ipAddress: '10.1.2.10' },
        { code: 'ATM102', location: 'Tomohon Mall', status: 'OPERATIONAL', ipAddress: '10.1.2.11' }
      ]
    },
    {
      name: 'Bitung Branch',
      code: 'BTG001',
      address: 'Jl. Pelabuhan Bitung No. 8',
      city: 'Bitung',
      province: 'North Sulawesi',
      phone: '0438-21001',
      email: 'bitung@banksulutgo.co.id',
      isActive: true,
      monitoringEnabled: true,
      ipAddress: '10.1.3.1',
      backupIpAddress: '10.1.3.2',
      networkMedia: 'M2M',
      networkVendor: 'Telkomsel',
      atms: [
        { code: 'ATM201', location: 'Branch Office', status: 'OPERATIONAL', ipAddress: '10.1.3.10' },
        { code: 'ATM202', location: 'Bitung Port', status: 'MAINTENANCE', ipAddress: '10.1.3.11' }
      ]
    },
    {
      name: 'Kotamobagu Branch',
      code: 'KTG001',
      address: 'Jl. Yos Sudarso No. 25',
      city: 'Kotamobagu',
      province: 'North Sulawesi',
      phone: '0434-21001',
      email: 'kotamobagu@banksulutgo.co.id',
      isActive: true,
      monitoringEnabled: true,
      ipAddress: '10.1.4.1',
      backupIpAddress: '10.1.4.2',
      networkMedia: 'FO',
      networkVendor: 'Telkom',
      atms: [
        { code: 'ATM301', location: 'Branch Office', status: 'OPERATIONAL', ipAddress: '10.1.4.10' }
      ]
    },
    {
      name: 'Airmadidi Branch',
      code: 'AMD001',
      address: 'Jl. Trans Sulawesi No. 10',
      city: 'Airmadidi',
      province: 'North Sulawesi',
      phone: '0431-891001',
      email: 'airmadidi@banksulutgo.co.id',
      isActive: true,
      monitoringEnabled: true,
      ipAddress: '10.1.5.1',
      backupIpAddress: '10.1.5.2',
      networkMedia: 'VSAT',
      networkVendor: 'Indosat',
      atms: [
        { code: 'ATM401', location: 'Branch Office', status: 'OPERATIONAL', ipAddress: '10.1.5.10' }
      ]
    }
  ];

  const branches = [];
  const atms = [];
  
  for (const branchData of branchesData) {
    const { atms: atmData, phone, email, ...branchInfo } = branchData;
    
    // Check if branch exists
    let branch = await prisma.branch.findUnique({
      where: { code: branchInfo.code }
    });
    
    if (!branch) {
      branch = await prisma.branch.create({ data: branchInfo });
    }
    branches.push(branch);
    
    // Create ATMs for this branch
    for (const atm of atmData) {
      const existingATM = await prisma.aTM.findUnique({
        where: { code: atm.code }
      });
      
      if (!existingATM) {
        const newATM = await prisma.aTM.create({
          data: {
            code: atm.code,
            name: `${branchData.name} - ${atm.code}`,
            location: atm.location,
            branchId: branch.id,
            isActive: atm.status === 'OPERATIONAL',
            ipAddress: atm.ipAddress || null
          }
        });
        atms.push(newATM);
      } else {
        atms.push(existingATM);
      }
    }
  }
  
  return { branches, atms };
}

async function seedUsers(branches: any[], supportGroups: any[]) {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const usersData = [
    // Super Admin
    {
      username: 'superadmin',
      email: 'superadmin@banksulutgo.co.id',
      name: 'Super Administrator',
      password: hashedPassword,
      role: 'ADMIN' as const,
      isActive: true
    },
    // Admin
    {
      username: 'admin',
      email: 'admin@banksulutgo.co.id',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'ADMIN' as const,
      isActive: true
    },
    // Branch Managers
    {
      username: 'manager.manado',
      email: 'manager.manado@banksulutgo.co.id',
      name: 'Manado Branch Manager',
      password: hashedPassword,
      role: 'MANAGER' as const,
      branchId: branches[0].id,
      isActive: true
    },
    {
      username: 'manager.tomohon',
      email: 'manager.tomohon@banksulutgo.co.id',
      name: 'Tomohon Branch Manager',
      password: hashedPassword,
      role: 'MANAGER' as const,
      branchId: branches[1].id,
      isActive: true
    },
    // Technicians for different support groups
    {
      username: 'tech.helpdesk',
      email: 'tech.helpdesk@banksulutgo.co.id',
      name: 'IT Helpdesk Technician',
      password: hashedPassword,
      role: 'TECHNICIAN' as const,
      supportGroupId: supportGroups.find(g => g.code === 'IT_HELPDESK').id,
      isActive: true
    },
    {
      username: 'tech.network',
      email: 'tech.network@banksulutgo.co.id',
      name: 'Network Technician',
      password: hashedPassword,
      role: 'TECHNICIAN' as const,
      supportGroupId: supportGroups.find(g => g.code === 'NETWORK_ADMIN').id,
      isActive: true
    },
    {
      username: 'tech.app',
      email: 'tech.app@banksulutgo.co.id',
      name: 'Application Support Technician',
      password: hashedPassword,
      role: 'TECHNICIAN' as const,
      supportGroupId: supportGroups.find(g => g.code === 'APP_SUPPORT').id,
      isActive: true
    },
    // Branch Users
    {
      username: 'user.manado',
      email: 'user.manado@banksulutgo.co.id',
      name: 'Manado Branch User',
      password: hashedPassword,
      role: 'USER' as const,
      branchId: branches[0].id,
      isActive: true
    },
    {
      username: 'user.tomohon',
      email: 'user.tomohon@banksulutgo.co.id',
      name: 'Tomohon Branch User',
      password: hashedPassword,
      role: 'USER' as const,
      branchId: branches[1].id,
      isActive: true
    },
    {
      username: 'user.bitung',
      email: 'user.bitung@banksulutgo.co.id',
      name: 'Bitung Branch User',
      password: hashedPassword,
      role: 'USER' as const,
      branchId: branches[2].id,
      isActive: true
    }
  ];

  const users = [];
  for (const userData of usersData) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    });
    
    if (!existing) {
      const user = await prisma.user.create({ data: userData });
      users.push(user);
    } else {
      users.push(existing);
    }
  }
  
  return users;
}

async function seedTaskTemplates() {
  // Task templates will be created based on schema structure
  // For now, return empty array as task templates need serviceId
  return [];
}

async function seedFieldTemplates() {
  const fieldTemplates = [];
  
  // Create field templates from commonFieldTemplates
  for (const [key, category] of Object.entries(commonFieldTemplates)) {
    for (const field of category.fields) {
      try {
        const existing = await prisma.fieldTemplate.findFirst({
          where: { name: field.name }
        });
        
        if (!existing) {
          const fieldTemplate = await prisma.fieldTemplate.create({
            data: {
              name: field.name,
              label: field.label,
              type: field.type as any,
              category: category.category,
              isRequired: field.isRequired,
              helpText: `Enter ${field.label}`
            }
          });
          fieldTemplates.push(fieldTemplate);
        } else {
          fieldTemplates.push(existing);
        }
      } catch (error) {
        console.error(`Error creating field template ${field.name}:`, error);
      }
    }
  }
  
  return fieldTemplates;
}

async function seed3TierCategories() {
  // Read CSV data
  const csvPath = path.join(process.cwd(), 'import1.csv');
  const csvData = parseCSV(csvPath);
  
  // Extract unique categories from CSV data
  const tier1Categories = new Map<string, any>();
  const tier2Categories = new Map<string, any>();
  const tier3Categories = new Map<string, any>();
  const legacyCategories = new Map<string, any>();

  // First pass: collect unique categories
  const uniqueTier1 = new Set<string>();
  const uniqueTier2 = new Map<string, { name: string; parent: string }>();
  const uniqueTier3 = new Map<string, { name: string; parent1: string; parent2: string }>();

  csvData.forEach(row => {
    const tier1 = row['Tier_1_Category'];
    const tier2 = row['Tier_2_SubCategory'];
    const tier3 = row['Tier_3_Service_Type'];
    
    if (tier1) uniqueTier1.add(tier1);
    if (tier1 && tier2) {
      uniqueTier2.set(`${tier1}|${tier2}`, { name: tier2, parent: tier1 });
    }
    if (tier1 && tier2 && tier3) {
      uniqueTier3.set(`${tier1}|${tier2}|${tier3}`, {
        name: tier3,
        parent1: tier1,
        parent2: tier2
      });
    }
  });

  // Create Tier 1 categories
  for (const name of Array.from(uniqueTier1)) {
    const existing = await prisma.category.findFirst({ where: { name } });
    
    if (existing) {
      tier1Categories.set(name, existing);
    } else {
      const category = await prisma.category.create({
        data: {
          name,
          description: `Tier 1 category: ${name}`,
          isActive: true
        }
      });
      tier1Categories.set(name, category);
    }
    
    // Also create legacy ServiceCategory
    const existingLegacy = await prisma.serviceCategory.findFirst({
      where: { name, level: 1 }
    });
    
    if (existingLegacy) {
      legacyCategories.set(name, existingLegacy);
    } else {
      const legacyCategory = await prisma.serviceCategory.create({
        data: {
          name,
          description: `Legacy category: ${name}`,
          level: 1,
          isActive: true
        }
      });
      legacyCategories.set(name, legacyCategory);
    }
  }

  // Create Tier 2 categories (subcategories)
  for (const [key, data] of Array.from(uniqueTier2)) {
    const parent = tier1Categories.get(data.parent);
    if (parent) {
      const existing = await prisma.subcategory.findFirst({
        where: { name: data.name, categoryId: parent.id }
      });
      
      if (existing) {
        tier2Categories.set(key, existing);
      } else {
        const subcategory = await prisma.subcategory.create({
          data: {
            categoryId: parent.id,
            name: data.name,
            description: `Tier 2 subcategory: ${data.name}`,
            isActive: true
          }
        });
        tier2Categories.set(key, subcategory);
      }
    }
  }

  // Create Tier 3 categories (items)
  for (const [key, data] of Array.from(uniqueTier3)) {
    const parentKey = `${data.parent1}|${data.parent2}`;
    const parent = tier2Categories.get(parentKey);
    if (parent) {
      const existing = await prisma.item.findFirst({
        where: { name: data.name, subcategoryId: parent.id }
      });
      
      if (existing) {
        tier3Categories.set(key, existing);
      } else {
        const item = await prisma.item.create({
          data: {
            subcategoryId: parent.id,
            name: data.name,
            description: `Tier 3 item: ${data.name}`,
            isActive: true
          }
        });
        tier3Categories.set(key, item);
      }
    }
  }

  return { tier1Categories, tier2Categories, tier3Categories, legacyCategories };
}

async function seedServices(
  tier1Categories: Map<string, any>,
  tier2Categories: Map<string, any>,
  tier3Categories: Map<string, any>,
  legacyCategories: Map<string, any>,
  defaultSupportGroup: any
) {
  // Read CSV data
  const csvPath = path.join(process.cwd(), 'import1.csv');
  const csvData = parseCSV(csvPath);
  
  const services = [];
  let created = 0;
  let skipped = 0;
  
  for (const row of csvData) {
    const tier1 = row['Tier_1_Category'];
    const tier2 = row['Tier_2_SubCategory'];
    const tier3 = row['Tier_3_Service_Type'];
    const title = row['Title'] || `${row['Original_Service_Catalog']} - ${row['Original_Service_Name']}`;
    
    if (tier1 && tier2 && tier3) {
      const tier3Key = `${tier1}|${tier2}|${tier3}`;
      const tier3Category = tier3Categories.get(tier3Key);
      const tier1Category = tier1Categories.get(tier1);
      const legacyCategory = legacyCategories.get(tier1);
      
      if (tier3Category && tier1Category && legacyCategory) {
        try {
          // Check if service already exists
          const existing = await prisma.service.findFirst({
            where: {
              name: title,
              categoryId: legacyCategory.id
            }
          });
          
          if (existing) {
            skipped++;
            services.push(existing);
          } else {
            const service = await prisma.service.create({
              data: {
                name: title,
                description: `${row['Original_Service_Name']} - ${tier3}`,
                categoryId: legacyCategory.id, // Legacy category field
                tier1CategoryId: tier1Category.id,
                tier3ItemId: tier3Category.id,
                supportGroupId: defaultSupportGroup.id,
                priority: mapPriority(row['Priority']),
                estimatedHours: parseSlaToHours(row['Resolution_Time']),
                slaHours: parseSlaToHours(row['Resolution_Time']),
                responseHours: parseSlaToHours(row['First_Response']),
                resolutionHours: parseSlaToHours(row['Resolution_Time']),
                requiresApproval: mapItilCategory(row['ITIL_Category']) === 'CHANGE_REQUEST',
                defaultItilCategory: mapItilCategory(row['ITIL_Category']),
                defaultIssueClassification: mapIssueClassification(row['Issue_Classification']),
                defaultTitle: title,
                isActive: true
              }
            });
            services.push(service);
            created++;
          }
        } catch (error: any) {
          console.warn(`Failed to create service for ${title}:`, error.message);
        }
      }
    }
  }

  console.log(`   - Created ${created} new services, skipped ${skipped} existing`);
  return services;
}

async function mapFieldTemplatesToServices(services: any[], fieldTemplates: any[]) {
  // Service to field mapping patterns
  const serviceFieldMappings = [
    { servicePattern: 'ATM Technical Issue', templates: ['atmInfo'] },
    { servicePattern: 'BSGTouch SMS Activation Not Sent', templates: ['approvalInfo'] },
    { servicePattern: 'Kasda.*Error', templates: ['userAccount', 'transactionInfo', 'errorInfo'] },
    { servicePattern: 'OLIBs.*Error', templates: ['errorInfo'] },
    { servicePattern: '.*Claim', templates: ['customerInfo', 'transactionInfo'] },
    { servicePattern: 'Network.*Disruption', templates: ['locationInfo'] },
    { servicePattern: '.*User Registration|.*User.*', templates: ['userAccount'] },
    { servicePattern: 'ATM Discrepancy Resolution', templates: ['atmReconciliation'] }
  ];

  const templateMap = new Map(fieldTemplates.map(ft => [ft.name, ft]));
  let mappingsCreated = 0;

  for (const service of services) {
    // Find matching field mappings for this service
    const matchingMappings = serviceFieldMappings.filter(mapping => {
      const regex = new RegExp(mapping.servicePattern, 'i');
      return regex.test(service.name);
    });
    
    if (matchingMappings.length > 0) {
      let order = 1;
      
      for (const mapping of matchingMappings) {
        for (const templateCategory of mapping.templates) {
          const categoryFields = commonFieldTemplates[templateCategory as keyof typeof commonFieldTemplates]?.fields || [];
          
          for (const field of categoryFields) {
            const fieldTemplate = templateMap.get(field.name);
            if (fieldTemplate) {
              try {
                const existing = await prisma.serviceFieldTemplate.findUnique({
                  where: {
                    serviceId_fieldTemplateId: {
                      serviceId: service.id,
                      fieldTemplateId: fieldTemplate.id
                    }
                  }
                });
                
                if (!existing) {
                  await prisma.serviceFieldTemplate.create({
                    data: {
                      serviceId: service.id,
                      fieldTemplateId: fieldTemplate.id,
                      order: order++,
                      isRequired: field.isRequired,
                      isUserVisible: true
                    }
                  });
                  mappingsCreated++;
                }
              } catch (error: any) {
                console.error(`Error linking field ${field.label} to service ${service.name}:`, error.message);
              }
            }
          }
        }
      }
    }
  }
  
  console.log(`   - Created ${mappingsCreated} service-field mappings`);
}

async function seedSampleTickets(
  services: any[], 
  users: any[], 
  branches: any[], 
  defaultSupportGroup: any
) {
  // Check if we already have tickets
  const existingTickets = await prisma.ticket.count();
  if (existingTickets > 0) {
    console.log(`   - Skipping tickets, ${existingTickets} already exist`);
    return [];
  }
  
  const tickets = [];
  
  if (services.length > 0 && users.length > 0) {
    const sampleTicketsData = [
      {
        ticketNumber: 'TKT-001',
        title: 'ATM Terminal Registration Request',
        description: 'Request for new ATM terminal registration at branch location',
        serviceId: services[0].id,
        priority: 'MEDIUM' as const,
        status: 'PENDING_APPROVAL' as const,
        createdById: users.find(u => u.role === 'USER')?.id,
        branchId: branches[0].id,
        supportGroupId: defaultSupportGroup.id,
        itilCategory: 'SERVICE_REQUEST' as const
      },
      {
        ticketNumber: 'TKT-002',
        title: 'Application Error Report',
        description: 'Application experiencing errors during operation',
        serviceId: services.length > 1 ? services[1].id : services[0].id,
        priority: 'HIGH' as const,
        status: 'IN_PROGRESS' as const,
        createdById: users.find(u => u.role === 'USER')?.id,
        assignedToId: users.find(u => u.role === 'TECHNICIAN')?.id,
        branchId: branches[0].id,
        supportGroupId: defaultSupportGroup.id,
        itilCategory: 'INCIDENT' as const
      },
      {
        ticketNumber: 'TKT-003',
        title: 'Network Connectivity Issue',
        description: 'Branch experiencing intermittent network connectivity problems',
        serviceId: services.find(s => s.name.includes('Network'))?.id || services[0].id,
        priority: 'HIGH' as const,
        status: 'OPEN' as const,
        createdById: users.find(u => u.branchId === branches[1].id)?.id,
        branchId: branches[1].id,
        supportGroupId: defaultSupportGroup.id,
        itilCategory: 'INCIDENT' as const
      },
      {
        ticketNumber: 'TKT-004',
        title: 'User Access Request',
        description: 'Request for new user account creation for branch employee',
        serviceId: services.find(s => s.name.includes('User'))?.id || services[0].id,
        priority: 'MEDIUM' as const,
        status: 'RESOLVED' as const,
        createdById: users.find(u => u.role === 'MANAGER')?.id,
        assignedToId: users.find(u => u.role === 'TECHNICIAN')?.id,
        branchId: branches[0].id,
        supportGroupId: defaultSupportGroup.id,
        itilCategory: 'SERVICE_REQUEST' as const,
        resolvedAt: new Date()
      }
    ];

    for (const ticketData of sampleTicketsData) {
      try {
        const ticket = await prisma.ticket.create({ 
          data: {
            ...ticketData,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        tickets.push(ticket);
      } catch (error) {
        console.error(`Error creating ticket ${ticketData.ticketNumber}:`, error);
      }
    }
  }
  
  return tickets;
}

// Run the main seeding function
main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });