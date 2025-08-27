#!/bin/bash

# Find all route files with params that need fixing
files=(
  "./app/api/reports/custom/[id]/favorite/route.ts"
  "./app/api/reports/custom/[id]/share/route.ts"
  "./app/api/reports/templates/[id]/route.ts"
  "./app/api/task-templates/[id]/route.ts"
  "./app/api/tickets/[id]/assign/route.ts"
  "./app/api/tickets/[id]/tasks/[taskId]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"
    
    # Read file content
    content=$(<"$file")
    
    # Check if already fixed
    if echo "$content" | grep -q "params: Promise<"; then
      echo "  ✓ Already fixed"
      continue
    fi
    
    # Fix the file using node
    node -e "
      const fs = require('fs');
      let content = fs.readFileSync('$file', 'utf-8');
      
      // Fix function signatures
      const functions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
      for (const fn of functions) {
        // Match and replace params type
        const regex = new RegExp(
          'export\\\\s+async\\\\s+function\\\\s+' + fn + '\\\\s*\\\\([^)]*\\\\{\\\\s*params\\\\s*\\\\}\\\\s*:\\\\s*\\\\{\\\\s*params:\\\\s*\\\\{([^}]+)\\\\}\\\\s*\\\\}',
          'g'
        );
        
        content = content.replace(regex, (match, paramsContent) => {
          return 'export async function ' + fn + '(\\n  request: NextRequest,\\n  { params }: { params: Promise<{' + paramsContent + '}> }';
        });
      }
      
      // Add await params after try {
      for (const fn of functions) {
        const fnRegex = new RegExp(
          'export\\\\s+async\\\\s+function\\\\s+' + fn + '\\\\s*\\\\([^)]*\\\\{\\\\s*params\\\\s*\\\\}\\\\s*:\\\\s*\\\\{\\\\s*params:\\\\s*Promise<\\\\{([^}]+)\\\\}>\\\\s*\\\\}\\\\s*\\\\)\\\\s*\\\\{\\\\s*try\\\\s*\\\\{',
          'g'
        );
        
        content = content.replace(fnRegex, (match, paramsContent) => {
          const params = paramsContent.match(/(\\\\w+):/g);
          if (!params) return match;
          
          const paramNames = params.map(p => p.slice(0, -1));
          const destructure = paramNames.length === 1 
            ? 'const { ' + paramNames[0] + ' } = await params;'
            : 'const { ' + paramNames.join(', ') + ' } = await params;';
          
          return match + '\\n    ' + destructure;
        });
      }
      
      // Replace params.id with id, params.taskId with taskId, etc.
      content = content.replace(/params\\.(\w+)/g, '\$1');
      
      fs.writeFileSync('$file', content);
      console.log('  ✓ Fixed');
    "
  else
    echo "  ✗ File not found: $file"
  fi
done

echo "Done!"