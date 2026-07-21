/**
 * Performance analysis and optimization detection
 */

import type { AnalysisResult, Diagnostic, Suggestion, Metric, SourceLocation } from './types.js';

export interface PerformanceReport extends AnalysisResult {
  hotspots: PerformanceHotspot[];
  bottlenecks: PerformanceBottleneck[];
  optimization: PerformanceOptimization;
  benchmarks: BenchmarkResult[];
}

export interface PerformanceHotspot {
  location: SourceLocation;
  type: 'render' | 'computation' | 'memory' | 'network' | 'state-update';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  impact: {
    renderTime?: number; // ms
    memoryUsage?: number; // KB
    cpuUsage?: number; // percentage
  };
  frequency: number; // calls per second
  suggestions: string[];
}

export interface PerformanceBottleneck {
  id: string;
  name: string;
  location: SourceLocation;
  category: 'component' | 'signal' | 'computation' | 'bundle' | 'api';
  metrics: {
    executionTime: number; // ms
    memoryFootprint: number; // KB
    frequency: number; // calls/sec
  };
  threshold: {
    warning: number;
    critical: number;
  };
  rootCause: string;
  dependencies: string[];
}

export interface PerformanceOptimization {
  opportunities: OptimizationOpportunity[];
  estimatedImpact: {
    renderTimeReduction: number; // ms
    memorySaving: number; // KB
    bundleSizeReduction: number; // KB
    fpsImprovement: number; // frames per second
  };
  recommendations: PerformanceRecommendation[];
}

export interface OptimizationOpportunity {
  id: string;
  title: string;
  description: string;
  type: 'memoization' | 'virtualization' | 'lazy-loading' | 'code-splitting' | 'caching' | 'debouncing';
  priority: 'high' | 'medium' | 'low';
  effort: 'low' | 'medium' | 'high';
  impact: {
    performance: number; // 0-100 score
    userExperience: number; // 0-100 score
    maintainability: number; // 0-100 score
  };
  location: SourceLocation;
  implementation: {
    steps: string[];
    codeExample?: string;
    estimatedTime: number; // hours
  };
}

export interface PerformanceRecommendation {
  category: 'architecture' | 'patterns' | 'tools' | 'monitoring';
  title: string;
  description: string;
  benefits: string[];
  implementation: string[];
  priority: number; // 1-10
}

export interface BenchmarkResult {
  name: string;
  category: 'render' | 'update' | 'mount' | 'computation';
  value: number;
  unit: 'ms' | 'ops/sec' | 'KB' | 'fps';
  target: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'critical';
  trend?: 'improving' | 'stable' | 'degrading';
}

export class PerformanceAnalyzer {
  /**
   * Analyze performance characteristics of the project
   */
  async analyzePerformance(projectRoot: string): Promise<PerformanceReport> {
    const diagnostics: Diagnostic[] = [];
    const suggestions: Suggestion[] = [];
    const metrics: Metric[] = [];
    
    // Detect performance hotspots
    const hotspots = await this.detectHotspots(projectRoot);
    
    // Identify bottlenecks
    const bottlenecks = await this.identifyBottlenecks(projectRoot);
    
    // Generate optimization opportunities
    const optimization = await this.generateOptimizations(hotspots, bottlenecks);
    
    // Run benchmarks
    const benchmarks = await this.runBenchmarks(projectRoot);
    
    // Convert hotspots to diagnostics
    hotspots.forEach(hotspot => {
      const severity = hotspot.severity === 'critical' ? 'error' : 
                      hotspot.severity === 'high' ? 'warning' : 'info';
      
      diagnostics.push({
        id: `perf-hotspot-${hotspot.type}`,
        severity,
        message: hotspot.description,
        location: hotspot.location,
        category: 'performance',
        tags: ['performance', hotspot.type]
      });
    });
    
    // Convert optimizations to suggestions
    optimization.opportunities.forEach(opp => {
      suggestions.push({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        location: opp.location,
        category: 'performance',
        impact: opp.priority,
        effort: opp.effort,
        autoFixable: opp.type === 'memoization' || opp.type === 'debouncing'
      });
    });
    
    // Generate performance metrics
    metrics.push(
      ...this.generatePerformanceMetrics(hotspots, bottlenecks, benchmarks)
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
      hotspots,
      bottlenecks,
      optimization,
      benchmarks
    };
  }
  
