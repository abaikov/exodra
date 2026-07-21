/**
 * Core introspection engine for analyzing Exodra projects
 */

import { Project, SourceFile, SyntaxKind, DiagnosticMessageChain, Diagnostic as TsDiagnostic, Node, FunctionDeclaration } from 'ts-morph';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs';
import type { 
  AnalysisResult, 
  Diagnostic, 
  Suggestion, 
  Metric, 
  SourceLocation
} from './types.js';

export interface IntrospectionConfig {
  /** Project root directory */
  projectRoot: string;
  
  /** TypeScript config file path */
  tsconfigPath?: string;
  
  /** File patterns to analyze */
  include?: string[];
  
  /** File patterns to exclude */
  exclude?: string[];
  
  /** Analysis options */
  analysis?: {
    /** Enable schema validation */
    schema?: boolean;
    
    /** Enable component analysis */
    components?: boolean;
    
    /** Enable performance analysis */
    performance?: boolean;
    
    /** Enable AI-powered suggestions */
    ai?: boolean;
  };
  
  /** AI configuration */
  ai?: {
    /** AI provider (openai, anthropic, local) */
    provider?: string;
    
    /** API key for AI provider */
    apiKey?: string;
    
    /** Model to use */
    model?: string;
    
    /** Enable context-aware suggestions */
    contextAware?: boolean;
  };
}

export class IntrospectionEngine {
  private project: Project;
  private config: IntrospectionConfig;
  
  constructor(config?: Partial<IntrospectionConfig>) {
    this.config = {
      projectRoot: process.cwd(),
      include: ['**/*.ts', '**/*.tsx'],
      exclude: ['node_modules/**', 'dist/**', '**/*.d.ts'],
      analysis: {
        schema: true,
        components: true,
        performance: true,
        ai: false
      },
      ...config
    } as IntrospectionConfig;
    
    this.project = this.createProject();
  }

  /**
   * Create a ts-morph Project, gracefully falling back to a tsconfig-less
   * project when the target directory has no tsconfig.json (so analysis works
   * on any folder, not just package roots).
   */
  private createProject(): Project {
    const tsConfigPath = this.config.tsconfigPath ||
      (this.config.projectRoot ? path.join(this.config.projectRoot, 'tsconfig.json') : undefined);
    const useTsConfig = !!tsConfigPath && fs.existsSync(tsConfigPath);

    if (useTsConfig) {
      return new Project({
        tsConfigFilePath: tsConfigPath,
        skipAddingFilesFromTsConfig: false,
        skipFileDependencyResolution: true
      });
    }

    return new Project({
      compilerOptions: { allowJs: true, jsx: 4 /* react-jsx */ },
      skipAddingFilesFromTsConfig: true,
      skipFileDependencyResolution: true
    });
  }
  
  /**
   * Analyze a specific project directory
   */
  async analyzeProject(projectPath: string, config?: Partial<IntrospectionConfig>): Promise<AnalysisResult> {
    // Update config with new project path
    this.config = {
      ...this.config,
      ...config,
      projectRoot: projectPath
    };
    
    // Re-initialize project with new path
    this.project = this.createProject();

    return this.analyze();
  }
  
  /**
   * Analyze the entire project
   */
  async analyze(): Promise<AnalysisResult> {
    const files = await this.getSourceFiles();
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    for (const file of files) {
      // A single unparseable/unexpected file should not abort the whole run.
      try {
        const fileAnalysis = await this.analyzeFile(file);
        diagnostics.push(...fileAnalysis.diagnostics);
        suggestions.push(...fileAnalysis.suggestions);
        metrics.push(...fileAnalysis.metrics);
      } catch {
        // skip files that fail to analyze
      }
    }
    
    // Add project-level metrics
    metrics.push(...this.getProjectMetrics());
    
    const result: AnalysisResult = {
      diagnostics,
      suggestions,
      metrics,
      summary: {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
        suggestions: suggestions.length
      },
      analysis: {
        filesAnalyzed: files.length,
        summary: {
          errors: diagnostics.filter(d => d.severity === 'error').length,
          warnings: diagnostics.filter(d => d.severity === 'warning').length,
          info: diagnostics.filter(d => d.severity === 'info').length
        },
        suggestions
      }
    };
    
    return result;
  }
  
