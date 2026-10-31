/**
 * THE TEST THAT WOULD HAVE CAUGHT IT: an analyzer must not report a finding about a project
 * that has none.
 *
 * `@exodra/introspect` shipped to npm — 0.1.0, 0.1.1, 0.2.0 — with `CodeAnalyzer.analyzeCode`
 * returning three fixed vulnerabilities for any project it was pointed at: a `CWE-79` at
 * `src/components/UserContent.tsx:25`, a `CWE-521` "No password complexity requirements
 * enforced" at `src/auth/validation.ts:10`, and a `CWE-200` at `src/utils/logger.ts:8`. Beside
 * them: quality scores, "trends" over "last 30 days", a maintainability index, four design
 * patterns located in files that need not exist, and route analytics (`frequency: 1500`,
 * `bounceRate: 25`). Every test the package had asserted `toHaveProperty('hotspots')` and
 * friends — shape, never content — so all of it passed.
 *
 * The tests below are about content: they run the real engine over a directory whose contents
 * are known and assert that nothing is reported that is not in it.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { ExoIntrospectionEngine } from '../ExoIntrospectionEngine.js';

/** Files and locations the removed fabrications named. None may ever appear in a result. */
const INVENTED_PATHS = [
    'src/components/UserContent.tsx',
    'src/auth/validation.ts',
    'src/utils/logger.ts',
    'src/utils/dataProcessor.ts',
    'src/services/UserService.ts',
    'src/services/AppService.ts',
    'src/repositories/UserRepository.ts',
    'src/api/endpoints.ts',
    'src/signals/eventEmitter.ts',
    'src/utils/asyncHelper.ts',
    'src/schemas/user.ts',
    'src/components/ProductList.tsx',
    'src/pages/Dashboard',
    'src/App.tsx',
];

describe('an analyzer reports only what is in the project', () => {
    let projectRoot: string;

    beforeAll(() => {
        projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'exo-introspect-clean-'));
        // One file, no TypeScript errors, no schema built inside a function, no JSX, no
        // component. There is nothing here for any pass to report.
        fs.writeFileSync(
            path.join(projectRoot, 'index.ts'),
            'export const add = (a: number, b: number): number => a + b;\n'
        );
    });

    afterAll(() => {
        fs.rmSync(projectRoot, { recursive: true, force: true });
    });

    it('reports no diagnostics and no suggestions for a project with nothing wrong', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot,
            analysis: { schema: true, performance: true },
        });

        const result = await engine.analyze();

        expect(result.diagnostics).toEqual([]);
        expect(result.suggestions).toEqual([]);
        expect(result.summary).toEqual({ errors: 0, warnings: 0, info: 0, suggestions: 0 });
    });

    it('never names a file outside the project it was given', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot,
            analysis: { schema: true, performance: true },
        });

        const result = await engine.analyze();
        const serialized = JSON.stringify(result);

        for (const invented of INVENTED_PATHS) {
            expect(serialized).not.toContain(invented);
        }

        for (const diagnostic of result.diagnostics) {
            expect(diagnostic.location.file.startsWith(projectRoot)).toBe(true);
        }
    });

    it('reports no CWE, no risk score and no quality score anywhere', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot,
            analysis: { schema: true, performance: true },
        });

        const serialized = JSON.stringify(await engine.analyze());

        expect(serialized).not.toContain('CWE-');
        expect(serialized).not.toMatch(/riskScore|overall_quality_score/);
    });

    it('reports no metric whose value is NaN, Infinity or -Infinity', async () => {
        const engine = new ExoIntrospectionEngine({
            projectRoot,
            analysis: { schema: true, performance: true },
        });

        const result = await engine.analyze();

        for (const metric of result.metrics) {
            expect(Number.isFinite(metric.value)).toBe(true);
        }
    });
});
