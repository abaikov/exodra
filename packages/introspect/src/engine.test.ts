/**
 * Tests for the introspection engine
 */

import { describe, it, expect } from 'vitest';
import { IntrospectionEngine } from './engine.js';
import path from 'path';
import { fileURLToPath } from 'node:url';

// packages/ dir, resolved from this test file (not process.cwd(), which is the
// repo root when vitest runs the whole workspace).
const packagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('IntrospectionEngine', () => {
  const testProjectRoot = path.join(packagesDir, 'core');
  
  it('should create engine instance with default config', () => {
    const engine = new IntrospectionEngine({
      projectRoot: testProjectRoot
    });
    
    expect(engine).toBeDefined();
  });

  it('should analyze project without throwing errors', async () => {
    const engine = new IntrospectionEngine({
      projectRoot: testProjectRoot,
      analysis: {
        schema: true,
        components: true,
        performance: true,
        ai: false
      }
    });
    
    const result = await engine.analyze();
    
    expect(result).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(Array.isArray(result.diagnostics)).toBe(true);
    expect(Array.isArray(result.suggestions)).toBe(true);
    expect(Array.isArray(result.metrics)).toBe(true);
  });

  it('should count project metrics correctly', async () => {
    const engine = new IntrospectionEngine({
      projectRoot: testProjectRoot,
      analysis: {
        schema: false,
        components: false,
        performance: true,
        ai: false
      }
    });
    
    const result = await engine.analyze();
    
    // Should have at least total_files and total_lines metrics
    const fileMetric = result.metrics.find(m => m.name === 'total_files');
    const linesMetric = result.metrics.find(m => m.name === 'total_lines');
    
    expect(fileMetric).toBeDefined();
    expect(linesMetric).toBeDefined();
    expect(fileMetric!.value).toBeGreaterThan(0);
    expect(linesMetric!.value).toBeGreaterThan(0);
  });

  it('should detect components and signals', async () => {
    const engine = new IntrospectionEngine({
      projectRoot: testProjectRoot,
      analysis: {
        schema: false,
        components: true,
        performance: true,
        ai: false
      }
    });
    
    const result = await engine.analyze();
    
    // Should detect some components or signals in the core package
    const componentMetrics = result.metrics.filter(m => 
      m.name === 'components' || m.name === 'signals'
    );
    
    expect(componentMetrics.length).toBeGreaterThan(0);
  });

  it('should handle a non-existent project path gracefully', () => {
    // The engine should construct without throwing even when the path has no
    // tsconfig — analysis then simply finds no files.
    expect(() => {
      new IntrospectionEngine({
        projectRoot: '/tmp/nonexistent',
        analysis: {
          schema: false,
          components: false,
          performance: false,
          ai: false
        }
      });
    }).not.toThrow();
  });
});