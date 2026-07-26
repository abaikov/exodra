// Bun is not available in this environment, so we drive the plugin's setup() with
// a fake builder that captures the onLoad handler, then invoke it on a temp
// .tsx file — exercising the real read -> runner -> contents delegation.
// Skipped if the preset dist isn't built.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exodra, type BunPlugin } from '../src/index';

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

type OnLoad = (args: { path: string }) => Promise<
    { contents: string; loader: string } | undefined
>;

// Run a plugin's setup() and return the registered onLoad handler + its filter.
function capture(plugin: BunPlugin): { onLoad: OnLoad; filter: RegExp } {
    let onLoad: OnLoad | undefined;
    let filter: RegExp | undefined;
    plugin.setup({
        onLoad(constraints, cb) {
            filter = constraints.filter;
            onLoad = cb as OnLoad;
        },
    });
    if (!onLoad || !filter) throw new Error('plugin did not register onLoad');
    return { onLoad, filter };
}

d('bun-plugin-exodra', () => {
    let dir: string;
    beforeAll(() => {
        dir = mkdtempSync(join(tmpdir(), 'exodra-bun-'));
    });
    afterAll(() => rmSync(dir, { recursive: true, force: true }));

    it('registers an onLoad for .jsx/.tsx', () => {
        const { filter } = capture(exodra());
        expect(filter.test('/x/a.tsx')).toBe(true);
        expect(filter.test('/x/a.jsx')).toBe(true);
        expect(filter.test('/x/a.ts')).toBe(false);
    });

    it('compiles a .tsx file to h() (types stripped)', async () => {
        const { onLoad } = capture(exodra());
        const path = join(dir, 'a.tsx');
        writeFileSync(
            path,
            `export const make = (id: string) => <div static={{ id }}>hi</div>;`
        );
        const out = await onLoad({ path });
        expect(out?.loader).toBe('js');
        expect(out?.contents).toContain('h("div"');
        expect(out?.contents).not.toContain(': string');
    });

    it('lowers a bind: directive', async () => {
        const { onLoad } = capture(exodra());
        const path = join(dir, 'b.tsx');
        writeFileSync(path, `export const v = <input bind:value={model} />;`);
        const out = await onLoad({ path });
        expect(out?.contents).toContain('mergeAttrs');
        expect(out?.contents).toMatch(/bind(Text|Number|Checked|Select)\(/);
    });
});
