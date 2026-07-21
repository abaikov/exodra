/**
 * Plugin system for extending introspect with third-party UI libraries
 */

import { createRequire } from 'module';
import type {
  ExoAnalysisResult,
  ExoDiagnostic,
  ExoSuggestion,
  ExoMetric,
  ExoSourceLocation
} from './types.js';

const requirePackage = createRequire(import.meta.url);

export interface ExoIntrospectPlugin {
  /** Plugin metadata */
  name: string;
  version: string;
  description: string;
  author?: string;
  
  /** Library it supports */
  library: {
    name: string;
    version: string;
    packageName: string;
  };
  
  /** Plugin capabilities */
  capabilities: ExoPluginCapability[];
  
  /** Plugin lifecycle hooks */
  hooks: ExoPluginHooks;
  
  /** Component patterns this plugin can analyze */
  patterns: ExoComponentPattern[];
  
  /** Custom rules and validations */
  rules?: ExoPluginRule[];
  
  /** AI context providers */
  aiContext?: ExoAIContextProvider[];
}

export type ExoPluginCapability = 
  | 'component-analysis' 
  | 'performance-analysis' 
  | 'pattern-detection'
  | 'validation'
  | 'ai-context'
  | 'custom-metrics';

export interface ExoPluginHooks {
  /** Called before analysis starts */
  beforeAnalysis?: (context: ExoAnalysisContext) => Promise<void>;
  
  /** Called after core analysis completes */
  afterAnalysis?: (result: ExoAnalysisResult, context: ExoAnalysisContext) => Promise<ExoAnalysisResult>;
  
  /** Called when analyzing a specific component */
  analyzeComponent?: (component: ExoComponentInfo, context: ExoAnalysisContext) => Promise<ExoPluginAnalysisResult>;
  
  /** Called when generating AI context */
  generateAIContext?: (context: ExoAnalysisContext) => Promise<string>;
  
  /** Called when validating code patterns */
  validatePatterns?: (code: string, location: ExoSourceLocation) => Promise<ExoDiagnostic[]>;
}

export interface ExoComponentPattern {
  /** Pattern identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Pattern description */
  description: string;
  
  /** Matcher function to detect this pattern */
  matcher: (component: ExoComponentInfo) => boolean;
  
  /** Analysis specific to this pattern */
  analyze: (component: ExoComponentInfo) => Promise<ExoPatternAnalysisResult>;
  
  /** Best practices for this pattern */
  bestPractices: ExoBestPractice[];
  
  /** Performance considerations */
  performance?: ExoPerformanceGuidance;
}

export interface ExoPluginRule {
  /** Rule identifier */
  id: string;
  
  /** Rule name */
  name: string;
  
  /** Rule description */
  description: string;
  
  /** Severity level */
  severity: 'error' | 'warning' | 'info';
  
  /** Rule category */
  category: string;
  
  /** Rule implementation */
  check: (context: ExoRuleContext) => Promise<ExoDiagnostic[]>;
  
  /** Auto-fix capability */
  fix?: (context: ExoRuleContext) => Promise<string>;
  
  /** Rule configuration */
  config?: Record<string, string | number | boolean>;
}

export interface ExoAIContextProvider {
  /** Provider name */
  name: string;
  
  /** Context type */
  type: 'components' | 'patterns' | 'usage' | 'best-practices';
  
  /** Generate context for AI */
  provide: (context: ExoAnalysisContext) => Promise<string>;
  
  /** Priority (higher = more important) */
  priority: number;
}

export interface ExoAnalysisContext {
  projectRoot: string;
  files: string[];
  components: ExoComponentInfo[];
  dependencies: Record<string, string>;
  config: Record<string, string | number | boolean>;
}

export interface ExoComponentInfo {
  name: string;
  filePath: string;
  location: ExoSourceLocation;
  props: ExoPropInfo[];
  imports: string[];
  exports: string[];
  ast?: unknown; // AST node
}

export interface ExoPropInfo {
  name: string;
  type: string;
  required: boolean;
  defaultValue?: string | number | boolean;
  source: string;
}

export interface ExoPluginAnalysisResult {
  diagnostics: ExoDiagnostic[];
  suggestions: ExoSuggestion[];
  metrics: ExoMetric[];
  patterns: string[];
}

