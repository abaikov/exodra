// Runs the REAL rollup with the plugin over a virtual .tsx module and asserts the
// bundle is Exodra schema code — a module-level `createExoNamedSchema()`. Skipped if the preset dist isn't built.

import { expect, it } from 'vitest';
import { rollup, type Plugin } from 'rollup';
import { describeIfPresetBuilt } from '@exodra/test-utils';
import { exodra } from '../src/index';

// `import.meta.url` so the probe resolves the preset from THIS package, exactly as the plugin
// will at runtime — see the helper's doc comment.
const d = describeIfPresetBuilt(import.meta.url);

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
            external: (id) => id.startsWith('@exodra/'),
            plugins: [virtual(source), exodra()],
            onwarn() {},
        });
        const { output } = await bundle.generate({ format: 'esm' });
        await bundle.close();
        return output[0].code;
    };

    it('compiles a .tsx declaration to a hoisted named schema (types stripped)', async () => {
        const code = await build(
            `export const ROW = exoJsx<{ id: unknown }>(($) => <li class="row" data-id={$.id} />);`
        );
        // Rollup is what makes this an INTEGRATION test rather than a repeat of the plugin's
        // own suite: it resolves the compiler's emitted `import { createExoNamedSchema } from
        // "@exodra/core"` and leaves the real exported name at the call site.
        expect(code).toContain('createExoNamedSchema(');
        expect(code).toContain('.port("data-id", "id")');
        expect(code).not.toContain('unknown');
    });

    it('lowers a named attribute port', async () => {
        const code = await build(`export const V = exoJsx(($) => <input class="f" value={$.value} />);`);
        expect(code).toContain('createExoNamedSchema(');
        expect(code).toContain('.port("value", "value")');
    });
});
