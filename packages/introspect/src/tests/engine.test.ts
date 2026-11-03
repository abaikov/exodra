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
