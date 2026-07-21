#!/usr/bin/env node
/**
 * Auto-generate API documentation from TypeScript source files
 * Creates markdown documentation for Docusaurus
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Project, SourceFile } from 'ts-morph';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');
const docsRoot = path.join(projectRoot, 'docs', 'docs');

/**
 * Generate API documentation for all packages
 */
async function generateAPIDocs() {
  console.log('🔨 Generating API documentation from TypeScript source...\n');

  // Initialize TypeScript project
  const project = new Project({
    tsConfigFilePath: path.join(projectRoot, 'tsconfig.json'),
  });

  // Find all packages
  const packagesDir = path.join(projectRoot, 'packages');
  const packages = await fs.readdir(packagesDir);

  for (const packageName of packages) {
    const packagePath = path.join(packagesDir, packageName);
    const packageStat = await fs.stat(packagePath);
    
    if (!packageStat.isDirectory()) continue;

    console.log(`📦 Processing package: ${packageName}`);
    
    try {
      await generatePackageAPIDocs(project, packageName, packagePath);
    } catch (error) {
      console.error(`❌ Failed to generate docs for ${packageName}:`, error.message);
    }
  }

  // Generate LLM context files
  await generateLLMContextFiles();
  
  console.log('\n✅ API documentation generated successfully!');
}

/**
 * Generate API docs for a single package
 */
async function generatePackageAPIDocs(project, packageName, packagePath) {
  const srcPath = path.join(packagePath, 'src');
  
  try {
    await fs.access(srcPath);
  } catch {
    console.log(`⏭️  No src directory found for ${packageName}`);
    return;
  }

  // Find main entry point
  const entryPoints = ['index.ts', 'index.tsx'];
  let entryFile = null;
  
  for (const entry of entryPoints) {
    const entryPath = path.join(srcPath, entry);
    try {
      await fs.access(entryPath);
      entryFile = project.addSourceFileAtPath(entryPath);
      break;
    } catch {
      // Continue to next entry point
    }
  }

  if (!entryFile) {
    console.log(`⏭️  No entry point found for ${packageName}`);
    return;
  }

  // Extract exports and documentation
  const apiDoc = extractAPIFromFile(entryFile, packageName);
  
  // Write API documentation
  const docsDir = path.join(docsRoot, 'api');
  await fs.mkdir(docsDir, { recursive: true });
  
  const docPath = path.join(docsDir, `${packageName}.md`);
  await fs.writeFile(docPath, apiDoc);
  
  console.log(`  ✅ Generated: docs/api/${packageName}.md`);
}

/**
 * Extract API documentation from TypeScript source file
 */
