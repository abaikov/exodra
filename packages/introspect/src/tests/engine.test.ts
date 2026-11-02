/**
 * Tests for the introspection engine
 */

import { describe, it, expect } from 'vitest';
import { ExoIntrospectionEngine } from '../ExoIntrospectionEngine.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';

// packages/ dir, resolved from this test file (not process.cwd(), which is the
// repo root when vitest runs the whole workspace).
const packagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('ExoIntrospectionEngine', () => {
    const testProjectRoot = path.join(packagesDir, 'core');

    it('should create engine instance with default config', () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot: testProjectRoot,
        });

        expect(engine).toBeDefined();
    });

    it('should analyze project without throwing errors', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot: testProjectRoot,
            analysis: {
                schema: true,
                performance: true,
            },
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
        const engine = new ExoIntrospectionEngine({
            projectRoot: testProjectRoot,
            analysis: {
                schema: false,
                performance: true,
            },
        });

        const result = await engine.analyze();

        // Should have at least total_files and total_lines metrics
        const fileMetric = result.metrics.find((m) => m.name === 'total_files');
        const linesMetric = result.metrics.find((m) => m.name === 'total_lines');

        expect(fileMetric).toBeDefined();
        expect(linesMetric).toBeDefined();
        expect(fileMetric!.value).toBeGreaterThan(0);
        expect(linesMetric!.value).toBeGreaterThan(0);
    });

    it('should report component counts', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot: testProjectRoot,
            analysis: {
                schema: false,
                performance: true,
            },
        });

        const result = await engine.analyze();

        const componentMetrics = result.metrics.filter((m) => m.name === 'components');

        expect(componentMetrics.length).toBeGreaterThan(0);
    });

    it('should handle a non-existent project path gracefully', () => {
        // The engine should construct without throwing even when the path has no
        // tsconfig — analysis then simply finds no files.
        expect(() => {
            new ExoIntrospectionEngine({
                projectRoot: '/tmp/nonexistent',
                analysis: {
                    schema: false,
                    performance: false,
                },
            });
        }).not.toThrow();
    });

    it('counts a createExoMachine machine as a component', async () => {
        const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-introspect-machine-'));
        try {
            fs.writeFileSync(
                path.join(projectRoot, 'counter.ts'),
                [
                    "import { createExoSchema, createExoMachine } from '@exodra/core';",
                    'const SCHEMA = createExoSchema((b) => ({ label: b.textPort() }));',
                    'export const COUNTER = createExoMachine(SCHEMA);',
                    '',
                ].join('\n')
            );
            const engine = new ExoIntrospectionEngine({
                projectRoot,
                analysis: { schema: false, performance: true },
            });

            const result = await engine.analyze();
            const total = (name: string): number =>
                result.metrics.filter((m) => m.name === name).reduce((sum, m) => sum + m.value, 0);

            expect(total('components')).toBe(1);
        } finally {
            fs.rmSync(projectRoot, { recursive: true, force: true });
        }
    });
});
