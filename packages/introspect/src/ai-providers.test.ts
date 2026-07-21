/**
 * Tests for AI providers functionality
 */

import { describe, it, expect } from 'vitest';
import { ExoAIProviderRegistry } from './ai-providers.js';

describe('ExoAIProviderRegistry', () => {
  it('should create registry instance', () => {
    const registry = new ExoAIProviderRegistry();
    
    expect(registry).toBeDefined();
  });

  it('should register and retrieve providers', () => {
    const registry = new ExoAIProviderRegistry();
    
    const mockProvider = {
      name: 'test-provider',
      version: '1.0.0',
      description: 'Test AI provider',
      capabilities: ['code-analysis' as const],
      connection: {
        type: 'local' as const
      },
      analyze: async () => ({
        analysis: { issues: [], suggestions: [], patterns: [], metrics: [] },
        insights: { summary: '', keyFindings: [], recommendations: [], riskAssessment: '' },
        improvements: [],
        metadata: { 
          model: 'test-model',
          processingTime: 100,
          tokensUsed: 50,
          confidence: 0.8
        }
      }),
      explain: async () => 'Test explanation',
      suggest: async () => [],
      ping: async () => true
    };

    registry.register(mockProvider);
    
    const providers = registry.getAll();
    expect(providers.length).toBeGreaterThan(0);
    
    const retrievedProvider = registry.getByName('test-provider');
    expect(retrievedProvider).toBeDefined();
    expect(retrievedProvider?.name).toBe('test-provider');
  });

  it('should select best provider by capabilities', () => {
    const registry = new ExoAIProviderRegistry();
    
    const provider1 = {
      name: 'provider-1',
      version: '1.0.0',
      description: 'Provider 1',
      capabilities: ['code-analysis' as const],
      connection: { type: 'local' as const },
      analyze: async () => ({
        analysis: { issues: [], suggestions: [], patterns: [], metrics: [] },
        insights: { summary: '', keyFindings: [], recommendations: [], riskAssessment: '' },
        improvements: [],
        metadata: { 
          model: 'test-model',
          processingTime: 100,
          tokensUsed: 50,
          confidence: 0.8
        }
      }),
      explain: async () => '',
      suggest: async () => [],
      ping: async () => true
    };

    const provider2 = {
      name: 'provider-2',
      version: '1.0.0',
      description: 'Provider 2',
      capabilities: ['refactoring' as const, 'performance-optimization' as const],
      connection: { type: 'local' as const },
      analyze: async () => ({
        analysis: { issues: [], suggestions: [], patterns: [], metrics: [] },
        insights: { summary: '', keyFindings: [], recommendations: [], riskAssessment: '' },
        improvements: [],
        metadata: { 
          model: 'test-model',
          processingTime: 100,
          tokensUsed: 50,
          confidence: 0.8
        }
      }),
      explain: async () => '',
      suggest: async () => [],
      ping: async () => true
    };

    registry.register(provider1);
    registry.register(provider2);
    
    const analysisProvider = registry.selectBest(['code-analysis']);
    const refactoringProvider = registry.selectBest(['refactoring']);
    
    expect(analysisProvider?.name).toBe('provider-1');
    expect(refactoringProvider?.name).toBe('provider-2');
  });

  it('should handle no providers available', () => {
    const registry = new ExoAIProviderRegistry();
    
    const provider = registry.selectBest(['code-analysis']);
    expect(provider).toBeNull();
    
    const namedProvider = registry.getByName('nonexistent');
    expect(namedProvider).toBeNull();
  });
});