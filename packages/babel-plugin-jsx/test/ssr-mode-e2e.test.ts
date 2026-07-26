// @vitest-environment jsdom
//
// End-to-end proof of SSR compile-mode: the SAME source compiled by the plugin
// with mode:'ssr' (template-string functions) must produce the same HTML as
// mode:'dom' compiled + renderToString'd (the walker) — byte for byte — and the
// client (mode:'dom' schema) must hydrate that SSR HTML without drift.

import { createRequire } from 'module';
import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import * as core from '@exodra/core';
import * as dom from '@exodra/dom';
import * as reactivity from '@exodra/reactivity';
import * as stringPkg from '@exodra/string';
import * as ssrPkg from '@exodra/ssr';
import * as stylePkg from '@exodra/style';
import * as srcPluginModule from '../src/index';

const require = createRequire(import.meta.url);
const plugin = (srcPluginModule as { default?: unknown }).default ?? srcPluginModule;
const { renderToString } = stringPkg as typeof import('@exodra/string');
const { mount, hydrate } = dom as typeof import('@exodra/dom');

// Compile a module with the plugin at a given mode, then execute it against the
// real Exodra packages and return its exports.
function build(src: string, mode: 'dom' | 'ssr'): Record<string, unknown> {
    const compiled = babel.transformSync(src, {
        filename: 'page.tsx',
        babelrc: false,
        configFile: false,
        presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
        plugins: [
            [syntaxJsx, { throwIfNamespace: false }],
            [plugin as babel.PluginItem, { importSource: '@exodra/core', mode }],
        ],
    });
    const cjs = babel.transformSync(compiled!.code!, {
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-transform-modules-commonjs'],
    });
    const shim: Record<string, unknown> = {
        '@exodra/core': core,
        '@exodra/dom': dom,
        '@exodra/reactivity': reactivity,
        '@exodra/string': stringPkg,
        '@exodra/ssr': ssrPkg,
        '@exodra/style': stylePkg,
    };
    const mod = { exports: {} as Record<string, unknown> };
    const req = (id: string): unknown => {
        if (id in shim) return shim[id];
        throw new Error(`unexpected module: ${id}`);
    };
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function('require', 'module', 'exports', cjs!.code!)(req, mod, mod.exports);
    return mod.exports;
}

const PAGE = `
export const Page = (data) => (
  <div static={{ class: 'app' }}>
    <h1>{data.title}</h1>
    <ul>{data.items.map(i => <li static={{ class: 'row' }}>{i}</li>)}</ul>
    {data.footer && <footer>{data.footer}</footer>}
  </div>
);
`;

describe('SSR compile-mode end-to-end', () => {
    const data = {
        title: 'Hello <b>&"world"',
        items: ['a', 'b & c', '<script>'],
        footer: 'the end',
    };

    it('mode:ssr output is byte-identical to the walker', () => {
        const ssr = build(PAGE, 'ssr').Page as (d: unknown) => string;
        const domMod = build(PAGE, 'dom').Page as (d: unknown) => Parameters<typeof renderToString>[0];

        const ssrHtml = String(ssr(data));
        const walkerHtml = renderToString(domMod(data));
        expect(ssrHtml).toBe(walkerHtml);
    });

    it('the SSR HTML hydrates without drift', () => {
        const ssr = build(PAGE, 'ssr').Page as (d: unknown) => string;
        const domMod = build(PAGE, 'dom').Page as (d: unknown) => Parameters<typeof mount>[0];

        const host = document.createElement('div');
        host.innerHTML = String(ssr(data));
        const before = host.innerHTML;

        const { dispose } = hydrate(domMod(data), host.firstChild as Element);
        // Hydration reuses the SSR nodes: the DOM is unchanged, and the structure
        // matches what a fresh client build produces.
        expect(host.querySelectorAll('li').length).toBe(3);
        expect(host.querySelector('footer')?.textContent).toBe('the end');
        expect(host.innerHTML).toBe(before);
        dispose();
    });

    it('the conditional branch is omitted when falsy (parity holds)', () => {
        const noFooter = { ...data, footer: '' };
        const ssr = build(PAGE, 'ssr').Page as (d: unknown) => string;
        const domMod = build(PAGE, 'dom').Page as (d: unknown) => Parameters<typeof renderToString>[0];
        expect(String(ssr(noFooter))).toBe(renderToString(domMod(noFooter)));
        expect(String(ssr(noFooter))).not.toContain('<footer>');
    });
});

