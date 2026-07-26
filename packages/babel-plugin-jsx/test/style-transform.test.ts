// Compile-time `static.style` folding in @exodra/babel-plugin-jsx.
//
// Two guarantees:
//  1. A fully-static `style` object literal is folded to a CSS STRING at build
//     time (zero runtime) — and that string is BYTE-FOR-BYTE identical to what
//     the runtime `@exodra/style` `style()` produces (the parity block imports
//     the real runtime helper and compares).
//  2. A `style` object with any dynamic value is wrapped in a runtime
//     `style(...)` call and `import { style } from '@exodra/style'` is injected.

import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as srcPluginModule from '../src/index';
import { style as runtimeStyle } from '../../style/src/style';

const srcPlugin =
    (srcPluginModule as { default?: unknown }).default ??
    (srcPluginModule as unknown);

function compile(src: string): string {
    const res = babel.transformSync(src, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        presets: [
            ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ],
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            // hoistStatic off so the folded string stays inline and readable.
            [srcPlugin as babel.PluginItem, { hoistStatic: false }],
        ],
    });
    if (!res?.code) throw new Error('compile produced no code');
    return res.code;
}

describe('compile-time static.style folding', () => {
    it('folds a fully-static style object into a CSS string', () => {
        const out = compile(
            `export const v = <div static={{ style: { color: 'red', fontSize: 12 } }} />;`
        );
        expect(out).toContain('"color:red;font-size:12px"');
        expect(out).not.toContain('style(');
        expect(out).not.toContain('@exodra/style');
    });

    it('drops null/undefined/false declarations while folding', () => {
        const out = compile(
            `export const v = <div static={{ style: { color: 'red', border: null, display: false } }} />;`
        );
        expect(out).toContain('"color:red"');
    });

    it('wraps a dynamic style object in a runtime style() call + injects import', () => {
        const out = compile(
            `export const v = <div static={{ style: { color: theme.fg, fontSize: 12 } }} />;`
        );
        expect(out).toContain('style(');
        expect(out).toContain('@exodra/style');
        expect(out).toMatch(/import\s*\{\s*style\s*\}\s*from\s*["']@exodra\/style["']/);
    });

    it('does not inject the import when no style object is present', () => {
        const out = compile(
            `export const v = <div static={{ id: 'x' }} bindable={{ textContent: label }} />;`
        );
        expect(out).not.toContain('@exodra/style');
    });

    it('leaves an already-string style untouched (no runtime, no import)', () => {
        const out = compile(
            `export const v = <div static={{ style: 'color:red' }} />;`
        );
        expect(out).toContain('color:red');
        expect(out).not.toContain('style(');
        expect(out).not.toContain('@exodra/style');
    });
});

// --- parity: compile-time fold === runtime style() -------------------------
//
// For every case here, the compile-time string embedded in the output MUST equal
// `runtimeStyle(sameObject)`. If the two normalizers ever drift, this fails.

function foldedString(objSrc: string): string {
    const out = compile(`export const v = <div static={{ style: ${objSrc} }} />;`);
    // Extract the folded string literal from `style: "…"`.
    const m = out.match(/style:\s*"((?:[^"\\]|\\.)*)"/);
    if (!m) throw new Error(`no folded style string in output:\n${out}`);
    return m[1].replace(/\\"/g, '"');
}

describe('compile-time fold matches runtime style()', () => {
    const cases: Array<[string, Record<string, unknown>]> = [
        ["{ backgroundColor: 'red', fontSize: 'inherit' }", { backgroundColor: 'red', fontSize: 'inherit' }],
        ['{ fontSize: 12, padding: 8 }', { fontSize: 12, padding: 8 }],
        ['{ margin: 0 }', { margin: 0 }],
        ['{ opacity: 0.5, zIndex: 10, lineHeight: 1.5, fontWeight: 700 }', { opacity: 0.5, zIndex: 10, lineHeight: 1.5, fontWeight: 700 }],
        ["{ '--gap': 8, '--brand': '#ec4899' }", { '--gap': 8, '--brand': '#ec4899' }],
        ["{ padding: [4, 8], margin: ['auto', 0] }", { padding: [4, 8], margin: ['auto', 0] }],
        ["{ 'z-index': 5, 'background-color': 'blue' }", { 'z-index': 5, 'background-color': 'blue' }],
        ["{ WebkitTransform: 'scale(2)', MozAppearance: 'none', msFlexAlign: 'center' }", { WebkitTransform: 'scale(2)', MozAppearance: 'none', msFlexAlign: 'center' }],
        ['{ marginTop: -4 }', { marginTop: -4 }],
    ];

    for (const [src, obj] of cases) {
        it(`parity: ${src}`, () => {
            expect(foldedString(src)).toBe(runtimeStyle(obj));
        });
    }
});
