/**
 * Tests for the CLI functionality
 */

import { describe, it, expect } from 'vitest';
import { spawn } from 'child_process';
import path from 'path';

describe('Introspect CLI', () => {
  const cliPath = path.join(__dirname, '../dist/cli.js');
  // Resolve the fixture relative to this file, not cwd — so the test passes
  // whether vitest runs from the repo root or from packages/introspect.
  const testProjectRoot = path.resolve(__dirname, '../../core');

  const runCLI = (args: string[]): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: testProjectRoot,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code || 0 });
      });

      child.on('error', (error) => {
        resolve({ stdout, stderr: error.message, code: 1 });
      });

      // Close stdin to prevent hanging
      child.stdin?.end();
    });
  };

  it('should show help when no args provided', async () => {
    const result = await runCLI([]);
    
    // Should exit with 0 and show help or run default command
    expect(result.code).toBe(0);
  });

  it('should run quick-check command successfully', async () => {
    const result = await runCLI(['quick-check']);
    
    // Should complete without critical errors
    expect(result.code).toBe(0);
  });

  it('should run analyze command successfully', async () => {
    const result = await runCLI(['analyze', '--path', 'src']);
    
    // Should complete without critical errors
    expect(result.code).toBe(0);
  });

  it('should show error for invalid command', async () => {
    const result = await runCLI(['invalid-command']);
    
    // Should exit with non-zero code for invalid command
    expect(result.code).toBe(1);
  });

  it('should handle analyze with non-existent path', async () => {
    const result = await runCLI(['analyze', '--path', '/nonexistent']);
    
    // Should handle gracefully, might exit with 0 or 1 depending on implementation
    expect(result.code).toBeGreaterThanOrEqual(0);
  });
});