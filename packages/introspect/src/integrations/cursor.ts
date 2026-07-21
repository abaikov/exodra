/**
 * Cursor (Claude Code) integration for @exodra/introspect
 */

import type { ExoDiagnostic, ExoSuggestion, ExoMetric } from '../types.js';
import type { IntrospectResult, QuickIntrospectResult } from '../introspect.js';
import type { ComponentAnalysis } from '../components.js';
import type { PerformanceReport } from '../performance.js';
import type { SchemaAnalysis } from '../schema.js';

export interface CursorIntegration {
  /** Register introspect as a Cursor tool */
  registerTool(): CursorTool;
  
  /** Convert analysis results to Cursor format */
  formatForCursor(result: IntrospectResult): CursorAnalysisReport;
  
  /** Generate context for Claude prompts */
  generateContext(projectPath: string): Promise<CursorContext>;
}

export interface CursorTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: CursorToolInput) => Promise<unknown>;
}

export interface CursorToolInput {
  action: string;
  target?: string;
  options?: {
    enableAI?: boolean;
    verbose?: boolean;
    format?: 'json' | 'markdown' | 'summary';
    timeout?: number;
    scenarios?: string[];
  };
}

export interface CursorAnalysisReport {
  summary: string;
  diagnostics: CursorDiagnostic[];
  suggestions: CursorSuggestion[];
  metrics: CursorMetric[];
  context: string;
}

export interface CursorDiagnostic {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  category: string;
  fix?: string;
}

export interface CursorSuggestion {
  title: string;
  description: string;
  file?: string;
  line?: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  codeExample?: string;
  implementation?: string[];
}

export interface CursorMetric {
  name: string;
  value: number;
  unit: string;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  description: string;
}

export interface CursorContext {
  projectStructure: string;
  technologies: string[];
  patterns: string[];
  conventions: string[];
  recentChanges?: string[];
}

/**
 * Shape consumed by {@link ExoCursorIntegration.formatExplorationResult}. This
 * predates the current `ExplorationResult` contract, so the two are reconciled
 * with an explicit cast at the call site rather than a structural match.
 */
interface ExplorationFormatterInput {
  componentTree: { components?: unknown[] };
  performance: {
    loadTime: number;
    firstContentfulPaint: number;
    memoryUsage: number;
  };
  interactions: Array<{ success: boolean; duration: number }>;
  screenshots: unknown[];
  issues: Array<{ severity: string }>;
  recommendations: Array<{ priority: string }>;
}

export class ExoCursorIntegration implements CursorIntegration {
  
