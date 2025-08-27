#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const filesToFix = [
  './app/api/manager/atms/[id]/route.ts',
  './app/api/reports/custom/[id]/export/route.ts',
  './app/api/reports/custom/[id]/favorite/route.ts',
  './app/api/reports/custom/[id]/share/route.ts',
  './app/api/reports/templates/[id]/route.ts',
  './app/api/task-templates/[id]/route.ts',
  './app/api/tickets/[id]/assign/route.ts',
  './app/api/tickets/[id]/tasks/[taskId]/route.ts',
  './app/api/tickets/[id]/activities/route.ts',
  './app/api/tickets/[id]/approve/route.ts',
  './app/api/tickets/[id]/attachments/route.ts',
  './app/api/tickets/[id]/close/route.ts',
  './app/api/tickets/[id]/comments/route.ts',
  './app/api/tickets/[id]/reopen/route.ts',
  './app/api/tickets/[id]/update-status/route.ts',
  './app/api/tickets/[id]/route.ts',
];

async function fixRoute(filePath: string) {
  try {
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Skip if already fixed
    if (content.includes('params: Promise<')) {
      console.log(`✅ Already fixed: ${filePath}`);
      return;
    }

    // Find all export async function with params
    const functions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    
    for (const fn of functions) {
      // Match function signature with params
      const regex = new RegExp(
        `export\\s+async\\s+function\\s+${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*\\{([^}]+)\\}\\s*\\}`,
        'g'
      );
      
      const matches = content.match(regex);
      if (!matches) continue;

      // Replace params type with Promise
      content = content.replace(regex, (match, paramsContent) => {
        modified = true;
        const lines = match.split('\n');
        const lastLine = lines[lines.length - 1];
        const indent = lastLine.match(/^(\s*)/)?.[1] || '';
        
        return `export async function ${fn}(
  request: NextRequest,
  { params }: { params: Promise<{${paramsContent}}> }`;
      });

      // Now add await for params at the beginning of function body
      const fnBodyRegex = new RegExp(
        `export\\s+async\\s+function\\s+${fn}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*Promise<\\{([^}]+)\\}>\\s*\\}\\s*\\)\\s*\\{`,
        'g'
      );

      content = content.replace(fnBodyRegex, (match, paramsContent) => {
        // Extract param names
        const paramMatches = paramsContent.match(/(\w+):/g);
        if (!paramMatches) return match;
        
        const paramNames = paramMatches.map(p => p.slice(0, -1));
        const destructure = paramNames.length === 1 
          ? `const { ${paramNames[0]} } = await params;`
          : `const { ${paramNames.join(', ')} } = await params;`;

        // Check if there's a try block right after
        const afterMatch = content.substring(content.indexOf(match) + match.length);
        const trimmed = afterMatch.trimStart();
        
        if (trimmed.startsWith('try {')) {
          // Insert after try {
          const tryIndex = afterMatch.indexOf('try {');
          const beforeTry = afterMatch.substring(0, tryIndex);
          return match + beforeTry + 'try {\n    ' + destructure;
        } else {
          // Insert at the beginning of the function
          return match + '\n  ' + destructure;
        }
      });

      // Replace all params.xyz with just xyz
      paramNames = [];
      const paramExtractRegex = /params\.(\w+)/g;
      let m;
      while ((m = paramExtractRegex.exec(content)) !== null) {
        if (!paramNames.includes(m[1])) {
          paramNames.push(m[1]);
        }
      }
      
      for (const param of paramNames) {
        const paramRegex = new RegExp(`params\\.${param}`, 'g');
        content = content.replace(paramRegex, param);
      }
    }

    if (modified) {
      writeFileSync(filePath, content);
      console.log(`🔧 Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  No changes: ${filePath}`);
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.log(`❌ Not found: ${filePath}`);
    } else {
      console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
  }
}

async function main() {
  for (const file of filesToFix) {
    await fixRoute(file);
  }
}

main().catch(console.error);