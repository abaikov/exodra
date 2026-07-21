/**
 * Core types for introspection analysis
 */

export interface ExoSourceLocation {
  file: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

export type ExoDiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface ExoDiagnostic {
  id: string;
  severity: ExoDiagnosticSeverity;
  message: string;
  location: ExoSourceLocation;
  category: string;
  tags?: string[];
  fixable?: boolean;
}

export interface ExoSuggestion {
  id: string;
  title: string;
  description: string;
  location?: ExoSourceLocation;
  category: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  autoFixable?: boolean;
  codeActions?: ExoCodeAction[];
}

export interface ExoCodeAction {
  title: string;
  description: string;
  edit: ExoTextEdit;
}

export interface ExoTextEdit {
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  newText: string;
}

export interface ExoMetric {
  name: string;
  value: number;
  unit: string;
  category: string;
  threshold?: {
    warning?: number;
    error?: number;
  };
}

export interface ExoAnalysisResult {
  diagnostics: ExoDiagnostic[];
  suggestions: ExoSuggestion[];
  metrics: ExoMetric[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
    suggestions: number;
  };
  analysis?: {
    filesAnalyzed: number;
    summary: {
      errors: number;
      warnings: number;
      info?: number;
    };
    suggestions: ExoSuggestion[];
  };
}

export interface IntrospectionConfig {
  projectRoot: string;
  include?: string[];
  exclude?: string[];
  strict?: boolean;
}

// Legacy aliases for compatibility
export type AnalysisResult = ExoAnalysisResult;
export type Diagnostic = ExoDiagnostic;
export type Suggestion = ExoSuggestion;
export type Metric = ExoMetric;
export type SourceLocation = ExoSourceLocation;

// Additional types for proper typing
export interface ExoAnalysisOptions {
  strict?: boolean;
  includeMetrics?: boolean;
  includeAI?: boolean;
  maxDepth?: number;
}

export interface ExoAnalysisContext {
  projectRoot: string;
  files: string[];
  options: ExoAnalysisOptions;
}

export interface ExoAIAnalysisRequest {
  context: ExoAnalysisContext;
  analysisType: string;
  data: ExoAnalysisResult;
}


// Type definitions for components
export interface ExoComponentProp {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
  description?: string;
}

export interface ExoComponentDefinition {
  name: string;
  props: ExoComponentProp[];
  complexity: ExoComplexityMetrics;
  location: ExoSourceLocation;
}

export interface ExoComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  linesOfCode: number;
}

// Type definitions for AST nodes
export interface ExoASTNode {
  type: string;
  start: number;
  end: number;
  loc?: ExoSourceLocation;
  getStart?: () => number;
  getEnd?: () => number;
  getParent?: () => ExoASTNode | undefined;
  getExpression?: () => ExoASTNode & { getText: () => string };
  getText?: () => string;
}

export interface ExoVariableDeclaration extends ExoASTNode {
  id: { name: string };
  init?: ExoASTNode;
  getType?: () => { getText: () => string };
}

export interface ExoFunctionDeclaration extends ExoASTNode {
  id: { name: string };
  params: ExoASTNode[];
  body: ExoASTNode;
  getReturnType?: () => { getText: () => string };
  getBody?: () => ExoASTNode;
  getDescendantsOfKind?: (kind: string) => ExoASTNode[];
  getParameters?: () => ExoASTNode[];
  getText?: () => string;
}

// Plugin configuration types
export interface ExoPluginConfig {
  enabled: boolean;
  options: Record<string, string | number | boolean>;
}

// Analysis result containers
export interface ExoComponentAnalysisResult {
  components: ExoComponentDefinition[];
  patterns: ExoAnalysisPattern[];
  optimization: ExoOptimizationRecommendation[];
}

export interface ExoAnalysisPattern {
  name: string;
  description: string;
  frequency: number;
  examples: ExoSourceLocation[];
  impact: string;
  occurrences: number;
}

export interface ExoOptimizationRecommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  estimatedImpact: string;
  location?: ExoSourceLocation;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}