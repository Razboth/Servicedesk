const { parse } = require('csv-parse/sync');
const { readFileSync } = require('fs');
const { join } = require('path');

try {
  const csvPath = join(process.cwd(), 'import1.csv');
  const fileContent = readFileSync(csvPath, 'utf-8');
  
  console.log('First 200 characters of CSV:');
  console.log(fileContent.substring(0, 200));
  
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    delimiter: ';'  // Explicitly set semicolon delimiter
  });
  
  console.log('\nNumber of records:', records.length);
  console.log('\nFirst record:');
  console.log(records[0]);
  
  console.log('\nColumn names:');
  console.log(Object.keys(records[0]));
  
  console.log('\nFirst few tier categories:');
  for (let i = 0; i < Math.min(5, records.length); i++) {
    const record = records[i];
    console.log(`Record ${i + 1}:`);
    console.log(`  Tier_1_Category: '${record['Tier_1_Category']}'`);
    console.log(`  Tier_2_SubCategory: '${record['Tier_2_SubCategory']}'`);
    console.log(`  Tier_3_Service_Type: '${record['Tier_3_Service_Type']}'`);
  }
} catch (error) {
  console.error('Error:', error);
}