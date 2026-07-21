/**
 * Main introspection API - the primary interface for analyzing Exodra projects
 */

import { IntrospectionEngine, type IntrospectionConfig } from './engine.js';
import { SchemaAnalyzer, type SchemaAnalysis } from './schema.js';
import { AIAnalysisEngine, type AIConfig } from './ai.js';
import type { AnalysisResult } from './types.js';

export interface IntrospectOptions extends IntrospectionConfig {
  /** Enable AI-enhanced analysis */
  enableAI?: boolean;
  
  /** AI configuration */
  aiConfig?: AIConfig;
  
  /** Analysis scope */
  scope?: 'file' | 'project' | 'workspace';
  
  /** Target file for single-file analysis */
  targetFile?: string;
  
  /** Output format */
  format?: 'json' | 'markdown' | 'html';
  
  /** Include detailed explanations */
  verbose?: boolean;
}

export interface IntrospectResult {
  /** Overall analysis results */
  analysis: AnalysisResult;
  
  /** Schema-specific analysis */
  schemas?: SchemaAnalysis;
  
  /** AI insights (if enabled) */
  aiInsights?: {
    suggestions: string[];
    explanations: string[];
    confidence: number;
  };
  
  /** Performance metrics */
  performance: {
    analysisTime: number;
    filesAnalyzed: number;
    linesAnalyzed: number;
  };
  
  /** Configuration used */
  config: IntrospectOptions;
  
  /** Timestamp */
  timestamp: string;
}

/**
 * Main introspection function - analyzes Exodra projects with optional AI enhancement
 */