export interface ExoPatternAnalysisResult {
  confidence: number; // 0-1
  issues: ExoDiagnostic[];
  optimizations: ExoSuggestion[];
  examples?: string[];
}

export interface ExoBestPractice {
  title: string;
  description: string;
  example?: string;
  antiPattern?: string;
  references?: string[];
}

export interface ExoPerformanceGuidance {
  renderComplexity: 'low' | 'medium' | 'high';
  memoryFootprint: 'small' | 'medium' | 'large';
  recommendations: string[];
  commonPitfalls: string[];
}

export interface ExoRuleContext {
  component: ExoComponentInfo;
  code: string;
  ast: unknown;
  config: Record<string, string | number | boolean>;
}

/**
 * Plugin registry and manager
 */
export class ExoPluginManager {
  private plugins: Map<string, ExoIntrospectPlugin> = new Map();
  private enabledPlugins: Set<string> = new Set();

  /**
   * Register a plugin
   */
  register(plugin: ExoIntrospectPlugin): void {
    // Validate plugin
    this.validatePlugin(plugin);
    
    // Check for library compatibility
    this.checkCompatibility(plugin);
    
    // Register plugin
    this.plugins.set(plugin.name, plugin);
    
    console.log(`📦 Registered plugin: ${plugin.name} for ${plugin.library.name}`);
  }

  /**
   * Enable a plugin
   */
  enable(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin ${pluginName} not found`);
    }
    
    this.enabledPlugins.add(pluginName);
  }

  /**
   * Disable a plugin
   */
  disable(pluginName: string): void {
    this.enabledPlugins.delete(pluginName);
  }

  /**
   * Get all registered plugins (enabled or not).
   */
  getPlugins(): ExoIntrospectPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): ExoIntrospectPlugin[] {
    return Array.from(this.enabledPlugins)
      .map(name => this.plugins.get(name)!)
      .filter(Boolean);
  }

  /**
   * Get plugins for a specific library
   */
  getPluginsForLibrary(libraryName: string): ExoIntrospectPlugin[] {
    return Array.from(this.plugins.values())
      .filter(plugin => plugin.library.name === libraryName);
  }

  /**
   * Run plugin hooks
   */
  async runHook<T>(
    hookName: keyof ExoPluginHooks, 
    ...args: unknown[]
  ): Promise<T[]> {
    const results: T[] = [];
    
    for (const plugin of this.getEnabledPlugins()) {
      const hook = plugin.hooks[hookName] as (...args: unknown[]) => unknown;
      if (hook) {
        try {
          const result = await hook(...args);
          if (result !== undefined && result !== null) {
            results.push(result as T);
          }
        } catch (error) {
          console.error(`Plugin ${plugin.name} hook ${hookName} failed:`, error);
        }
      }
    }
    
    return results;
  }

  /**
   * Get AI context from all plugins
   */
  async generatePluginAIContext(context: ExoAnalysisContext): Promise<string> {
    const contextParts: string[] = [];
    
    for (const plugin of this.getEnabledPlugins()) {
      if (plugin.aiContext) {
        for (const provider of plugin.aiContext) {
          try {
            const contextContent = await provider.provide(context);
            contextParts.push(`## ${plugin.library.name} - ${provider.name}\n${contextContent}\n`);
          } catch (error) {
            console.error(`Plugin ${plugin.name} AI context failed:`, error);
          }
        }
      }
    }
    
    return contextParts.join('\n');
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: ExoIntrospectPlugin): void {
    if (!plugin.name || !plugin.version || !plugin.library) {
      throw new Error('Plugin must have name, version, and library information');
    }
    
    if (!plugin.capabilities.length) {
      throw new Error('Plugin must declare at least one capability');
    }
    
    if (!plugin.hooks && !plugin.patterns?.length && !plugin.rules?.length) {
      throw new Error('Plugin must provide hooks, patterns, or rules');
    }
  }

  /**
   * Check library compatibility
   */
  private checkCompatibility(plugin: ExoIntrospectPlugin): void {
    // Check if library is installed
    try {
      const packageJson = requirePackage(`${plugin.library.packageName}/package.json`);
      const installedVersion = packageJson.version;
      
      // Simplified version check - in reality would use semver
      if (!this.isVersionCompatible(installedVersion, plugin.library.version)) {
        console.warn(`Plugin ${plugin.name} expects ${plugin.library.name}@${plugin.library.version}, found ${installedVersion}`);
      }
    } catch (error) {
      console.warn(`Library ${plugin.library.packageName} not found, plugin ${plugin.name} may not work correctly`);
    }
  }

  /**
   * Simple version compatibility check
   */
  private isVersionCompatible(installed: string, expected: string): boolean {
    // Simplified - in reality would use proper semver matching
    return installed.startsWith(expected.split('.')[0]);
  }
}

