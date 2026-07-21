/**
 * @exodra/introspect - AI-powered introspection and developer tooling
 * 
 * Provides comprehensive analysis capabilities for Exodra applications including:
 * - Schema introspection and validation
 * - Component analysis and optimization suggestions
 * - Performance bottleneck detection
 * - AI-powered code insights and recommendations
 * - Developer tooling integrations
 */

export { IntrospectionEngine, type IntrospectionConfig } from './engine.js';
export { SchemaAnalyzer, type SchemaAnalysis } from './schema.js';
export { ComponentAnalyzer, type ComponentAnalysis } from './components.js';
export { PerformanceAnalyzer, type PerformanceReport } from './performance.js';
export { CodeAnalyzer, type CodeAnalysis } from './analysis.js';
export { ExoRouterAnalyzer, type ExoRouterAnalysis } from './router.js';

// Plugin system
export { 
  ExoPluginManager, 
  ExoPluginDiscovery,
  type ExoIntrospectPlugin,
  type ExoPluginCapability
} from './plugins.js';
export { 
  ExoExtensibleIntrospectionEngine,
  type ExoExtensibleConfig
} from './extensible-engine.js';
export { exoRouterPlugin } from './plugins/router.js';

// Universal AI system
export {
  ExoUniversalAI,
  ExoAIProviderRegistry,
  universalAI,
  githubCopilotProvider,
  customAIProvider,
  type ExoAIProvider,
  type ExoAIAnalysisRequest,
  type ExoAIAnalysisResponse,
  type ExoAICapability,
  type ExoExternalAIConfig
} from './ai-providers.js';

// Main introspection API
export { introspect, quickIntrospect, formatResults, type IntrospectOptions, type IntrospectResult } from './introspect.js';

// ESLint plugin
export { default as eslintPlugin } from './eslint-plugin.js';

// Types
export type {
  ExoAnalysisResult,
  ExoDiagnostic,
  ExoDiagnosticSeverity,
  ExoSourceLocation,
  ExoSuggestion,
  ExoMetric
} from './types.js';