#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

async function fixDynamicRoutes() {
  console.log('Fixing Next.js 15 dynamic route parameters...\n');

  // Find all dynamic route files
  const files = await glob('app/**/\\[*\\]/route.ts');
  
  let updatedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const filePath = path.resolve(file);
    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Skip auth/[...nextauth]/route.ts as it's a special case
    if (file.includes('[...nextauth]')) {
      console.log(`⏭️  Skipping: ${file} (NextAuth special case)`);
      skippedCount++;
      continue;
    }

    // Pattern to match function signatures with params
    const functionPattern = /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\([^)]*\{\s*params\s*\}\s*:\s*\{\s*params:\s*(?!Promise<)\{[^}]+\}\s*\}/g;
    
    // Check if file needs updating
    if (!functionPattern.test(content)) {
      // Check if already updated
      if (content.includes('params: Promise<{')) {
        console.log(`✅ Already fixed: ${file}`);
        skippedCount++;
        continue;
      }
      console.log(`⚠️  No params found: ${file}`);
      skippedCount++;
      continue;
    }

    // Reset regex
    content = readFileSync(filePath, 'utf-8');

    // Replace function signatures to use Promise<params>
    content = content.replace(
      /export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(([^)]*)\{\s*params\s*\}\s*:\s*\{\s*params:\s*(\{[^}]+\})\s*\}/g,
      (match, method, beforeParams, paramsType) => {
        // Check if we need to add await for params
        const functionBody = content.substring(content.indexOf(match));
        const nextBrace = functionBody.indexOf('{', match.length);
        const functionContent = functionBody.substring(nextBrace);
        
        // Check if params are being used directly (e.g., params.id)
        const needsAwait = /params\.\w+/.test(functionContent.substring(0, 2000));

        if (needsAwait) {
          // We'll handle the await separately
          modified = true;
          return `export async function ${method}(${beforeParams}{ params }: { params: Promise<${paramsType}> }`;
        } else {
          modified = true;
          return `export async function ${method}(${beforeParams}{ params }: { params: Promise<${paramsType}> }`;
        }
      }
    );

    // Now handle adding await for params where needed
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of methods) {
      const methodRegex = new RegExp(
        `export\\s+async\\s+function\\s+${method}\\s*\\([^)]*\\{\\s*params\\s*\\}\\s*:\\s*\\{\\s*params:\\s*Promise<\\{([^}]+)\\}>\\s*\\}\\s*\\)\\s*\\{([^{}]*(?:\\{[^{}]*\\}[^{}]*)*)\\}`, 
        'g'
      );

      content = content.replace(methodRegex, (match, paramsContent, functionBody) => {
        // Check if params are used directly without await
        if (/params\.\w+/.test(functionBody) && !/await\s+params/.test(functionBody)) {
          // Extract param names
          const paramNames = paramsContent.match(/(\w+):/g)?.map(p => p.slice(0, -1)) || [];
          const destructure = paramNames.length === 1 
            ? `const { ${paramNames[0]} } = await params;`
            : `const { ${paramNames.join(', ')} } = await params;`;

          // Add await params at the beginning of the function
          const tryIndex = functionBody.indexOf('try {');
          if (tryIndex !== -1) {
            const beforeTry = functionBody.substring(0, tryIndex);
            const afterTry = functionBody.substring(tryIndex + 5);
            
            // Replace params.x with just x
            let updatedBody = afterTry;
            paramNames.forEach(param => {
              updatedBody = updatedBody.replace(new RegExp(`params\\.${param}`, 'g'), param);
            });

            return `export async function ${method}(
  request: NextRequest,
  { params }: { params: Promise<{${paramsContent}}> }
) {${beforeTry}try {
    ${destructure}${updatedBody}}`;
          } else {
            // No try block
            let updatedBody = functionBody;
            paramNames.forEach(param => {
              updatedBody = updatedBody.replace(new RegExp(`params\\.${param}`, 'g'), param);
            });
            
            return `export async function ${method}(
  request: NextRequest,
  { params }: { params: Promise<{${paramsContent}}> }
) {
  const { ${paramNames.join(', ')} } = await params;${updatedBody}}`;
          }
        }
        return match;
      });
    }

    if (modified) {
      writeFileSync(filePath, content);
      console.log(`🔧 Updated: ${file}`);
      updatedCount++;
    } else {
      console.log(`⏭️  Skipped: ${file}`);
      skippedCount++;
    }
  }

  console.log(`\n✅ Complete! Updated ${updatedCount} files, skipped ${skippedCount} files.`);
}

// Run the fix
fixDynamicRoutes().catch(console.error);