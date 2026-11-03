// Verifies the preset wires the full pipeline. Asserts the two things a naive
// babel-jest setup gets wrong — stripping TS types (bundled preset-typescript)
// and parsing the namespaced `on:` listener (needs
// throwIfNamespace:false) — plus that a declaration compiles to a module-level
// `createExoNamedSchema()`. Runtime behaviour of the emitted code is
// already covered by @exodra/babel-plugin-schema's own suite.
//
// Runs against the BUILT preset (dist), which requires @exodra/babel-plugin-schema
// by name; skipped with a warning if either package isn't built yet.

import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';

const require = createRequire(import.meta.url);

let preset: babel.PluginItem | null = null;
try {
    preset = require('../dist/index.cjs').default as babel.PluginItem;
} catch {
    preset = null;
}

const d = preset ? describe : describe.skip;
if (!preset) {
    console.warn(
        '[preset.test] dist not built — skipping (run `npm run build` in babel-preset-exodra and @exodra/babel-plugin-schema)'
    );
}

d('babel-preset-exodra', () => {
    const compile = (src: string): string => {
        const res = babel.transformSync(src, {
            filename: 'input.tsx',
            babelrc: false,
            configFile: false,
            presets: [preset as babel.PluginItem],
        });
        if (!res?.code) throw new Error('preset produced no code');
        return res.code;
    };

    it('lowers a declaration to a hoisted named schema by default (no mode option at all)', () => {
        const code = compile(
            `export const ROW = exoJsx<{ id: unknown }>(($) => <li class="row" data-id={$.id} />);`
        );
        expect(code).toContain('import { createExoNamedSchema } from "@exodra/core"');
        expect(code).toContain('.port("data-id", "id")');
    });

    it('strips TypeScript types', () => {
        const code = compile(
            `const label: string = 'x'; export const V = exoJsx<{ t: unknown }>(($) => <span>{$.t}</span>);`
        );
        expect(code).not.toContain(': string');
        expect(code).not.toContain('unknown');
        expect(code).toContain('createExoNamedSchema(');
    });

    it('does not throw on the on: namespace (throwIfNamespace is off)', () => {
        expect(() =>
            compile(
                `export const V = exoJsx(($) => <input class="f" value={$.model} on:input={$.input} />);`
            )
        ).not.toThrow();
    });

    it('typescript:false skips type stripping', () => {
        const factory = require('../dist/index.cjs').default as (
            api: unknown,
            opts?: unknown
        ) => unknown;
        const cfg = factory({ assertVersion() {} }, { typescript: false }) as {
            presets: unknown[];
            plugins: unknown[];
        };
        expect(cfg.presets).toHaveLength(0);
        // syntax-jsx + the one compiler.
        expect(cfg.plugins).toHaveLength(2);
    });

    // The shared runner every bundler plugin calls.
    it('transformExodraJsx runs the full pipeline with a source map', async () => {
        const { transformExodraJsx } = require('../dist/index.cjs') as {
            transformExodraJsx: (
                code: string,
                filename: string
            ) => Promise<{ code: string; map: object | null } | null>;
        };
        const out = await transformExodraJsx(
            `export const ROW = exoJsx<{ id: unknown }>(($) => <li class="row" data-id={$.id} />);`,
            'input.tsx'
        );
        expect(out).not.toBeNull();
        expect(out!.code).toContain('createExoNamedSchema(');
        expect(out!.code).not.toContain('unknown');
        expect(out!.map).toBeTypeOf('object');
    });

    it('transformExodraJsx defaults typescript off for .jsx', async () => {
        const { transformExodraJsx } = require('../dist/index.cjs') as {
            transformExodraJsx: (
                code: string,
                filename: string
            ) => Promise<{ code: string } | null>;
        };
        // No TS syntax in a .jsx file — must still compile the JSX.
        const out = await transformExodraJsx(
            `export const V = exoJsx(() => <span class="x" />);`,
            'input.jsx'
        );
        expect(out!.code).toContain('createExoNamedSchema(');
    });

    // The schema compiler's own options reach it through the preset.
    it('forwards schemaSource', async () => {
        const { transformExodraJsx } = require('../dist/index.cjs') as {
            transformExodraJsx: (
                code: string,
                filename: string,
                options?: { schemaSource?: string }
            ) => Promise<{ code: string } | null>;
        };
        const out = await transformExodraJsx(
            `export const V = exoJsx(() => <li class="row" />);`,
            'input.tsx',
            { schemaSource: '@exodra/core/schema' }
        );
        expect(out!.code).toContain('from "@exodra/core/schema"');
    });
});
