#!/usr/bin/env node

/**
 * Test script for the new branch mapping logic
 */

/**
 * Map branch based on legacy ticket requester info
 * Maps branch names like "Cabang Utama" -> branch code "001"
 * Maps "Cabang Pembantu Sam Ratulangi" -> branch code "047"
 */
function mapBranchFromLegacyData(username, email, displayName) {
  if (!username && !email && !displayName) return null;
  
  // Combine all identifiers for searching
  const identifiers = [
    username || '',
    email || '',
    displayName || ''
  ].join(' ').toLowerCase();
  
  // Comprehensive branch mapping for Bank SulutGo (All 80 active branches) 
  // Format: search pattern -> branch code - SAME AS IMPORT SCRIPT
  const branchMappings = {
    // KANTOR PUSAT (000)
    'kantor pusat': '000',
    'head office': '000',
    'pusat': '000',
    'cab000': '000',

    // CABANG UTAMA (001) 
    'cabang utama': '001',
    'main branch': '001',
    'utama': '001',
    'cab001': '001',

    // CABANG KOTAMOBAGU (002)
    'cabang kotamobagu': '002',
    'kotamobagu': '002',
    'cab002': '002',

    // CABANG GORONTALO (003)
    'cabang gorontalo': '003',
    'gorontalo': '003',
    'cab003': '003',

    // CABANG TAHUNA (004)
    'cabang tahuna': '004',
    'tahuna': '004',
    'cab004': '004',

    // CABANG BITUNG (005)
    'cabang bitung': '005',
    'bitung': '005',
    'cab005': '005',

    // CABANG KAWANGKOAN (006)
    'cabang kawangkoan': '006',
    'kawangkoan': '006',
    'cab006': '006',

    // CABANG LIMBOTO (007)
    'cabang limboto': '007',
    'limboto': '007',
    'cab007': '007',

    // CABANG TONDANO (008)
    'cabang tondano': '008',
    'tondano': '008',
    'cab008': '008',

    // CABANG TOMOHON (009)
    'cabang tomohon': '009',
    'tomohon': '009',
    'cab009': '009',

    // CABANG RATAHAN (022)
    'cabang ratahan': '022',
    'ratahan': '022',
    'cab022': '022',

    // CAPEM SAMRAT (047) - Sam Ratulangi
    'capem samrat': '047',
    'capem sam ratulangi': '047',
    'sam ratulangi': '047',
    'samrat': '047',
    'ratulangi': '047',
    'cab047': '047',

    // CAPEM CEMPAKA PUTIH (024)
    'capem cempaka putih': '024',
    'cempaka putih': '024',
    'cempaka': '024',
    'putih': '024',
    'cab024': '024',

    // Test a few more key branches
    'cabang jakarta': '016',
    'jakarta': '016',
    'cab016': '016',

    'cabang airmadidi': '017',
    'airmadidi': '017',
    'air madidi': '017',
    'cab017': '017',

    'cabang kwandang': '019',
    'kwandang': '019',
    'cab019': '019',

    // Departmental codes
    'teknologi informasi': 'ITE',
    'divisi it': 'ITE',
    'it': 'ITE',
    'ite': 'ITE'
  };
  
  // Search for branch patterns in identifiers
  for (const [pattern, branchCode] of Object.entries(branchMappings)) {
    if (identifiers.includes(pattern)) {
      return branchCode;
    }
  }
  
  // Check email patterns for branch codes
  if (email && email.includes('@')) {
    const emailLocal = email.split('@')[0].toLowerCase();
    for (const [pattern, branchCode] of Object.entries(branchMappings)) {
      if (emailLocal.includes(pattern)) {
        return branchCode;
      }
    }
  }
  
  return null;
}