  /**
   * Analyze a specific file
   */
  async analyzeFile(sourceFile: SourceFile): Promise<AnalysisResult> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // TypeScript diagnostics
    const tsDiagnostics = sourceFile.getPreEmitDiagnostics();
    for (const diagnostic of tsDiagnostics) {
      const start = diagnostic.getStart();
      if (start !== undefined) {
        const startPos = sourceFile.getLineAndColumnAtPos(start);
        const length = diagnostic.getLength() || 0;
        const endPos = sourceFile.getLineAndColumnAtPos(start + length);
        
        diagnostics.push({
          id: `ts-${diagnostic.getCode()}`,
          severity: diagnostic.getCategory() === 1 ? 'error' : diagnostic.getCategory() === 2 ? 'warning' : 'info',
          message: typeof diagnostic.getMessageText() === 'string'
            ? diagnostic.getMessageText() as string
            : (diagnostic.getMessageText() as DiagnosticMessageChain).getMessageText(),
          location: {
            file: sourceFile.getFilePath(),
            line: startPos.line,
            column: startPos.column,
            endLine: endPos.line,
            endColumn: endPos.column
          },
          category: 'typescript'
        });
      }
    }
    
    // Exodra-specific analysis
    if (this.config.analysis?.schema) {
      const schemaAnalysis = this.analyzeSchema(sourceFile);
      diagnostics.push(...schemaAnalysis.diagnostics);
      suggestions.push(...schemaAnalysis.suggestions);
    }
    
    if (this.config.analysis?.components) {
      const componentAnalysis = this.analyzeComponents(sourceFile);
      diagnostics.push(...componentAnalysis.diagnostics);
      suggestions.push(...componentAnalysis.suggestions);
    }
    
    if (this.config.analysis?.performance) {
      const perfAnalysis = this.analyzePerformance(sourceFile);
      diagnostics.push(...perfAnalysis.diagnostics);
      suggestions.push(...perfAnalysis.suggestions);
      metrics.push(...perfAnalysis.metrics);
    }
    
