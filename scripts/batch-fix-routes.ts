#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

async function fixRouteFile(filePath: string): Promise<boolean> {
  let content = readFileSync(filePath, 'utf-8');
  let modified = false;

  // Skip if already fixed
  if (content.includes('params: Promise<')) {
    return false;
  }

  // Find all function signatures with params
  const functions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
  
  for (const fn of functions) {
    // Match function signature
    const regex = new RegExp(
      `export async function ${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*\\{([^}]+)\\}\\s*\\}`,
      'g'
    );
    
    const matches = content.match(regex);
    if (!matches) continue;

    // Replace signature to use Promise
    content = content.replace(regex, (match, paramsContent) => {
      modified = true;
      return `export async function ${fn}(\n  request: NextRequest,\n  { params }: { params: Promise<{${paramsContent}}> }`;
    });

    // Now add await for params usage
    const functionRegex = new RegExp(
      `export async function ${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*Promise<\\{([^}]+)\\}>\\s*\\}\\s*\\)\\s*\\{`,
      'g'
    );

    content = content.replace(functionRegex, (match, paramsContent) => {
      // Extract param names
      const paramMatches = paramsContent.match(/(\w+):/g);
      if (!paramMatches) return match;
      
      const paramNames = paramMatches.map(p => p.slice(0, -1));
      const destructure = paramNames.length === 1 
        ? `const { ${paramNames[0]} } = await params;`
        : `const { ${paramNames.join(', ')} } = await params;`;

      // Find where to insert the await
      const fnStart = content.indexOf(match);
      const bodyStart = fnStart + match.length;
      const nextContent = content.substring(bodyStart);
      
      // Check if there's a try block
      if (nextContent.trimStart().startsWith('try {')) {
        return match + '\n  try {\n    ' + destructure;
      } else {
        return match + '\n  ' + destructure;
      }
    });

    // Replace all params.xyz with just xyz
    const paramPattern = /params\.(\w+)/g;
    content = content.replace(paramPattern, (match, param) => {
      // Only replace if we've added the await
      if (content.includes(`const { ${param} } = await params;`) || 
          content.includes(`, ${param}`) || 
          content.includes(`${param},`)) {
        return param;
      }
      return match;
    });
  }

  if (modified) {
    writeFileSync(filePath, content);
  }

  return modified;
}

async function main() {
  const files = [
    './app/api/admin/support-groups/[id]/route.ts',
    './app/api/admin/services/[id]/fields/route.ts',
    './app/api/admin/services/[id]/fields/[fieldId]/route.ts',
    './app/api/admin/services/[id]/field-templates/route.ts',
    './app/api/admin/services/[id]/field-templates/[linkId]/route.ts',
    './app/api/admin/users/[id]/toggle-active/route.ts',
    './app/api/admin/tier-categories/[id]/route.ts',
    './app/api/admin/tier-categories/items/[id]/route.ts',
    './app/api/admin/tier-categories/subcategories/[id]/route.ts',
    './app/api/branches/[id]/users/route.ts',
    './app/api/categories/favorites/[categoryId]/route.ts',
    './app/api/tickets/[id]/route.ts',
    './app/api/tickets/[id]/activities/route.ts',
    './app/api/tickets/[id]/approve/route.ts',
    './app/api/tickets/[id]/assign/route.ts',
    './app/api/tickets/[id]/attachments/route.ts',
    './app/api/tickets/[id]/close/route.ts',
    './app/api/tickets/[id]/comments/route.ts',
    './app/api/tickets/[id]/reopen/route.ts',
    './app/api/tickets/[id]/update-status/route.ts',
  ];

  let fixed = 0;
  let skipped = 0;

  for (const file of files) {
    try {
      if (await fixRouteFile(file)) {
        console.log(`✅ Fixed: ${file}`);
        fixed++;
      } else {
        console.log(`⏭️  Skipped: ${file} (already fixed)`);
        skipped++;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`❌ Not found: ${file}`);
      } else {
        console.error(`❌ Error fixing ${file}:`, error.message);
      }
    }
  }

  console.log(`\nSummary: Fixed ${fixed} files, skipped ${skipped} files`);
}

main().catch(console.error);