#!/usr/bin/env node

/**
 * Version bump script for Exodra monorepo
 * Updates version in all package.json files
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const bumpType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node version-bump.js <patch|minor|major>');
  process.exit(1);
}

async function updateVersion(packagePath, newVersion) {
  const packageJsonPath = path.join(packagePath, 'package.json');
  
  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(content);
    
    const oldVersion = packageJson.version;
    packageJson.version = newVersion;
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    
    console.log(`📦 ${packageJson.name}: ${oldVersion} → ${newVersion}`);
    
  } catch (error) {
    console.error(`❌ Failed to update ${packagePath}:`, error.message);
  }
}

function incrementVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error('Invalid bump type');
  }
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  
  // Get current version from root package.json
  const rootPackageJson = JSON.parse(
    await fs.readFile(path.join(rootDir, 'package.json'), 'utf-8')
  );
  
  const currentVersion = rootPackageJson.version;
  const newVersion = incrementVersion(currentVersion, bumpType);
  
  console.log(`🚀 Bumping version: ${currentVersion} → ${newVersion} (${bumpType})`);
  console.log('');
  
  // Update root package.json
  await updateVersion(rootDir, newVersion);
  
  // Find all packages
  const packagesDir = path.join(rootDir, 'packages');
  const packages = await fs.readdir(packagesDir);
  
  // Update all package.json files
  for (const packageName of packages) {
    const packagePath = path.join(packagesDir, packageName);
    const stat = await fs.stat(packagePath);
    
    if (stat.isDirectory()) {
      const packageJsonPath = path.join(packagePath, 'package.json');
      
      try {
        await fs.access(packageJsonPath);
        await updateVersion(packagePath, newVersion);
      } catch {
        // No package.json in this directory
      }
    }
  }
  
  console.log('');
  console.log('✅ Version bump complete!');
  console.log('');
  console.log('Next steps:');
  console.log(`  git add .`);
  console.log(`  git commit -m "chore: bump version to ${newVersion}"`);
  console.log(`  git tag v${newVersion}`);
  console.log(`  npm run publish:all`);
}

main().catch(console.error);