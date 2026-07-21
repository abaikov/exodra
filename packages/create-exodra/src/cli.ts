#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import fs from 'fs-extra';
import {
  generateComponentFile,
  generatePageFile,
  generateApiFile,
} from './generators';

const program = new Command();

program
  .name('exodra')
  .description('Exodra CLI for scaffolding')
  .version('0.1.0');

program
  .command('component <name>')
  .alias('c')
  .description('Create a new component')
  .option('-d, --dir <path>', 'Directory to create component in', 'src/components')
  .option('-t, --typescript', 'Use TypeScript')
  .option('--naming <style>', 'Naming convention (PascalCase, kebab-case, snake_case)', 'PascalCase')
  .action(async (name, options) => {
    const config = await loadConfig();
    const naming = options.naming || config?.naming?.components || 'PascalCase';
    const ext = options.typescript ? 'tsx' : 'jsx';
    
    const componentDir = path.join(process.cwd(), options.dir);
    await fs.ensureDir(componentDir);
    
    const fileName = formatFileName(name, config?.naming?.files || 'PascalCase');
    const filePath = path.join(componentDir, `${fileName}.${ext}`);
    
    if (await fs.pathExists(filePath)) {
      console.error(chalk.red(`Component ${name} already exists!`));
      process.exit(1);
    }
    
    const componentName = formatComponentName(name, naming);
    const content = generateComponentFile(componentName, name.toLowerCase());
    await fs.writeFile(filePath, content);
    
    console.log(chalk.green(`✅ Component ${chalk.bold(name)} created at ${chalk.dim(filePath)}`));
  });

program
  .command('page <name>')
  .alias('p')
  .description('Create a new page')
  .option('-d, --dir <path>', 'Directory to create page in', 'src/pages')
  .option('-t, --typescript', 'Use TypeScript')
  .option('--naming <style>', 'Naming convention', 'PascalCase')
  .action(async (name, options) => {
    const config = await loadConfig();
    const naming = options.naming || config?.naming?.pages || 'PascalCase';
    const ext = options.typescript ? 'tsx' : 'jsx';
    
    const pageDir = path.join(process.cwd(), options.dir);
    await fs.ensureDir(pageDir);
    
    const fileName = formatFileName(name, config?.naming?.files || 'PascalCase');
    const filePath = path.join(pageDir, `${fileName}.${ext}`);
    
    if (await fs.pathExists(filePath)) {
      console.error(chalk.red(`Page ${name} already exists!`));
      process.exit(1);
    }
    
    const pageName = formatComponentName(name, naming);
    const content = generatePageFile(pageName);
    await fs.writeFile(filePath, content);

    // Update router if exists
    await updateRouter(name, `./pages/${fileName}`);
    
    console.log(chalk.green(`✅ Page ${chalk.bold(name)} created at ${chalk.dim(filePath)}`));
  });

program
  .command('api <name>')
  .alias('a')
  .description('Create a new API route')
  .option('-d, --dir <path>', 'Directory to create API route in', 'src/api')
  .option('-t, --typescript', 'Use TypeScript')
  .action(async (name, options) => {
    const ext = options.typescript ? 'ts' : 'js';
    const apiDir = path.join(process.cwd(), options.dir);
    await fs.ensureDir(apiDir);
    
    const filePath = path.join(apiDir, `${name}.${ext}`);
    
    if (await fs.pathExists(filePath)) {
      console.error(chalk.red(`API route ${name} already exists!`));
      process.exit(1);
    }
    
    const content = generateApiFile(name);
    await fs.writeFile(filePath, content);
    
    console.log(chalk.green(`✅ API route ${chalk.bold(name)} created at ${chalk.dim(filePath)}`));
  });

