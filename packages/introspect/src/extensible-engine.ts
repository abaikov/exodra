/**
 * Extensible introspection engine with plugin support
 */

import type { 
  ExoAnalysisResult, 
  ExoDiagnostic, 
  ExoSuggestion, 
  ExoMetric, 
  IntrospectionConfig,
  ExoComponentDefinition
} from './types.js';
import { 
  ExoPluginManager, 
  ExoPluginDiscovery, 
  type ExoIntrospectPlugin,
  type ExoAnalysisContext as PluginAnalysisContext,
  type ExoComponentInfo 
} from './plugins.js';

// Use the plugin context type directly
type ExtendedAnalysisContext = PluginAnalysisContext;

export interface ExoExtensibleConfig extends IntrospectionConfig {
  /** Plugin configuration */
  plugins?: {
    /** Auto-discover plugins in node_modules */
    autoDiscover?: boolean;
    
    /** Explicitly enabled plugins */
    enabled?: string[];
    
    /** Plugin-specific configuration */
    config?: Record<string, string | number | boolean>;
    
    /** Plugin search paths */
    searchPaths?: string[];
  };
}

export class ExoExtensibleIntrospectionEngine {
  private pluginManager: ExoPluginManager;
  private config: ExoExtensibleConfig;
  
  constructor(config: ExoExtensibleConfig) {
    this.config = {
      plugins: {
        autoDiscover: true,
        enabled: [],
        config: {},
        searchPaths: []
      },
      ...config
    };
    
    this.pluginManager = new ExoPluginManager();
  }
  
  /**
   * Initialize engine with plugin discovery
   */
  async initialize(): Promise<void> {
    // Auto-discover plugins if enabled
    if (this.config.plugins?.autoDiscover) {
      await this.discoverAndRegisterPlugins();
    }
    
    // Enable explicitly configured plugins
    if (this.config.plugins?.enabled) {
      for (const pluginName of this.config.plugins.enabled) {
        try {
          this.pluginManager.enable(pluginName);
        } catch (error) {
          console.warn(`Failed to enable plugin ${pluginName}:`, error);
        }
      }
    }
  }
  
  /**
   * Register a plugin manually
   */
  registerPlugin(plugin: ExoIntrospectPlugin): void {
    this.pluginManager.register(plugin);
  }
  
