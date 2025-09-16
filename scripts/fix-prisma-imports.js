#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function findFilesWithDefaultImport() {
  try {
    const { stdout } = await execAsync(
      `grep -r "import prisma from '@/lib/prisma'" --include="*.ts" --include="*.tsx" /Users/razboth/Documents/Project/Servicedesk | cut -d: -f1 | sort -u`
    );

    return stdout.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error finding files:', error);
    return [];
  }
}

async function updateFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const updatedContent = content.replace(
      /import prisma from '@\/lib\/prisma';/g,
      "import { prisma } from '@/lib/prisma';"
    );

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  Skipped (no changes): ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Failed to update ${filePath}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding files with default Prisma imports...\n');

  const files = await findFilesWithDefaultImport();

  if (files.length === 0) {
    console.log('✨ No files need updating!');
    return;
  }

  console.log(`Found ${files.length} files to update:\n`);

  let updatedCount = 0;

  for (const file of files) {
    const updated = await updateFile(file);
    if (updated) updatedCount++;
  }

  console.log(`\n📊 Summary: Updated ${updatedCount} of ${files.length} files`);

  // Also update the main prisma.ts export to ensure it's a named export
  console.log('\n🔧 Ensuring prisma.ts exports correctly...');
  const prismaPath = '/Users/razboth/Documents/Project/Servicedesk/lib/prisma.ts';
  const prismaContent = fs.readFileSync(prismaPath, 'utf8');

  // Check if it needs updating for default export
  if (prismaContent.includes('export default prisma')) {
    const updatedPrismaContent = prismaContent.replace(
      /export default prisma/g,
      'export { prisma }'
    );
    fs.writeFileSync(prismaPath, updatedPrismaContent, 'utf8');
    console.log('✅ Updated prisma.ts to use named export');
  } else {
    console.log('✅ prisma.ts already uses named export');
  }

  console.log('\n✨ All files have been updated!');
  console.log('📦 Now rebuild the application with: npm run build');
}

main().catch(console.error);