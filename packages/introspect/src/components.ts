/**
 * Component analysis and optimization
 */

import type { AnalysisResult, Diagnostic, Suggestion, Metric, SourceLocation } from './types.js';

export interface ComponentAnalysis extends AnalysisResult {
  components: ComponentInfo[];
  patterns: ComponentPattern[];
  optimization: OptimizationReport;
}

export interface ComponentInfo {
  name: string;
  type: 'functional' | 'class' | 'schema';
  location: SourceLocation;
  props: PropInfo[];
  state: StateInfo[];
  dependencies: string[];
  complexity: ComplexityMetrics;
  performance: PerformanceMetrics;
}

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean | null;
  validation?: string[];
}

export interface StateInfo {
  name: string;
  type: 'bindable' | 'derived' | 'computed';
  dependencies: string[];
  updateFrequency: number;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingLevel: number;
  linesOfCode: number;
}

export interface PerformanceMetrics {
  renderComplexity: 'low' | 'medium' | 'high';
  memoizationOpportunities: number;
  unnecessaryRerenders: number;
  heavyComputations: number;
}

export interface ComponentPattern {
  name: string;
  description: string;
  occurrences: number;
  benefits: string[];
  considerations: string[];
  examples: SourceLocation[];
}

export interface OptimizationReport {
  opportunities: OptimizationOpportunity[];
  potentialSavings: {
    renderTime: number;
    memoryUsage: number;
    bundleSize: number;
  };
  priority: OpportunityPriority[];
}

export interface OptimizationOpportunity {
  id: string;
  component: string;
  type: 'memoization' | 'splitting' | 'lazy-loading' | 'state-optimization' | 'prop-optimization';
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  estimatedSavings: {
    renderTime?: number;
    memoryUsage?: number;
    bundleSize?: number;
  };
}

export interface OpportunityPriority {
  opportunity: string;
  score: number;
  reasoning: string;
}

export class ComponentAnalyzer {
  /**
   * Analyze components in a project. Alias of analyzeComponents for a
   * consistent analyzer API (SchemaAnalyzer/PerformanceAnalyzer use the same
   * verb-noun convention).
   */
  async analyzeProject(projectRoot: string): Promise<ComponentAnalysis> {
    return this.analyzeComponents(projectRoot);
  }

  /**
   * Analyze all components in a project
   */
  async analyzeComponents(projectRoot: string): Promise<ComponentAnalysis> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    const components: ComponentInfo[] = [];
    
    // Discover components
    const discoveredComponents = await this.discoverComponents(projectRoot);
    components.push(...discoveredComponents);
    
    // Analyze each component
    for (const component of components) {
      const componentAnalysis = this.analyzeComponent(component);
      diagnostics.push(...componentAnalysis.diagnostics);
      suggestions.push(...componentAnalysis.suggestions);
      metrics.push(...componentAnalysis.metrics);
    }
    
    // Identify patterns
    const patterns = this.identifyPatterns(components);
    
    // Generate optimization report
    const optimization = this.generateOptimizationReport(components);
    
    // Add component metrics
    metrics.push(
      {
        name: 'total_components',
        value: components.length,
        unit: 'count',
        category: 'components'
      },
      {
        name: 'avg_component_complexity',
        value: this.calculateAverageComplexity(components),
        unit: 'score',
        category: 'complexity',
        threshold: { warning: 8, error: 15 }
      },
      {
        name: 'optimization_opportunities',
        value: optimization.opportunities.length,
        unit: 'count',
        category: 'optimization'
      }
    );
    
