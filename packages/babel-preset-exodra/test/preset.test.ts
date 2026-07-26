// Verifies the preset wires the full pipeline. Asserts the two things a naive
// babel-jest setup gets wrong — stripping TS types (bundled preset-typescript)
// and lowering namespaced directives like `bind:` (needs throwIfNamespace:false)
// — plus that a plain element compiles to an h() call. Runtime behavior of the
// emitted code is already covered by @exodra/babel-plugin-jsx's own e2e suite.
//
// Runs against the BUILT preset (dist), which requires @exodra/babel-plugin-jsx
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
        '[preset.test] dist not built — skipping (run `npm run build` in babel-preset-exodra and @exodra/babel-plugin-jsx)'
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

    it('lowers a plain element to an h() call', () => {
        const code = compile(`export const v = <div static={{ id: 'x' }}>hi</div>;`);
        expect(code).toContain('h("div"');
        expect(code).toContain('import { h, text } from "@exodra/core"');
    });

    it('strips TypeScript types', () => {
        const code = compile(
            `export const make = (label: string): unknown => <span static={{ id: label }} />;`
        );
        expect(code).not.toContain(': string');
        expect(code).not.toContain(': unknown');
        expect(code).toContain('h("span"');
    });

    it('lowers a bind: directive (throwIfNamespace is off)', () => {
        const code = compile(`export const v = <input bind:value={model} />;`);
        expect(code).toContain('mergeAttrs');
        expect(code).toMatch(/bind(Text|Number|Checked|Select)\(/);
    });

    it('does not throw on namespaced directives', () => {
        expect(() =>
            compile(`export const v = <li cache:key={k} static={{ id: 'r' }} />;`)
        ).not.toThrow();
    });

    it('typescript:false skips type stripping', () => {
        const factory = require('../dist/index.cjs').default as (
            api: unknown,
            opts?: unknown
        ) => unknown;
        const cfg = factory(
            { assertVersion() {} },
            { typescript: false }
        ) as { presets: unknown[]; plugins: unknown[] };
        expect(cfg.presets).toHaveLength(0);
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
            `export const make = (id: string) => <div static={{ id }}>hi</div>;`,
            'input.tsx'
        );
        expect(out).not.toBeNull();
        expect(out!.code).toContain('h("div"');
        expect(out!.code).not.toContain(': string');
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
            `export const v = <span static={{ id: 'x' }} />;`,
            'input.jsx'
        );
        expect(out!.code).toContain('h("span"');
    });

    it("mode:ssr compiles JSX to HTML-string functions", async () => {
        const { transformExodraJsx } = require("../dist/index.cjs") as {
            transformExodraJsx: (
                code: string,
                filename: string,
                options?: { mode?: "dom" | "ssr" }
            ) => Promise<{ code: string } | null>;
        };
        const out = await transformExodraJsx(
            `export const P = () => <div static={{ id: 'x' }}>hi</div>;`,
            'input.tsx',
            { mode: 'ssr' }
        );
        expect(out!.code).toContain('_html(');
        expect(out!.code).toContain('<div id="x">hi</div>');
        expect(out!.code).toContain("from \"@exodra/string\"");
        expect(out!.code).not.toContain('h("div"');
    });

});