export async function introspect(options: IntrospectOptions): Promise<IntrospectResult> {
  const startTime = Date.now();
  
  // Initialize engines
  const engine = new IntrospectionEngine(options);
  const schemaAnalyzer = new SchemaAnalyzer();
  
  let aiEngine: AIAnalysisEngine | undefined;
  if (options.enableAI && options.aiConfig) {
    aiEngine = new AIAnalysisEngine(options.aiConfig);
  }
  
  let analysis: AnalysisResult;
  let schemas: SchemaAnalysis | undefined;
  let aiInsights: { suggestions: string[]; explanations: string[]; confidence: number } | undefined;
  let filesAnalyzed: number;
  let linesAnalyzed = 0;
  
  try {
    // Perform analysis based on scope
    switch (options.scope) {
      case 'file':
        if (!options.targetFile) {
          throw new Error('targetFile is required for file scope analysis');
        }
        analysis = await analyzeFile(engine, options.targetFile, aiEngine);
        filesAnalyzed = 1;
        break;
        
      case 'project':
        analysis = await engine.analyze();
        schemas = await schemaAnalyzer.analyzeProject(options.projectRoot);
        filesAnalyzed = analysis.metrics.find((m) => m.name === 'total_files')?.value || 0;
        linesAnalyzed = analysis.metrics.find((m) => m.name === 'total_lines')?.value || 0;
        break;
        
      case 'workspace':
      default:
        analysis = await engine.analyze();
        schemas = await schemaAnalyzer.analyzeProject(options.projectRoot);
        filesAnalyzed = analysis.metrics.find((m) => m.name === 'total_files')?.value || 0;
        linesAnalyzed = analysis.metrics.find((m) => m.name === 'total_lines')?.value || 0;
        
        // Enhanced AI analysis for workspace
        if (aiEngine) {
          aiInsights = await performAIAnalysis(aiEngine, analysis, options);
        }
        break;
    }
    
    // Add performance metrics
    const analysisTime = Date.now() - startTime;
    
    return {
      analysis,
      schemas,
      aiInsights,
      performance: {
        analysisTime,
        filesAnalyzed,
        linesAnalyzed
      },
      config: options,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    // Return error analysis
    return {
      analysis: {
        diagnostics: [{
          id: 'introspection-error',
          severity: 'error',
          message: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: { file: options.projectRoot, line: 1, column: 1 },
          category: 'system'
        }],
        suggestions: [],
        metrics: [],
        summary: { errors: 1, warnings: 0, info: 0, suggestions: 0 }
      },
      performance: {
        analysisTime: Date.now() - startTime,
        filesAnalyzed: 0,
        linesAnalyzed: 0
      },
      config: options,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyze a single file
 */
async function analyzeFile(
  _engine: IntrospectionEngine,
  _filePath: string,
  _aiEngine?: AIAnalysisEngine
): Promise<AnalysisResult> {
  // This would need to be implemented in the engine
  // For now, return basic analysis
  return {
    diagnostics: [],
    suggestions: [],
    metrics: [],
    summary: { errors: 0, warnings: 0, info: 0, suggestions: 0 }
  };
}

/**
 * Perform AI-enhanced analysis
 */
async function performAIAnalysis(
  aiEngine: AIAnalysisEngine,
  staticAnalysis: AnalysisResult,
  options: IntrospectOptions
): Promise<{ suggestions: string[]; explanations: string[]; confidence: number }> {
  try {
    // Create analysis context
    const context = {
      code: '', // Would need to collect relevant code
      filePath: options.projectRoot,
      projectContext: {
        dependencies: [], // Would extract from package.json
        framework: 'exodra',
        patterns: [],
        conventions: []
      },
      focusAreas: [
        { area: 'performance' as const, priority: 'high' as const },
        { area: 'maintainability' as const, priority: 'medium' as const }
      ]
    };
    
    const enhanced = await aiEngine.enhanceAnalysis(staticAnalysis, '', context);
    
    return {
      suggestions: enhanced.suggestions.filter(s => s.id.startsWith('ai-')).map(s => s.description),
      explanations: [],
      confidence: 0.8
    };
    
  } catch (error) {
    return {
      suggestions: [],
      explanations: [],
      confidence: 0
    };
  }
}

/**
 * Quick analysis for development - lighter weight version
 */
export interface QuickIntrospectResult {
  health: 'excellent' | 'good' | 'needs-attention' | 'critical';
  summary: string;
  topIssues: string[];
  suggestions: string[];
}

export async function quickIntrospect(projectRoot: string): Promise<QuickIntrospectResult> {
  const options: IntrospectOptions = {
    projectRoot,
    scope: 'project',
    analysis: {
      schema: true,
      components: true,
      performance: true,
      ai: false
    }
  };
  
  let result: IntrospectResult;
  
  try {
    result = await introspect(options);
  } catch (error) {
    // Fallback for when introspect fails
    const fallbackResult: IntrospectResult = {
      analysis: {
        diagnostics: [],
        suggestions: [],
        metrics: [],
        summary: { errors: 0, warnings: 0, info: 0, suggestions: 0 },
        analysis: {
          filesAnalyzed: 0,
          summary: { errors: 0, warnings: 0 },
          suggestions: []
        }
      },
      performance: {
        analysisTime: 0,
        filesAnalyzed: 0,
        linesAnalyzed: 0
      },
      config: options,
      timestamp: new Date().toISOString()
    };
    
    // Try basic file counting at least
    const path = await import('path');
    const glob = await import('glob');
    
    try {
      const pattern = path.join(projectRoot, '**/*.{ts,tsx,js,jsx}');
      const files = await glob.glob(pattern, {
        ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
      });
      fallbackResult.performance.filesAnalyzed = files.length;
    } catch {
      // Ignore file-counting errors; the fallback result is still returned.
    }
    
    result = fallbackResult;
  }
  
  // Calculate health score
  const { errors, warnings } = result.analysis.summary;
  let health: 'excellent' | 'good' | 'needs-attention' | 'critical';
  
  if (errors > 10) health = 'critical';
  else if (errors > 3 || warnings > 15) health = 'needs-attention';
  else if (warnings > 5) health = 'good';
  else health = 'excellent';
  
  // Generate summary
  const summary = `Analyzed ${result.performance.filesAnalyzed} files with ${errors} errors and ${warnings} warnings`;
  
  // Extract top issues
  const topIssues = result.analysis.diagnostics
    .filter(d => d.severity === 'error' || d.severity === 'warning')
    .slice(0, 5)
    .map((d) => d.message);
  
  // Extract suggestions
  const suggestions = result.analysis.suggestions
    .filter(s => s.impact === 'high')
    .slice(0, 3)
    .map((s) => s.title);
  
  return {
    health,
    summary,
    topIssues,
    suggestions
  };
}

/**
 * Format analysis results for different output types
 */
export function formatResults(result: IntrospectResult, format: 'json' | 'markdown' | 'html' = 'json'): string {
  switch (format) {
    case 'markdown':
      return formatMarkdown(result);
    case 'html':
      return formatHTML(result);
    case 'json':
    default:
      return JSON.stringify(result, null, 2);
  }
}

function formatMarkdown(result: IntrospectResult): string {
  const { analysis, performance } = result;
  const { summary } = analysis;
  
  return `# Exodra Project Analysis

## Summary
- **Files Analyzed**: ${performance.filesAnalyzed}
- **Analysis Time**: ${performance.analysisTime}ms
- **Errors**: ${summary.errors}
- **Warnings**: ${summary.warnings}
- **Suggestions**: ${summary.suggestions}

## Issues

### Errors (${summary.errors})
${analysis.diagnostics
  .filter(d => d.severity === 'error')
  .map((d) => `- **${d.location.file}:${d.location.line}** - ${d.message}`)
  .join('\n')}

### Warnings (${summary.warnings})
${analysis.diagnostics
  .filter(d => d.severity === 'warning')
  .map((d) => `- **${d.location.file}:${d.location.line}** - ${d.message}`)
  .join('\n')}

## Suggestions

${analysis.suggestions
  .map((s) => `### ${s.title}
**Impact**: ${s.impact} | **Effort**: ${s.effort} | **Category**: ${s.category}

${s.description}
${s.location ? `\nLocation: ${s.location.file}:${s.location.line}` : ''}`)
  .join('\n\n')}

## Metrics

${analysis.metrics
  .map((m) => `- **${m.name}**: ${m.value} ${m.unit}`)
  .join('\n')}
`;
}

function formatHTML(result: IntrospectResult): string {
  // Basic HTML template - could be enhanced with styling
  return `<!DOCTYPE html>
<html>
<head>
    <title>Exodra Analysis Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .summary { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin-right: 20px; }
        .error { color: #d32f2f; }
        .warning { color: #f57c00; }
        .info { color: #1976d2; }
    </style>
</head>
<body>
    <h1>Exodra Project Analysis</h1>
    
    <div class="summary">
        <h2>Summary</h2>
        <div class="metric">Files: ${result.performance.filesAnalyzed}</div>
        <div class="metric">Time: ${result.performance.analysisTime}ms</div>
        <div class="metric">Errors: <span class="error">${result.analysis.summary.errors}</span></div>
        <div class="metric">Warnings: <span class="warning">${result.analysis.summary.warnings}</span></div>
    </div>
    
    <h2>Issues</h2>
    ${result.analysis.diagnostics.map((d) => `
        <div class="${d.severity}">
            <strong>${d.location.file}:${d.location.line}</strong> - ${d.message}
        </div>
    `).join('')}
    
    <h2>Suggestions</h2>
    ${result.analysis.suggestions.map((s) => `
        <div>
            <h3>${s.title}</h3>
            <p>${s.description}</p>
            <small>Impact: ${s.impact} | Effort: ${s.effort} | Category: ${s.category}</small>
        </div>
    `).join('')}
    
</body>
</html>`;
}