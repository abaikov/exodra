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
    it('emits the cursor calls a hand-written declaration makes', () => {
        const out = compile(COUNTER);
        expectEmits(out, 'import { createExoNamedSchema } from "@exodra/core";');
        expectEmits(out, '_b1.port("data-n", "n");');
        expectEmits(out, '_b2.textPort("count");');
        expectEmits(out, '_b2.eventPort("click", "increment");');
        expectEmits(out, '_b2.eventPort("dblclick", "reset");');
        expectEmits(out, '_b1.childrenPort("rows");');
        expectEmits(out, '_b2.refPort("box");');
        expectEmits(out, '_b2.childrenPort("html");');
        expectEmits(out, 'export const COUNTER = _s0;');
    });

    it('emits no wire, no machine and no fill', () => {
        expect(compile(COUNTER)).not.toMatch(/createInitialState|EXO_NO_EFFECTS|_c\./);
    });

    it('drops the marker import once nothing names it', () => {
        expect(compile(COUNTER)).not.toContain('@exodra/jsx');
    });

    it('keeps the marker import while something else still names it', () => {
        const out = compile(`
            import { exoJsx } from '@exodra/jsx';
            export const A = exoJsx(($) => <li>{$.t}</li>);
            export { exoJsx };
        `);
        expect(out).toContain('@exodra/jsx');
    });

    it('is what a config with no mode at all selects', () => {
        expectEmits(compileWith({ mode: 'schema' })(COUNTER), 'const _s0 = createExoNamedSchema(');
        expectEmits(compile(COUNTER), 'const _s0 = createExoNamedSchema(');
    });

    it('takes a declaration with no ports and no parameter', () => {
        expectEmits(
            compile(`export const S = exoJsx(() => <hr class="rule" />);`),
            '_b0.el("hr", { class: "rule" });'
        );
    });

    it('imports the factory under the name schemaImport gives it, from schemaSource', () => {
        const out = compileWith({ schemaSource: 'my-core', schemaImport: 'declare' })(COUNTER);
        expectEmits(out, 'import { declare } from "my-core";');
        expectEmits(out, 'const _s0 = declare(');
    });

    it('compiles away whatever call markerName names, and leaves the default name alone', () => {
        const out = compileWith({ markerName: 'mark' })(`
            const A = mark(($) => <li>{$.t}</li>);
            const untouched = exoJsx;
        `);
        expectEmits(out, '_b1.textPort("t");');
        expectEmits(out, 'const untouched = exoJsx;');
    });

    it('follows an import alias of the marker', () => {
        const out = compile(`
            import { exoJsx as view } from '@exodra/jsx';
            export const A = view(($) => <li>{$.t}</li>);
        `);
        expectEmits(out, '_b1.textPort("t");');
    });

    it('keeps the holder name the author chose', () => {
        expectEmits(
            compile(`const A = exoJsx((port) => <li title={port.label} />);`),
            '_b1.port("title", "label");'
        );
    });

    it('reads a bracketed port name, for one that is not an identifier', () => {
        expectEmits(
            compile(`const A = exoJsx(($) => <li title={$['row-label']} />);`),
            '_b1.port("title", "row-label");'
        );
    });

    it('folds every literal attribute into the markup', () => {
        const out = compile(
            `const A = exoJsx(() => <input type="checkbox" tabindex={0} checked disabled={false} />);`
        );
        expectEmits(out, 'type: "checkbox"');
        expectEmits(out, 'tabindex: 0');
        expectEmits(out, 'checked: true');
        expectEmits(out, 'disabled: false');
    });

    it('writes a key that is not a plain name as a string', () => {
        expectEmits(compile(`const A = exoJsx(() => <li data-kind="row" />);`), '"data-kind": "row"');
    });

    it('trims the indentation JSX puts around text on its own line', () => {
        const out = compile(
            `const A = exoJsx(() => (\n    <div class="card">\n        <h3>\n            Heading\n        </h3>\n    </div>\n));`
        );
        expectEmits(out, '_b2.text("Heading");');
        expect(out).not.toMatch(/text\(["'][ \t]+Heading/);
    });

    it('strips TypeScript types', () => {
        const out = compile(`const A = exoJsx(($: Ports) => <li>{$.t}</li>);`);
        expect(out).not.toContain(': Ports');
        expectEmits(out, 'const _s0 = createExoNamedSchema(');
    });
});

d('the declaration is hoisted to module scope', () => {
    const moduleLines = (out: string) => out.split('\n').filter((l) => l !== '' && !/^\s/.test(l));

    it('stays at module scope when written there', () => {
        const out = compile(`export const ROW = exoJsx(($) => <li>{$.t}</li>);`);
        expect(moduleLines(out).some((l) => l.startsWith('const _s0 = createExoNamedSchema('))).toBe(
            true
        );
        expectEmits(out, 'export const ROW = _s0;');
    });

    it('leaves a function and lands in front of the statement holding it', () => {
        const out = compile(`
            const before = 1;
            function makeRow() {
                return exoJsx(($) => <li>{$.t}</li>);
            }
        `);
        const lines = moduleLines(out);
        const schemaAt = lines.findIndex((l) => l.startsWith('const _s0 = createExoNamedSchema('));
        expect(lines.indexOf('const before = 1;')).toBeLessThan(schemaAt);
        expect(schemaAt).toBeLessThan(lines.findIndex((l) => l.startsWith('function makeRow')));
        expectEmits(out, 'return _s0;');
    });

    it('numbers two declarations in one file apart, under one import', () => {
        const out = compile(`
            const A = exoJsx(($) => <li>{$.a}</li>);
            const B = exoJsx(($) => <li>{$.b}</li>);
        `);
        expectEmits(out, 'const _s0 = createExoNamedSchema(');
        expectEmits(out, 'const _s1 = createExoNamedSchema(');
        expect(out.match(/^import /gm)).toHaveLength(1);
    });

    it('builds ONE schema for a declaration inside a loop', () => {
        const out = compile(`
            const views = [];
            for (const p of parts) {
                views.push(exoJsx(($) => <li>{$.t}</li>));
            }
        `);
        expect(out.match(/createExoNamedSchema\(/g)).toHaveLength(1);
        expect(out.indexOf('const _s0 = createExoNamedSchema(')).toBeLessThan(out.indexOf('for ('));
    });

    it('grows a generated name past one the file already binds', () => {
        const out = compile(`
            const _s0 = 'taken';
            const A = exoJsx(($) => <li>{$.a}</li>);
        `);
        expectEmits(out, 'const _s_0 = createExoNamedSchema(');
    });

    it('emits no import for a file with no declaration', () => {
        expect(compile(`export const x = 1;`)).not.toContain('createExoNamedSchema');
    });
});

d('a declaration holds markup and named ports, and nothing else', () => {
    it('refuses an attribute expression that is not a port', () => {
        expect(() => compile(`const V = exoJsx(($) => <li title={item.title} />);`)).toThrow(
            /title=\{…\} on <li> is an expression/
        );
    });

    it('refuses a child expression that is not a port', () => {
        expect(() => compile(`const V = exoJsx(($) => <li>{item.title}</li>);`)).toThrow(
            /\{…\} inside <li> is an expression/
        );
    });

    it('refuses a closure where an event port belongs', () => {
        expect(() => compile(`const V = exoJsx(($) => <li onClick={() => go()} />);`)).toThrow(
            /onClick on <li> takes a port — write onClick=\{\$\.name\}/
        );
        expect(() => compile(`const V = exoJsx(($) => <li on:click={go} />);`)).toThrow(
            /on:click on <li> takes a port/
        );
    });

    it('refuses an inline HTML handler and names both event-port forms', () => {
        expect(() => compile(`const V = exoJsx(($) => <li onclick="go()" />);`)).toThrow(
            /"onclick" on <li> is an inline HTML handler/
        );
        expect(() => compile(`const V = exoJsx(($) => <li onclick="go()" />);`)).toThrow(
            /onClick=\{\$\.name\}, or on:click=\{\$\.name\}/
        );
    });

    it('refuses a namespace other than on:', () => {
        expect(() => compile(`const V = exoJsx(($) => <li set:title={$.t} />);`)).toThrow(
            /"set:title" on <li> — the one namespace is on:/
        );
    });

    it('refuses a spread', () => {
        expect(() => compile(`const V = exoJsx(($) => <li {...rest} />);`)).toThrow(
            /\{\.\.\.spread\} on <li>/
        );
    });

    it('refuses a component tag and points at the children port', () => {
        expect(() => compile(`const V = exoJsx(($) => <ul><Row /></ul>);`)).toThrow(
            /<Row> is not an element, and a declaration has no components/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><Row /></ul>);`)).toThrow(
            /<\$\.rows \/>/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><ui.Row /></ul>);`)).toThrow(
            /<ui\.Row> is not an element/
        );
    });

    it('refuses attributes or children on a children port', () => {
        expect(() => compile(`const V = exoJsx(($) => <ul><$.rows list={3} /></ul>);`)).toThrow(
            /<\$\.rows \/> is a children port and takes no attributes/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><$.rows>x</$.rows></ul>);`)).toThrow(
            /<\$\.rows \/> is a children port and takes no children/
        );
    });

    it('refuses a text port beside other children', () => {
        expect(() => compile(`const V = exoJsx(($) => <li>Hi, {$.name}</li>);`)).toThrow(
            /\{\$\.name\} inside <li> stands beside other children/
        );
    });

    it('refuses unsafeHtml beside children, and unsafeHtml that is not a port', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => <div unsafeHtml={$.html}>x</div>);`)
        ).toThrow(/has unsafeHtml=\{…\} and children/);
        expect(() => compile(`const V = exoJsx(($) => <div unsafeHtml="<b>x</b>" />);`)).toThrow(
            /unsafeHtml on <div> takes a port/
        );
    });

    it('refuses a port name used twice', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => <li title={$.t}><b>{$.t}</b></li>);`)
        ).toThrow(/the port "t" is declared twice/);
    });

    it('refuses a fragment, at the root and inside', () => {
        expect(() => compile(`const V = exoJsx(($) => <><li /></>);`)).toThrow(
            /returns ONE element and does nothing else/
        );
        expect(() => compile(`const V = exoJsx(($) => <ul><><li /></></ul>);`)).toThrow(
            /a fragment has no place in a declaration/
        );
    });

    it('refuses work before the return', () => {
        expect(() =>
            compile(`const V = exoJsx(($) => { const x = 1; return <li />; });`)
        ).toThrow(/returns ONE element and does nothing else/);
    });

    it('refuses a destructured or second parameter', () => {
        expect(() => compile(`const V = exoJsx(({ t }) => <li />);`)).toThrow(
            /takes ONE plain parameter/
        );
        expect(() => compile(`const V = exoJsx(($, i) => <li />);`)).toThrow(
            /takes ONE plain parameter/
        );
    });

    it('refuses a reference where the function literal belongs', () => {
        expect(() => compile(`const V = exoJsx(build);`)).toThrow(
            /takes exactly one function literal/
        );
    });

    it('refuses JSX outside exoJsx()', () => {
        expect(() => compile(`const V = <li />;`)).toThrow(/JSX outside exoJsx\(\)/);
        expect(() => compile(`const V = <><li /></>;`)).toThrow(/a fragment cannot be compiled/);
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