function extractAPIFromFile(sourceFile, packageName) {
  const exports = sourceFile.getExportDeclarations();
  const namedExports = sourceFile.getExportedDeclarations();
  
  let markdown = `# @exodra/${packageName} API

Auto-generated API documentation.

## Installation

\`\`\`bash
npm install @exodra/${packageName}
\`\`\`

## Usage

\`\`\`typescript
import { /* exports */ } from '@exodra/${packageName}';
\`\`\`

## API Reference

`;

  // Document exported interfaces
  for (const [name, declarations] of namedExports) {
    for (const declaration of declarations) {
      const kind = declaration.getKind();
      
      if (kind === 'InterfaceDeclaration') {
        const interfaceDecl = declaration;
        markdown += `### ${name}\n\n`;
        
        // Get JSDoc comment
        const jsDocs = interfaceDecl.getJsDocs();
        if (jsDocs.length > 0) {
          markdown += `${jsDocs[0].getDescription()}\n\n`;
        }
        
        markdown += `\`\`\`typescript\n`;
        markdown += `interface ${name} {\n`;
        
        // Document properties
        const properties = interfaceDecl.getProperties();
        for (const prop of properties) {
          const propName = prop.getName();
          const propType = prop.getType().getText();
          const isOptional = prop.hasQuestionToken() ? '?' : '';
          markdown += `  ${propName}${isOptional}: ${propType};\n`;
        }
        
        markdown += `}\n\`\`\`\n\n`;
      }
      
      if (kind === 'ClassDeclaration') {
        const classDecl = declaration;
        markdown += `### ${name}\n\n`;
        
        // Get JSDoc comment
        const jsDocs = classDecl.getJsDocs();
        if (jsDocs.length > 0) {
          markdown += `${jsDocs[0].getDescription()}\n\n`;
        }
        
        markdown += `\`\`\`typescript\n`;
        markdown += `class ${name} {\n`;
        
        // Document public methods
        const methods = classDecl.getMethods().filter(m => m.hasModifier('public') || !m.getModifiers().length);
        for (const method of methods) {
          const methodName = method.getName();
          const params = method.getParameters().map(p => 
            `${p.getName()}: ${p.getType().getText()}`
          ).join(', ');
          const returnType = method.getReturnType().getText();
          markdown += `  ${methodName}(${params}): ${returnType};\n`;
        }
        
        markdown += `}\n\`\`\`\n\n`;
      }
      
      if (kind === 'FunctionDeclaration') {
        const funcDecl = declaration;
        markdown += `### ${name}()\n\n`;
        
        // Get JSDoc comment
        const jsDocs = funcDecl.getJsDocs();
        if (jsDocs.length > 0) {
          markdown += `${jsDocs[0].getDescription()}\n\n`;
        }
        
        const params = funcDecl.getParameters().map(p => 
          `${p.getName()}: ${p.getType().getText()}`
        ).join(', ');
        const returnType = funcDecl.getReturnType().getText();
        
        markdown += `\`\`\`typescript\n`;
        markdown += `function ${name}(${params}): ${returnType}\n`;
        markdown += `\`\`\`\n\n`;
      }
    }
  }

  // Add examples section
  markdown += `## Examples

See the [examples directory](../examples/${packageName}) for usage examples.

## Related

- [Getting Started Guide](../getting-started)
- [Full API Reference](../api)
`;

  return markdown;
}

/**
 * Generate LLM context files for AI tools
 */
