// @vitest-environment jsdom
//
// Compiler-level tests for @exodra/babel-plugin-jsx.
//
// The JSX compiler is part of the Exodra language, so it's tested like one:
//  1. OUTPUT SNAPSHOTS lock the emitted `h()` code for representative inputs.
//  2. RUNTIME E2E takes real Exodra JSX, runs it through the ACTUAL plugin, then
//     EXECUTES the compiled output against real @exodra/core + @exodra/dom and
//     asserts BEHAVIOR — static attrs, reactive bindables driving the DOM, real
//     DOM events, and children/list reconciliation.
//
// The E2E suite runs against BOTH the plugin `src` AND the built `dist`. The
// `dist` pass is the guard against the stale-`dist` trap: if the shipped compiler
// diverges from source, these behavioral tests fail instead of examples silently
// mis-compiling. (`dist` is skipped with a warning if it hasn't been built.)

import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as core from '@exodra/core';
import * as dom from '@exodra/dom';
import * as reactivity from '@exodra/reactivity';
import * as jsx from '@exodra/jsx';
import * as forms from '@exodra/forms';
import * as srcPluginModule from '../src/index';

const require = createRequire(import.meta.url);

const srcPlugin =
    (srcPluginModule as { default?: unknown }).default ??
    (srcPluginModule as unknown);

let distPlugin: unknown = null;
try {
    distPlugin = require('../dist/index.cjs').default;
} catch {
    // not built — the dist E2E pass is skipped below with a warning.
}

const { h, text } = core as typeof import('@exodra/core');
const { mount } = dom as typeof import('@exodra/dom');
const { bindable } = reactivity as typeof import('@exodra/reactivity');

type Schema = Parameters<typeof mount>[0];

/** Compile Exodra JSX/TSX to `h()` code via a given plugin build. */
function compileWith(plugin: unknown, src: string): string {
    const res = babel.transformSync(src, {
        filename: 'input.tsx',
        babelrc: false,
        configFile: false,
        presets: [
            ['@babel/preset-typescript', { isTSX: true, allExtensions: true }],
        ],
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as babel.PluginItem, { importSource: '@exodra/core' }],
        ],
    });
    if (!res?.code) throw new Error('compile produced no code');
    return res.code;
}

