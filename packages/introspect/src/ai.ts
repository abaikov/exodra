/**
 * AI connectivity layer for enhanced code analysis and suggestions
 */

import type { AnalysisResult, Suggestion, Diagnostic, SourceLocation } from './types.js';

export interface AIProvider {
  name: string;
  analyze(context: AnalysisContext): Promise<AIAnalysisResult>;
  generateSuggestion(request: SuggestionRequest): Promise<Suggestion>;
  explainCode(code: string, context: CodeContext): Promise<string>;
}

export interface AnalysisContext {
  code: string;
  filePath: string;
  projectContext?: ProjectContext;
  existingDiagnostics?: Diagnostic[];
  focusAreas?: AnalysisFocus[];
}

export interface ProjectContext {
  dependencies: string[];
  framework: string;
  patterns: CodePattern[];
  conventions: CodingConvention[];
}

export interface CodePattern {
  name: string;
  description: string;
  examples: string[];
}

export interface CodingConvention {
  category: string;
  rules: string[];
}

export interface AnalysisFocus {
  area: 'performance' | 'security' | 'maintainability' | 'patterns' | 'testing';
  priority: 'low' | 'medium' | 'high';
}

export interface SuggestionRequest {
  code: string;
  location: SourceLocation;
  issue: string;
  context: AnalysisContext;
}

export interface CodeContext {
  purpose: string;
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export interface AIAnalysisResult {
  suggestions: Suggestion[];
  explanations: Explanation[];
  confidence: number;
  metadata: {
    model: string;
    analysisTime: number;
    tokensUsed?: number;
  };
}

export interface Explanation {
  topic: string;
  description: string;
  examples?: string[];
  references?: string[];
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider implements AIProvider {
  name = 'openai';
  
  constructor(
    private apiKey: string,
    private model: string = 'gpt-4'
  ) {}
  
  async analyze(context: AnalysisContext): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(context);
    
    const response = await this.callOpenAI({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Exodra framework developer and code reviewer. Provide detailed analysis focusing on performance, patterns, and best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });
    
    return this.parseAnalysisResponse(response);
  }
  
  async generateSuggestion(request: SuggestionRequest): Promise<Suggestion> {
    const prompt = this.buildSuggestionPrompt(request);
    
    const response = await this.callOpenAI({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: 'Generate a specific, actionable code improvement suggestion with concrete steps.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: 500
    });
    
    return this.parseSuggestionResponse(response, request);
  }
  
  async explainCode(code: string, context: CodeContext): Promise<string> {
    const prompt = `
Explain this Exodra framework code:

Context: ${context.purpose}
Complexity: ${context.complexity}
Dependencies: ${context.dependencies.join(', ')}

Code:
\`\`\`typescript
${code}
\`\`\`

Provide a clear explanation of what this code does, how it works, and any notable patterns or optimizations.
`;
    
    const response = await this.callOpenAI({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000
    });
    
    return response.content || 'Unable to generate explanation';
  }
  
  private buildAnalysisPrompt(context: AnalysisContext): string {
    const focusAreas = context.focusAreas?.map(f => f.area).join(', ') || 'general';
    
    return `
Analyze this Exodra framework code for ${focusAreas} improvements:

File: ${context.filePath}

${context.projectContext ? `
Project Context:
- Framework: ${context.projectContext.framework}
- Dependencies: ${context.projectContext.dependencies.join(', ')}
` : ''}

Code:
\`\`\`typescript
${context.code}
\`\`\`

${context.existingDiagnostics?.length ? `
Existing Issues:
${context.existingDiagnostics.map(d => `- ${d.severity}: ${d.message}`).join('\n')}
` : ''}

Provide specific suggestions for:
1. Performance optimizations
2. Code patterns and best practices
3. Potential issues or anti-patterns
4. Maintainability improvements

Format your response as JSON with this structure:
{
  "suggestions": [
    {
      "title": "string",
      "description": "string", 
      "impact": "high|medium|low",
      "effort": "low|medium|high",
      "category": "string"
    }
  ],
  "explanations": [
    {
      "topic": "string",
      "description": "string"
    }
  ]
}
`;
  }
  
  private buildSuggestionPrompt(request: SuggestionRequest): string {
    return `
Generate a specific improvement suggestion for this Exodra code issue:

Issue: ${request.issue}
File: ${request.location.file}:${request.location.line}

Code Context:
\`\`\`typescript
${request.code}
\`\`\`

Provide:
1. Specific title for the suggestion
2. Detailed description with concrete steps
3. Impact assessment (high/medium/low)
4. Effort required (low/medium/high)
5. Category classification

Respond in JSON format matching the Suggestion interface.
`;
  }
  
  private async callOpenAI(_params: unknown): Promise<{ content?: string }> {
    // In a real implementation, this would make an HTTP request to OpenAI API
    // For now, we'll return a mock response
    return {
      content: JSON.stringify({
        suggestions: [
          {
            title: "Consider memoizing expensive calculations",
            description: "The component performs complex calculations on each render. Use derived signals or memoization to improve performance.",
            impact: "high",
            effort: "medium",
            category: "performance"
          }
        ],
        explanations: [
          "Exodra's reactive system works best when expensive operations are memoized or moved to derived signals."
        ]
      })
    };
  }
  
