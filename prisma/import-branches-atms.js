require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Override DATABASE_URL to use Windows host IP if in WSL
const isWSL = process.platform === 'linux' && fs.existsSync('/proc/sys/fs/binfmt_misc/WSLInterop');
if (isWSL) {
  const originalUrl = process.env.DATABASE_URL;
  // Replace localhost with Windows host IP
  process.env.DATABASE_URL = originalUrl.replace('localhost', '172.18.240.1');
  console.log('WSL detected, using Windows host IP for database connection');
}

const prisma = new PrismaClient();

// Types for branch and ATM data

async function parseCsv() {
  const csvPath = path.join(process.cwd(), 'daftar_atm.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').slice(1); // Skip header
  
  const branchMap = new Map();
  const atms = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const [no, branchCode, branchName, atmCode, location] = line.split(';').map(s => s.trim());
    
    if (branchCode && branchName && branchCode !== 'KODE CABANG') {
      // Store unique branches
      if (!branchMap.has(branchCode)) {
        branchMap.set(branchCode, branchName);
      }
      
      // Store ATM data
      if (atmCode && location) {
        atms.push({
          branchCode,
          atmCode,
          location
        });
      }
    }
  }
  
  // Convert branch map to array
  const branches = Array.from(branchMap.entries()).map(([code, name]) => ({
    code,
    name
  }));
  
  return { branches, atms };
}

async function importData() {
  console.log('Starting import of branches and ATMs...');
  
  try {
    const { branches, atms } = await parseCsv();
    console.log(`Found ${branches.length} unique branches and ${atms.length} ATMs`);
    
    // Import branches first
    console.log('\nImporting branches...');
    const branchIdMap = new Map();
    
    for (const branch of branches) {
      try {
        // Check if branch already exists
        const existingBranch = await prisma.branch.findUnique({
          where: { code: branch.code }
        });
        
        if (existingBranch) {
          console.log(`Branch ${branch.code} already exists, skipping...`);
          branchIdMap.set(branch.code, existingBranch.id);
        } else {
          // Parse branch name to extract city if possible
          let city = '';
          let cleanName = branch.name;
          
          // Extract city from branch name patterns
          if (branch.name.includes('CABANG ')) {
            city = branch.name.replace('CABANG ', '').replace(/^\d+\s+/, '');
            if (city.includes(' ')) {
              const parts = city.split(' ');
              city = parts[parts.length - 1]; // Usually last word is city
            }
          } else if (branch.name.includes('CAPEM ')) {
            city = branch.name.replace('CAPEM ', '').replace(/^\d+\s+/, '');
          }
          
          // Special handling for specific branches
          const provinceMap = {
            'GORONTALO': 'Gorontalo',
            'JAKARTA': 'DKI Jakarta',
            'SURABAYA': 'East Java',
            'MALANG': 'East Java',
            'MANADO': 'North Sulawesi',
            'BITUNG': 'North Sulawesi',
            'TOMOHON': 'North Sulawesi',
            'KOTAMOBAGU': 'North Sulawesi',
            'TAHUNA': 'North Sulawesi',
            'AIRMADIDI': 'North Sulawesi',
            'TONDANO': 'North Sulawesi',
            'KAWANGKOAN': 'North Sulawesi',
            'AMURANG': 'North Sulawesi'
          };
          
          const province = provinceMap[city.toUpperCase()] || 'North Sulawesi';
          
          const newBranch = await prisma.branch.create({
            data: {
              code: branch.code,
              name: cleanName,
              city: city || undefined,
              province: province,
              isActive: true
            }
          });
          
          console.log(`Created branch: ${branch.code} - ${cleanName}`);
          branchIdMap.set(branch.code, newBranch.id);
        }
      } catch (error) {
        console.error(`Error creating branch ${branch.code}:`, error);
      }
    }
    
    // Import ATMs
    console.log('\nImporting ATMs...');
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const atm of atms) {
      try {
        const branchId = branchIdMap.get(atm.branchCode);
        
        if (!branchId) {
          console.error(`Branch not found for ATM ${atm.atmCode}: ${atm.branchCode}`);
          errorCount++;
          continue;
        }
        
        // Check if ATM already exists
        const existingATM = await prisma.aTM.findUnique({
          where: { code: atm.atmCode }
        });
        
        if (existingATM) {
          console.log(`ATM ${atm.atmCode} already exists, skipping...`);
          skipCount++;
          continue;
        }
        
        // Create ATM
        await prisma.aTM.create({
          data: {
            code: atm.atmCode,
            name: atm.location,
            branchId: branchId,
            location: atm.location,
            isActive: true
          }
        });
        
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Progress: ${successCount} ATMs imported...`);
        }
      } catch (error) {
        console.error(`Error creating ATM ${atm.atmCode}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Branches: ${branches.length} processed`);
    console.log(`ATMs: ${successCount} imported, ${skipCount} skipped, ${errorCount} errors`);
    console.log('Import completed successfully!');
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importData().catch(console.error);