  /**
   * Detect performance hotspots in the codebase
   */
  private async detectHotspots(_projectRoot: string): Promise<PerformanceHotspot[]> {
    const hotspots: PerformanceHotspot[] = [];
    
    // Mock hotspot detection - in reality would use static analysis + profiling
    hotspots.push(
      {
        location: {
          file: 'src/components/ProductList.tsx',
          line: 45,
          column: 12
        },
        type: 'render',
        severity: 'high',
        description: 'Complex filtering logic in render function causing expensive re-calculations',
        impact: {
          renderTime: 25,
          cpuUsage: 15
        },
        frequency: 12,
        suggestions: [
          'Move filtering logic to derived signal',
          'Use memoization for expensive calculations',
          'Consider virtualization for large lists'
        ]
      },
      {
        location: {
          file: 'src/utils/calculations.ts',
          line: 78,
          column: 8
        },
        type: 'computation',
        severity: 'critical',
        description: 'Recursive algorithm without memoization causing exponential time complexity',
        impact: {
          renderTime: 150,
          cpuUsage: 60
        },
        frequency: 8,
        suggestions: [
          'Add memoization to recursive function',
          'Consider iterative approach',
          'Implement caching layer'
        ]
      },
      {
        location: {
          file: 'src/components/UserDashboard.tsx',
          line: 120,
          column: 5
        },
        type: 'memory',
        severity: 'medium',
        description: 'Large objects created in render causing memory pressure',
        impact: {
          memoryUsage: 500,
          renderTime: 8
        },
        frequency: 20,
        suggestions: [
          'Move object creation outside render',
          'Use object pooling',
          'Implement lazy initialization'
        ]
      },
      {
        location: {
          file: 'src/hooks/useApiData.ts',
          line: 23,
          column: 15
        },
        type: 'network',
        severity: 'high',
        description: 'Multiple API calls triggered on every state change without debouncing',
        impact: {
          renderTime: 200,
          cpuUsage: 10
        },
        frequency: 45,
        suggestions: [
          'Add debouncing to API calls',
          'Implement request deduplication',
          'Use cache-first strategy'
        ]
      }
    );
    
    return hotspots;
  }
  
  /**
   * Identify performance bottlenecks
   */
  private async identifyBottlenecks(_projectRoot: string): Promise<PerformanceBottleneck[]> {
    const bottlenecks: PerformanceBottleneck[] = [];
    
    // Mock bottleneck identification
    bottlenecks.push(
      {
        id: 'component-product-list',
        name: 'ProductList Component',
        location: {
          file: 'src/components/ProductList.tsx',
          line: 1,
          column: 1
        },
        category: 'component',
        metrics: {
          executionTime: 35,
          memoryFootprint: 200,
          frequency: 15
        },
        threshold: {
          warning: 20,
          critical: 50
        },
        rootCause: 'Inefficient filtering and sorting operations',
        dependencies: ['ProductFilter', 'SortUtils', 'ProductItem']
      },
      {
        id: 'signal-user-preferences',
        name: 'User Preferences Signal',
        location: {
          file: 'src/signals/userPreferences.ts',
          line: 15,
          column: 10
        },
        category: 'signal',
        metrics: {
          executionTime: 12,
          memoryFootprint: 50,
          frequency: 100
        },
        threshold: {
          warning: 10,
          critical: 25
        },
        rootCause: 'Complex validation logic executed on every update',
        dependencies: ['ValidationSchema', 'LocalStorage']
      }
    );
    
    return bottlenecks;
  }
  