  /**
   * Analyze project with plugin support
   */
  async analyze(): Promise<ExoAnalysisResult> {
    const diagnostics: ExoDiagnostic[] = [];
    const suggestions: ExoSuggestion[] = [];
    const metrics: ExoMetric[] = [];
    
    // Create analysis context
    const context = await this.createAnalysisContext();
    
    // Run beforeAnalysis hooks
    await this.pluginManager.runHook('beforeAnalysis', context);
    
    // Perform core analysis (simplified - would use actual engine)
    const coreResult = await this.performCoreAnalysis(context);
    diagnostics.push(...coreResult.diagnostics);
    suggestions.push(...coreResult.suggestions);
    metrics.push(...coreResult.metrics);
    
    // Run component analysis hooks for each component
    const components = await this.analyzeComponents();
    for (const component of components) {
      const pluginResults = await this.pluginManager.runHook(
        'analyzeComponent', 
        component, 
        context
      );
      
      pluginResults.forEach(result => {
        const analysisResult = result as { diagnostics?: unknown[]; suggestions?: unknown[]; metrics?: unknown[] };
        if (analysisResult.diagnostics) diagnostics.push(...(analysisResult.diagnostics as ExoDiagnostic[]));
        if (analysisResult.suggestions) suggestions.push(...(analysisResult.suggestions as ExoSuggestion[]));
        if (analysisResult.metrics) metrics.push(...(analysisResult.metrics as ExoMetric[]));
      });
    }
    
    // Create initial result
    let result: ExoAnalysisResult = {
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
    
    // Run afterAnalysis hooks to allow plugins to modify results
    const modifiedResults = await this.pluginManager.runHook(
      'afterAnalysis', 
      result, 
      context
    );
    
    // Apply modifications from plugins
    if (modifiedResults.length > 0) {
      const lastResult = modifiedResults[modifiedResults.length - 1];
      if (lastResult && typeof lastResult === 'object' && 'diagnostics' in lastResult) {
        result = lastResult as ExoAnalysisResult;
      }
    }
    
    return result;
  }
  
  /**
   * Generate AI context with plugin contributions
   */
  async generateAIContext(): Promise<string> {
    const context = await this.createAnalysisContext();
    
    const sections = [
      '# Project Analysis Context\n',
      await this.generateCoreAIContext(context),
      '\n# Plugin Analysis\n',
      await this.pluginManager.generatePluginAIContext(context)
    ];
    
    return sections.filter(Boolean).join('\n');
  }
  
  /**
   * Get information about registered plugins
   */
  getPluginInfo(): Array<{
    name: string;
    version: string;
    library: string;
    enabled: boolean;
    capabilities: string[];
  }> {
    const enabledPlugins = new Set(
      this.pluginManager.getEnabledPlugins().map(p => p.name)
    );
    
    return Array.from(this.pluginManager['plugins'].values()).map(plugin => ({
      name: plugin.name,
      version: plugin.version,
      library: plugin.library.name,
      enabled: enabledPlugins.has(plugin.name),
      capabilities: plugin.capabilities
    }));
  }
  
  /**
   * Enable/disable plugins dynamically
   */
  configurePlugin(pluginName: string, enabled: boolean): void {
    if (enabled) {
      this.pluginManager.enable(pluginName);
    } else {
      this.pluginManager.disable(pluginName);
    }
  }
  
  /**
   * Get plugins for a specific library
   */
  getLibraryPlugins(libraryName: string): ExoIntrospectPlugin[] {
    return this.pluginManager.getPluginsForLibrary(libraryName);
  }
  
  /**
   * Discover and register plugins automatically
   */
  private async discoverAndRegisterPlugins(): Promise<void> {
    try {
      const discoveredPlugins = await ExoPluginDiscovery.discoverPlugins(
        this.config.projectRoot
      );
      
      for (const plugin of discoveredPlugins) {
        try {
          this.pluginManager.register(plugin);
          console.log(`🔌 Auto-discovered plugin: ${plugin.name}`);
        } catch (error) {
          console.warn(`Failed to register discovered plugin ${plugin.name}:`, error);
        }
      }
      
      // Auto-enable discovered plugins based on installed libraries
      await this.autoEnablePlugins();
      
    } catch (error) {
      console.warn('Plugin discovery failed:', error);
    }
  }
  
  /**
   * Auto-enable plugins based on detected libraries
   */
  private async autoEnablePlugins(): Promise<void> {
    const packageJson = await this.loadPackageJson();
    const dependencies = {
      ...(packageJson.dependencies as Record<string, string> || {}),
      ...(packageJson.devDependencies as Record<string, string> || {})
    };
    
    // Enable plugins for detected libraries
    for (const [libName] of Object.entries(dependencies)) {
      const plugins = this.pluginManager.getPluginsForLibrary(libName);
      for (const plugin of plugins) {
        this.pluginManager.enable(plugin.name);
        console.log(`🚀 Auto-enabled plugin: ${plugin.name} (detected ${libName})`);
      }
    }
  }
  
  /**
   * Create analysis context for plugins
   */
  private async createAnalysisContext(): Promise<ExtendedAnalysisContext> {
    const files = await this.discoverSourceFiles();
    const components = await this.analyzeComponents();
    const packageJson = await this.loadPackageJson();
    
    // Convert ExoComponentDefinition to ExoComponentInfo
    const componentInfos: ExoComponentInfo[] = components.map(comp => ({
      name: comp.name,
      filePath: comp.location.file,
      location: comp.location,
      imports: [],
      exports: [comp.name],
      props: comp.props.map(prop => ({ 
        ...prop, 
        source: 'props' as const,
        defaultValue: prop.defaultValue === null ? undefined : prop.defaultValue
      })),
      complexity: comp.complexity
    }));
    
    return {
      projectRoot: this.config.projectRoot,
      files,
      components: componentInfos,
      dependencies: {
        ...packageJson.dependencies as Record<string, string>,
        ...packageJson.devDependencies as Record<string, string>
      },
      config: this.config.plugins?.config || {}
    };
  }
  
  /**
   * Perform core analysis without plugins
   */
  private async performCoreAnalysis(_context: ExtendedAnalysisContext): Promise<ExoAnalysisResult> {
    // Simplified core analysis - would integrate with existing engines
    return {
      diagnostics: [],
      suggestions: [],
      metrics: [{
        name: 'core_analysis_completed',
        value: 1,
        unit: 'boolean',
        category: 'system'
      }],
      summary: { errors: 0, warnings: 0, info: 0, suggestions: 0 }
    };
  }
  
  /**
   * Generate core AI context
   */
  private async generateCoreAIContext(context: ExtendedAnalysisContext): Promise<string> {
    return `
## Core Project Information
- **Root**: ${context.projectRoot}
- **Files**: ${context.files.length} source files
- **Components**: ${context.components.length} components
- **Dependencies**: ${Object.keys(context.dependencies).join(', ')}
`;
  }
  
  /**
   * Helper methods
   */
  private async discoverSourceFiles(): Promise<string[]> {
    // Mock implementation
    return ['src/App.tsx', 'src/components/Table.tsx'];
  }
  
  private async analyzeComponents(): Promise<ExoComponentDefinition[]> {
    // Mock implementation
    return [
      {
        name: 'App',
        location: { file: 'src/App.tsx', line: 1, column: 1 },
        props: [],
        complexity: { cyclomaticComplexity: 5, cognitiveComplexity: 3, linesOfCode: 50 }
      },
      {
        name: 'DataTable',
        location: { file: 'src/components/Table.tsx', line: 10, column: 1 },
        props: [
          { name: 'data', type: 'Array<unknown>', required: true },
          { name: 'columns', type: 'Column[]', required: true }
        ],
        complexity: { cyclomaticComplexity: 8, cognitiveComplexity: 10, linesOfCode: 120 }
      }
    ];
  }
  
  private async loadPackageJson(): Promise<Record<string, unknown>> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const packagePath = path.join(this.config.projectRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { dependencies: {}, devDependencies: {} };
    }
  }
}

/**
 * Factory function to create extensible engine
 */
export async function createExoIntrospectionEngine(
  config: ExoExtensibleConfig
): Promise<ExoExtensibleIntrospectionEngine> {
  const engine = new ExoExtensibleIntrospectionEngine(config);
  await engine.initialize();
  return engine;
}