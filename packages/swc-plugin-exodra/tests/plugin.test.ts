// Runs the REAL @swc/core with the built Wasm plugin and asserts the compiled
// output matches what the Babel plugin emits for the same input.
//
// THE WASM IS A BUILD ARTIFACT AND IS NOT CHECKED IN, so this file starts by
// asserting the artifact is there and is not older than the Rust it is built from.
// That check exists because of a real failure: a rename in the runtime changed what
// the plugin emits, the wasm on disk was three weeks older than the source, and the
// suite reported a wrong specifier instead of "you did not rebuild".

import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const wasm = resolve(here, '..', 'swc_plugin_exodra.wasm');
const src = resolve(here, '..', 'src');

function rustSources(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return rustSources(full);
        return entry.name.endsWith('.rs') ? [full] : [];
    });
}

const wasmBuilt = existsSync(wasm);
const newestSource = Math.max(...rustSources(src).map((f) => statSync(f).mtimeMs));
const wasmFresh = wasmBuilt && statSync(wasm).mtimeMs >= newestSource;

let swc: typeof import('@swc/core') | null = null;
try {
    if (wasmBuilt) swc = require('@swc/core');
} catch {
    swc = null;
}

describe('the built plugin', () => {
    it('exists and is newer than the Rust it is built from', () => {
        expect(
            wasmBuilt,
            'swc_plugin_exodra.wasm is missing — run `npm run build` (needs the Rust ' +
                'toolchain and the wasm32-wasip1 target)'
        ).toBe(true);
        expect(
            wasmFresh,
            'swc_plugin_exodra.wasm is older than src/ — every assertion below would be ' +
                'testing a previous build. Run `npm run build`.'
        ).toBe(true);
    });
});

const d = swc && wasmFresh ? describe : describe.skip;
if (!swc) {
    console.warn(
        '[plugin.test] wasm or @swc/core missing — skipping (run `npm run build` with the Rust toolchain)'
    );
}

const flat = (s: string) => s.replace(/\s+/g, '').replace(/'/g, '"');

function compileWith(config: Record<string, unknown>) {
    return (code: string): string =>
        swc!.transformSync(code, {
            filename: 'in.tsx',
            jsc: {
                parser: { syntax: 'typescript', tsx: true },
                target: 'es2022',
                experimental: { plugins: [[wasm, config]] },
            },
        }).code;
}

const compile = compileWith({});

function expectEmits(out: string, line: string): void {
    expect(flat(out), `wanted ${line} in:\n${out}`).toContain(flat(line));
}

const COUNTER = `
    import { exoJsx } from '@exodra/jsx';
    export const COUNTER = exoJsx(($) => (
        <div class="counter" data-n={$.n}>
            <span>{$.count}</span>
            <button type="button" onClick={$.increment} on:dblclick={$.reset}>+</button>
            <$.rows />
            <div ref={$.box} unsafeHtml={$.html} />
        </div>
    ));
`;

d('exoJsx compiles to a named schema declaration', () => {
    it('is what a config with no mode at all selects', () => {
        expectEmits(compileWith({ mode: 'schema' })(COUNTER), 'const _s0 = createExoNamedSchema(');
        expectEmits(compile(COUNTER), 'const _s0 = createExoNamedSchema(');
    });

    it('strips TypeScript types', () => {
        const out = compile(`const A = exoJsx(($: Ports) => <li>{$.t}</li>);`);
        expect(out).not.toContain(': Ports');
        expectEmits(out, 'const _s0 = createExoNamedSchema(');
    });
});

d('the declaration is hoisted to module scope', () => {
    const moduleLines = (out: string) => out.split('\n').filter((l) => l !== '' && !/^\s/.test(l));

    it('numbers two declarations in one file apart, under one import', () => {
        const out = compile(`
            const A = exoJsx(($) => <li>{$.a}</li>);
            const B = exoJsx(($) => <li>{$.b}</li>);
        `);
        expectEmits(out, 'const _s0 = createExoNamedSchema(');
        expectEmits(out, 'const _s1 = createExoNamedSchema(');
        expect(out.match(/^import /gm)).toHaveLength(1);
    });
});

d('the plugin config', () => {
    it('refuses the dialect that was removed', () => {
        expect(() => compileWith({ mode: 'legacy' })(COUNTER)).toThrow(/three-props dialect/);
    });

    it('refuses a mode nothing implements', () => {
        expect(() => compileWith({ mode: 'nope' })(`const x = 1;`)).toThrow(/is not a mode/);
    });
});
