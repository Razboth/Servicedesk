#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get the bump type from command line arguments
const bumpType = process.argv[2];

if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
  console.log('Usage: node scripts/bump-version.js [major|minor|patch]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/bump-version.js patch  # 1.0.0 -> 1.0.1');
  console.log('  node scripts/bump-version.js minor  # 1.0.0 -> 1.1.0');
  console.log('  node scripts/bump-version.js major  # 1.0.0 -> 2.0.0');
  process.exit(1);
}

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Parse current version
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`📦 Version bumped from ${currentVersion} to ${newVersion}`);

// Regenerate version file
console.log('🔄 Regenerating version file...');
execSync('npm run version:generate', { stdio: 'inherit' });

console.log('');
console.log('✅ Version bump complete!');
console.log('');
console.log('Next steps:');
console.log(`  1. Review the changes`);
console.log(`  2. Commit: git add -A && git commit -m "chore: Bump version to ${newVersion}"`);
console.log(`  3. Tag: git tag v${newVersion}`);
console.log(`  4. Push: git push && git push --tags`);