program
  .command('config')
  .description('Initialize Exodra configuration')
  .action(async () => {
    const configPath = path.join(process.cwd(), 'exodra.config.js');
    
    if (await fs.pathExists(configPath)) {
      const { overwrite } = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: 'Config file already exists. Overwrite?',
        initial: false
      });
      
      if (!overwrite) {
        process.exit(0);
      }
    }
    
    const config = await prompts([
      {
        type: 'select',
        name: 'componentNaming',
        message: 'Component naming convention',
        choices: [
          { title: 'PascalCase', value: 'PascalCase' },
          { title: 'kebab-case', value: 'kebab-case' },
          { title: 'snake_case', value: 'snake_case' }
        ],
        initial: 0
      },
      {
        type: 'select',
        name: 'fileNaming',
        message: 'File naming convention',
        choices: [
          { title: 'PascalCase.tsx', value: 'PascalCase' },
          { title: 'kebab-case.tsx', value: 'kebab-case' },
          { title: 'snake_case.tsx', value: 'snake_case' }
        ],
        initial: 0
      },
      {
        type: 'select',
        name: 'styling',
        message: 'Preferred styling solution',
        choices: [
          { title: 'Tailwind CSS', value: 'tailwind' },
          { title: 'CSS Modules', value: 'css-modules' },
          { title: 'Styled Components', value: 'styled-components' },
          { title: 'Plain CSS', value: 'none' }
        ],
        initial: 0
      }
    ]);
    
    const configContent = `export default {
  naming: {
    components: '${config.componentNaming}',
    pages: '${config.componentNaming}',
    utils: 'camelCase',
    files: '${config.fileNaming}'
  },
  styling: '${config.styling}',
  features: {
    router: true,
    ssr: false,
    i18n: false,
    pwa: false,
    testing: false
  }
};
`;
    
    await fs.writeFile(configPath, configContent);
    console.log(chalk.green('✅ Configuration file created!'));
  });

async function loadConfig() {
  const configPath = path.join(process.cwd(), 'exodra.config.js');
  if (await fs.pathExists(configPath)) {
    try {
      return (await import(configPath)).default;
    } catch (e) {
      return null;
    }
  }
  return null;
}

async function updateRouter(pageName: string, pagePath: string) {
  const routerFiles = [
    'src/main.ts',
    'src/main.tsx', 
    'src/main.js',
    'src/main.jsx',
    'src/router.ts',
    'src/router.tsx',
    'src/router.js',
    'src/router.jsx'
  ];
  
  for (const file of routerFiles) {
    const filePath = path.join(process.cwd(), file);
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8');
      
      // Check if router exists
      if (content.includes('createRouter')) {
        // Add import
        const importStatement = `import ${pageName}Page from '${pagePath}';`;
        const lastImport = content.lastIndexOf('import ');
        const insertPos = content.indexOf('\n', lastImport) + 1;
        content = content.slice(0, insertPos) + importStatement + '\n' + content.slice(insertPos);
        
        // Add route
        const routeEntry = `  { path: '/${pageName.toLowerCase()}', component: ${pageName}Page },`;
        const routesPos = content.indexOf('createRouter([');
        if (routesPos !== -1) {
          const arrayStart = content.indexOf('[', routesPos) + 1;
          content = content.slice(0, arrayStart) + '\n' + routeEntry + content.slice(arrayStart);
        }
        
        await fs.writeFile(filePath, content);
        console.log(chalk.gray(`  Updated router with new page`));
        break;
      }
    }
  }
}

function formatComponentName(name: string, format: string): string {
  switch (format) {
    case 'PascalCase':
      return name.split(/[-_]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
    
    case 'kebab-case':
      return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    
    case 'snake_case':
      return name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    
    default:
      return name;
  }
}

function formatFileName(name: string, format: string): string {
  switch (format) {
    case 'PascalCase':
      return name.split(/[-_]/).map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('');
    
    case 'kebab-case':
      return name
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
    
    case 'snake_case':
      return name
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toLowerCase();
    
    default:
      return name;
  }
}

program.parse();