  /**
   * Generate optimization opportunities
   */
  private async generateOptimizations(
    hotspots: PerformanceHotspot[],
    bottlenecks: PerformanceBottleneck[]
  ): Promise<PerformanceOptimization> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Generate opportunities based on hotspots
    hotspots.forEach(hotspot => {
      if (hotspot.type === 'render' && hotspot.severity === 'high') {
        opportunities.push({
          id: `memo-${hotspot.location.file.split('/').pop()}`,
          title: 'Add Memoization',
          description: 'Memoize expensive calculations to prevent unnecessary re-computation',
          type: 'memoization',
          priority: 'high',
          effort: 'low',
          impact: {
            performance: 80,
            userExperience: 75,
            maintainability: 60
          },
          location: hotspot.location,
          implementation: {
            steps: [
              'Identify expensive calculations in component',
              'Wrap calculations with useMemo or move to derived signals',
              'Add dependencies array with minimal dependencies',
              'Test performance improvement'
            ],
            codeExample: `
// Before
const expensiveResult = calculateExpensiveValue(props.data);

// After
const expensiveResult = useMemo(() => 
  calculateExpensiveValue(props.data), 
  [props.data]
);`,
            estimatedTime: 2
          }
        });
      }
      
      if (hotspot.type === 'computation' && hotspot.impact.renderTime! > 50) {
        opportunities.push({
          id: `cache-${hotspot.location.line}`,
          title: 'Implement Caching',
          description: 'Add caching layer for expensive computations',
          type: 'caching',
          priority: 'high',
          effort: 'medium',
          impact: {
            performance: 90,
            userExperience: 85,
            maintainability: 70
          },
          location: hotspot.location,
          implementation: {
            steps: [
              'Create caching mechanism (Map or LRU cache)',
              'Add cache key generation logic',
              'Implement cache invalidation strategy',
              'Monitor cache hit rates'
            ],
            estimatedTime: 8
          }
        });
      }
      
      if (hotspot.type === 'network' && hotspot.frequency > 30) {
        opportunities.push({
          id: `debounce-${hotspot.location.line}`,
          title: 'Add Debouncing',
          description: 'Debounce network requests to reduce API call frequency',
          type: 'debouncing',
          priority: 'medium',
          effort: 'low',
          impact: {
            performance: 70,
            userExperience: 80,
            maintainability: 90
          },
          location: hotspot.location,
          implementation: {
            steps: [
              'Wrap API calls with debounce utility',
              'Configure appropriate delay (200-500ms)',
              'Handle loading states properly',
              'Test user experience'
            ],
            codeExample: `
// Before
const handleSearch = (query) => {
  apiCall(query);
};

// After
const handleSearch = debounce((query) => {
  apiCall(query);
}, 300);`,
            estimatedTime: 1
          }
        });
      }
    });
    
    // Generate opportunities based on bottlenecks
    bottlenecks.forEach(bottleneck => {
      if (bottleneck.metrics.executionTime > bottleneck.threshold.warning) {
        opportunities.push({
          id: `optimize-${bottleneck.id}`,
          title: `Optimize ${bottleneck.name}`,
          description: `Performance bottleneck detected in ${bottleneck.name}`,
          type: 'lazy-loading',
          priority: bottleneck.metrics.executionTime > bottleneck.threshold.critical ? 'high' : 'medium',
          effort: 'medium',
          impact: {
            performance: 75,
            userExperience: 70,
            maintainability: 60
          },
          location: bottleneck.location,
          implementation: {
            steps: [
              'Analyze bottleneck root cause',
              'Implement lazy loading strategy',
              'Add loading states and error handling',
              'Monitor performance improvements'
            ],
            estimatedTime: 6
          }
        });
      }
    });
    
    // Calculate estimated impact
    const estimatedImpact = {
      renderTimeReduction: opportunities.reduce((sum, opp) => 
        sum + (opp.impact.performance / 100 * 20), 0),
      memorySaving: opportunities.filter(opp => opp.type === 'caching' || opp.type === 'memoization')
        .length * 100,
      bundleSizeReduction: opportunities.filter(opp => opp.type === 'lazy-loading' || opp.type === 'code-splitting')
        .length * 50,
      fpsImprovement: opportunities.filter(opp => opp.priority === 'high')
        .length * 5
    };
    
    // Generate recommendations
    const recommendations: PerformanceRecommendation[] = [
      {
        category: 'patterns',
        title: 'Implement Virtual Scrolling',
        description: 'Use virtual scrolling for large lists to improve render performance',
        benefits: [
          'Constant render time regardless of list size',
          'Reduced memory usage',
          'Better user experience with large datasets'
        ],
        implementation: [
          'Install virtual scrolling library',
          'Replace large lists with virtual components',
          'Configure item height and container dimensions',
          'Test with realistic data sizes'
        ],
        priority: 8
      },
      {
        category: 'tools',
        title: 'Add Performance Monitoring',
        description: 'Implement real-time performance monitoring and alerting',
        benefits: [
          'Early detection of performance regressions',
          'Data-driven optimization decisions',
          'User experience insights'
        ],
        implementation: [
          'Integrate performance monitoring service',
          'Set up key metrics tracking',
          'Configure alerting thresholds',
          'Create performance dashboards'
        ],
        priority: 6
      }
    ];
    
