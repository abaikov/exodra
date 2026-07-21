/**
 * Universal AI provider interface for any AI tool integration
 */

import type { ExoAnalysisResult, ExoAnalysisContext } from './types.js';

export interface ExoAIProvider {
  /** Provider identification */
  name: string;
  version: string;
  description: string;
  
  /** Provider capabilities */
  capabilities: ExoAICapability[];
  
  /** Connection configuration */
  connection: ExoAIConnection;
  
  /** API methods */
  analyze(request: ExoAIAnalysisRequest): Promise<ExoAIAnalysisResponse>;
  explain(request: ExoAIExplanationRequest): Promise<string>;
  suggest(request: ExoAISuggestionRequest): Promise<ExoAISuggestion[]>;
  
  /** Optional streaming support */
  analyzeStream?(request: ExoAIAnalysisRequest): AsyncGenerator<ExoAIStreamChunk>;
  
  /** Health check */
  ping(): Promise<boolean>;
}

export type ExoAICapability = 
  | 'code-analysis'
  | 'code-explanation' 
  | 'code-generation'
  | 'refactoring'
  | 'performance-optimization'
  | 'security-analysis'
  | 'pattern-detection'
  | 'documentation-generation'
  | 'test-generation';

export interface ExoAIConnection {
  type: 'http' | 'websocket' | 'grpc' | 'local' | 'plugin';
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  
  /** Authentication */
  auth?: {
    type: 'bearer' | 'basic' | 'custom';
    credentials: string | Record<string, string>;
  };
  
  /** Rate limiting */
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute?: number;
  };
}

export interface ExoAIAnalysisRequest {
  /** Project context */
  projectRoot: string;
  files: ExoFileInfo[];
  dependencies: Record<string, string>;
  
  /** Analysis scope */
  scope: 'file' | 'component' | 'project' | 'custom';
  target?: string;
  
  /** Code and context */
  code?: string;
  language: 'typescript' | 'javascript' | 'jsx' | 'tsx';
  
  /** Exodra specific context */
  exodraContext: {
    schemas: unknown[];
    components: unknown[];
    routes: unknown[];
    plugins: string[];
  };
  
  /** Analysis preferences */
  focus?: ExoAnalysisFocus[];
  maxTokens?: number;
  temperature?: number;
  
  /** Additional context */
  previousAnalysis?: ExoAnalysisResult;
  userPrompt?: string;
}

export interface ExoFileInfo {
  path: string;
  content: string;
  language: string;
  size: number;
  lastModified: Date;
}

export interface ExoAnalysisFocus {
  area: 'performance' | 'security' | 'maintainability' | 'patterns' | 'testing' | 'accessibility';
  priority: 'low' | 'medium' | 'high';
  specific?: string[]; // Specific aspects to focus on
}

export interface ExoAIAnalysisResponse {
  /** Analysis results */
  analysis: {
    issues: ExoAIIssue[];
    suggestions: ExoAISuggestion[];
    patterns: ExoAIPattern[];
    metrics: ExoAIMetric[];
  };
  
  /** AI insights */
  insights: {
    summary: string;
    keyFindings: string[];
    recommendations: string[];
    riskAssessment: string;
  };
  
  /** Code improvements */
  improvements: ExoAIImprovement[];
  
  /** Metadata */
  metadata: {
    model: string;
    processingTime: number;
    tokensUsed: number;
    confidence: number; // 0-1
    costEstimate?: number;
  };
}

export interface ExoAIIssue {
  id: string;
  type: 'bug' | 'performance' | 'security' | 'style' | 'maintainability';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  location?: {
    file: string;
    line: number;
    column: number;
  };
  fix?: {
    description: string;
    code?: string;
    automated: boolean;
  };
  references?: string[];
}

export interface ExoAISuggestion {
  id: string;
  category: string;
  title: string;
  description: string;
  reasoning: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number; // 1-10
  
  implementation?: {
    steps: string[];
    codeExample?: string;
    estimatedTime?: number; // hours
    prerequisites?: string[];
  };
  
  alternatives?: Array<{
    title: string;
    description: string;
    pros: string[];
    cons: string[];
  }>;
}

export interface ExoAIPattern {
  name: string;
  type: 'design-pattern' | 'anti-pattern' | 'best-practice' | 'code-smell';
  confidence: number; // 0-1
  description: string;
  occurrences: Array<{
    file: string;
    line: number;
    context: string;
  }>;
  recommendation: string;
}

export interface ExoAIMetric {
  name: string;
  value: number;
  unit: string;
  category: string;
  benchmark?: {
    industry: number;
    optimal: number;
  };
  trend?: 'improving' | 'stable' | 'declining';
}

export interface ExoAIImprovement {
  type: 'refactor' | 'optimize' | 'modernize' | 'simplify';
  title: string;
  description: string;
  
  original: {
    file: string;
    code: string;
    lines: [number, number];
  };
  
  improved: {
    code: string;
    explanation: string;
  };
  
  benefits: string[];
  impact: {
    performance?: number; // percentage improvement
    readability?: number;
    maintainability?: number;
  };
}

