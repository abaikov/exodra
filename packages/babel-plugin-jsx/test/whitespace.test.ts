// @vitest-environment jsdom
//
// Regression: JSX must preserve SIGNIFICANT (same-line) whitespace in mixed
// text/expression children. `Total {a}: {b}` rendered as `Totala:b` before the
// `cleanJSXText` fix — the compiler `.trim()`ed every JSXText and killed the
// spaces between text and expressions. This is the most basic JSX shape, so it
// gets a real E2E test against the actual renderer.

import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as core from '@exodra/core';
import * as dom from '@exodra/dom';
import * as reactivity from '@exodra/reactivity';
import * as jsx from '@exodra/jsx';
import * as forms from '@exodra/forms';
import * as attrs from '../../attrs/src/index';
import * as srcPluginModule from '../src/index';

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
            [srcPlugin as babel.PluginItem, { hoistStatic: false }],
        ],
    });
    if (!res?.code) throw new Error('compile produced no code');
    return res.code;
}

function buildWith(src: string): Record<string, unknown> {
    const cjs = babel.transformSync(compile(src), {
        filename: 'compiled.ts',
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const shim: Record<string, unknown> = {
        '@exodra/core': core,
        '@exodra/dom': dom,
        '@exodra/reactivity': reactivity,
        '@exodra/jsx': jsx,
        '@exodra/forms': forms,
        '@exodra/attrs': attrs,
    };
    const mod = { exports: {} as Record<string, unknown> };
    const req = (id: string): unknown => {
        if (id in shim) return shim[id];
        throw new Error(`compiled code required an unexpected module: ${id}`);
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('require', 'module', 'exports', cjs!.code!)(req, mod, mod.exports);
    return mod.exports;
}

function render(src: string, ...args: unknown[]): string {
    const mod = buildWith(src);
    const host = document.createElement('div');
    document.body.appendChild(host);
    (dom as typeof import('@exodra/dom')).mount(
        (mod.make as (...a: unknown[]) => Parameters<typeof dom.mount>[0])(...args),
        host
    );
    return host.querySelector('span,div')!.textContent ?? '';
}

describe('JSX whitespace in mixed text/expression children', () => {
    it('preserves the spaces in `Total {a}: {b}` (the reported bug)', () => {
        expect(
            render(`export function make(a,b){ return <span>Total {a}: {b}</span>; }`, 'responses', 10)
        ).toBe('Total responses: 10');
    });

    it('keeps a lone space between two expressions', () => {
        expect(
            render(`export function make(a,b){ return <span>{a} {b}</span>; }`, 'a', 'b')
        ).toBe('a b');
    });

    it('keeps a trailing space before an expression, drops newline indentation', () => {
        expect(
            render("export function make(a){ return <span>\n      Total {a}\n    </span>; }", 'x')
        ).toBe('Total x');
    });

    it('preserves a single-line leading/trailing space around text', () => {
        expect(
            render(`export function make(){ return <span> hi </span>; }`)
        ).toBe(' hi ');
    });

    it('drops whitespace-only children (indentation between elements)', () => {
        const out = compile(
            `export const v = <div>\n  <span>a</span>\n  <span>b</span>\n</div>;`
        );
        // no text() call whose content is pure whitespace
        expect(out).not.toMatch(/text\(\s*"[ \t\r\n]+"\s*\)/);
    });
});