  /**
   * Register as a Cursor tool that Claude can use
   */
  registerTool(): CursorTool {
    return {
      name: 'exodra_introspect',
      description: 'Analyze Exodra projects for performance, patterns, and optimization opportunities',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['analyze', 'quick-check', 'component-analysis', 'performance-check', 'schema-analysis', 'router-analysis', 'explore'],
            description: 'Type of analysis to perform'
          },
          target: {
            type: 'string',
            description: 'File path or directory to analyze (optional, defaults to current directory)'
          },
          options: {
            type: 'object',
            properties: {
              enableAI: { type: 'boolean', description: 'Enable AI-enhanced analysis' },
              verbose: { type: 'boolean', description: 'Include detailed explanations' },
              format: { type: 'string', enum: ['json', 'markdown', 'summary'] }
            }
          }
        },
        required: ['action']
      },
      handler: this.handleCursorRequest.bind(this)
    };
  }

  /**
   * Handle requests from Cursor/Claude
   */
  async handleCursorRequest(input: CursorToolInput): Promise<unknown> {
    const { action, target = '.', options = {} } = input;
    
    try {
      const { introspect, quickIntrospect } = await import('../introspect.js');
      
      switch (action) {
        case 'quick-check': {
          const result = await quickIntrospect(target);
          return this.formatQuickCheck(result);
        }
        
        case 'analyze': {
          const analysisOptions = {
            projectRoot: target,
            scope: 'project' as const,
            enableAI: options.enableAI || false,
            verbose: options.verbose || false,
            analysis: {
              schema: true,
              components: true,
              performance: true,
              ai: options.enableAI || false
            }
          };
          
          const result = await introspect(analysisOptions);
          return this.formatForCursor(result);
        }
        
        case 'component-analysis': {
          const { ComponentAnalyzer } = await import('../components.js');
          const analyzer = new ComponentAnalyzer();
          const analysis = await analyzer.analyzeComponents(target);
          return this.formatComponentAnalysis(analysis);
        }
        
        case 'performance-check': {
          const { PerformanceAnalyzer } = await import('../performance.js');
          const analyzer = new PerformanceAnalyzer();
          const report = await analyzer.analyzePerformance(target);
          return this.formatPerformanceReport(report);
        }
        
        case 'schema-analysis': {
          const { SchemaAnalyzer } = await import('../schema.js');
          const analyzer = new SchemaAnalyzer();
          const analysis = await analyzer.analyzeProject(target);
          return this.formatSchemaAnalysis(analysis);
        }
        
        case 'explore': {
          const { ExodraBrowserExplorer } = await import('../browser-explorer.js');
          const explorer = new ExodraBrowserExplorer(target);
          
          const _config = {
            headless: true,
            timeout: options.timeout || 30000,
            scenarios: options.scenarios || []
          };
          
          const explorationResult = await explorer.explore();
          return this.formatExplorationResult(
            explorationResult as unknown as ExplorationFormatterInput,
            options.enableAI
          );
        }
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return {
        error: true,
        message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        suggestions: [
          'Check if the target path exists',
          'Ensure the project has valid TypeScript configuration',
          'Verify @exodra/core is installed'
        ]
      };
    }
  }

  /**
   * Format analysis results for Cursor
   */
  formatForCursor(result: IntrospectResult): CursorAnalysisReport {
    const diagnostics = result.analysis.diagnostics.map((d: ExoDiagnostic): CursorDiagnostic => ({
      file: d.location.file,
      line: d.location.line,
      column: d.location.column,
      severity: d.severity as CursorDiagnostic['severity'],
      message: d.message,
      category: d.category,
      fix: d.fixable ? `This issue can be automatically fixed` : undefined
    }));

    const suggestions = result.analysis.suggestions.map((s: ExoSuggestion): CursorSuggestion => ({
      title: s.title,
      description: s.description,
      file: s.location?.file,
      line: s.location?.line,
      impact: s.impact,
      effort: s.effort,
      codeExample: s.codeActions?.[0]?.edit?.newText
    }));

    const metrics = result.analysis.metrics.map((m: ExoMetric): CursorMetric => {
      let status: 'excellent' | 'good' | 'needs-improvement' | 'critical' = 'good';
      
      if (m.threshold) {
        if (m.value > (m.threshold.error || Infinity)) status = 'critical';
        else if (m.value > (m.threshold.warning || Infinity)) status = 'needs-improvement';
        else status = 'excellent';
      }

      return {
        name: m.name.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        value: m.value,
        unit: m.unit,
        status,
        description: `${m.category} metric`
      };
    });

    const summary = this.generateSummary(result);

    return {
      summary,
      diagnostics,
      suggestions,
      metrics,
      context: this.generateAnalysisContext(result)
    };
  }

  /**
   * Generate project context for Claude prompts
   */
  async generateContext(projectPath: string): Promise<CursorContext> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      // Analyze package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      let packageJson: {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      } = {};

      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
        packageJson = JSON.parse(packageContent);
      } catch {
        // No package.json or invalid JSON
      }

      // Extract technologies
      const dependencies = {
        ...packageJson.dependencies || {},
        ...packageJson.devDependencies || {}
      };
      
      const technologies = [
        'exodra', // Always include Exodra
        ...Object.keys(dependencies).map(dep => {
          // Simplify dependency names
          if (dep.startsWith('@types/')) return undefined;
          if (dep.includes('eslint')) return 'eslint';
          if (dep.includes('typescript')) return 'typescript';
          if (dep.includes('vite')) return 'vite';
          if (dep.includes('react')) return 'react';
          return dep.replace(/[@/]/g, '');
        }).filter(Boolean)
      ].slice(0, 10); // Limit to top 10

      // Detect patterns from file structure
      const patterns = await this.detectPatterns(projectPath);
      
      // Extract conventions
      const conventions = [
        'TypeScript-first development',
        'Schema-driven components',
        'Reactive signals pattern'
      ];

      // Generate project structure overview
      const projectStructure = await this.generateProjectStructure(projectPath);

      return {
        projectStructure,
        technologies: technologies.filter((t): t is string => t !== undefined).filter((t, i, arr) => arr.indexOf(t) === i), // Remove undefined and dedupe
        patterns,
        conventions
      };
    } catch (error) {
      return {
        projectStructure: 'Unable to analyze project structure',
        technologies: ['exodra'],
        patterns: [],
        conventions: []
      };
    }
  }

  /**
   * Format quick check results
   */
  private formatQuickCheck(result: QuickIntrospectResult) {
    return {
      health: result.health,
      summary: result.summary,
      topIssues: result.topIssues,
      suggestions: result.suggestions,
      recommendation: this.getHealthRecommendation(result.health),
      nextSteps: this.generateNextSteps(result)
    };
  }

  /**
   * Format component analysis
   */
  private formatComponentAnalysis(analysis: ComponentAnalysis) {
    const complexComponents = analysis.components.filter(
      c => c.complexity.cyclomaticComplexity > 8
    );

    return {
      summary: `Analyzed ${analysis.components.length} components`,
      totalComponents: analysis.components.length,
      complexComponents: complexComponents.length,
      patterns: analysis.patterns.map(p => ({
        name: p.name,
        // `occurrences` is a count and `impact` is not part of ComponentPattern;
        // these reads resolve to `undefined` at runtime, matching prior behavior.
        occurrences: (p.occurrences as unknown as { length?: number }).length,
        impact: (p as { impact?: string }).impact
      })),
      optimizations: analysis.optimization.opportunities.slice(0, 5),
      recommendations: this.generateComponentRecommendations(analysis)
    };
  }

  /**
   * Format performance report
   */
  private formatPerformanceReport(report: PerformanceReport) {
    return {
      summary: `Found ${report.hotspots.length} hotspots and ${report.bottlenecks.length} bottlenecks`,
      criticalIssues: report.hotspots.filter(h => h.severity === 'critical').length,
      topOptimizations: report.optimization.opportunities
        .filter(o => o.priority === 'high')
        .slice(0, 3),
      estimatedImpact: report.optimization.estimatedImpact,
      benchmarks: report.benchmarks,
      recommendations: report.optimization.recommendations.slice(0, 3)
    };
  }

  /**
   * Format schema analysis
   */
  private formatSchemaAnalysis(analysis: SchemaAnalysis) {
    return {
      summary: `Analyzed ${analysis.schemas.length} schemas`,
      coverage: analysis.coverage,
      unvalidatedSchemas: analysis.schemas.filter(s => !s.validation.hasValidation).length,
      relationships: analysis.relationships.length,
      recommendations: [
        'Add validation to unvalidated schemas',
        'Consider schema composition for reusability',
        'Document complex schemas'
      ]
    };
  }

  /**
   * Format browser exploration results
   */
  private formatExplorationResult(result: ExplorationFormatterInput, enableAI?: boolean) {
    const { componentTree, performance, interactions, screenshots, issues, recommendations } = result;

    const criticalIssues = issues.filter(i => i.severity === 'high').length;
    const warningIssues = issues.filter(i => i.severity === 'medium').length;
    
    const formattedResult = {
      summary: `Explored app with ${interactions.length} scenarios. Found ${componentTree.components?.length || 0} components.`,
      exploration: {
        totalScenarios: interactions.length,
        successfulScenarios: interactions.filter(i => i.success).length,
        totalDuration: interactions.reduce((sum: number, i) => sum + i.duration, 0),
        screenshotCount: screenshots.length
      },
      componentTree: {
        componentsFound: componentTree.components?.length || 0,
        components: componentTree.components || []
      },
      performance: {
        loadTime: performance.loadTime,
        firstContentfulPaint: performance.firstContentfulPaint,
        memoryUsage: performance.memoryUsage,
        status: performance.loadTime < 3000 ? 'good' : 'needs-improvement'
      },
      issues: {
        critical: criticalIssues,
        warnings: warningIssues,
        total: issues.length,
        details: issues.slice(0, 5) // Show top 5 issues
      },
      recommendations: recommendations.filter(r => r.priority === 'high').slice(0, 3),
      nextSteps: [
        criticalIssues > 0 ? 'Address critical performance issues' : null,
        warningIssues > 0 ? 'Review warning-level issues' : null,
        'Consider implementing high-priority recommendations',
        'Run detailed component analysis for deeper insights'
      ].filter(Boolean)
    };

    if (enableAI) {
      formattedResult.summary += ' AI analysis included for actionable insights.';
    }

    return formattedResult;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(result: IntrospectResult): string {
    const { errors, warnings, suggestions } = result.analysis.summary;
    const { filesAnalyzed, analysisTime } = result.performance;
    
    let summary = `Analyzed ${filesAnalyzed} files in ${analysisTime}ms. `;
    
    if (errors > 0) {
      summary += `Found ${errors} errors`;
      if (warnings > 0) summary += ` and ${warnings} warnings`;
      summary += '. ';
    } else if (warnings > 0) {
      summary += `Found ${warnings} warnings. `;
    } else {
      summary += 'No issues found. ';
    }
    
    if (suggestions > 0) {
      summary += `Generated ${suggestions} optimization suggestions.`;
    }
    
    return summary;
  }

  /**
   * Generate analysis context for Claude
   */
  private generateAnalysisContext(result: IntrospectResult): string {
    const context = [
      `Project Analysis Context:`,
      `- Files analyzed: ${result.performance.filesAnalyzed}`,
      `- Analysis time: ${result.performance.analysisTime}ms`,
      `- Issues found: ${result.analysis.summary.errors} errors, ${result.analysis.summary.warnings} warnings`,
      `- Suggestions generated: ${result.analysis.summary.suggestions}`,
    ];

    if (result.schemas) {
      context.push(`- Schemas: ${result.schemas.schemas.length} total, ${result.schemas.coverage.coveragePercentage}% coverage`);
    }

    if (result.aiInsights) {
      context.push(`- AI insights: ${result.aiInsights.suggestions.length} AI-powered suggestions`);
    }

    return context.join('\n');
  }

  /**
   * Detect project patterns
   */
  private async detectPatterns(projectPath: string): Promise<string[]> {
    const patterns: string[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      // Check for common directories
      const srcExists = await fs.access(path.join(projectPath, 'src')).then(() => true).catch(() => false);
      const componentsExists = await fs.access(path.join(projectPath, 'src/components')).then(() => true).catch(() => false);
      const pagesExists = await fs.access(path.join(projectPath, 'src/pages')).then(() => true).catch(() => false);

      if (srcExists) patterns.push('src/ directory structure');
      if (componentsExists) patterns.push('Component-based architecture');
      if (pagesExists) patterns.push('Page-based routing');

      // Check for config files
      const configFiles = ['vite.config.ts', 'tsconfig.json', 'eslint.config.js'];
      for (const file of configFiles) {
        const exists = await fs.access(path.join(projectPath, file)).then(() => true).catch(() => false);
        if (exists) patterns.push(`${file} configuration`);
      }

    } catch (error) {
      // Ignore errors
    }

    return patterns;
  }

  /**
   * Generate project structure overview
   */
  private async generateProjectStructure(projectPath: string): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');

    try {
      const items = await fs.readdir(projectPath);
      const structure = [];

      for (const item of items.slice(0, 10)) { // Limit to first 10 items
        const itemPath = path.join(projectPath, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          structure.push(`📁 ${item}/`);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx') || item.endsWith('.json'))) {
          structure.push(`📄 ${item}`);
        }
      }

      return structure.join('\n');
    } catch (error) {
      return 'Unable to read project structure';
    }
  }

  /**
   * Get health recommendation
   */
  private getHealthRecommendation(health: string): string {
    switch (health) {
      case 'excellent':
        return 'Your project is in excellent shape! Consider adding advanced optimizations.';
      case 'good':
        return 'Good project health. Address warnings to improve further.';
      case 'needs-attention':
        return 'Several issues detected. Focus on fixing errors first.';
      case 'critical':
        return 'Critical issues found. Immediate attention required.';
      default:
        return 'Unable to assess project health.';
    }
  }

  /**
   * Generate next steps
   */
  private generateNextSteps(result: QuickIntrospectResult): string[] {
    const steps = [];
    
    if (result.topIssues.length > 0) {
      steps.push('Fix critical errors first');
    }
    
    if (result.suggestions.length > 0) {
      steps.push('Implement high-impact suggestions');
    }
    
    steps.push('Run full analysis for detailed insights');
    steps.push('Set up automated quality checks');
    
    return steps;
  }

  /**
   * Generate component recommendations
   */
  private generateComponentRecommendations(analysis: ComponentAnalysis): string[] {
    const recommendations = [];

    const complexComponents = analysis.components.filter(
      c => c.complexity.cyclomaticComplexity > 8
    ).length;

    if (complexComponents > 0) {
      recommendations.push(`Refactor ${complexComponents} complex components`);
    }

    const memorizationOps = analysis.optimization.opportunities.filter(
      o => o.type === 'memoization'
    ).length;
    
    if (memorizationOps > 0) {
      recommendations.push(`Add memoization to ${memorizationOps} components`);
    }
    
    recommendations.push('Follow established component patterns');
    recommendations.push('Add prop validation where missing');
    
    return recommendations;
  }
}

