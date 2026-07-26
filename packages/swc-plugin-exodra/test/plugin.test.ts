// Runs the REAL @swc/core with the built Wasm plugin and asserts the compiled
// output matches the Babel plugin's h()/text() shape. Skipped if the wasm has not
// been built yet (`npm run build` in this package needs the Rust/wasm toolchain).

import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const wasm = resolve(here, '..', 'swc_plugin_exodra.wasm');

let swc: typeof import('@swc/core') | null = null;
try {
    if (existsSync(wasm)) swc = require('@swc/core');
} catch {
    swc = null;
}

const d = swc ? describe : describe.skip;
if (!swc) {
    console.warn('[plugin.test] wasm or @swc/core missing — skipping (run `npm run build` with the Rust toolchain)');
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();

d('swc-plugin-exodra', () => {
    const compile = (code: string): string =>
        swc!.transformSync(code, {
            filename: 'in.tsx',
            jsc: {
                parser: { syntax: 'typescript', tsx: true },
                target: 'es2022',
                experimental: { plugins: [[wasm, {}]] },
            },
        }).code;

    it('element with static attrs + text child', () => {
        const out = norm(compile(`const v = <div static={{ id: 'x' }}>hi</div>;`));
        expect(out).toContain('import { h, text } from "@exodra/core"');
        expect(out).toContain('h("div"');
        expect(out).toContain('static: {');
        expect(out).toMatch(/children: text\("hi"\)/);
    });

    it('maps singular buckets to plural schema buckets', () => {
        const out = norm(
            compile(
                `const v = <button static={{ class: 'b' }} bindable={{ textContent: label }} handlers={{ onClick: f }} />;`
            )
        );
        expect(out).toContain('static: { class:');
        expect(out).toContain('bindables: { textContent: label }');
        expect(out).toContain('handlers: { onClick: f }');
    });

    it('expression child becomes static.children', () => {
        const out = norm(compile(`const v = <div>{count}</div>;`));
        expect(out).toContain('h("div", { static: { children: count } })');
    });

    it('components and nesting: h(Comp, ...) with nested h()/text()', () => {
        const out = norm(compile(`const v = <Card><span>a</span>{x}</Card>;`));
        expect(out).toMatch(/h\(Card,/);
        expect(out).toMatch(/h\("span"/);
        expect(out).toContain('text("a")');
    });

    it('bindableList children', () => {
        const out = norm(compile(`const v = <ul bindableList={{ children: rows }} />;`));
        expect(out).toContain('bindableLists: { children: rows }');
    });

    it('props={} becomes a leading spread', () => {
        const out = norm(compile(`const v = <div props={base} static={{ id: 'x' }} />;`));
        expect(out).toMatch(/h\("div", \{ \.\.\.base, static:/);
    });

    it('strips TypeScript types', () => {
        const out = compile(`const make = (id: string) => <span static={{ id }} />;`);
        expect(out).not.toContain(': string');
        expect(out).toContain('h("span"');
    });

    it('rejects a flat attribute', () => {
        expect(() => compile(`const v = <div class='foo' />;`)).toThrow(/not allowed/);
    });

    it('rejects a flat event prop', () => {
        expect(() => compile(`const v = <button onClick={f} />;`)).toThrow(/not allowed/);
    });

    it('lowers bind: directives to mergeAttrs + the right forms helper', () => {
        expect(norm(compile(`const v = <input bind:value={m} />;`))).toContain(
            'h("input", mergeAttrs({}, bindText(m)))'
        );
        expect(norm(compile(`const v = <select bind:value={s} />;`))).toContain(
            'bindSelect(s)'
        );
        expect(
            norm(compile(`const v = <input static={{ type: 'number' }} bind:value={n} />;`))
        ).toContain('bindNumber(n)');
    });

    it('puts cacheKey / cache:key as the 3rd arg of h()', () => {
        const out = norm(compile(`const v = <li cache:key={k} static={{ id: 'r' }} />;`));
        expect(out).toContain('h("li", { static: { id: \'r\' } }, k)');
    });

    it('a single-identifier fragment becomes h(Fragment, { bindableLists })', () => {
        const out = norm(compile(`const v = <>{rows}</>;`));
        expect(out).toContain('h(Fragment, { bindableLists: { children: rows } })');
        expect(out).toContain('from "@exodra/jsx"');
    });

    it('a static fragment becomes an array', () => {
        expect(norm(compile(`const v = <>{a}{b}</>;`))).toMatch(/\[\s*a,\s*b\s*\]/);
    });

    it('shadow-safe: a local `text`/`h` does not collide with the auto-import', () => {
        const out = norm(compile(`function f(text) { return <div>hi</div>; }`));
        expect(out).toMatch(/text as (_text\w*)/);
        const uid = out.match(/text as (_text\w*)/)![1];
        expect(out).toContain(`${uid}("hi")`);
        expect(out).toMatch(/function f\(text\)/);
    });

    it('static hoisting: a fully-static element in .map() gets a Symbol cacheKey', () => {
        const out = norm(compile(`const v = items.map(() => <li static={{ class: 'row' }}>hi</li>);`));
        expect(out).toMatch(/const _ck\w* = Symbol\(\)/);
        expect(out).toMatch(/\}, _ck\w*\)/); // key threaded as 3rd arg
    });

    it('static hoisting: a dynamic child in .map() is NOT hoisted', () => {
        const out = norm(compile(`const v = items.map(x => <li static={{ class: 'row' }}>{x}</li>);`));
        expect(out).not.toContain('Symbol()');
    });

    it('static hoisting: a static element OUTSIDE iteration is NOT hoisted', () => {
        const out = norm(compile(`const v = <li static={{ class: 'row' }}>hi</li>;`));
        expect(out).not.toContain('Symbol()');
    });

    it('template hoisting: a multi-node subtree WITH holes gets a cacheKey', () => {
        // div has a bindable "hole", 2 nodes (div + span) → worth cloning+patching.
        const out = norm(
            compile(`const v = items.map(c => <div bindable={{ class: c }}><span>hi</span></div>);`)
        );
        expect(out).toMatch(/const _ck\w* = Symbol\(\)/);
        expect(out).toMatch(/bindables: \{ class: c \}/);
    });

    it('template hoisting: a single node with only a hole is NOT keyed', () => {
        // One node + a hole isn't worth cloning+patching over building it.
        const out = norm(compile(`const v = items.map(x => <input bindable={{ value: x }} />);`));
        expect(out).not.toContain('Symbol()');
    });

    it('a component tag is a reference (h(Card), not h("Card"))', () => {
        const out = norm(compile(`const v = <Card static={{ id: 'x' }} />;`));
        expect(out).toContain('h(Card, ');
        expect(out).not.toContain('h("Card"');
        expect(norm(compile(`const v = <Foo.Bar />;`))).toContain('h(Foo.Bar)');
    });

    it('folds a fully-static style object to a CSS string', () => {
        const out = norm(compile(`const v = <div static={{ style: { color: 'red', fontSize: 12, marginTop: 0 } }} />;`));
        expect(out).toContain('style: "color:red;font-size:12px;margin-top:0"');
    });

    it('wraps a dynamic style object in a runtime style() call', () => {
        const out = norm(compile(`const v = <div static={{ style: { color: c } }} />;`));
        expect(out).toContain('style: style({');
        expect(out).toContain('from "@exodra/style"');
    });

    // Regression: significant (same-line) whitespace in mixed text/expression
    // children must survive. `Total {a}: {b}` compiled to `Totala:b` before the
    // clean_jsx_text fix. NOTE: assert on the RAW output (not norm()) so the
    // spaces inside the string literals are visible.
    it('preserves spaces between text and expressions', () => {
        const out = compile(`const v = <span>Total {a}: {b}</span>;`);
        expect(out).toContain('text("Total ")');
        expect(out).toContain('text(": ")');
        expect(out).not.toContain('text("Total")'); // no trimmed-away space
    });

    it('keeps a lone space between two expressions', () => {
        const out = compile(`const v = <span>{a} {b}</span>;`);
        expect(out).toContain('text(" ")');
    });

    it('trims newline indentation but keeps a trailing inline space', () => {
        const out = compile(`const v = <span>\n      Total {a}\n    </span>;`);
        expect(out).toContain('text("Total ")');
        expect(out).not.toMatch(/text\("[ \t]+Total/); // no leading indentation
    });
});
