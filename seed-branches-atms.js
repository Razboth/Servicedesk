const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Parse CSV file
function parseATMCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const headers = lines[0].split(';').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(';').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

async function seedBranchesAndATMs() {
  try {
    console.log('Starting branch and ATM seeding...');
    
    // Read the CSV file
    const csvPath = path.join(process.cwd(), 'daftar_atm.csv');
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      return;
    }
    
    const atmData = parseATMCSV(csvPath);
    console.log(`Loaded ${atmData.length} records from CSV`);
    
    // Group by branch
    const branchMap = new Map();
    atmData.forEach(row => {
      const branchCode = row['KODE CABANG'];
      const branchName = row['PENGELOLA'];
      
      if (!branchMap.has(branchCode)) {
        branchMap.set(branchCode, {
          code: branchCode,
          name: branchName,
          atms: []
        });
      }
      
      branchMap.get(branchCode).atms.push({
        code: row['KODE ATM'],
        location: row['Lokasi ATM']
      });
    });
    
    console.log(`Found ${branchMap.size} unique branches`);
    
    // Create or update branches and ATMs
    for (const [branchCode, branchData] of branchMap) {
      console.log(`\nProcessing branch: ${branchData.name} (${branchCode})`);
      
      // Check if branch exists
      let branch = await prisma.branch.findFirst({
        where: { code: branchCode }
      });
      
      if (!branch) {
        // Create branch
        branch = await prisma.branch.create({
          data: {
            code: branchCode,
            name: branchData.name,
            address: 'Address TBD',
            city: extractCity(branchData.name),
            province: 'North Sulawesi',
            isActive: true
          }
        });
        console.log(`Created branch: ${branch.name}`);
      } else {
        console.log(`Branch already exists: ${branch.name}`);
      }
      
      // Create ATMs for this branch
      console.log(`Creating ${branchData.atms.length} ATMs for branch ${branchCode}...`);
      
      for (const atmData of branchData.atms) {
        // Check if ATM exists
        const existingATM = await prisma.aTM.findFirst({
          where: { code: atmData.code }
        });
        
        if (!existingATM) {
          await prisma.aTM.create({
            data: {
              code: atmData.code,
              location: atmData.location,
              branchId: branch.id,
              status: 'OPERATIONAL',
              isActive: true
            }
          });
          console.log(`  Created ATM: ${atmData.code} at ${atmData.location}`);
        } else {
          console.log(`  ATM already exists: ${atmData.code}`);
        }
      }
    }
    
    // Add some sample ATM incidents for monitoring
    console.log('\nCreating sample ATM incidents...');
    
    // Get some ATMs to create incidents for
    const sampleATMs = await prisma.aTM.findMany({
      take: 10
    });
    
    if (sampleATMs.length > 0) {
      const incidentTypes = ['CASH_OUT', 'PAPER_OUT', 'CARD_READER_ERROR', 'NETWORK_DOWN', 'POWER_FAILURE'];
      const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      
      for (let i = 0; i < 5; i++) {
        const atm = sampleATMs[Math.floor(Math.random() * sampleATMs.length)];
        const type = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
        const severity = type === 'CASH_OUT' || type === 'NETWORK_DOWN' ? 'HIGH' : 
                        type === 'POWER_FAILURE' ? 'CRITICAL' : 
                        severities[Math.floor(Math.random() * severities.length)];
        
        await prisma.aTMIncident.create({
          data: {
            atmId: atm.id,
            type,
            severity,
            description: `${type.replace(/_/g, ' ')} incident reported at ATM ${atm.code}`,
            resolvedAt: Math.random() > 0.3 ? new Date() : null // 70% resolved
          }
        });
      }
      console.log('Created sample ATM incidents');
    }
    
    // Summary
    const totalBranches = await prisma.branch.count();
    const totalATMs = await prisma.aTM.count();
    const totalIncidents = await prisma.aTMIncident.count();
    
    console.log('\n=== Seeding Summary ===');
    console.log(`Total branches: ${totalBranches}`);
    console.log(`Total ATMs: ${totalATMs}`);
    console.log(`Total incidents: ${totalIncidents}`);
    
  } catch (error) {
    console.error('Error seeding branches and ATMs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to extract city from branch name
function extractCity(branchName) {
  // Common city names in North Sulawesi
  const cities = ['Manado', 'Bitung', 'Tomohon', 'Minahasa', 'Kotamobagu', 'Tahuna'];
  
  for (const city of cities) {
    if (branchName.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  // Default to first word as city
  return branchName.split(' ')[0];
}

// Run the seeding
seedBranchesAndATMs();