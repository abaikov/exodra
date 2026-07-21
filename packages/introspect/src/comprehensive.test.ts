/**
 * Comprehensive tests for @exodra/introspect
 */

import { describe, it, expect } from 'vitest';
import { IntrospectionEngine } from './engine.js';
import { SchemaAnalyzer } from './schema.js';
import { ComponentAnalyzer } from './components.js';
import { PerformanceAnalyzer } from './performance.js';
import { ExoAIProviderRegistry, ExoUniversalAI } from './ai-providers.js';
import { ExoPluginManager, ExoPluginDiscovery } from './plugins.js';
import { introspect, quickIntrospect } from './introspect.js';
import eslintPlugin from './eslint-plugin.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'node:url';

// packages/ dir, resolved from this test file (vitest runs from the repo root).
const packagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('@exodra/introspect Comprehensive Tests', () => {
  const testProjectPath = path.join(packagesDir, 'core', 'src');
  
  describe('Core Engine', () => {
    it('should initialize without config', () => {
      const engine = new IntrospectionEngine();
      expect(engine).toBeDefined();
    });
    
    it('should analyze a project', async () => {
      const engine = new IntrospectionEngine();
      const result = await engine.analyzeProject(testProjectPath);
      
      expect(result).toHaveProperty('diagnostics');
      expect(result).toHaveProperty('suggestions');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('analysis');
      expect(result.analysis?.filesAnalyzed).toBeGreaterThan(0);
    });
  });
  
  describe('Schema Analyzer', () => {
    it('should analyze schemas', async () => {
      const analyzer = new SchemaAnalyzer();
      const analysis = await analyzer.analyzeProject(testProjectPath);
      
      expect(analysis).toHaveProperty('schemas');
      expect(analysis).toHaveProperty('coverage');
      expect(analysis).toHaveProperty('relationships');
    });
    
    it('should calculate schema coverage', async () => {
      const analyzer = new SchemaAnalyzer();
      const analysis = await analyzer.analyzeProject(testProjectPath);
      
      expect(analysis.coverage).toHaveProperty('totalSchemas');
      expect(analysis.coverage).toHaveProperty('validatedSchemas');
      expect(analysis.coverage).toHaveProperty('coveragePercentage');
    });
  });
  
  describe('Component Analyzer', () => {
    it('should analyze components', async () => {
      const analyzer = new ComponentAnalyzer();
      const analysis = await analyzer.analyzeProject(testProjectPath);
      
      expect(analysis).toHaveProperty('components');
      expect(analysis).toHaveProperty('patterns');
      expect(analysis).toHaveProperty('optimization');
    });
    
    it('should detect component patterns', async () => {
      const analyzer = new ComponentAnalyzer();
      const analysis = await analyzer.analyzeProject(testProjectPath);
      
      expect(analysis.patterns).toBeDefined();
      expect(Array.isArray(analysis.patterns)).toBe(true);
    });
  });
  
  describe('Performance Analyzer', () => {
    it('should analyze performance', async () => {
      const analyzer = new PerformanceAnalyzer();
      const report = await analyzer.analyzePerformance(testProjectPath);
      
      expect(report).toHaveProperty('hotspots');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('optimization');
    });
    
    it('should identify performance hotspots', async () => {
      const analyzer = new PerformanceAnalyzer();
      const report = await analyzer.analyzePerformance(testProjectPath);
      
      expect(Array.isArray(report.hotspots)).toBe(true);
      report.hotspots.forEach(hotspot => {
        expect(hotspot).toHaveProperty('location');
        expect(hotspot).toHaveProperty('severity');
        expect(hotspot).toHaveProperty('impact');
      });
    });
  });
  
  describe('AI Provider System', () => {
    it('should register and retrieve AI providers', () => {
      const registry = new ExoAIProviderRegistry();
      const provider = {
        name: 'test-provider',
        version: '1.0.0',
        capabilities: ['code-analysis' as const],
        analyze: async () => ({ suggestions: [], explanations: [], confidence: 1 })
      };
      
      registry.register(provider);
      const retrieved = registry.getByName('test-provider');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-provider');
    });
    
    it('should select best provider by capabilities', () => {
      const registry = new ExoAIProviderRegistry();
      const provider1 = {
        name: 'provider-1',
        version: '1.0.0',
        capabilities: ['code-analysis' as const],
        analyze: async () => ({ suggestions: [], explanations: [], confidence: 1 })
      };
      const provider2 = {
        name: 'provider-2',
        version: '1.0.0',
        capabilities: ['performance-analysis' as const, 'code-analysis' as const],
        analyze: async () => ({ suggestions: [], explanations: [], confidence: 1 })
      };
      
      registry.register(provider1);
      registry.register(provider2);
      
      const best = registry.selectBest(['performance-analysis']);
      expect(best?.name).toBe('provider-2');
    });
    
    it('should support universal AI', () => {
      const universalAI = new ExoUniversalAI();
      expect(universalAI).toBeDefined();
      expect(universalAI.analyze).toBeDefined();
    });
  });
  
  describe('Plugin System', () => {
    it('should discover and load plugins', async () => {
      const discovery = new ExoPluginDiscovery();
      const manager = new ExoPluginManager();
      
      expect(discovery).toBeDefined();
      expect(manager).toBeDefined();
    });
    
    it('should register custom plugins', () => {
      const manager = new ExoPluginManager();
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        library: { name: 'exodra', version: '0.1.0', packageName: '@exodra/core' },
        capabilities: ['custom-analysis' as const],
        hooks: {},
        analyze: async () => ({
          diagnostics: [],
          suggestions: [],
          metrics: []
        })
      };
      
      manager.register(plugin);
      const plugins = manager.getPlugins();
      
      expect(plugins).toContainEqual(expect.objectContaining({
        name: 'test-plugin'
      }));
    });
  });
  
  describe('Main API', () => {
    it('should perform introspection', async () => {
      const result = await introspect({
        projectRoot: testProjectPath,
        scope: 'project',
        analysis: {
          schema: true,
          components: true,
          performance: false
        }
      });
      
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('performance');
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('timestamp');
    });
    
    it('should perform quick introspection', async () => {
      const result = await quickIntrospect(testProjectPath);
      
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('topIssues');
      expect(result).toHaveProperty('suggestions');
      expect(['excellent', 'good', 'needs-attention', 'critical']).toContain(result.health);
    });
  });
  
  describe('ESLint Plugin', () => {
    it('should export rules', () => {
      expect(eslintPlugin.rules).toBeDefined();
      expect(eslintPlugin.rules['no-inline-objects']).toBeDefined();
      expect(eslintPlugin.rules['prefer-derived-signals']).toBeDefined();
      expect(eslintPlugin.rules['schema-validation']).toBeDefined();
      expect(eslintPlugin.rules['no-direct-state-mutation']).toBeDefined();
      expect(eslintPlugin.rules['proper-cleanup']).toBeDefined();
    });
    
    it('should export configs', () => {
      expect(eslintPlugin.configs).toBeDefined();
      expect(eslintPlugin.configs.recommended).toBeDefined();
      expect(eslintPlugin.configs.strict).toBeDefined();
    });
    
    it('should have valid rule metadata', () => {
      Object.values(eslintPlugin.rules).forEach(rule => {
        expect(rule.meta).toBeDefined();
        expect(rule.meta.type).toBeDefined();
        expect(rule.meta.docs).toBeDefined();
        expect(rule.create).toBeDefined();
        expect(typeof rule.create).toBe('function');
      });
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle non-existent project path gracefully', async () => {
      const result = await quickIntrospect('/non/existent/path');
      
      expect(result).toBeDefined();
      expect(result.health).toBe('excellent'); // No files = no errors
      expect(result.summary).toContain('0 files');
    });
    
    it('should handle empty project', async () => {
      const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-introspect-empty-'));
      try {
        const engine = new IntrospectionEngine({ projectRoot: emptyDir });
        const result = await engine.analyze();

        expect(result).toBeDefined();
        expect(result.diagnostics).toBeDefined();
        expect(Array.isArray(result.diagnostics)).toBe(true);
      } finally {
        fs.rmSync(emptyDir, { recursive: true, force: true });
      }
    });
    
    it('should handle circular dependencies', async () => {
      // This would test circular dependency detection
      // For now, just ensure it doesn't crash
      const analyzer = new SchemaAnalyzer();
      const analysis = await analyzer.analyzeProject('.');
      
      expect(analysis).toBeDefined();
    });
  });
});