    return {
      diagnostics,
      suggestions,
      metrics,
      summary: {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
        suggestions: suggestions.length
      }
    };
  }
  
  /**
   * Get all source files to analyze
   */
  private async getSourceFiles(): Promise<SourceFile[]> {
    const patterns = this.config.include!.map(pattern => 
      path.resolve(this.config.projectRoot, pattern)
    );
    
    const files: string[] = [];
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        ignore: this.config.exclude,
        absolute: true
      });
      files.push(...matches);
    }
    
    return files
      .map(file => {
        // Reuse files already loaded from tsconfig; otherwise add them so
        // analysis also works when there is no tsconfig.
        try {
          return this.project.getSourceFile(file) ?? this.project.addSourceFileAtPath(file);
        } catch {
          return undefined;
        }
      })
      .filter((file): file is SourceFile => file !== undefined);
  }
  
  /**
   * Analyze schema usage and validation
   */
  private analyzeSchema(sourceFile: SourceFile): { diagnostics: Diagnostic[]; suggestions: Suggestion[] } {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    
    // Look for schema definitions
    sourceFile.getVariableDeclarations().forEach((varDecl) => {
      const type = varDecl.getType();
      const typeText = type.getText();
      
      // Check for schema patterns
      if (typeText.includes('Schema') || typeText.includes('z.')) {
        const location = this.getLocationFromNode(varDecl, sourceFile);
        
        // Check for missing validation
        const hasValidation = this.checkSchemaValidation(varDecl);
        if (!hasValidation) {
          suggestions.push({
            id: 'schema-validation',
            title: 'Add schema validation',
            description: 'Consider adding runtime validation for this schema',
            location,
            category: 'schema',
            impact: 'medium',
            effort: 'low'
          });
        }
      }
    });
    
    return { diagnostics, suggestions };
  }
  
  /**
   * Analyze component patterns and best practices
   */
  private analyzeComponents(sourceFile: SourceFile): { diagnostics: Diagnostic[]; suggestions: Suggestion[] } {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    
    // Look for Exodra components
    sourceFile.getFunctions().forEach((func) => {
      // Check if it's a component function
      if (this.isExodraComponent(func)) {
        const location = this.getLocationFromNode(func, sourceFile);
        
        // Check for performance anti-patterns
        const hasInlineObjects = this.hasInlineObjectCreation(func);
        if (hasInlineObjects) {
          suggestions.push({
            id: 'inline-objects',
            title: 'Avoid inline object creation',
            description: 'Inline object creation in render functions can cause unnecessary re-renders',
            location,
            category: 'performance',
            impact: 'medium',
            effort: 'low'
          });
        }
        
        // Check for missing memoization
        const needsMemoization = this.needsMemoization(func);
        if (needsMemoization) {
          suggestions.push({
            id: 'memoization',
            title: 'Consider memoization',
            description: 'This component might benefit from memoization',
            location,
            category: 'performance',
            impact: 'medium',
            effort: 'medium'
          });
        }
      }
    });
    
    return { diagnostics, suggestions };
  }
  
  /**
   * Analyze performance patterns
   */
  private analyzePerformance(sourceFile: SourceFile): { 
    diagnostics: Diagnostic[]; 
    suggestions: Suggestion[]; 
    metrics: Metric[] 
  } {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Count various metrics
    const componentCount = this.countComponents(sourceFile);
    const signalCount = this.countSignals(sourceFile);
    const complexityScore = this.calculateComplexity(sourceFile);
    
    metrics.push(
      {
        name: 'components',
        value: componentCount,
        unit: 'count',
        category: 'structure'
      },
      {
        name: 'signals',
        value: signalCount,
        unit: 'count',
        category: 'reactivity'
      },
      {
        name: 'complexity',
        value: complexityScore,
        unit: 'score',
        category: 'maintainability',
        threshold: { warning: 10, error: 20 }
      }
    );
    
    // Check complexity thresholds
    if (complexityScore > 20) {
      diagnostics.push({
        id: 'high-complexity',
        severity: 'warning',
        message: `File complexity is high (${complexityScore}). Consider breaking down into smaller modules.`,
        location: { file: sourceFile.getFilePath(), line: 1, column: 1 },
        category: 'maintainability'
      });
    }
    
    return { diagnostics, suggestions, metrics };
  }
  
  /**
   * Get project-level metrics
   */
  private getProjectMetrics(): Metric[] {
    const sourceFiles = this.project.getSourceFiles();
    const totalFiles = sourceFiles.length;
    const totalLines = sourceFiles.reduce((sum: number, file: SourceFile) => sum + (file.getEndLineNumber?.() || 0), 0);
    
    return [
      {
        name: 'total_files',
        value: totalFiles,
        unit: 'count',
        category: 'project'
      },
      {
        name: 'total_lines',
        value: totalLines,
        unit: 'lines',
        category: 'project'
      }
    ];
  }
  
  // Helper methods
  private getLocationFromDiagnostic(diagnostic: TsDiagnostic, sourceFile: SourceFile): SourceLocation | null {
    const start = diagnostic.getStart();
    if (!start) return null;
    
    const startPos = sourceFile.getLineAndColumnAtPos(start);
    const length = diagnostic.getLength();
    const endPos = length ? sourceFile.getLineAndColumnAtPos(start + length) : startPos;
    
    return {
      file: sourceFile.getFilePath(),
      line: startPos.line,
      column: startPos.column,
      endLine: endPos.line,
      endColumn: endPos.column
    };
  }
  
  private getLocationFromNode(node: Node, sourceFile: SourceFile): SourceLocation {
    const start = node.getStart ? node.getStart() : 0;
    const end = node.getEnd ? node.getEnd() : 0;
    const startPos = sourceFile.getLineAndColumnAtPos(start);
    const endPos = sourceFile.getLineAndColumnAtPos(end);
    
    return {
      file: sourceFile.getFilePath(),
      line: startPos.line,
      column: startPos.column,
      endLine: endPos.line,
      endColumn: endPos.column
    };
  }
  
  private mapTsSeverity(category: number): 'error' | 'warning' | 'info' {
    switch (category) {
      case 1: return 'error';
      case 2: return 'warning';
      default: return 'info';
    }
  }
  
  private checkSchemaValidation(node: Node): boolean {
    // Check if there's a .parse() or .safeParse() call nearby
    const parent = node.getParent();
    return parent?.getDescendantsOfKind(SyntaxKind.CallExpression)
      .some((call) => {
        const expr = call.getExpression();
        return expr.getText().includes('parse') || expr.getText().includes('validate');
      }) || false;
  }
  
  private isExodraComponent(func: FunctionDeclaration): boolean {
    // Check if function returns JSX or has Exodra patterns
    const returnType = func.getReturnType();
    const typeText = returnType.getText();
    return typeText.includes('Element') || typeText.includes('JSX') ||
           (func.getBody()?.getDescendantsOfKind(SyntaxKind.JsxElement).length ?? 0) > 0;
  }
  
  private hasInlineObjectCreation(func: FunctionDeclaration): boolean {
    return func.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).length > 0;
  }
  
  private needsMemoization(func: FunctionDeclaration): boolean {
    // Simple heuristic: functions with props that don't use memo
    return func.getParameters().length > 0 && 
           !func.getText().includes('memo') && 
           !func.getText().includes('useMemo');
  }
  
  private countComponents(sourceFile: SourceFile): number {
    return sourceFile.getFunctions()
      .filter(func => this.isExodraComponent(func))
      .length;
  }
  
  private countSignals(sourceFile: SourceFile): number {
    return sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
      .filter(call => {
        const expr = call.getExpression().getText();
        return expr.includes('bindable') || expr.includes('signal') || expr.includes('derived');
      })
      .length;
  }
  
  private calculateComplexity(sourceFile: SourceFile): number {
    // Simple cyclomatic complexity calculation
    const controlFlow = sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement).length +
                       sourceFile.getDescendantsOfKind(SyntaxKind.WhileStatement).length +
                       sourceFile.getDescendantsOfKind(SyntaxKind.ForStatement).length +
                       sourceFile.getDescendantsOfKind(SyntaxKind.SwitchStatement).length;
    
    return controlFlow + 1; // Base complexity is 1
  }
}