  private parseAnalysisResponse(response: { content?: string }): AIAnalysisResult {
    try {
      const content = JSON.parse(response.content || '{}');
      
      return {
        suggestions: (content as { suggestions?: { id: string; title: string; description: string }[] }).suggestions?.map((s) => ({
          id: s.id || `ai-${Date.now()}`,
          title: s.title,
          description: s.description,
          category: 'ai-suggestion',
          impact: 'medium' as const,
          effort: 'medium' as const,
          autoFixable: false
        })) || [],
        explanations: content.explanations || [],
        confidence: 0.85,
        metadata: {
          model: this.model,
          analysisTime: Date.now()
        }
      };
    } catch (error) {
      return {
        suggestions: [],
        explanations: [],
        confidence: 0,
        metadata: {
          model: this.model,
          analysisTime: Date.now()
        }
      };
    }
  }
  
  private parseSuggestionResponse(response: { content?: string }, _request: SuggestionRequest): Suggestion {
    try {
      const content = JSON.parse(response.content || '{}');
      
      return {
        id: `ai-suggestion-${Date.now()}`,
        title: content.title || 'AI Suggestion',
        description: content.description || 'No description provided',
        location: _request.location,
        category: content.category || 'general',
        impact: content.impact || 'medium',
        effort: content.effort || 'medium',
        autoFixable: false
      };
    } catch (error) {
      return {
        id: `ai-suggestion-fallback`,
        title: 'AI Analysis Error',
        description: 'Failed to generate AI suggestion',
        location: _request.location,
        category: 'error',
        impact: 'low',
        effort: 'low'
      };
    }
  }
}

/**
 * Anthropic Claude provider implementation  
 */
export class AnthropicProvider implements AIProvider {
  name = 'anthropic';
  
  constructor(
    private apiKey: string,
    private model: string = 'claude-3-sonnet-20240229'
  ) {}
  
  async analyze(_context: AnalysisContext): Promise<AIAnalysisResult> {
    // Implementation would be similar to OpenAI but using Anthropic's API
    return {
      suggestions: [],
      explanations: [],
      confidence: 0.9,
      metadata: {
        model: this.model,
        analysisTime: Date.now()
      }
    };
  }
  
  async generateSuggestion(request: SuggestionRequest): Promise<Suggestion> {
    return {
      id: `anthropic-suggestion`,
      title: 'Anthropic Suggestion',
      description: 'Suggestion from Claude',
      location: request.location,
      category: 'general',
      impact: 'medium',
      effort: 'medium'
    };
  }
  
  async explainCode(_code: string, _context: CodeContext): Promise<string> {
    return 'Code explanation from Claude';
  }
}

/**
 * Local AI provider (for offline analysis)
 */
export class LocalAIProvider implements AIProvider {
  name = 'local';
  
  constructor(private modelPath: string) {}
  
  async analyze(_context: AnalysisContext): Promise<AIAnalysisResult> {
    // Implementation would use a local model (e.g., through Ollama)
    return {
      suggestions: [],
      explanations: [],
      confidence: 0.7,
      metadata: {
        model: 'local',
        analysisTime: Date.now()
      }
    };
  }
  
  async generateSuggestion(request: SuggestionRequest): Promise<Suggestion> {
    return {
      id: `local-suggestion`,
      title: 'Local AI Suggestion',
      description: 'Suggestion from local model',
      location: request.location,
      category: 'general',
      impact: 'medium',
      effort: 'medium'
    };
  }
  
  async explainCode(_code: string, _context: CodeContext): Promise<string> {
    return 'Code explanation from local AI';
  }
}

/**
 * AI provider factory
 */
export class AIProviderFactory {
  static create(config: AIConfig): AIProvider {
    switch (config.provider) {
      case 'openai':
        return new OpenAIProvider(config.apiKey!, config.model!);
      case 'anthropic':
        return new AnthropicProvider(config.apiKey!, config.model!);
      case 'local':
        return new LocalAIProvider(config.modelPath || 'default');
      default:
        throw new Error(`Unknown AI provider: ${config.provider}`);
    }
  }
}

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'local';
  apiKey?: string;
  model?: string;
  modelPath?: string;
}

/**
 * AI-enhanced analysis engine
 */
export class AIAnalysisEngine {
  private provider: AIProvider;
  
  constructor(private config: AIConfig) {
    this.provider = AIProviderFactory.create(config);
  }
  
  /**
   * Enhance static analysis with AI insights
   */
  async enhanceAnalysis(
    staticResult: AnalysisResult, 
    code: string, 
    context: AnalysisContext
  ): Promise<AnalysisResult> {
    try {
      const aiResult = await this.provider.analyze({
        ...context,
        code,
        existingDiagnostics: staticResult.diagnostics
      });
      
      return {
        ...staticResult,
        suggestions: [
          ...staticResult.suggestions,
          ...aiResult.suggestions
        ]
      };
    } catch (error) {
      // Fallback to static analysis if AI fails
      console.warn('AI analysis failed:', error);
      return staticResult;
    }
  }
  
  /**
   * Generate contextual code explanations
   */
  async explainCode(code: string, context: CodeContext): Promise<string> {
    try {
      return await this.provider.explainCode(code, context);
    } catch (error) {
      return 'Unable to generate AI explanation';
    }
  }
  
  /**
   * Get AI-powered refactoring suggestions
   */
  async getRefactoringSuggestions(
    code: string,
    location: SourceLocation,
    context: AnalysisContext
  ): Promise<Suggestion[]> {
    try {
      const suggestion = await this.provider.generateSuggestion({
        code,
        location,
        issue: 'General code improvement',
        context
      });
      
      return [suggestion];
    } catch (error) {
      return [];
    }
  }
}