    return {
      opportunities: opportunities.sort((a, b) => {
        const aPriority = a.priority === 'high' ? 3 : a.priority === 'medium' ? 2 : 1;
        const bPriority = b.priority === 'high' ? 3 : b.priority === 'medium' ? 2 : 1;
        return bPriority - aPriority;
      }),
      estimatedImpact,
      recommendations: recommendations.sort((a, b) => b.priority - a.priority)
    };
  }
  
  /**
   * Run performance benchmarks
   */
  private async runBenchmarks(_projectRoot: string): Promise<BenchmarkResult[]> {
    // Mock benchmark results
    return [
      {
        name: 'Component Render Time',
        category: 'render',
        value: 16.7,
        unit: 'ms',
        target: 16.7, // 60 FPS
        status: 'good',
        trend: 'stable'
      },
      {
        name: 'Signal Update Rate',
        category: 'update',
        value: 1200,
        unit: 'ops/sec',
        target: 1000,
        status: 'excellent',
        trend: 'improving'
      },
      {
        name: 'Initial Bundle Size',
        category: 'mount',
        value: 245,
        unit: 'KB',
        target: 200,
        status: 'needs-improvement',
        trend: 'stable'
      },
      {
        name: 'Memory Usage',
        category: 'computation',
        value: 15.2,
        unit: 'KB',
        target: 20,
        status: 'excellent',
        trend: 'improving'
      }
    ];
  }
  
  /**
   * Generate performance metrics
   */
  private generatePerformanceMetrics(
    hotspots: PerformanceHotspot[],
    bottlenecks: PerformanceBottleneck[],
    benchmarks: BenchmarkResult[]
  ): Metric[] {
    const metrics: Metric[] = [];
    
    // Hotspot metrics
    const criticalHotspots = hotspots.filter(h => h.severity === 'critical').length;
    const highHotspots = hotspots.filter(h => h.severity === 'high').length;
    
    metrics.push(
      {
        name: 'critical_hotspots',
        value: criticalHotspots,
        unit: 'count',
        category: 'performance',
        threshold: { warning: 1, error: 3 }
      },
      {
        name: 'high_priority_hotspots',
        value: highHotspots,
        unit: 'count',
        category: 'performance',
        threshold: { warning: 3, error: 8 }
      }
    );
    
    // Bottleneck metrics
    const severeBottlenecks = bottlenecks.filter(b => 
      b.metrics.executionTime > b.threshold.critical
    ).length;
    
    metrics.push({
      name: 'severe_bottlenecks',
      value: severeBottlenecks,
      unit: 'count',
      category: 'performance',
      threshold: { warning: 1, error: 3 }
    });
    
    // Benchmark metrics
    benchmarks.forEach(benchmark => {
      const status = benchmark.status;
      const statusScore = status === 'excellent' ? 100 : 
                         status === 'good' ? 80 : 
                         status === 'needs-improvement' ? 60 : 40;
      
      metrics.push({
        name: `benchmark_${benchmark.name.toLowerCase().replace(/\s+/g, '_')}`,
        value: statusScore,
        unit: 'score',
        category: 'benchmarks'
      });
    });
    
    // Overall performance score
    const avgBenchmarkScore = benchmarks.reduce((sum, b) => {
      const score = b.status === 'excellent' ? 100 : 
                   b.status === 'good' ? 80 : 
                   b.status === 'needs-improvement' ? 60 : 40;
      return sum + score;
    }, 0) / benchmarks.length;
    
    const performanceScore = Math.max(0, 
      avgBenchmarkScore - (criticalHotspots * 20) - (highHotspots * 10) - (severeBottlenecks * 15)
    );
    
    metrics.push({
      name: 'overall_performance_score',
      value: Math.round(performanceScore),
      unit: 'score',
      category: 'performance',
      threshold: { warning: 70, error: 50 }
    });
    
    return metrics;
  }
}