export interface ExoAIExplanationRequest {
  code: string;
  language: string;
  context: {
    purpose: string;
    complexity: 'low' | 'medium' | 'high';
    audience: 'beginner' | 'intermediate' | 'expert';
  };
  focus?: string[]; // What aspects to explain
}

export interface ExoAISuggestionRequest {
  problem: string;
  context: ExoAnalysisContext;
  constraints?: string[];
  preferences?: {
    style: 'functional' | 'object-oriented' | 'mixed';
    performance: 'balanced' | 'speed' | 'memory';
    verbosity: 'concise' | 'detailed';
  };
}

export interface ExoAIStreamChunk {
  type: 'analysis' | 'suggestion' | 'explanation' | 'completion';
  data: unknown;
  done: boolean;
}

/**
 * Registry for AI providers
 */
export class ExoAIProviderRegistry {
  private providers: Map<string, ExoAIProvider> = new Map();
  private activeProvider: string | null = null;
  
  /**
   * Register an AI provider
   */
  register(provider: ExoAIProvider): void {
    this.validateProvider(provider);
    this.providers.set(provider.name, provider);
    console.log(`🤖 Registered AI provider: ${provider.name}`);
  }
  
  /**
   * Set active provider
   */
  setActive(providerName: string): void {
    if (!this.providers.has(providerName)) {
      throw new Error(`AI provider ${providerName} not found`);
    }
    this.activeProvider = providerName;
  }
  
  /**
   * Get active provider
   */
  getActive(): ExoAIProvider | null {
    if (!this.activeProvider) return null;
    return this.providers.get(this.activeProvider) || null;
  }
  
  /**
   * Get all available providers
   */
  getAll(): ExoAIProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get providers by capability
   */
  getByCapability(capability: ExoAICapability): ExoAIProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.capabilities.includes(capability));
  }
  
  /**
   * Auto-select best provider for task
   */
  selectBest(capabilities: ExoAICapability[]): ExoAIProvider | null {
    const candidates = this.providers.values();
    let bestProvider: ExoAIProvider | null = null;
    let bestScore = 0;
    
    for (const provider of candidates) {
      const score = capabilities.filter(cap => 
        provider.capabilities.includes(cap)
      ).length;
      
      if (score > bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }
    
    return bestProvider;
  }

  /**
   * Get provider by name
   */
  getByName(name: string): ExoAIProvider | null {
    return this.providers.get(name) || null;
  }
  
  private validateProvider(provider: ExoAIProvider): void {
    if (!provider.name || !provider.version) {
      throw new Error('AI provider must have name and version');
    }
    
    if (!provider.capabilities.length) {
      throw new Error('AI provider must declare capabilities');
    }
    
    if (!provider.analyze) {
      throw new Error('AI provider must implement analyze method');
    }
  }
}

/**
 * Universal AI adapter that works with any provider
 */
export class ExoUniversalAI {
  private registry = new ExoAIProviderRegistry();
  
  constructor() {
    this.registerBuiltinProviders();
  }
  
  /**
   * Analyze code with best available AI
   */
  async analyze(request: ExoAIAnalysisRequest): Promise<ExoAIAnalysisResponse> {
    const provider = this.registry.selectBest(['code-analysis']);
    
    if (!provider) {
      throw new Error('No AI provider available for code analysis');
    }
    
    try {
      return await provider.analyze(request);
    } catch (error) {
      console.error(`AI analysis failed with ${provider.name}:`, error);
      
      // Try fallback provider
      const fallback = this.getFallbackProvider(provider);
      if (fallback) {
        console.log(`Falling back to ${fallback.name}`);
        return await fallback.analyze(request);
      }
      
      throw error;
    }
  }
  
  /**
   * Get code explanation
   */
  async explain(
    code: string, 
    context: ExoAIExplanationRequest['context']
  ): Promise<string> {
    const provider = this.registry.selectBest(['code-explanation']);
    
    if (!provider) {
      return 'No AI provider available for code explanation';
    }
    
    return await provider.explain({ code, language: 'typescript', context });
  }
  
  /**
   * Get improvement suggestions
   */
  async suggest(request: ExoAISuggestionRequest): Promise<ExoAISuggestion[]> {
    const provider = this.registry.selectBest(['refactoring', 'performance-optimization']);
    
    if (!provider) {
      return [];
    }
    
    return await provider.suggest(request);
  }
  
  /**
   * Register external AI provider
   */
  registerProvider(provider: ExoAIProvider): void {
    this.registry.register(provider);
  }
  
  /**
   * Connect to external AI service
   */
  async connectExternal(config: ExoExternalAIConfig): Promise<void> {
    const provider = await this.createExternalProvider(config);
    this.registry.register(provider);
    
    // Test connection
    const isHealthy = await provider.ping();
    if (!isHealthy) {
      throw new Error(`Failed to connect to external AI: ${config.name}`);
    }
    
    console.log(`✅ Connected to external AI: ${config.name}`);
  }
  
  /**
   * Get available providers info
   */
  getProviders(): Array<{
    name: string;
    capabilities: ExoAICapability[];
    status: 'available' | 'error' | 'rate-limited';
  }> {
    return this.registry.getAll().map(provider => ({
      name: provider.name,
      capabilities: provider.capabilities,
      status: 'available' // Would check actual status
    }));
  }
  
  private async createExternalProvider(config: ExoExternalAIConfig): Promise<ExoAIProvider> {
    return {
      name: config.name,
      version: config.version || '1.0.0',
      description: config.description || 'External AI provider',
      capabilities: config.capabilities,
      connection: config.connection,
      
      analyze: async (request: ExoAIAnalysisRequest): Promise<ExoAIAnalysisResponse> => {
        return await this.callExternalAPI(config, 'analyze', request);
      },
      
      explain: async (request) => {
        const response = await this.callExternalAPI(config, 'explain', request);
        return response.insights?.summary || 'No explanation available';
      },
      
      suggest: async (request): Promise<ExoAISuggestion[]> => {
        const response = await this.callExternalAPI(config, 'suggest', request);
        return response.analysis?.suggestions || [];
      },
      
      ping: async () => {
        try {
          await this.callExternalAPI(config, 'health', {});
          return true;
        } catch {
          return false;
        }
      }
    };
  }
  
  private async callExternalAPI(config: ExoExternalAIConfig, endpoint: string, data: unknown): Promise<ExoAIAnalysisResponse> {
    const url = `${config.connection.endpoint}/${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.connection.headers
    };
    
    if (config.connection.auth) {
      if (config.connection.auth.type === 'bearer') {
        headers.Authorization = `Bearer ${config.connection.auth.credentials}`;
      }
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...(data as Record<string, unknown>),
        provider: 'exodra-introspect',
        version: '1.0.0'
      })
    });
    
    if (!response.ok) {
      throw new Error(`External AI API error: ${response.status}`);
    }
    
    return await response.json() as ExoAIAnalysisResponse;
  }
  
  private registerBuiltinProviders(): void {
    // Register built-in providers (OpenAI, Anthropic, etc.)
    // This would include existing providers from ai.ts
  }
  
  private getFallbackProvider(failed: ExoAIProvider): ExoAIProvider | null {
    const alternatives = this.registry.getAll()
      .filter(p => p.name !== failed.name)
      .filter(p => p.capabilities.some(cap => failed.capabilities.includes(cap)));
    
    return alternatives[0] || null;
  }
}

export interface ExoExternalAIConfig {
  name: string;
  version?: string;
  description?: string;
  capabilities: ExoAICapability[];
  connection: ExoAIConnection;
}

/**
 * Examples of external AI tool integrations
 */

// GitHub Copilot integration
export const githubCopilotProvider: ExoAIProvider = {
  name: 'github-copilot',
  version: '1.0.0',
  description: 'GitHub Copilot integration',
  capabilities: ['code-generation', 'code-explanation'],
  connection: {
    type: 'plugin',
    endpoint: 'vscode://github.copilot'
  },
  
  analyze: async (_request: ExoAIAnalysisRequest): Promise<ExoAIAnalysisResponse> => {
    // Integration with Copilot API
    return {
      analysis: { issues: [], suggestions: [], patterns: [], metrics: [] },
      insights: {
        summary: 'Copilot analysis completed',
        keyFindings: [],
        recommendations: [],
        riskAssessment: 'Low risk'
      },
      improvements: [],
      metadata: {
        model: 'copilot',
        processingTime: 100,
        tokensUsed: 0,
        confidence: 0.8
      }
    };
  },
  
  explain: async (request) => {
    return `GitHub Copilot explanation for: ${request.code.slice(0, 50)}...`;
  },

  suggest: async (_request) => {
    return [{
      id: 'copilot-suggestion',
      category: 'code-generation',
      title: 'Copilot suggestion',
      description: 'Generated code suggestion',
      reasoning: 'Based on similar patterns',
      impact: 'medium',
      effort: 'low',
      priority: 5
    }];
  },
  
  ping: async () => true
};

// Custom external AI service
export const customAIProvider = (config: ExoExternalAIConfig): ExoAIProvider => ({
  name: config.name,
  version: config.version || '1.0.0',
  description: config.description || 'Custom AI provider',
  capabilities: config.capabilities,
  connection: config.connection,
  
  analyze: async (request: ExoAIAnalysisRequest): Promise<ExoAIAnalysisResponse> => {
    // Call your custom AI service
    const response = await fetch(`${config.connection.endpoint}/analyze`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.connection.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    return await response.json() as ExoAIAnalysisResponse;
  },
  
  explain: async (request) => {
    const response = await fetch(`${config.connection.endpoint}/explain`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.connection.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    const result = await response.json();
    return (result as { explanation: string }).explanation;
  },
  
  suggest: async (request) => {
    const response = await fetch(`${config.connection.endpoint}/suggest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.connection.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    });
    
    const result = await response.json();
    return (result as { suggestions: ExoAISuggestion[] }).suggestions;
  },
  
  ping: async () => {
    try {
      const response = await fetch(`${config.connection.endpoint}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
});

// Global instance
export const universalAI = new ExoUniversalAI();