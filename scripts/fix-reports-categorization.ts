import { promises as fs } from 'fs';
import * as path from 'path';

async function fixReportsCategorization() {
  console.log('🔧 Fixing Reports to Use Direct Ticket Categorization...\n');
  
  const reportsToFix = [
    'app/api/reports/technician/technical-issues/route.ts',
    'app/api/reports/technician/tasks/route.ts',
    'app/api/reports/technician/task-execution/route.ts',
    'app/api/reports/manager/branch-operations/route.ts',
    'app/api/reports/manager/approval-workflow/route.ts',
    'app/api/reports/infrastructure/technical-trends/route.ts',
    'app/api/reports/infrastructure/atm-intelligence/route.ts',
    'app/api/reports/compliance/system-health/route.ts',
    'app/api/reports/compliance/security/route.ts',
    'app/api/reports/business/operational-excellence/route.ts',
    'app/api/reports/business/customer-experience/route.ts',
    'app/api/reports/admin/sla-performance/route.ts',
    'app/api/reports/admin/service-catalog/route.ts',
  ];

  const replacements = [
    // Replace service tier references with direct ticket categorization
    {
      pattern: /service:\s*{\s*include:\s*{\s*tier1Category:\s*{[^}]+}\s*}\s*}/g,
      replacement: 'category: {\n          select: { name: true }\n        }'
    },
    {
      pattern: /service\.tier1Category\?\.name/g,
      replacement: 'category?.name'
    },
    {
      pattern: /ticket\.service\.tier1Category\?\.name/g,
      replacement: 'ticket.category?.name'
    },
    {
      pattern: /service:\s*{\s*include:\s*{\s*tier1Category:\s*true,?\s*tier2Subcategory:\s*true,?\s*tier3Item:\s*true\s*}\s*}/g,
      replacement: 'category: true,\n        subcategory: true,\n        item: true'
    },
    {
      pattern: /service\.tier2Subcategory\?\.name/g,
      replacement: 'subcategory?.name'
    },
    {
      pattern: /service\.tier3Item\?\.name/g,
      replacement: 'item?.name'
    },
    // For grouped queries
    {
      pattern: /service:\s*{\s*select:\s*{\s*tier1Category:\s*{[^}]+}\s*}\s*}/g,
      replacement: 'category: {\n          select: { id: true, name: true }\n        }'
    },
    // Update field names in includes
    {
      pattern: /tier1Category:/g,
      replacement: 'category:'
    },
    {
      pattern: /tier2Subcategory:/g,
      replacement: 'subcategory:'
    },
    {
      pattern: /tier3Item:/g,
      replacement: 'item:'
    }
  ];

  let totalFixed = 0;
  let filesFixed = [];

  for (const reportFile of reportsToFix) {
    const filePath = path.join(process.cwd(), reportFile);
    
    try {
      let content = await fs.readFile(filePath, 'utf8');
      let fileModified = false;
      
      for (const { pattern, replacement } of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, replacement);
          fileModified = true;
          console.log(`   ✓ Fixed ${matches.length} occurrence(s) in ${path.basename(reportFile)}`);
        }
      }
      
      if (fileModified) {
        await fs.writeFile(filePath, content, 'utf8');
        filesFixed.push(reportFile);
        totalFixed++;
      }
      
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log(`   ⚠️ File not found: ${reportFile}`);
      } else {
        console.error(`   ❌ Error processing ${reportFile}:`, error);
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total files fixed: ${totalFixed}`);
  if (filesFixed.length > 0) {
    console.log(`   Files modified:`);
    filesFixed.forEach(file => console.log(`     - ${file}`));
  }
  
  console.log('\n✅ Report categorization fix completed!');
}

// Run the fix
fixReportsCategorization()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });