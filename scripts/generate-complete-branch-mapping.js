#!/usr/bin/env node

/**
 * Generate complete branch mapping based on actual database data
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateCompleteBranchMapping() {
  console.log('🔧 Generating Complete Branch Mapping');
  console.log('=====================================');
  
  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      code: {
        not: 'LEGACY' // Skip the legacy branch
      }
    },
    select: { 
      code: true, 
      name: true
    },
    orderBy: { code: 'asc' }
  });
  
  console.log(`Generating mapping for ${branches.length} active branches...\n`);
  
  // Generate comprehensive mapping
  const mappingLines = [];
  
  // Add comment header
  mappingLines.push('  // Comprehensive branch mapping for Bank SulutGo');
  mappingLines.push('  // Format: search pattern -> branch code');
  mappingLines.push('  const branchMappings = {');
  
  branches.forEach(branch => {
    const name = branch.name.toLowerCase();
    const code = branch.code;
    
    // Skip user-generated codes that don't represent real branches
    if (code.startsWith('USR_')) {
      return;
    }
    
    mappingLines.push(`    // ${branch.name} (${code})`);
    
    // Add full name mapping
    mappingLines.push(`    '${name}': '${code}',`);
    
    // Extract key words and create variations
    const words = name.split(/\s+/).filter(word => 
      word.length > 2 && 
      !['cabang', 'capem', 'pembantu', 'departemen', 'divisi', 'unit', 'satuan', 'kantor', 'sentra'].includes(word)
    );
    
    // Add individual word mappings for significant words
    const addedWords = new Set();
    words.forEach(word => {
      if (!addedWords.has(word) && word.length > 3) {
        mappingLines.push(`    '${word}': '${code}',`);
        addedWords.add(word);
      }
    });
    
    // Add abbreviated code mapping
    mappingLines.push(`    'cab${code.toLowerCase()}': '${code}',`);
    mappingLines.push('');
  });
  
  mappingLines.push('  };');
  
  // Print the complete mapping
  console.log('Complete Branch Mapping Object:');
  console.log('==============================');
  mappingLines.forEach(line => console.log(line));
  
  console.log(`\n✅ Generated ${mappingLines.length - 3} mapping entries for ${branches.length} branches`);
  
  await prisma.$disconnect();
}

generateCompleteBranchMapping().catch(console.error);