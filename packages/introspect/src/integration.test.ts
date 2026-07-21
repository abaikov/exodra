/**
 * Integration tests to verify introspect works with core Exodra components
 */

import { describe, it, expect } from 'vitest';
import { IntrospectionEngine } from './engine.js';
import { ExoAIProviderRegistry } from './ai-providers.js';
import path from 'path';
import { fileURLToPath } from 'node:url';

// packages/ dir, resolved from this test file (vitest runs from the repo root).
const packagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('Exodra Integration Tests', () => {
  it('should analyze core package and detect Exodra patterns', async () => {
    const corePackagePath = path.join(packagesDir, 'core');
    
    const engine = new IntrospectionEngine({
      projectRoot: corePackagePath,
      analysis: {
        schema: true,
        components: true,
        performance: true,
        ai: false
      }
    });

    const result = await engine.analyze();
    
    // Should find some components and metrics in core package
    expect(result.metrics).toBeDefined();
    expect(result.metrics.length).toBeGreaterThan(0);
    
    // Should have project-level metrics
    const fileCountMetric = result.metrics.find(m => m.name === 'total_files');
    expect(fileCountMetric).toBeDefined();
    expect(fileCountMetric!.value).toBeGreaterThan(0);
  });

  it('should analyze JSX package and detect components', async () => {
    const jsxPackagePath = path.join(packagesDir, 'jsx');
    
    const engine = new IntrospectionEngine({
      projectRoot: jsxPackagePath,
      analysis: {
        schema: false,
        components: true,
        performance: true,
        ai: false
      }
    });

    const result = await engine.analyze();
    
    // JSX package should have components
    expect(result.metrics).toBeDefined();
    
    const componentMetrics = result.metrics.filter(m => 
      m.category === 'structure' || m.category === 'reactivity'
    );
    
    expect(componentMetrics.length).toBeGreaterThan(0);
  });

  it('should work with AI provider registry', () => {
    const registry = new ExoAIProviderRegistry();
    
    // Should initialize without errors
    expect(registry).toBeDefined();
    expect(registry.getAll()).toBeDefined();
    expect(Array.isArray(registry.getAll())).toBe(true);
  });

  it('should detect complexity patterns in router package', async () => {
    const routerPackagePath = path.join(packagesDir, 'router');
    
    const engine = new IntrospectionEngine({
      projectRoot: routerPackagePath,
      analysis: {
        schema: false,
        components: true,
        performance: true,
        ai: false
      }
    });

    const result = await engine.analyze();
    
    // Router package should have some complexity metrics
    const complexityMetrics = result.metrics.filter(m => 
      m.name === 'complexity' || m.category === 'maintainability'
    );
    
    expect(complexityMetrics.length).toBeGreaterThan(0);
  });

  it('should handle multiple package analysis without conflicts', async () => {
    const packages = ['core', 'jsx', 'router'];
    
    for (const pkg of packages) {
      const packagePath = path.join(packagesDir, pkg);
      
      const engine = new IntrospectionEngine({
        projectRoot: packagePath,
        analysis: {
          schema: false,
          components: true,
          performance: true,
          ai: false
        }
      });

      // Should analyze each package independently without errors
      const result = await engine.analyze();
      
      expect(result).toBeDefined();
      expect(result.diagnostics).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.metrics).toBeDefined();
    }
  }, 10000); // Increase timeout to 10 seconds
});