/**
 * Plugin discovery and auto-registration
 */
export class ExoPluginDiscovery {
  
  /**
   * Discover plugins in node_modules
   */
  static async discoverPlugins(projectRoot: string): Promise<ExoIntrospectPlugin[]> {
    const plugins: ExoIntrospectPlugin[] = [];
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const nodeModulesPath = path.join(projectRoot, 'node_modules');
      const packages = await fs.readdir(nodeModulesPath);
      
      // Look for packages starting with 'exodra-introspect-'
      const pluginPackages = packages.filter(pkg => 
        pkg.startsWith('exodra-introspect-') || 
        pkg.startsWith('@exodra/introspect-')
      );
      
      for (const packageName of pluginPackages) {
        try {
          const pluginPath = path.join(nodeModulesPath, packageName);
          const plugin = await this.loadPlugin(pluginPath);
          if (plugin) {
            plugins.push(plugin);
          }
        } catch (error) {
          console.warn(`Failed to load plugin ${packageName}:`, error);
        }
      }
    } catch (error) {
      // No node_modules or access issues
    }
    
    return plugins;
  }

  /**
   * Load plugin from path
   */
  private static async loadPlugin(pluginPath: string): Promise<ExoIntrospectPlugin | null> {
    const path = await import('path');
    const fs = await import('fs/promises');

    // Check package.json for plugin metadata
    const packageJsonPath = path.join(pluginPath, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    // Look for exodra-introspect configuration
    if (!packageJson.exodraIntrospect) {
      return null;
    }

    // Load plugin module
    const pluginModule = await import(pluginPath);
    const plugin = pluginModule.default || pluginModule.plugin;

    if (!plugin) {
      throw new Error('Plugin module must export default or named "plugin" export');
    }

    return plugin;
  }
}

/**
 * Global plugin manager instance
 */
export const pluginManager = new ExoPluginManager();

/**
 * Helper functions for plugin development
 */
export class ExoPluginHelpers {
  
  /**
   * Create a simple component pattern matcher
   */
  static createComponentMatcher(
    importName: string,
    componentName?: string
  ): (component: ExoComponentInfo) => boolean {
    return (component) => {
      const hasImport = component.imports.some(imp => 
        imp.includes(importName)
      );
      
      if (componentName) {
        return hasImport && component.name.includes(componentName);
      }
      
      return hasImport;
    };
  }

  /**
   * Create a prop validation rule
   */
  static createPropRule(
    propName: string, 
    validation: (prop: ExoPropInfo) => boolean,
    message: string
  ): ExoPluginRule {
    return {
      id: `prop-${propName}`,
      name: `Validate ${propName} prop`,
      description: message,
      severity: 'warning',
      category: 'props',
      check: async (context) => {
        const diagnostics: ExoDiagnostic[] = [];
        const prop = context.component.props.find(p => p.name === propName);
        
        if (prop && !validation(prop)) {
          diagnostics.push({
            id: `prop-${propName}`,
            severity: 'warning',
            message,
            location: context.component.location,
            category: 'props'
          });
        }
        
        return diagnostics;
      }
    };
  }

