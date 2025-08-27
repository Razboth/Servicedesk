#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

async function fixAllRoutes() {
  const routeFiles = [
    './app/api/admin/tier-categories/items/[id]/route.ts',
    './app/api/admin/tier-categories/subcategories/[id]/route.ts',
    './app/api/branches/[id]/users/route.ts',
    './app/api/categories/favorites/[categoryId]/route.ts',
  ];

  for (const file of routeFiles) {
    try {
      let content = readFileSync(file, 'utf-8');
      let modified = false;

      // Skip if already fixed
      if (content.includes('params: Promise<')) {
        console.log(`✅ Already fixed: ${file}`);
        continue;
      }

      // Fix each function type
      const functions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      
      for (const fn of functions) {
        // Match function with params
        const regex = new RegExp(
          `export\\s+async\\s+function\\s+${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*\\{([^}]+)\\}\\s*\\}`,
          'g'
        );
        
        if (!regex.test(content)) continue;
        
        // Reset for replacement
        content = readFileSync(file, 'utf-8');
        
        // Replace params type with Promise
        content = content.replace(regex, (match, paramsContent) => {
          modified = true;
          return `export async function ${fn}(\n  request: NextRequest,\n  { params }: { params: Promise<{${paramsContent}}> }`;
        });

        // Add await for params at the beginning of function body
        const fnRegex = new RegExp(
          `export\\s+async\\s+function\\s+${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*Promise<\\{([^}]+)\\}>\\s*\\}\\s*\\)\\s*\\{`,
          'g'
        );

        content = content.replace(fnRegex, (match, paramsContent) => {
          // Extract param names
          const paramMatches = paramsContent.match(/(\w+):/g);
          if (!paramMatches) return match;
          
          const paramNames = paramMatches.map(p => p.slice(0, -1));
          const destructure = paramNames.length === 1 
            ? `const { ${paramNames[0]} } = await params;`
            : `const { ${paramNames.join(', ')} } = await params;`;

          // Check if there's a try block right after
          const afterMatch = content.substring(content.indexOf(match) + match.length);
          if (afterMatch.trimStart().startsWith('try {')) {
            return match + '\n  try {\n    ' + destructure;
          } else {
            return match + '\n  ' + destructure;
          }
        });

        // Replace all params.xyz with just xyz
        const paramUsageRegex = /params\.(\w+)/g;
        content = content.replace(paramUsageRegex, '$1');
      }

      if (modified) {
        writeFileSync(file, content);
        console.log(`🔧 Fixed: ${file}`);
      } else {
        console.log(`⏭️  No changes needed: ${file}`);
      }
    } catch (error: any) {
      console.error(`❌ Error fixing ${file}:`, error.message);
    }
  }
}

fixAllRoutes().catch(console.error);