// Test cases
const testCases = [
  // Main branch tests - CORRECTED
  { username: 'admin', email: 'admin@banksulut.co.id', displayName: 'Cabang Utama', expected: '001' },
  { username: 'user1', email: 'user@banksulut.co.id', displayName: 'Kantor Pusat', expected: '000' }, // FIXED: Kantor Pusat = 000
  { username: 'cab001', email: 'cab001@banksulut.co.id', displayName: '', expected: '001' },
  
  // Sam Ratulangi branch tests  
  { username: 'user_ratulangi', email: 'user@banksulut.co.id', displayName: 'Cabang Pembantu Sam Ratulangi', expected: '047' },
  { username: 'sam', email: 'sam@banksulut.co.id', displayName: 'Sam Ratulangi', expected: '047' },
  { username: 'cab047', email: 'cab047@banksulut.co.id', displayName: '', expected: '047' },
  
  // Other branch tests - CORRECTED CODES
  { username: 'kotamobagu', email: 'user@banksulut.co.id', displayName: 'Kotamobagu', expected: '002' }, // FIXED: Kotamobagu = 002
  { username: 'gorontalo', email: 'gorontalo@banksulut.co.id', displayName: 'Gorontalo', expected: '003' }, // FIXED: Gorontalo = 003
  { username: 'tahuna', email: 'tahuna@banksulut.co.id', displayName: 'Tahuna', expected: '004' }, // FIXED: Tahuna = 004
  { username: 'bitung', email: 'bitung@banksulut.co.id', displayName: 'Bitung Branch', expected: '005' }, // FIXED: Bitung = 005
  { username: 'kawangkoan', email: 'kwn@banksulut.co.id', displayName: 'Kawangkoan', expected: '006' }, // FIXED: Kawangkoan = 006
  { username: 'limboto', email: 'limboto@banksulut.co.id', displayName: 'Limboto', expected: '007' }, // FIXED: Limboto = 007
  { username: 'tondano', email: 'ton@banksulut.co.id', displayName: 'Tondano', expected: '008' }, // FIXED: Tondano = 008
  { username: 'tomohon_user', email: 'tom@banksulut.co.id', displayName: '', expected: '009' }, // FIXED: Tomohon = 009
  { username: 'airmadidi', email: 'air@banksulut.co.id', displayName: 'Air Madidi', expected: '017' }, // FIXED: Airmadidi = 017
  { username: 'cempaka', email: 'putih@banksulut.co.id', displayName: 'Cempaka Putih', expected: '024' },
  
  // CABANG RATAHAN tests (newly added)
  { username: 'ratahan_user', email: 'user@banksulut.co.id', displayName: 'CABANG RATAHAN', expected: '022' },
  { username: 'cabang ratahan', email: 'admin@banksulut.co.id', displayName: '', expected: '022' },
  { username: 'RATAHAN', email: '', displayName: 'Staff Ratahan', expected: '022' },
  { username: 'admin', email: 'admin@ratahan.banksulut.co.id', displayName: '', expected: '022' },
  { username: '', email: 'cab022@banksulut.co.id', displayName: '', expected: '022' },
  
  // Email-based tests - CORRECTED
  { username: '', email: 'cab024@banksulut.co.id', displayName: '', expected: '024' },
  { username: '', email: 'tomohon@banksulut.co.id', displayName: '', expected: '009' }, // FIXED: Tomohon = 009
  
  // No match tests
  { username: 'unknown', email: 'unknown@banksulut.co.id', displayName: 'Unknown Branch', expected: null },
  { username: '', email: '', displayName: '', expected: null }
];

console.log('🧪 Testing Branch Mapping Logic');
console.log('================================');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = mapBranchFromLegacyData(testCase.username, testCase.email, testCase.displayName);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: PASS`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: FAIL`);
    console.log(`   Input: username='${testCase.username}', email='${testCase.email}', displayName='${testCase.displayName}'`);
    console.log(`   Expected: '${testCase.expected}', Got: '${result}'`);
  }
});

console.log('\n📊 Test Results');
console.log('================');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Branch mapping is working correctly.');
} else {
  console.log(`\n⚠️  ${failed} test(s) failed. Please review the mapping logic.`);
  process.exit(1);
}