// Runs the REAL esbuild with the plugin on a temp .tsx file and asserts the output
// is Exodra schema code — a module-level `createExoNamedSchema()` (TS stripped, named
// ports lowered). Skipped if the preset dist isn't built (the plugin
// requires it at runtime).

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import * as esbuild from 'esbuild';
import { describeIfPresetBuilt } from '@exodra/test-utils';
import { exodra } from '../src/index';

// `import.meta.url` so the probe resolves the preset from THIS package, exactly as the plugin
// will at runtime — see the helper's doc comment.
const d = describeIfPresetBuilt(import.meta.url);

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

    it('compiles a .tsx declaration to a hoisted named schema (types stripped)', async () => {
        const out = await bundle(
            'a.tsx',
            `export const ROW = exoJsx<{ id: unknown }>(($) => <li class="row" data-id={$.id} />);`
        );
        expect(out).toContain('createExoNamedSchema(');
        expect(out).toContain('.port("data-id", "id")');
        expect(out).not.toContain('unknown');
    });

    it('lowers a named attribute port', async () => {
        const out = await bundle(
            'b.tsx',
            `export const V = exoJsx(($) => <input class="f" value={$.value} />);`
        );
        expect(out).toContain('createExoNamedSchema(');
        expect(out).toContain('.port("value", "value")');
    });
});
