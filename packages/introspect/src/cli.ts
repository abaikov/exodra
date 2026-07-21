#!/usr/bin/env node

/**
 * CLI interface for @exodra/introspect
 */

import { Command } from 'commander';
import { ComponentTreeNode } from './browser-explorer.js';
import type { ExoComponentDefinition, ExoMetric } from './types.js';
// Import actual analysis types that are returned
import type { ComponentInfo, ComponentPattern } from './components.js';
import type { PerformanceHotspot, OptimizationOpportunity } from './performance.js';
import type { ExoBundleSplit } from './router.js';
import chalk from 'chalk';
import ora from 'ora';
import { introspect as exoIntrospect, quickIntrospect, formatResults } from './introspect.js';
import { createCursorIntegration } from './integrations/cursor.js';
import { autoSetup, interactiveSetup } from './auto-setup.js';
import { universalAI } from './ai-providers.js';

const program = new Command();

program
  .name('@exodra/introspect')
  .description('AI-powered introspection and developer tooling for Exodra applications')
  .version('0.1.0');

// Quick check command
program
  .command('quick-check')
  .description('Quick health check of the project')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const spinner = ora('Performing quick health check...').start();
    
    try {
      const result = await quickIntrospect(options.path);
      spinner.succeed('Health check completed');
      
      console.log('\\n' + chalk.bold('🏥 Project Health Check'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const healthColor = {
        excellent: chalk.green,
        good: chalk.blue,
        'needs-attention': chalk.yellow,
        critical: chalk.red
      }[result.health];
      
      console.log(`Status: ${healthColor(result.health.toUpperCase())}`);
      console.log(`Summary: ${result.summary}`);
      
      if (result.topIssues.length > 0) {
        console.log('\\n' + chalk.yellow('⚠️  Top Issues:'));
        result.topIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });
      }
      
      if (result.suggestions.length > 0) {
        console.log('\\n' + chalk.blue('💡 Quick Wins:'));
        result.suggestions.forEach((suggestion, i) => {
          console.log(`  ${i + 1}. ${suggestion}`);
        });
      }
      
    } catch (error) {
      spinner.fail('Health check failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Full analyze command
program
  .command('analyze')
  .description('Perform comprehensive project analysis')
  .option('-p, --path <path>', 'Project path', '.')
  .option('--ai', 'Enable AI-enhanced analysis')
  .option('--provider <provider>', 'AI provider (openai, anthropic, local)', 'openai')
  .option('--model <model>', 'AI model to use')
  .option('--api-key <key>', 'AI API key')
  .option('-f, --format <format>', 'Output format (json, markdown, html)', 'markdown')
  .option('-o, --output <file>', 'Output file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (options) => {
    const spinner = ora('Analyzing project...').start();
    
    try {
      const analysisOptions = {
        projectRoot: options.path,
        scope: 'project' as const,
        enableAI: options.ai,
        verbose: options.verbose,
        analysis: {
          schema: true,
          components: true,
          performance: true,
          ai: options.ai
        },
        ...(options.ai && {
          aiConfig: {
            provider: options.provider,
            ...(options.model && { model: options.model }),
            ...(options.apiKey && { apiKey: options.apiKey })
          }
        })
      };
      
      const result = await exoIntrospect(analysisOptions);
      spinner.succeed('Analysis completed');
      
      const formatted = formatResults(result, options.format);
      
      if (options.output) {
        const fs = await import('fs/promises');
        await fs.writeFile(options.output, formatted);
        console.log(chalk.green(`Results saved to ${options.output}`));
      } else {
        console.log('\\n' + formatted);
      }
      
      // Summary stats
      const { errors, warnings, suggestions } = result.analysis.summary;
      console.log('\\n' + chalk.bold('📊 Analysis Summary'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Files analyzed: ${result.performance.filesAnalyzed}`);
      console.log(`Analysis time: ${result.performance.analysisTime}ms`);
      
      if (errors > 0) console.log(`Errors: ${chalk.red(errors.toString())}`);
      if (warnings > 0) console.log(`Warnings: ${chalk.yellow(warnings.toString())}`);
      if (suggestions > 0) console.log(`Suggestions: ${chalk.blue(suggestions.toString())}`);
      
    } catch (error) {
      spinner.fail('Analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Setup Cursor integration
program
  .command('setup-cursor')
  .description('Setup Cursor (Claude Code) integration')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const spinner = ora('Setting up Cursor integration...').start();
    
    try {
      createCursorIntegration();
      await import('./integrations/cursor.js').then(m => m.setupCursorIntegration());
      
      // Generate .cursor-tools.js
      const cursorToolsContent = `// Auto-generated Cursor integration for @exodra/introspect
import { setupCursorIntegration } from '@exodra/introspect/integrations/cursor';

export const tools = [
  (await setupCursorIntegration()).tool
];

// Usage examples:
// "Analyze my Exodra project for performance issues"
// "Check the health of my codebase"  
// "Find components that need optimization"
// "Review my schemas for best practices"
`;

      const fs = await import('fs/promises');
      const path = await import('path');
      
      const toolsPath = path.join(options.path, '.cursor-tools.js');
      await fs.writeFile(toolsPath, cursorToolsContent);
      
      spinner.succeed('Cursor integration setup completed');
      
      console.log('\\n' + chalk.bold('🎯 Cursor Integration Ready!'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`Created: ${chalk.blue('.cursor-tools.js')}`);
      console.log('\\nNow you can ask Claude to:');
      console.log('  • "Check my project health"');
      console.log('  • "Analyze components for optimization"'); 
      console.log('  • "Find performance bottlenecks"');
      console.log('  • "Review schemas and suggest improvements"');
      console.log('\\n' + chalk.gray('Restart Cursor IDE to enable the integration'));
      
    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Component analysis
program
  .command('components')
  .description('Analyze components for patterns and optimization opportunities')
  .option('-p, --path <path>', 'Project path', '.')
  .option('-f, --format <format>', 'Output format (json, table)', 'table')
  .action(async (options) => {
    const spinner = ora('Analyzing components...').start();
    
    try {
      const { ComponentAnalyzer } = await import('./components.js');
      const analyzer = new ComponentAnalyzer();
      const analysis = await analyzer.analyzeComponents(options.path);
      
      spinner.succeed('Component analysis completed');
      
      if (options.format === 'json') {
        console.log(JSON.stringify(analysis, null, 2));
        return;
      }
      
      console.log('\\n' + chalk.bold('🧩 Component Analysis'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log(`Total components: ${analysis.components.length}`);
      
      const complexComponents = analysis.components.filter((c: ComponentInfo) => 
        c.complexity.cyclomaticComplexity > 10
      );
      
      if (complexComponents.length > 0) {
        console.log('\\n' + chalk.yellow('⚠️  Complex Components:'));
        complexComponents.forEach((comp: ExoComponentDefinition) => {
          console.log(`  • ${comp.name} (complexity: ${comp.complexity.cyclomaticComplexity})`);
        });
      }
      
      if (analysis.optimization && analysis.optimization.opportunities && analysis.optimization.opportunities.length > 0) {
        console.log('\\n' + chalk.blue('💡 Optimization Opportunities:'));
        analysis.optimization.opportunities.slice(0, 5).forEach((opp) => {
          console.log(`  • ${opp.description} (${opp.impact} impact, ${opp.effort} effort)`);
        });
      }
      
      if (analysis.patterns.length > 0) {
        console.log('\\n' + chalk.green('📐 Detected Patterns:'));
        analysis.patterns.forEach((pattern: ComponentPattern) => {
          console.log(`  📐 ${pattern.name} (${pattern.occurrences} occurrences)`);
          if (pattern.benefits.length > 0) {
            console.log(`    ✅ ${pattern.benefits[0]}`);
          }
        });
      }
      
    } catch (error) {
      spinner.fail('Component analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Performance analysis
program
  .command('performance')
  .description('Analyze performance hotspots and bottlenecks')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const spinner = ora('Analyzing performance...').start();
    
    try {
      const { PerformanceAnalyzer } = await import('./performance.js');
      const analyzer = new PerformanceAnalyzer();
      const report = await analyzer.analyzePerformance(options.path);
      
      spinner.succeed('Performance analysis completed');
      
      console.log('\\n' + chalk.bold('⚡ Performance Analysis'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      const criticalHotspots = report.hotspots.filter(h => h.severity === 'critical');
      const highHotspots = report.hotspots.filter(h => h.severity === 'high');
      
      if (criticalHotspots.length > 0) {
        console.log('\\n' + chalk.red('🚨 Critical Hotspots:'));
        criticalHotspots.forEach((hotspot: PerformanceHotspot) => {
          console.log(`  • ${hotspot.description}`);
          console.log(`    Location: ${hotspot.location?.file || 'unknown'}:${hotspot.location?.line || 0}`);
          console.log(`    Impact: renderTime ${hotspot.impact.renderTime || 0}ms, memory ${hotspot.impact.memoryUsage || 0}KB`);
        });
      }
      
      if (highHotspots.length > 0) {
        console.log('\\n' + chalk.yellow('⚠️  High Priority Issues:'));
        highHotspots.slice(0, 3).forEach((hotspot: PerformanceHotspot) => {
          console.log(`  • ${hotspot.description}`);
          console.log(`    ${hotspot.location.file}:${hotspot.location.line}`);
        });
      }
      
      const highImpactOptimizations = report.optimization.opportunities
        .filter(o => o.priority === 'high');
      
      if (highImpactOptimizations.length > 0) {
        console.log('\\n' + chalk.blue('🎯 High Impact Optimizations:'));
        highImpactOptimizations.slice(0, 3).forEach((opp: OptimizationOpportunity) => {
          console.log(`  • ${opp.title}`);
          console.log(`    ${opp.description}`);
          console.log(`    Estimated implementation effort: ${opp.implementation.estimatedTime} hours`);
        });
      }
      
      console.log('\\n' + chalk.bold('📊 Benchmarks:'));
      report.benchmarks.forEach(benchmark => {
        const statusIcon = {
          excellent: '🟢',
          good: '🔵', 
          'needs-improvement': '🟡',
          critical: '🔴'
        }[benchmark.status];
        
        console.log(`  ${statusIcon} ${benchmark.name}: ${benchmark.value} ${benchmark.unit}`);
      });
      
    } catch (error) {
      spinner.fail('Performance analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Schema analysis
program
  .command('schemas')
  .description('Analyze schema definitions and relationships')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const spinner = ora('Analyzing schemas...').start();
    
    try {
      const { SchemaAnalyzer } = await import('./schema.js');
      const analyzer = new SchemaAnalyzer();
      const analysis = await analyzer.analyzeProject(options.path);
      
      spinner.succeed('Schema analysis completed');
      
      console.log('\\n' + chalk.bold('📋 Schema Analysis'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log(`Total schemas: ${analysis.schemas.length}`);
      console.log(`Coverage: ${analysis.coverage.coveragePercentage}%`);
      
      const unvalidatedSchemas = analysis.schemas.filter((s: { validation: { hasValidation: boolean } }) => !s.validation.hasValidation);
      if (unvalidatedSchemas.length > 0) {
        console.log('\\n' + chalk.yellow('⚠️  Schemas without validation:'));
        unvalidatedSchemas.forEach((schema) => {
          console.log(`  • ${schema.name}`);
        });
      }
      
      if (analysis.relationships.length > 0) {
        console.log('\\n' + chalk.blue('🔗 Schema Relationships:'));
        analysis.relationships.slice(0, 5).forEach(rel => {
          console.log(`  • ${rel.from} ${rel.type} ${rel.to}`);
        });
      }
      
      const suggestions = analysis.suggestions.filter(s => s.impact === 'high');
      if (suggestions.length > 0) {
        console.log('\\n' + chalk.green('💡 Recommendations:'));
        suggestions.slice(0, 3).forEach(suggestion => {
          console.log(`  • ${suggestion.title}`);
        });
      }
      
    } catch (error) {
      spinner.fail('Schema analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Router analysis
program
  .command('routes')
  .description('Analyze application routes and navigation structure')
  .option('-p, --path <path>', 'Project path', '.')
  .action(async (options) => {
    const spinner = ora('Analyzing routes...').start();
    
    try {
      const { ExoRouterAnalyzer } = await import('./router.js');
      const analyzer = new ExoRouterAnalyzer();
      const analysis = await analyzer.analyzeRouter(options.path);
      
      spinner.succeed('Router analysis completed');
      
      console.log('\\n' + chalk.bold('🧭 Router Analysis'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log(`Total routes: ${analysis.structure.totalRoutes}`);
      console.log(`Nesting levels: ${analysis.structure.nestedLevels}`);
      console.log(`Public routes: ${analysis.structure.publicRoutes}`);
      console.log(`Protected routes: ${analysis.structure.protectedRoutes}`);
      
      if (analysis.structure.dynamicRoutes > 0) {
        console.log(`Dynamic routes: ${analysis.structure.dynamicRoutes}`);
      }
      
      const criticalRoutes = analysis.routes.filter(r => 
        r.guards.length === 0 && r.metadata.tags.includes('sensitive')
      );
      
      if (criticalRoutes.length > 0) {
        console.log('\\n' + chalk.red('🚨 Unprotected Sensitive Routes:'));
        criticalRoutes.forEach(route => {
          console.log(`  • ${route.path} → ${route.component}`);
        });
      }
      
      const lazyRoutes = analysis.routes.filter(r => r.lazy);
      if (lazyRoutes.length > 0) {
        console.log('\\n' + chalk.green('⚡ Lazy-loaded Routes:'));
        lazyRoutes.forEach(route => {
          console.log(`  • ${route.path} → ${route.component}`);
        });
      }
      
      const highUsageRoutes = analysis.routes
        .filter(r => r.usage.frequency > 1000)
        .sort((a, b) => b.usage.frequency - a.usage.frequency);
      
      if (highUsageRoutes.length > 0) {
        console.log('\\n' + chalk.blue('📈 High Traffic Routes:'));
        highUsageRoutes.slice(0, 5).forEach(route => {
          console.log(`  • ${route.path} (${route.usage.frequency} visits/day)`);
        });
      }
      
      if (analysis.guards.length > 0) {
        console.log('\\n' + chalk.cyan('🔒 Route Guards:'));
        analysis.guards.forEach(guard => {
          console.log(`  • ${guard.name} (${guard.type}) - ${guard.routes.length} routes`);
        });
      }
      
      console.log(`\\n🎯 Accessibility Score: ${analysis.accessibility.score}/100`);
      
      if (analysis.accessibility.issues.length > 0) {
        console.log('\\n' + chalk.yellow('♿ Accessibility Issues:'));
        analysis.accessibility.issues.slice(0, 3).forEach(issue => {
          console.log(`  • ${issue.route}: ${issue.description}`);
        });
      }
      
      const highImpactOpts = (analysis.optimization?.bundleSplitting || [])
        .filter((opt: ExoBundleSplit) => opt.priority === 'high');
      
      if (highImpactOpts.length > 0) {
        console.log('\\n' + chalk.magenta('🚀 Optimization Opportunities:'));
        highImpactOpts.slice(0, 3).forEach((opt: ExoBundleSplit) => {
          console.log(`  • ${opt.recommendation}`);
        });
      }
      
    } catch (error) {
      spinner.fail('Router analysis failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// AI explain command
program
  .command('explain <file>')
  .description('Get AI explanation of code file')
  .option('--provider <provider>', 'AI provider', 'openai')
  .option('--api-key <key>', 'AI API key')
  .action(async (file, options) => {
    const spinner = ora('Generating explanation...').start();
    
    try {
      const fs = await import('fs/promises');
      const code = await fs.readFile(file, 'utf-8');
      
      const { AIAnalysisEngine } = await import('./ai.js');
      const aiEngine = new AIAnalysisEngine({
        provider: options.provider,
        apiKey: options.apiKey
      });
      
      const explanation = await aiEngine.explainCode(code, {
        purpose: 'code analysis',
        complexity: 'medium',
        dependencies: ['@exodra/core']
      });
      
      spinner.succeed('Explanation generated');
      
      console.log('\\n' + chalk.bold(`🤖 AI Explanation: ${file}`));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(explanation);
      
    } catch (error) {
      spinner.fail('Explanation failed');
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Check thresholds (for CI)
program
  .command('check-thresholds <file>')
  .description('Check analysis results against quality thresholds')
  .option('--max-errors <count>', 'Maximum allowed errors', '0')
  .option('--max-warnings <count>', 'Maximum allowed warnings', '10')
  .option('--min-score <score>', 'Minimum quality score', '70')
  .action(async (file, options) => {
    try {
      const fs = await import('fs/promises');
      const content = await fs.readFile(file, 'utf-8');
      const result = JSON.parse(content);
      
      const errors = result.analysis.summary.errors;
      const warnings = result.analysis.summary.warnings;
      
      let failed = false;
      
      if (errors > parseInt(options.maxErrors)) {
        console.log(chalk.red(`❌ Too many errors: ${errors} > ${options.maxErrors}`));
        failed = true;
      }
      
      if (warnings > parseInt(options.maxWarnings)) {
        console.log(chalk.yellow(`⚠️  Too many warnings: ${warnings} > ${options.maxWarnings}`));
        failed = true;
      }
      
      // Check quality score if available
      const qualityMetric = result.analysis.metrics.find((m: ExoMetric) => m.name === 'overall_quality_score');
      if (qualityMetric && qualityMetric.value < parseInt(options.minScore)) {
        console.log(chalk.red(`📉 Quality score too low: ${qualityMetric.value} < ${options.minScore}`));
        failed = true;
      }
      
      if (failed) {
        console.log('\\n' + chalk.red('❌ Quality gates failed'));
        process.exit(1);
      } else {
        console.log(chalk.green('✅ All quality gates passed'));
      }
      
    } catch (error) {
      console.error(chalk.red('Error checking thresholds:'), error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

// Auto-setup command (new universal setup)
program
  .command('setup')
  .description('Automatically setup AI integration (zero configuration)')
  .option('--interactive', 'Interactive setup with prompts')
  .option('--silent', 'Silent setup without output')
  .option('--project-root <path>', 'Project root directory')
  .action(async (options) => {
    const spinner = ora('Setting up Exodra AI ecosystem').start();
    
    try {
      if (options.interactive) {
        spinner.stop();
        await interactiveSetup();
      } else {
        await autoSetup({
          projectRoot: options.projectRoot,
          silent: options.silent
        });
        
        spinner.succeed('🎉 Complete AI ecosystem ready!');
        
        if (!options.silent) {
          console.log(chalk.green('\n✅ Files created:'));
          console.log('  • .cursor-tools.js (Cursor/Claude integration)');
          console.log('  • exo.config.js (Exodra configuration)');
          console.log('  • EXODRA_LLM_CONTEXT.md (Universal AI context)');
          console.log(chalk.blue('\n🤖 Any AI tool can now understand your project!'));
          console.log(chalk.yellow('💡 Try: "Analyze my Exodra app" in any AI assistant'));
        }
      }
    } catch (error) {
      spinner.fail('Setup failed');
      console.error(chalk.red((error as Error).message));
      process.exit(1);
    }
  });

// AI provider management
const aiCommand = program
  .command('ai')
  .description('Manage AI providers and connections');

aiCommand
  .command('providers')
  .description('List available AI providers')
  .action(async () => {
    const providers = universalAI.getProviders();
    
    console.log(chalk.blue('\n🤖 Available AI Providers:\n'));
    
    if (providers.length === 0) {
      console.log(chalk.yellow('  No AI providers configured'));
      console.log(chalk.blue('  Run: exo-introspect setup to configure'));
      return;
    }

    providers.forEach(provider => {
      console.log(`  ${chalk.green('✅')} ${chalk.bold(provider.name)}`);
      console.log(`      Capabilities: ${provider.capabilities.join(', ')}`);
      console.log(`      Status: ${provider.status}\n`);
    });
  });

aiCommand
  .command('test')
  .description('Test AI provider connection')
  .option('--provider <provider>', 'Test specific provider')
  .action(async (_options) => {
    const spinner = ora('Testing AI connection').start();

    try {
      // Test AI connection with minimal request
      await universalAI.analyze({
        projectRoot: process.cwd(),
        files: [],
        dependencies: {} as Record<string, string>,
        scope: 'project' as const,
        language: 'typescript' as const,
        exodraContext: {
          schemas: [],
          components: [],
          routes: [],
          plugins: []
        }
      });
      
      spinner.succeed('AI connection successful!');
      console.log(chalk.green('✅ AI provider is working correctly'));
      
    } catch (error) {
      spinner.fail('AI connection failed');
      console.error(chalk.red((error as Error).message));
      
      // Provide helpful suggestions
      console.log(chalk.yellow('\n💡 Try:'));
      console.log('  • Check your API keys (OPENAI_API_KEY, ANTHROPIC_API_KEY)');
      console.log('  • Run: exo-introspect setup');
      console.log('  • Check network connection');
    }
  });

// Plugin management
const pluginCommand = program
  .command('plugins')
  .description('Manage introspect plugins');

pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(async () => {
    console.log(chalk.blue('\n🔌 Installed Plugins:\n'));
    
    try {
      const { ExoPluginDiscovery } = await import('./plugins.js');
      new ExoPluginDiscovery();
      const plugins = await ExoPluginDiscovery.discoverPlugins(process.cwd());
      
      if (plugins.length === 0) {
        console.log(chalk.yellow('  No plugins found'));
        console.log(chalk.blue('  Install library plugins: npm install exodra-introspect-*'));
        return;
      }

      plugins.forEach((plugin: { name: string; version: string; description: string }) => {
        console.log(`  ${chalk.green('✅')} ${chalk.bold(plugin.name)}`);
        console.log(`      Version: ${plugin.version}`);
        console.log(`      Description: ${plugin.description}\n`);
      });
      
    } catch (error) {
      console.error(chalk.red('Failed to load plugins:'), (error as Error).message);
    }
  });

// Browser exploration command
program
  .command('explore')
  .description('Launch and explore your Exodra app with AI analysis')
  .option('--headless', 'Run browser in headless mode (default: true)')
  .option('--scenarios <list>', 'Comma-separated list of scenarios to run')
  .option('--url <url>', 'Custom base URL (default: http://localhost:3000)')
  .option('--ai', 'Include AI-powered analysis of findings')
  .action(async (options) => {
    const spinner = ora('Starting browser exploration...').start();
    
    try {
      const { ExodraBrowserExplorer } = await import('./browser-explorer.js');
      const explorer = new ExodraBrowserExplorer(process.cwd());

      spinner.text = 'Launching application and browser...';
      
      const results = await explorer.explore();
      
      spinner.succeed('Browser exploration completed!');
      
      // Display results
      console.log('\n' + chalk.bold('🔍 Browser Exploration Results'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      // Performance summary
      console.log('\n' + chalk.blue('⚡ Performance Metrics:'));
      console.log(`  Load Time: ${results.performance.loadTime}ms`);
      console.log(`  Render Time: ${results.performance.renderTime}ms`);
      console.log(`  Memory Usage: ${results.performance.memoryUsage}MB`);
      
      // Component analysis
      if (results.componentTree?.length > 0) {
        console.log('\n' + chalk.green('🧩 Components Found:'));
        results.componentTree.forEach((comp: ComponentTreeNode) => {
          console.log(`  • ${comp.type || 'Unnamed component'}`);
        });
      }
      
      // Issues found
      if (results.insights?.length > 0) {
        console.log('\n' + chalk.yellow('⚠️  Issues Detected:'));
        results.insights.forEach((insight: { severity: string; message: string }) => {
          const icon = insight.severity === 'error' ? '🔴' : 
                       insight.severity === 'warning' ? '🟡' : '🟢';
          console.log(`  ${icon} ${insight.message}`);
        });
      }
      
      // Show suggestions from insights
      const suggestionsInsights = results.insights?.filter((insight: { suggestion?: string }) => insight.suggestion);
      if (suggestionsInsights?.length > 0) {
        console.log('\n' + chalk.cyan('💡 Suggestions:'));
        suggestionsInsights.forEach((insight: { suggestion: string }) => {
          console.log(`  • ${insight.suggestion}`);
        });
      }
      
      // AI analysis if requested
      if (options.ai && results.insights.length > 0) {
        const aiSpinner = ora('Running AI analysis of findings...').start();
        
        try {
          const aiAnalysis = await universalAI.analyze({
            projectRoot: process.cwd(),
            scope: 'project',
            language: 'typescript',
            
            // Browser exploration data
            dependencies: {},
            focus: [
              { area: 'performance', priority: 'high' },
              { area: 'maintainability', priority: 'medium' }
            ],
            
            files: [],
            exodraContext: {
              schemas: [],
              components: results.componentTree || [],
              routes: [],
              plugins: []
            }
          });
          
          aiSpinner.succeed('AI analysis completed!');
          
          if (aiAnalysis.insights?.recommendations) {
            console.log('\n' + chalk.magenta('🤖 AI Insights:'));
            aiAnalysis.insights.recommendations.forEach(insight => {
              console.log(`  • ${insight}`);
            });
          }
          
        } catch (error) {
          aiSpinner.fail('AI analysis failed');
          console.log(chalk.gray('  (AI analysis requires configured provider)'));
        }
      }
      
      console.log('\n' + chalk.gray('Screenshots and detailed logs saved to ./exploration-results/'));
      
    } catch (error) {
      spinner.fail('Browser exploration failed');
      console.error(chalk.red('Error:'), (error as Error).message);
      
      if ((error as Error).message.includes('npm run dev')) {
        console.log(chalk.yellow('\n💡 Make sure your app has a "dev" script in package.json'));
      }
      
      process.exit(1);
    }
  });

// Handle no command - show helpful welcome
if (!process.argv.slice(2).length) {
  console.log(chalk.blue('🚀 Exodra Introspect - Universal AI Development Ecosystem\n'));
  console.log(chalk.green('🎯 Zero-Configuration Setup:'));
  console.log('  exo-introspect setup          # Complete AI integration');
  console.log('  exo-introspect setup-cursor   # Cursor/Claude only\n');
  console.log(chalk.blue('📊 Analysis & Insights:'));
  console.log('  exo-introspect analyze        # Static code analysis');
  console.log('  exo-introspect explore        # 🆕 Live browser exploration');
  console.log('  exo-introspect analyze --ai   # AI-powered insights\n');
  console.log(chalk.yellow('🤖 AI Integration:'));
  console.log('  exo-introspect ai providers   # List AI tools');
  console.log('  exo-introspect ai test        # Test connections\n');
  console.log(chalk.cyan('🔌 Plugin Ecosystem:'));
  console.log('  exo-introspect plugins list   # Show installed plugins\n');
  console.log(chalk.gray('For detailed help: exo-introspect --help'));
  // Showing the welcome screen is a successful, intentional default action.
  process.exit(0);
}

program.parse(process.argv);

export default program;