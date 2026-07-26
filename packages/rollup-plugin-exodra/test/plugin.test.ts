// Runs the REAL rollup with the plugin over a virtual .tsx module and asserts
// the bundle is Exodra `h()` code. Skipped if the preset dist isn't built.

import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { rollup, type Plugin } from 'rollup';
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

// Serve one virtual .tsx entry so we do not touch the filesystem, and keep the
// compiled `@exodra/*` imports external so rollup does not try to bundle them.
const virtual = (source: string): Plugin => ({
    name: 'virtual',
    resolveId(id) {
        return id === 'entry.tsx' ? id : null;
    },
    load(id) {
        return id === 'entry.tsx' ? source : null;
    },
});

d('rollup-plugin-exodra', () => {
    const build = async (source: string): Promise<string> => {
        const bundle = await rollup({
            input: 'entry.tsx',
            external: id => id.startsWith('@exodra/'),
            plugins: [virtual(source), exodra()],
            onwarn() {},
        });
        const { output } = await bundle.generate({ format: 'esm' });
        await bundle.close();
        return output[0].code;
    };

    it('compiles a .tsx element to an h() call (types stripped)', async () => {
        const code = await build(
            `export const make = (id: string) => <div static={{ id }}>hi</div>;`
        );
        expect(code).toContain('h("div"');
        expect(code).not.toContain(': string');
    });

    it('lowers a bind: directive', async () => {
        const code = await build(`export const v = <input bind:value={model} />;`);
        expect(code).toContain('mergeAttrs');
        expect(code).toMatch(/bind(Text|Number|Checked|Select)\(/);
    });
});