  /**
   * Create performance analysis for heavy components
   */
  static createPerformancePattern(
    name: string,
    matcher: (component: ExoComponentInfo) => boolean,
    recommendations: string[]
  ): ExoComponentPattern {
    return {
      id: `perf-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      description: `Performance analysis for ${name}`,
      matcher,
      analyze: async (_component) => ({
        confidence: 0.8,
        issues: [],
        optimizations: [{
          id: `optimize-${name}`,
          title: `Optimize ${name}`,
          description: recommendations[0],
          category: 'performance',
          impact: 'medium' as const,
          effort: 'medium' as const
        }]
      }),
      bestPractices: recommendations.map(rec => ({
        title: rec,
        description: `Best practice for ${name} components`
      })),
      performance: {
        renderComplexity: 'high',
        memoryFootprint: 'large',
        recommendations,
        commonPitfalls: [
          'Rendering large datasets without virtualization',
          'Not memoizing expensive calculations',
          'Creating objects in render function'
        ]
      }
    };
  }
}

/**
 * Example plugin for a hypothetical table library
 */
export const exampleTablePlugin: ExoIntrospectPlugin = {
  name: 'exodra-table-introspect',
  version: '1.0.0',
  description: 'Introspect plugin for ExodraTable library',
  author: 'Exodra Team',
  
  library: {
    name: 'ExodraTable',
    version: '2.0.0',
    packageName: '@exodra/table'
  },
  
  capabilities: ['component-analysis', 'performance-analysis', 'pattern-detection', 'ai-context'],
  
  hooks: {
    analyzeComponent: async (component, _context) => {
      const diagnostics: ExoDiagnostic[] = [];
      const suggestions: ExoSuggestion[] = [];
      const metrics: ExoMetric[] = [];
      
      // Check if it's a table component
      const isTableComponent = component.imports.some(imp => imp.includes('@exodra/table'));
      
      if (isTableComponent) {
        // Check for common table performance issues
        const dataProps = component.props.filter(p => 
          p.name.includes('data') || p.name.includes('rows')
        );
        
        if (dataProps.length > 0) {
          const dataSize = 1000; // Mock data size analysis
          
          if (dataSize > 500) {
            suggestions.push({
              id: 'table-virtualization',
              title: 'Enable table virtualization',
              description: 'Large datasets should use virtual scrolling for better performance',
              category: 'performance',
              impact: 'high',
              effort: 'medium',
              location: component.location
            });
          }
        }
        
        // Check for sorting/filtering props
        const hasSorting = component.props.some(p => p.name.includes('sort'));
        const hasFiltering = component.props.some(p => p.name.includes('filter'));
        
        if (hasSorting && hasFiltering) {
          metrics.push({
            name: 'table_features',
            value: 2,
            unit: 'features',
            category: 'functionality'
          });
        }
      }
      
      return { diagnostics, suggestions, metrics, patterns: [] };
    },
    
    generateAIContext: async (context) => {
      const tableComponents = context.components.filter(c => 
        c.imports.some(imp => imp.includes('@exodra/table'))
      );
      
      if (tableComponents.length === 0) return '';
      
      return `
# ExodraTable Components

Found ${tableComponents.length} table components:

${tableComponents.map(comp => `
## ${comp.name}
- **File**: ${comp.filePath}
- **Props**: ${comp.props.map(p => `${p.name}:${p.type}`).join(', ')}
- **Features**: Sorting, Filtering, Pagination
- **Performance**: ${comp.props.some(p => p.name.includes('virtual')) ? 'Virtualized' : 'Standard rendering'}
`).join('\n')}

### Best Practices:
- Use virtualization for datasets > 500 rows
- Memoize column definitions
- Implement server-side sorting/filtering for large datasets
- Use row keys for efficient re-rendering
`;
    }
  },
  
  patterns: [
    ExoPluginHelpers.createPerformancePattern(
      'Large Data Table',
      ExoPluginHelpers.createComponentMatcher('@exodra/table', 'Table'),
      [
        'Enable virtual scrolling for large datasets',
        'Memoize column definitions',
        'Use server-side pagination',
        'Implement lazy loading for nested data'
      ]
    )
  ],
  
  rules: [
    ExoPluginHelpers.createPropRule(
      'data',
      (prop) => prop.type.includes('Array') && prop.required,
      'Table data prop should be a required array'
    )
  ],
  
  aiContext: [
    {
      name: 'Table Usage Patterns',
      type: 'patterns',
      priority: 8,
      provide: async (_context) => {
        return 'Tables are used for displaying structured data with sorting and filtering capabilities.';
      }
    }
  ]
};