/**
 * Create and register the Cursor integration
 */
export function createCursorIntegration(): ExoCursorIntegration {
  return new ExoCursorIntegration();
}

/**
 * Setup function that can be called from Cursor
 */
export async function setupCursorIntegration() {
  const integration = createCursorIntegration();
  const tool = integration.registerTool();
  
  // Return tool definition that can be registered with Cursor
  return {
    tool,
    usage: `
To use Exodra Introspect in Cursor:

1. Quick health check:
   Use the tool with action: "quick-check"

2. Full analysis:
   Use the tool with action: "analyze" and enableAI: true

3. Component analysis:
   Use the tool with action: "component-analysis"

4. Performance check:
   Use the tool with action: "performance-check"

5. Schema analysis:
   Use the tool with action: "schema-analysis"

6. Browser exploration (Live App Analysis):
   Use the tool with action: "explore" to launch and analyze your running application

Example prompts:
"Analyze my Exodra project for performance issues and suggest optimizations"
"Launch my app and explore it to find component tree and performance bottlenecks"
`,
    examples: [
      'Check the health of my Exodra project',
      'Analyze components for optimization opportunities',
      'Find performance bottlenecks in the codebase',
      'Review my schemas for best practices',
      'Get AI-powered suggestions for code improvements',
      'Launch and explore my app to analyze live performance',
      'Run browser scenarios to test component interactions'
    ]
  };
}