/** Compile with a plugin, then execute the module against real Exodra packages. */
function buildWith(plugin: unknown, src: string): Record<string, unknown> {
    const cjs = babel.transformSync(compileWith(plugin, src), {
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

// --- output snapshots (src is authoritative) -------------------------------

describe('@exodra/babel-plugin-jsx — output snapshots', () => {
    const c = (src: string) => compileWith(srcPlugin, src);

    it('element with static attrs + text child', () => {
        expect(c(`export const v = <div static={{ id: 'x' }}>hi</div>;`)).toMatchSnapshot();
    });
    it('mixed buckets (static + bindable + handlers)', () => {
        expect(
            c(`export const v = <button static={{ class: 'b' }} bindable={{ textContent: label }} handlers={{ onClick: f }} />;`)
        ).toMatchSnapshot();
    });
    it('expression child becomes a reactive child', () => {
        expect(c(`export const v = <div>{count}</div>;`)).toMatchSnapshot();
    });
    it('fragment', () => {
        expect(c(`export const v = <>{a}{b}</>;`)).toMatchSnapshot();
    });
    it('bindableList children', () => {
        expect(c(`export const v = <ul bindableList={{ children: rows }} />;`)).toMatchSnapshot();
    });
});

// --- structural guarantees --------------------------------------------------

describe('@exodra/babel-plugin-jsx — compiled structure', () => {
    it('puts children in static.children, not a positional 3rd arg', () => {
        const code = compileWith(srcPlugin, `export const v = <div static={{ id: 'x' }}>hi</div>;`);
        expect(code).toContain('h("div"');
        expect(code).toContain('static:');
        expect(code).toMatch(/children:\s*text\("hi"\)/);
        expect(code).not.toMatch(/h\("div",\s*\{[^}]*\},\s*text\(/s);
    });
});

// --- runtime E2E, run against BOTH src and (if built) dist ------------------

const variants: Array<[string, unknown]> = [['src', srcPlugin]];
if (distPlugin) variants.push(['dist', distPlugin]);
else console.warn('[compiler.test] dist not built — skipping the dist E2E pass (run `npm run build` to include it)');

describe.each(variants)('@exodra/babel-plugin-jsx — runtime semantics [%s]', (_name, plugin) => {
    const build = (src: string) => buildWith(plugin, src);

    it('renders static attributes and text children', () => {
        const mod = build(`export const v = <section static={{ class: 'wrap' }}>hello</section>;`);
        const el = container();
        const { dispose } = mount(mod.v as Schema, el);
        expect(el.querySelector('section.wrap')?.textContent).toBe('hello');
        dispose();
    });

    it('bindable textContent drives the DOM on setValue', () => {
        const mod = build(`export function make(label) { return <span bindable={{ textContent: label }} />; }`);
        const label = bindable('a');
        const el = container();
        const make = mod.make as (l: unknown) => Schema;
        const { dispose } = mount(make(label), el);
        expect(el.querySelector('span')?.textContent).toBe('a');
        label.setValue('b');
        expect(el.querySelector('span')?.textContent).toBe('b');
        dispose();
    });

    it('handlers fire on real DOM events', () => {
        const mod = build(`export function make(onClick) { return <button handlers={{ onClick }}>x</button>; }`);
        let clicks = 0;
        const el = container();
        const make = mod.make as (f: () => void) => Schema;
        const { dispose } = mount(make(() => clicks++), el);
        el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicks).toBe(1);
        dispose();
    });

    it('reactive children reconcile (add a row)', () => {
        const mod = build(`export function make(items) { return <ul bindable={{ children: items }} />; }`);
        const a = h('li', { static: { children: text('a') } });
        const b = h('li', { static: { children: text('b') } });
        const items = bindable<Schema[]>([a]);
        const el = container();
        const make = mod.make as (i: unknown) => Schema;
        const { dispose } = mount(make(items), el);
        expect(el.querySelectorAll('li').length).toBe(1);
        items.setValue([a, b]);
        expect(el.querySelectorAll('li').length).toBe(2);
        expect(el.textContent).toContain('a');
        expect(el.textContent).toContain('b');
        dispose();
    });
});

// --- compiler-specific paths: directives, cacheKey, fragments ---------------

describe('@exodra/babel-plugin-jsx — directives & special forms', () => {
    const c = (src: string) => compileWith(srcPlugin, src);

    it('cache:key → 3rd arg of h() (snapshot)', () => {
        expect(c(`export const v = <li cache:key={key} static={{ id: 'r' }} />;`)).toMatchSnapshot();
    });
    it('bind:value → mergeAttrs + forms helper (snapshot)', () => {
        expect(c(`export const v = <input bind:value={model} />;`)).toMatchSnapshot();
    });
    it('bindableHandlers bucket (snapshot)', () => {
        expect(c(`export const v = <button bindableHandlers={{ onClick: sig }} />;`)).toMatchSnapshot();
    });

    it('cache:key element mounts and renders', () => {
        const mod = buildWith(
            srcPlugin,
            `export function make(key) { return <span cache:key={key} static={{ class: 'c' }}>y</span>; }`
        );
        const el = container();
        const make = mod.make as (k: unknown) => Schema;
        const { dispose } = mount(make('k1'), el);
        expect(el.querySelector('span.c')?.textContent).toBe('y');
        dispose();
    });

    it('bind:value is two-way (DOM reflects model, edits write back)', () => {
        const mod = buildWith(
            srcPlugin,
            `export function make(model) { return <input bind:value={model} />; }`
        );
        const model = bindable('hi');
        const el = container();
        const make = mod.make as (m: unknown) => Schema;
        const { dispose } = mount(make(model), el);
        const input = el.querySelector('input') as HTMLInputElement;
        expect(input.value).toBe('hi');
        input.value = 'bye';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        expect(model.getValue()).toBe('bye');
        dispose();
    });

    it('nested fragment renders all children', () => {
        const mod = buildWith(
            srcPlugin,
            `export const v = <div><><span>one</span><span>two</span></></div>;`
        );
        const el = container();
        const { dispose } = mount(mod.v as Schema, el);
        expect(el.querySelectorAll('span').length).toBe(2);
        expect(el.textContent).toContain('one');
        expect(el.textContent).toContain('two');
        dispose();
    });

    // A BARE fragment emits `h(Fragment, …)` with an actual Fragment import.
    // The import itself is now correct (`@exodra/jsx`, verified in compat.test),
    // but @exodra/dom can't yet mount a fragment as the ROOT element (fragments
    // work fine as children). Documented as a known limitation with it.fails —
    // it flips green when the renderer supports fragment roots.
    it.fails('bare fragment as the mount root is not yet supported', () => {
        const mod = buildWith(
            srcPlugin,
            `export const v = <><span>one</span><span>two</span></>;`
        );
        mount(mod.v as Schema, container());
    });
});

// --- strict flat-prop errors ------------------------------------------------

describe('@exodra/babel-plugin-jsx — strict flat-prop errors', () => {
    it('rejects a flat attribute at compile time', () => {
        expect(() => compileWith(srcPlugin, `const x = <div class="foo" />;`)).toThrow(
            /flat attribute "class" is not allowed/
        );
    });
    it('rejects a flat event prop at compile time', () => {
        expect(() => compileWith(srcPlugin, `const x = <button onClick={f} />;`)).toThrow(
            /flat event prop "onClick" is not allowed/
        );
    });
});
