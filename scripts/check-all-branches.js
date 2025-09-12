#!/usr/bin/env node

/**
 * Check all branches in the database and compare with branch mapping
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Current branch mappings from the import script
const branchMappings = {
  // Main Branch (Cabang Utama)
  'cabang utama': '001',
  'utama': '001',
  'main branch': '001',
  'kantor pusat': '001',
  'head office': '001',
  'cab001': '001',
  
  // Branch offices (Cabang Pembantu/Capem)
  'sam ratulangi': '047',
  'ratulangi': '047',
  'cab047': '047',
  
  'tomohon': '002',
  'cab002': '002',
  
  'bitung': '003',
  'cab003': '003',
  
  'kotamobagu': '004',
  'cab004': '004',
  
  'airmadidi': '005',
  'air madidi': '005',
  'cab005': '005',
  
  'minahasa': '006',
  'cab006': '006',
  
  'tondano': '007',
  'cab007': '007',
  
  'manado': '008',
  'cab008': '008',
  
  'cempaka putih': '024',
  'cempaka': '024',
  'putih': '024',
  'cab024': '024',
  
  // Additional branches - add more as needed
  'tahuna': '009',
  'cab009': '009',
  
  'sangihe': '010',
  'cab010': '010',
  
  'talaud': '011',
  'cab011': '011',
  
  'gorontalo': '012',
  'cab012': '012',
  
  'limboto': '013',
  'cab013': '013',
  
  'marisa': '014',
  'cab014': '014',
  
  'kwandang': '015',
  'cab015': '015',
  
  'ratahan': '022',
  'cabang ratahan': '022',
  'cab022': '022'
};

async function checkAllBranches() {
  console.log('🏢 All Branches in Database');
  console.log('==========================');
  
  const branches = await prisma.branch.findMany({
    select: { 
      code: true, 
      name: true,
      isActive: true 
    },
    orderBy: { code: 'asc' }
  });
  
  console.log(`Found ${branches.length} branches:\n`);
  
  // Get all mapped branch codes
  const mappedCodes = new Set(Object.values(branchMappings));
  
  let missingMappings = [];
  
  branches.forEach((branch, index) => {
    const status = branch.isActive ? '✅' : '❌';
    const mapped = mappedCodes.has(branch.code) ? '🔗' : '❓';
    
    console.log(`${String(index + 1).padStart(2)}. ${status} ${mapped} Code: ${branch.code.padEnd(4)} | Name: ${branch.name}`);
    
    if (branch.isActive && !mappedCodes.has(branch.code)) {
      missingMappings.push(branch);
    }
  });
  
  console.log(`\nLegend:`);
  console.log(`✅ = Active branch`);
  console.log(`❌ = Inactive branch`);
  console.log(`🔗 = Has mapping in import script`);
  console.log(`❓ = No mapping in import script`);
  
  console.log(`\nSummary:`);
  console.log(`Total branches: ${branches.length}`);
  console.log(`Active branches: ${branches.filter(b => b.isActive).length}`);
  console.log(`Inactive branches: ${branches.filter(b => !b.isActive).length}`);
  console.log(`Branches with mappings: ${branches.filter(b => mappedCodes.has(b.code)).length}`);
  console.log(`Active branches without mappings: ${missingMappings.length}`);
  
  if (missingMappings.length > 0) {
    console.log(`\n⚠️  Missing Mappings for Active Branches:`);
    console.log(`==========================================`);
    missingMappings.forEach(branch => {
      console.log(`Code: ${branch.code} | Name: ${branch.name}`);
      
      // Suggest mapping patterns
      const name = branch.name.toLowerCase();
      const suggestions = [];
      
      // Extract key words from branch name
      const words = name.split(/\s+/).filter(word => 
        word.length > 2 && 
        !['cabang', 'pembantu', 'capem', 'kas'].includes(word)
      );
      
      suggestions.push(`'${name}': '${branch.code}'`);
      if (words.length > 0) {
        words.forEach(word => {
          suggestions.push(`'${word}': '${branch.code}'`);
        });
      }
      suggestions.push(`'cab${branch.code}': '${branch.code}'`);
      
      console.log(`  Suggested mappings:`);
      suggestions.forEach(suggestion => {
        console.log(`    ${suggestion},`);
      });
      console.log();
    });
  } else {
    console.log(`\n🎉 All active branches have mappings in the import script!`);
  }
  
  await prisma.$disconnect();
}

checkAllBranches().catch(console.error);