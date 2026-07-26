// @vitest-environment jsdom
//
// `props={obj}` — spread a full bucket object into the schema props.
//
// Semantics under test:
//  - plain JS spread: `props={}` is the base, inline buckets override it;
//  - it composes with `bind:` (the spread object becomes the mergeAttrs base);
//  - `exo:schema` still replaces everything;
//  - an element carrying a runtime spread is NEVER static-hoisted;
//  - E2E: a helper's buckets actually drive the real DOM.

import { createRequire } from 'module';
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

const require = createRequire(import.meta.url);
const srcPlugin =
    (srcPluginModule as { default?: unknown }).default ??
    (srcPluginModule as unknown);

function compile(src: string, opts: Record<string, unknown> = {}): string {
    const res = babel.transformSync(src, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        presets: [
            ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ],
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [srcPlugin as babel.PluginItem, opts],
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

function container(): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    return el;
}

describe('props={} — compiled output', () => {
    it('spreads the object into the props (props only)', () => {
        const out = compile(`export const v = <div props={base} />;`, {
            hoistStatic: false,
        });
        expect(out).toContain('h("div", {');
        expect(out).toContain('...base');
    });

    it('spreads first, inline bucket after (inline overrides)', () => {
        const out = compile(
            `export const v = <div props={base} static={{ class: 'b' }} />;`,
            { hoistStatic: false }
        );
        // ...base comes before static: so the object literal is {...base, static:{…}}
        const idxSpread = out.indexOf('...base');
        const idxStatic = out.indexOf('static:');
        expect(idxSpread).toBeGreaterThanOrEqual(0);
        expect(idxStatic).toBeGreaterThan(idxSpread);
    });

    it('layers several props={} in written order', () => {
        const out = compile(`export const v = <div props={a} props={b} />;`, {
            hoistStatic: false,
        });
        expect(out.indexOf('...a')).toBeLessThan(out.indexOf('...b'));
    });

    it('composes with bind: — spread object is the mergeAttrs base', () => {
        const out = compile(`export const v = <input props={base} bind:value={m} />;`, {
            hoistStatic: false,
        });
        expect(out).toContain('mergeAttrs(');
        expect(out).toContain('...base');
        expect(out).toContain('@exodra/attrs');
    });

    it('exo:schema replaces everything (props ignored)', () => {
        const out = compile(
            `export const v = <div props={base} exo:schema={other} />;`,
            { hoistStatic: false }
        );
        expect(out).toContain('other');
        expect(out).not.toContain('...base');
    });

    it('does NOT hoist an element carrying a props spread', () => {
        const out = compile(
            `export const v = <div props={base} static={{ id: 'x' }} />;`,
            { hoistStatic: true }
        );
        // A hoist would lift the props object to a module-const before the export.
        expect(out).toContain('...base');
        expect(out).not.toMatch(/const _hoisted/);
    });
});

describe('props={} — real DOM behavior', () => {
    it("a helper's static + handler buckets drive the element", () => {
        const mod = buildWith(`
            const helper = {
                static: { id: 'from-props', class: 'hp' },
                handlers: { onClick: () => { globalThis.__clicked = true; } },
            };
            export const tree = <button props={helper} />;
        `);
        const host = container();
        (dom as typeof import('@exodra/dom')).mount(
            mod.tree as Parameters<typeof dom.mount>[0],
            host
        );
        const btn = host.querySelector('button')!;
        expect(btn.id).toBe('from-props');
        expect(btn.className).toBe('hp');
        (globalThis as Record<string, unknown>).__clicked = false;
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect((globalThis as Record<string, unknown>).__clicked).toBe(true);
    });

    it('non-static helper buckets survive alongside inline children', () => {
        // The realistic helper (forms/oimdb) returns handlers/bindables, NOT
        // static — so it does not collide with children (which fold into static).
        const mod = buildWith(`
            const helper = { handlers: { onClick: () => { globalThis.__c2 = true; } } };
            export const tree = <button props={helper}>go</button>;
        `);
        const host = container();
        (dom as typeof import('@exodra/dom')).mount(
            mod.tree as Parameters<typeof dom.mount>[0],
            host
        );
        const btn = host.querySelector('button')!;
        expect(btn.textContent).toBe('go');
        (globalThis as Record<string, unknown>).__c2 = false;
        btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect((globalThis as Record<string, unknown>).__c2).toBe(true);
    });

    it('KNOWN EDGE: children fold into inline static and replace props.static wholesale', () => {
        // Children live in `static.children`, so they create an inline `static`
        // bucket — which whole-field replaces the helper's `static` (plain JS
        // spread, no deep merge). So a helper's `static.id` is lost the moment the
        // element also has children. Keep static OUT of a helper used with
        // children, or merge it yourself: props={mergeAttrs(helper, { static })}.
        const mod = buildWith(`
            const helper = { static: { id: 'gone' } };
            export const tree = <div props={helper}>child</div>;
        `);
        const host = container();
        (dom as typeof import('@exodra/dom')).mount(
            mod.tree as Parameters<typeof dom.mount>[0],
            host
        );
        const div = host.querySelector('div')!;
        expect(div.textContent).toBe('child');
        expect(div.id).toBe(''); // helper.static.id was replaced by { children }
    });

    it('inline bucket overrides the same key from props (whole-field replace)', () => {
        const mod = buildWith(`
            const helper = { static: { class: 'from-props', id: 'keep' } };
            export const tree = <div props={helper} static={{ class: 'inline' }} />;
        `);
        const host = container();
        (dom as typeof import('@exodra/dom')).mount(
            mod.tree as Parameters<typeof dom.mount>[0],
            host
        );
        const div = host.querySelector('div')!;
        // static is whole-field replaced: inline wins on class, and props' `id`
        // is GONE (not deep-merged) — plain JS spread semantics.
        expect(div.className).toBe('inline');
        expect(div.id).toBe('');
    });
});
