// Runs the REAL esbuild with the plugin on a temp .tsx file and asserts the
// output is Exodra `h()` code (TS stripped, directive lowered). Skipped if the
// preset dist isn't built (the plugin requires it at runtime).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as esbuild from 'esbuild';
import { exodra } from '../src/index';

const require = createRequire(import.meta.url);
let hasPreset = true;
try {
    require('babel-preset-exodra/dist/index.cjs');
} catch {
    hasPreset = false;
}

const d = hasPreset ? describe : describe.skip;
if (!hasPreset) {
    console.warn('[plugin.test] babel-preset-exodra not built — skipping (run its build)');
}

d('esbuild-plugin-exodra', () => {
    let dir: string;
    beforeAll(() => {
        dir = mkdtempSync(join(tmpdir(), 'exodra-esbuild-'));
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    const bundle = async (file: string, source: string): Promise<string> => {
        const path = join(dir, file);
        writeFileSync(path, source);
        const result = await esbuild.build({
            entryPoints: [path],
            bundle: true,
            write: false,
            format: 'esm',
            packages: 'external',
            plugins: [exodra()],
        });
        return result.outputFiles[0].text;
    };

    it('compiles a .tsx element to an h() call (types stripped)', async () => {
        const out = await bundle(
            'a.tsx',
            `export const make = (id: string) => <div static={{ id }}>hi</div>;`
        );
        expect(out).toContain('h("div"');
        expect(out).not.toContain(': string');
    });

    it('lowers a bind: directive', async () => {
        const out = await bundle(
            'b.tsx',
            `export const v = <input bind:value={model} />;`
        );
        expect(out).toContain('mergeAttrs');
        expect(out).toMatch(/bind(Text|Number|Checked|Select)\(/);
    });
});