// A component (reads props via ctx.getConstant) compiled and invoked in SSR mode.
const WITH_COMPONENT = `
export const Badge = (ctx) => (
  <span static={{ class: 'badge' }}>{ctx.getConstant('label')}</span>
);
export const Page = (data) => (
  <div static={{ class: 'app' }}>
    <Badge static={{ label: data.tag }} />
    <Badge static={{ label: data.other }} />
  </div>
);
`;

describe('SSR compile-mode components', () => {
    const data = { tag: 'new <&>', other: 'hot' };

    it('a component reads props and renders with walker parity', () => {
        const page = build(WITH_COMPONENT, 'ssr').Page as (d: unknown) => string;
        const domMod = build(WITH_COMPONENT, 'dom');
        const domPage = domMod.Page as (d: unknown) => Parameters<typeof renderToString>[0];
        expect(String(page(data))).toBe(renderToString(domPage(data)));
    });

    it('a component page hydrates without drift', () => {
        const page = build(WITH_COMPONENT, 'ssr').Page as (d: unknown) => string;
        const domMod = build(WITH_COMPONENT, 'dom');
        const domPage = domMod.Page as (d: unknown) => Parameters<typeof mount>[0];

        const host = document.createElement('div');
        host.innerHTML = String(page(data));
        const before = host.innerHTML;
        const { dispose } = hydrate(domPage(data), host.firstChild as Element);
        expect(host.querySelectorAll('span.badge').length).toBe(2);
        expect(host.innerHTML).toBe(before);
        dispose();
    });
});

// Composition: a component that renders its children, and the flagship
// `{arr.map(componentRef)}` pattern (a function returning JSX, by reference).
const COMPOSITION = `
export const Box = (ctx) => (
  <div static={{ class: 'box' }}>{ctx.getConstant('children')}</div>
);
const card = (t) => <li static={{ class: 'card' }}>{t}</li>;
export const List = (data) => <ul>{data.tags.map(card)}</ul>;
export const Wrapped = (data) => <Box><span>{data.msg}</span></Box>;
`;

describe('SSR compile-mode composition', () => {
    it('a component renders its children (walker parity)', () => {
        const ssr = build(COMPOSITION, 'ssr').Wrapped as (d: unknown) => string;
        const domMod = build(COMPOSITION, 'dom').Wrapped as (
            d: unknown
        ) => Parameters<typeof renderToString>[0];
        const data = { msg: 'hi <&>' };
        expect(String(ssr(data))).toBe(renderToString(domMod(data)));
    });

    it('{arr.map(componentRef)} composes (flagship pattern)', () => {
        const ssr = build(COMPOSITION, 'ssr').List as (d: unknown) => string;
        const domMod = build(COMPOSITION, 'dom').List as (
            d: unknown
        ) => Parameters<typeof renderToString>[0];
        const data = { tags: ['a', 'b & c', '<x>'] };
        const html = String(ssr(data));
        expect(html).toBe(renderToString(domMod(data)));
        expect(html).toContain('<li class="card">a</li>');
        expect(html).not.toContain('[object'); // SafeHtml flattened, not stringified
    });

    it('a composed page hydrates without drift', () => {
        const ssr = build(COMPOSITION, 'ssr').List as (d: unknown) => string;
        const domMod = build(COMPOSITION, 'dom').List as (
            d: unknown
        ) => Parameters<typeof mount>[0];
        const data = { tags: ['a', 'b', 'c'] };
        const host = document.createElement('div');
        host.innerHTML = String(ssr(data));
        const before = host.innerHTML;
        const { dispose } = hydrate(domMod(data), host.firstChild as Element);
        expect(host.querySelectorAll('li.card').length).toBe(3);
        expect(host.innerHTML).toBe(before);
        dispose();
    });
});

// SSR side-effect context: metadata components (Status/Header/State/Head) reach
// the per-request context via inject(ssrContextKey). Under compiled SSR that is
// the module-scoped ambient set by renderToStringCompiled; parity is checked
// against ExoNodeSsr (the walker) rendering the same page's schema.
const META_PAGE = `
import { Status, Header, State, Head } from '@exodra/ssr';
export const Page = (data) => (
  <div static={{ class: 'app' }}>
    <Status static={{ code: 404 }} />
    <Header static={{ name: 'X-Test', value: 'yes' }} />
    <State static={{ name: 'user', value: data.user }} />
    <Head><title>{data.title}</title></Head>
    <h1>{data.title}</h1>
  </div>
);
`;

