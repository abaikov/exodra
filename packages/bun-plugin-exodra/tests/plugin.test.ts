// Bun is not available in this environment, so we drive the plugin's setup() with
// a fake builder that captures the onLoad handler, then invoke it on a temp
// .tsx file — exercising the real read -> runner -> contents delegation.
// Skipped if the preset dist isn't built.

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { describeIfPresetBuilt } from '@exodra/test-utils';
import { exodra, type BunPlugin } from '../src/index';

// `import.meta.url` so the probe resolves the preset from THIS package, exactly as the plugin
// will at runtime — see the helper's doc comment.
const d = describeIfPresetBuilt(import.meta.url);

type OnLoad = (args: { path: string }) => Promise<{ contents: string; loader: string } | undefined>;

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

    it('compiles a .tsx declaration to a hoisted named schema (types stripped)', async () => {
        const { onLoad } = capture(exodra());
        const path = join(dir, 'a.tsx');
        writeFileSync(
            path,
            `export const ROW = exoJsx<{ id: unknown }>(($) => <li class="row" data-id={$.id} />);`
        );
        const out = await onLoad({ path });
        expect(out?.loader).toBe('js');
        expect(out?.contents).toContain('createExoNamedSchema(');
        expect(out?.contents).toContain('.port("data-id", "id")');
        expect(out?.contents).not.toContain('unknown');
    });

    it('lowers a named attribute port', async () => {
        const { onLoad } = capture(exodra());
        const path = join(dir, 'b.tsx');
        writeFileSync(
            path,
            `export const V = exoJsx(($) => <input class="f" value={$.value} />);`
        );
        const out = await onLoad({ path });
        expect(out?.contents).toContain('.port("value", "value")');
    });

    // THE MAP HAS TO TRAVEL IN THE CONTENTS, because a loader hook has no field to return
    // one in — which is exactly what the esbuild plugin does with the identical eight lines
    // against the identical host-API shape. This plugin did not, and dropped a map the
    // shared runner had already computed: every stack trace in a Bun-built app pointed at
    // generated schema/wire code rather than the author's JSX. That matters more here than
    // in a tree renderer, because the emitted program does not resemble the source at all.
    it('inlines the source map, as the esbuild plugin does — the shapes must not diverge', async () => {
        const { onLoad } = capture(exodra());
        const path = join(dir, 'c.tsx');
        writeFileSync(path, `export const V = exoJsx(($) => <li class="row">{$.title}</li>);`);
        const out = await onLoad({ path });
        expect(
            out?.contents,
            'bun-plugin-exodra returned compiled code with no sourceMappingURL. The runner ' +
                'always asks Babel for a map; a loader hook has nowhere to put one except ' +
                'the contents, so dropping it here is dropping it entirely.'
        ).toContain('//# sourceMappingURL=data:application/json;base64,');

        const encoded = (out?.contents ?? '').split(
            '//# sourceMappingURL=data:application/json;base64,'
        )[1];
        const map = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as {
            version: number;
            mappings: string;
        };
        expect(map.version, 'the inlined map is not a v3 source map').toBe(3);
        expect(
            map.mappings.length,
            'the inlined map has no mappings at all, so it points nowhere'
        ).toBeGreaterThan(0);
    });
});