async function generateLLMContextFiles() {
  console.log('🤖 Generating LLM context files...');

  // Copy main LLM context to docs
  const mainContextPath = path.join(projectRoot, 'EXODRA_LLM_CONTEXT.md');
  const docsContextPath = path.join(docsRoot, 'ai-integration', 'llm-context.md');
  
  try {
    const contextContent = await fs.readFile(mainContextPath, 'utf-8');
    
    // Add frontmatter for Docusaurus
    const docusaurusContent = `---
title: LLM Context File
description: Universal context file for AI tools
sidebar_position: 1
---

${contextContent}`;

    await fs.mkdir(path.dirname(docsContextPath), { recursive: true });
    await fs.writeFile(docsContextPath, docusaurusContent);
    
    console.log('  ✅ Generated: docs/ai-integration/llm-context.md');
  } catch (error) {
    console.warn('⚠️  Could not copy LLM context file:', error.message);
  }

  // Generate AI setup guide
  const aiSetupContent = `---
title: AI Tool Setup
description: How to connect any AI tool to your Exodra project
sidebar_position: 2
---

# AI Tool Setup

## Zero-Configuration Setup

The easiest way to get any AI tool working with your Exodra project:

\`\`\`bash
# One command setup for all AI tools
npx @exodra/introspect setup

# Files created:
# ✅ .cursor-tools.js (Cursor/Claude)
# ✅ exo.config.js (Configuration)  
# ✅ EXODRA_LLM_CONTEXT.md (Universal AI context)
\`\`\`

## Supported AI Tools

### Cursor with Claude
- **Setup**: \`npx @exodra/introspect setup-cursor\`
- **Usage**: Ask Claude to "Analyze my Exodra app"
- **Features**: Full project context, real-time analysis

### GitHub Copilot
- **Setup**: Automatic when VS Code extension is installed
- **Usage**: Code suggestions with Exodra patterns
- **Features**: Context-aware completions

### OpenAI GPT-4
- **Setup**: Set \`OPENAI_API_KEY\` environment variable
- **Usage**: \`npx @exodra/introspect analyze --ai\`
- **Features**: Advanced analysis and insights

### Anthropic Claude
- **Setup**: Set \`ANTHROPIC_API_KEY\` environment variable  
- **Usage**: API integration for analysis
- **Features**: Security and best practices focus

### Custom AI Tools
Any AI tool can read the \`EXODRA_LLM_CONTEXT.md\` file to understand your project.

## Manual Integration

### For Cursor/Claude Code

1. Run setup: \`npx @exodra/introspect setup-cursor\`
2. Restart Cursor
3. Ask Claude: "Analyze my Exodra project"

### For Other AI Tools

1. Point your AI tool to read \`EXODRA_LLM_CONTEXT.md\`
2. The file contains complete project context
3. AI can now understand Exodra patterns and provide relevant assistance

## What AI Tools Can Do

- **Code Analysis**: Find performance issues, security vulnerabilities
- **Optimization**: Suggest improvements for components and schemas
- **Best Practices**: Ensure code follows Exodra patterns
- **Debugging**: Help diagnose issues with detailed context
- **Documentation**: Generate explanations and documentation

## Examples

### Cursor/Claude Conversation

**You**: "Analyze my Exodra app for performance issues"

**Claude**: "I've analyzed your Exodra application and found several optimization opportunities:

📊 **Performance Issues Found:**
- ProductTable: 1,200 rows need virtualization (150ms render time)
- UserForm: Missing validation schema causing re-renders

💡 **Recommendations:**
1. Enable virtualization: \`<DataTable virtualizeRows={true} />\`
2. Add form validation schema for better performance
3. Implement lazy loading for admin routes

Would you like me to implement these fixes?"

### CLI Analysis

\`\`\`bash
# AI-powered analysis
npx @exodra/introspect analyze --ai

# 🔍 Analysis Results:
# ⚠️  Performance: 3 components need optimization
# ✅ Security: All routes properly guarded  
# 💡 Suggestions: 5 improvement opportunities
\`\`\`

## Configuration

### Environment Variables

\`\`\`bash
# Optional - enables advanced AI features
export OPENAI_API_KEY="your-openai-key"
export ANTHROPIC_API_KEY="your-anthropic-key"
\`\`\`

### Project Configuration

The \`exo.config.js\` file is automatically created with optimal AI integration settings:

\`\`\`javascript
export default {
  introspect: {
    ai: {
      autoDetect: true,
      providers: ['openai', 'anthropic'],
      context: {
        includePluginAnalysis: true,
        maxContextSize: '100KB'
      }
    }
  }
};
\`\`\`

## Troubleshooting

### AI Not Working

1. **Check Setup**: Run \`npx @exodra/introspect setup\`
2. **Verify Files**: Ensure \`.cursor-tools.js\` and \`EXODRA_LLM_CONTEXT.md\` exist
3. **Restart IDE**: Restart Cursor or VS Code
4. **Test Connection**: Run \`npx @exodra/introspect ai test\`

### Performance Issues

- Large projects may take longer for AI analysis
- Use \`--focus\` flag to analyze specific areas
- Enable caching in \`exo.config.js\`

### API Key Issues

- Verify API keys are correct and have sufficient credits
- Check network connectivity
- Use fallback providers

The AI integration is designed to work with minimal configuration while providing maximum insight into your Exodra applications.
`;

  const aiSetupPath = path.join(docsRoot, 'ai-integration', 'setup.md');
  await fs.writeFile(aiSetupPath, aiSetupContent);
  console.log('  ✅ Generated: docs/ai-integration/setup.md');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAPIDocs().catch(console.error);
}

export { generateAPIDocs };