    return {
      diagnostics,
      suggestions,
      metrics,
      summary: {
        errors: diagnostics.filter(d => d.severity === 'error').length,
        warnings: diagnostics.filter(d => d.severity === 'warning').length,
        info: diagnostics.filter(d => d.severity === 'info').length,
        suggestions: suggestions.length
      },
      components,
      patterns,
      optimization
    };
  }
  
  /**
   * Analyze a single component
   */
  analyzeComponent(component: ComponentInfo): AnalysisResult {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Check complexity thresholds
    if (component.complexity.cyclomaticComplexity > 10) {
      diagnostics.push({
        id: 'high-complexity',
        severity: 'warning',
        message: `Component '${component.name}' has high cyclomatic complexity (${component.complexity.cyclomaticComplexity})`,
        location: component.location,
        category: 'complexity'
      });
      
      suggestions.push({
        id: 'split-component',
        title: 'Split complex component',
        description: `Consider breaking '${component.name}' into smaller, focused components`,
        location: component.location,
        category: 'refactoring',
        impact: 'high',
        effort: 'high'
      });
    }
    
    // Check for performance issues
    if (component.performance.unnecessaryRerenders > 0) {
      suggestions.push({
        id: 'reduce-rerenders',
        title: 'Optimize re-renders',
        description: `Component '${component.name}' has ${component.performance.unnecessaryRerenders} unnecessary re-renders`,
        location: component.location,
        category: 'performance',
        impact: 'high',
        effort: 'medium'
      });
    }
    
    // Check for memoization opportunities
    if (component.performance.memoizationOpportunities > 0) {
      suggestions.push({
        id: 'add-memoization',
        title: 'Add memoization',
        description: `${component.performance.memoizationOpportunities} expensive calculations could be memoized`,
        location: component.location,
        category: 'performance',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Check prop validation
    const unvalidatedProps = component.props.filter(p => !p.validation || p.validation.length === 0);
    if (unvalidatedProps.length > 0) {
      suggestions.push({
        id: 'add-prop-validation',
        title: 'Add prop validation',
        description: `${unvalidatedProps.length} props lack validation in '${component.name}'`,
        location: component.location,
        category: 'validation',
        impact: 'medium',
        effort: 'low'
      });
    }
    
    // Check for large components
    if (component.complexity.linesOfCode > 200) {
      suggestions.push({
        id: 'component-too-large',
        title: 'Component is too large',
        description: `Component '${component.name}' has ${component.complexity.linesOfCode} lines. Consider splitting.`,
        location: component.location,
        category: 'maintainability',
        impact: 'medium',
        effort: 'high'
      });
    }
    
    // Add component-specific metrics
    metrics.push(
      {
        name: 'component_complexity',
        value: component.complexity.cyclomaticComplexity,
        unit: 'score',
        category: 'complexity'
      },
      {
        name: 'component_props',
        value: component.props.length,
        unit: 'count',
        category: 'interface'
      },
      {
        name: 'component_state',
        value: component.state.length,
        unit: 'count',
        category: 'state'
      }
    );
    
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
   * Discover components in the project
   */
  private async discoverComponents(_projectRoot: string): Promise<ComponentInfo[]> {
    // Mock component discovery - in reality would parse TypeScript files
    return [
      {
        name: 'UserProfile',
        type: 'functional',
        location: {
          file: 'src/components/UserProfile.tsx',
          line: 10,
          column: 1
        },
        props: [
          { name: 'user', type: 'User', required: true, validation: ['object'] },
          { name: 'onUpdate', type: '(user: User) => void', required: false }
        ],
        state: [
          { name: 'isEditing', type: 'bindable', dependencies: [], updateFrequency: 5 },
          { name: 'formData', type: 'bindable', dependencies: ['user'], updateFrequency: 10 }
        ],
        dependencies: ['@exodra/core', 'zod'],
        complexity: {
          cyclomaticComplexity: 8,
          cognitiveComplexity: 12,
          nestingLevel: 3,
          linesOfCode: 150
        },
        performance: {
          renderComplexity: 'medium',
          memoizationOpportunities: 2,
          unnecessaryRerenders: 1,
          heavyComputations: 0
        }
      },
      {
        name: 'ProductList',
        type: 'functional',
        location: {
          file: 'src/components/ProductList.tsx',
          line: 15,
          column: 1
        },
        props: [
          { name: 'products', type: 'Product[]', required: true },
          { name: 'onSelect', type: '(product: Product) => void', required: false },
          { name: 'filters', type: 'ProductFilters', required: false, defaultValue: '{}' }
        ],
        state: [
          { name: 'selectedId', type: 'bindable', dependencies: [], updateFrequency: 3 },
          { name: 'filteredProducts', type: 'derived', dependencies: ['products', 'filters'], updateFrequency: 8 }
        ],
        dependencies: ['@exodra/core'],
        complexity: {
          cyclomaticComplexity: 12,
          cognitiveComplexity: 18,
          nestingLevel: 4,
          linesOfCode: 250
        },
        performance: {
          renderComplexity: 'high',
          memoizationOpportunities: 3,
          unnecessaryRerenders: 2,
          heavyComputations: 1
        }
      }
    ];
  }
  
  /**
   * Identify common component patterns
   */
  private identifyPatterns(components: ComponentInfo[]): ComponentPattern[] {
    const patterns: ComponentPattern[] = [];
    
    // Container/Presenter pattern
    const containerComponents = components.filter(c => 
      c.name.includes('Container') || c.state.length > c.props.length
    );
    if (containerComponents.length > 0) {
      patterns.push({
        name: 'Container/Presenter',
        description: 'Separation of data logic from presentation',
        occurrences: containerComponents.length,
        benefits: ['Better testability', 'Clearer separation of concerns'],
        considerations: ['May increase component count'],
        examples: containerComponents.map(c => c.location)
      });
    }
    
    // Compound components pattern
    const compoundComponents = components.filter(c => 
      c.props.some(p => p.name === 'children') && c.props.length > 1
    );
    if (compoundComponents.length > 0) {
      patterns.push({
        name: 'Compound Components',
        description: 'Components with flexible child composition',
        occurrences: compoundComponents.length,
        benefits: ['High flexibility', 'Reusable API'],
        considerations: ['Can be complex to understand'],
        examples: compoundComponents.map(c => c.location)
      });
    }
    
    // High-order component pattern
    const hocComponents = components.filter(c => 
      c.name.startsWith('with') || c.props.some(p => p.type.includes('Component'))
    );
    if (hocComponents.length > 0) {
      patterns.push({
        name: 'Higher-Order Components',
        description: 'Components that enhance other components',
        occurrences: hocComponents.length,
        benefits: ['Code reuse', 'Cross-cutting concerns'],
        considerations: ['Can complicate component tree'],
        examples: hocComponents.map(c => c.location)
      });
    }
    
    return patterns;
  }
  
  /**
   * Generate optimization report
   */
  private generateOptimizationReport(components: ComponentInfo[]): OptimizationReport {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Find memoization opportunities
    components.forEach(component => {
      if (component.performance.memoizationOpportunities > 0) {
        opportunities.push({
          id: `memo-${component.name}`,
          component: component.name,
          type: 'memoization',
          description: `Add memoization to reduce ${component.performance.memoizationOpportunities} expensive calculations`,
          impact: component.performance.memoizationOpportunities > 2 ? 'high' : 'medium',
          effort: 'low',
          estimatedSavings: {
            renderTime: component.performance.memoizationOpportunities * 5 // ms
          }
        });
      }
      
      // Component splitting opportunities
      if (component.complexity.cyclomaticComplexity > 10) {
        opportunities.push({
          id: `split-${component.name}`,
          component: component.name,
          type: 'splitting',
          description: `Split complex component to improve maintainability`,
          impact: 'high',
          effort: 'high',
          estimatedSavings: {
            renderTime: 10,
            memoryUsage: 20
          }
        });
      }
      
      // Lazy loading opportunities
      if (component.complexity.linesOfCode > 200) {
        opportunities.push({
          id: `lazy-${component.name}`,
          component: component.name,
          type: 'lazy-loading',
          description: `Large component could benefit from lazy loading`,
          impact: 'medium',
          effort: 'medium',
          estimatedSavings: {
            bundleSize: Math.floor(component.complexity.linesOfCode / 10) // KB estimate
          }
        });
      }
    });
    
    // Calculate priority scores
    const priority: OpportunityPriority[] = opportunities.map(opp => {
      let score = 0;
      
      // Impact scoring
      if (opp.impact === 'high') score += 30;
      else if (opp.impact === 'medium') score += 20;
      else score += 10;
      
      // Effort scoring (inverse - lower effort = higher score)
      if (opp.effort === 'low') score += 20;
      else if (opp.effort === 'medium') score += 10;
      else score += 5;
      
      // Savings scoring
      if (opp.estimatedSavings.renderTime && opp.estimatedSavings.renderTime > 10) score += 15;
      if (opp.estimatedSavings.bundleSize && opp.estimatedSavings.bundleSize > 50) score += 10;
      
      return {
        opportunity: opp.id,
        score,
        reasoning: `Impact: ${opp.impact}, Effort: ${opp.effort}, Type: ${opp.type}`
      };
    }).sort((a, b) => b.score - a.score);
    
    // Calculate potential savings
    const potentialSavings = {
      renderTime: opportunities.reduce((sum, opp) => sum + (opp.estimatedSavings.renderTime || 0), 0),
      memoryUsage: opportunities.reduce((sum, opp) => sum + (opp.estimatedSavings.memoryUsage || 0), 0),
      bundleSize: opportunities.reduce((sum, opp) => sum + (opp.estimatedSavings.bundleSize || 0), 0)
    };
    
    return {
      opportunities,
      potentialSavings,
      priority
    };
  }
  
  /**
   * Calculate average complexity across components
   */
  private calculateAverageComplexity(components: ComponentInfo[]): number {
    if (components.length === 0) return 0;
    
    const totalComplexity = components.reduce(
      (sum, component) => sum + component.complexity.cyclomaticComplexity,
      0
    );
    
    return Math.round(totalComplexity / components.length);
  }
  
  /**
   * Generate component health score
   */
  calculateHealthScore(component: ComponentInfo): number {
    let score = 100;
    
    // Complexity penalties
    if (component.complexity.cyclomaticComplexity > 15) score -= 20;
    else if (component.complexity.cyclomaticComplexity > 10) score -= 10;
    
    if (component.complexity.linesOfCode > 300) score -= 15;
    else if (component.complexity.linesOfCode > 200) score -= 8;
    
    // Performance penalties
    score -= component.performance.unnecessaryRerenders * 5;
    score -= component.performance.heavyComputations * 10;
    
    // Validation bonus
    const validatedProps = component.props.filter(p => p.validation && p.validation.length > 0);
    if (validatedProps.length === component.props.length && component.props.length > 0) {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }
}