describe('SSR compile-mode side-effect context', () => {
    const data = { user: 'ada', title: 'Home <&>' };

    it('collects status/headers/state/head, with walker parity', () => {
        const { renderToStringCompiled } = ssrPkg as typeof import('@exodra/ssr');
        const { ExoNodeSsr } = ssrPkg as typeof import('@exodra/ssr');

        const ssrPage = build(META_PAGE, 'ssr').Page as (d: unknown) => unknown;
        const domPage = build(META_PAGE, 'dom').Page as (
            d: unknown
        ) => Parameters<typeof renderToString>[0];

        const compiled = renderToStringCompiled(() => ssrPage(data));
        const walker = new ExoNodeSsr(domPage(data));

        expect(compiled.status).toBe(404);
        expect(compiled.status).toBe(walker.getStatus());
        expect(compiled.headers).toEqual([{ name: 'X-Test', value: 'yes' }]);
        expect(compiled.headers).toEqual(walker.getHeaders());
        expect(compiled.state).toEqual({ user: 'ada' });
        expect(compiled.state).toEqual(walker.getStateSnapshot());
        expect(compiled.head).toBe(walker.renderHead());
        expect(compiled.head).toContain('<title>Home &lt;&amp;&gt;</title>');
        // Metadata components emit no body; the body matches the walker.
        expect(compiled.html).toBe(walker.renderBody());
        expect(compiled.html).toContain('<h1>Home &lt;&amp;&gt;</h1>');
    });

    it('renderDocument assembles a full HTML document with head + state', () => {
        const { renderToStringCompiled } = ssrPkg as typeof import('@exodra/ssr');
        const ssrPage = build(META_PAGE, 'ssr').Page as (d: unknown) => unknown;
        const doc = renderToStringCompiled(() => ssrPage(data)).renderDocument({
            rootId: 'root',
        });
        expect(doc).toContain('<!doctype html>');
        expect(doc).toContain('<head><title>Home &lt;&amp;&gt;</title></head>');
        expect(doc).toContain('<div id="root"><div class="app">');
        expect(doc).toContain('__EXODRA_STATE__'); // <State> collected
    });
});

// Static-attribute baking + style folding: fully-static attrs bake into the
// literal (no runtime _a); a static style object folds to a CSS string; dynamic
// values fall back to runtime — all byte-identical to the walker.
describe('SSR compile-mode static baking + style', () => {
    it('bakes static literal attrs (no runtime _a) with walker parity', () => {
        const src = `export const P = () => (
            <div static={{ id: 'x', class: 'card', tabIndex: 0, hidden: false, draggable: true }}>hi</div>
        );`;
        // The compiled body is a single literal — no _a( calls.
        const code = babel.transformSync(src, {
            filename: 'p.tsx',
            babelrc: false,
            configFile: false,
            presets: [['@babel/preset-typescript', { isTSX: true, allExtensions: true }]],
            plugins: [
                [syntaxJsx, { throwIfNamespace: false }],
                [plugin as babel.PluginItem, { mode: 'ssr' }],
            ],
        })!.code!;
        expect(code).not.toContain('_a(');

        const ssr = build(src, 'ssr').P as () => string;
        const dom = build(src, 'dom').P as () => Parameters<typeof renderToString>[0];
        expect(String(ssr())).toBe(renderToString(dom()));
    });

    it('folds a static style object to a CSS string (walker parity)', () => {
        const src = `export const P = () => (
            <div static={{ style: { color: 'red', fontSize: 12, marginTop: 0 } }}>x</div>
        );`;
        const ssr = build(src, 'ssr').P as () => string;
        const dom = build(src, 'dom').P as () => Parameters<typeof renderToString>[0];
        const html = String(ssr());
        expect(html).toContain('style="color:red;font-size:12px;margin-top:0"');
        expect(html).toBe(renderToString(dom()));
    });

    it('a dynamic style object folds at runtime via style() (walker parity)', () => {
        const src = `export const P = (d) => <div static={{ style: { color: d.color, fontSize: 14 } }} />;`;
        const ssr = build(src, 'ssr').P as (d: unknown) => string;
        const dom = build(src, 'dom').P as (d: unknown) => Parameters<typeof renderToString>[0];
        const d = { color: 'blue' };
        expect(String(ssr(d))).toBe(renderToString(dom(d)));
    });
});

describe('SSR compile-mode shadow-safety', () => {
    it('a local _a does not collide with the runtime helper', () => {
        const src = `export const P = (d) => {
            const _a = 'the-id';
            return <div static={{ id: _a }}>{d.msg}</div>;
        };`;
        const ssr = build(src, 'ssr').P as (d: unknown) => string;
        const dom = build(src, 'dom').P as (d: unknown) => Parameters<typeof renderToString>[0];
        const d = { msg: 'hi <&>' };
        // Would throw "_a is not a function" if the helper reused the shadowed name.
        expect(String(ssr(d))).toBe(renderToString(dom(d)));
        expect(String(ssr(d))).toContain('id="the-id"');
    });
});
