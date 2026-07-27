// Parity gate for the SSR compile-mode emitter (first slice). For each case we
// compile the SAME Exodra JSX into a template string (emitSsr) AND render the
// equivalent schema through the runtime walker (renderToString), then eval the
// compiled string with the same data and assert the two HTML strings are equal,
// byte for byte. If they ever drift, the compiled server output and the walker
// (and thus hydration) diverge.

import { describe, it, expect } from 'vitest';
import * as babel from '@babel/core';
import syntaxJsx from '@babel/plugin-syntax-jsx';
import { h, text } from '@exodra/core';
import { createExoBindable } from '../../reactivity/src/createExoBindable';
import { renderToString } from '@exodra/string';
import {
    spaceAttribute,
    spaceAttributeUnchecked,
    escapeOrRaw,
    markHtml,
    ssrContext,
} from '@exodra/string';
import { emitSsr } from '../src/ssr-emit';

type Schema = Parameters<typeof renderToString>[0];

// Compile a JSX expression to the emitter's template string, then eval it with
// the runtime helpers (`_a`, `_esc`) and the provided free variables.
function compiledHtml(jsxExpr: string, scope: Record<string, unknown>): string {
    const out = babel.transformSync(`_r = (${jsxExpr});`, {
        babelrc: false,
        configFile: false,
        plugins: [
            syntaxJsx,
            {
                visitor: {
                    JSXElement(path: babel.NodePath<babel.types.JSXElement>) {
                        if (!path.parentPath.isJSXElement()) {
                            path.replaceWith(emitSsr(path.node));
                            path.skip();
                        }
                    },
                },
            },
        ],
    });
    const keys = Object.keys(scope);
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function(
        '_a',
        '_au',
        '_esc',
        '_html',
        '_ctx',
        ...keys,
        `let _r; ${out!.code}; return _r;`
    );
    // emitSsr wraps output as SafeHtml; String() gives the HTML.
    return String(
        fn(
            spaceAttribute,
            spaceAttributeUnchecked,
            escapeOrRaw,
            markHtml,
            ssrContext,
            ...keys.map(k => scope[k])
        )
    );
}

describe('ssr-emit — compiled output matches the walker', () => {
    it('element with static + dynamic attrs and a text hole', () => {
        const cls = 'card';
        const name = '<b>&"x"';
        const compiled = compiledHtml(
            `<div static={{ id: 'x', class: cls }}>hi {name}</div>`,
            { cls, name }
        );
        const walker = renderToString(
            h('div', {
                static: { id: 'x', class: cls, children: [text('hi'), name] },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('bindable attribute is read once and serialized like the walker', () => {
        const title = createExoBindable('a "b" <c>');
        const compiled = compiledHtml(
            `<div static={{ id: 'x' }} bindable={{ title }}>t</div>`,
            { title }
        );
        const walker = renderToString(
            h('div', {
                static: { id: 'x', children: text('t') },
                bindables: { title },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('nested elements bake into one template', () => {
        const label = 'A & B';
        const compiled = compiledHtml(
            `<section static={{ class: 'wrap' }}><h1>Title</h1><p>{label}</p></section>`,
            { label }
        );
        const walker = renderToString(
            h('section', {
                static: {
                    class: 'wrap',
                    children: [
                        h('h1', { static: { children: text('Title') } }),
                        h('p', { static: { children: [label] } }),
                    ],
                },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('a falsy/omitted attribute renders nothing (no stray space)', () => {
        const hidden = false;
        const compiled = compiledHtml(
            `<div static={{ id: 'x', hidden }}>y</div>`,
            { hidden }
        );
        const walker = renderToString(
            h('div', { static: { id: 'x', hidden, children: text('y') } }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('a list {arr.map(...)} bakes the row template + joins', () => {
        const items = ['a', '<b> & c'];
        const compiled = compiledHtml(
            `<ul>{items.map(i => <li>{i}</li>)}</ul>`,
            { items }
        );
        const walker = renderToString(
            h('ul', {
                static: {
                    children: items.map(i =>
                        h('li', { static: { children: [i] } })
                    ),
                },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('a && conditional renders the branch or nothing', () => {
        for (const show of [true, false]) {
            const compiled = compiledHtml(
                `<div>{show && <span>hi</span>}</div>`,
                { show }
            );
            const walker = renderToString(
                h('div', {
                    static: {
                        children: [
                            show && h('span', { static: { children: text('hi') } }),
                        ],
                    },
                }) as Schema
            );
            expect(compiled).toBe(walker);
        }
    });

    it('a ternary picks the compiled branch', () => {
        for (const ok of [true, false]) {
            const compiled = compiledHtml(
                `<div>{ok ? <b>Y</b> : <i>N</i>}</div>`,
                { ok }
            );
            const walker = renderToString(
                h('div', {
                    static: {
                        children: [
                            ok
                                ? h('b', { static: { children: text('Y') } })
                                : h('i', { static: { children: text('N') } }),
                        ],
                    },
                }) as Schema
            );
            expect(compiled).toBe(walker);
        }
    });

    it('static textContent is baked (and wins over children)', () => {
        const compiled = compiledHtml(
            `<span static={{ class: 'c', textContent: 'a & <b>' }} />`,
            {}
        );
        const walker = renderToString(
            h('span', { static: { class: 'c', textContent: 'a & <b>' } }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('bindable textContent is read once and escaped', () => {
        const label = createExoBindable('x < y & "z"');
        const compiled = compiledHtml(
            `<span bindable={{ textContent: label }} />`,
            { label }
        );
        const walker = renderToString(
            h('span', { bindables: { textContent: label } }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('dangerouslySetInnerHTML emits raw (unescaped) content', () => {
        const raw = '<em>bold</em> & stuff';
        const compiled = compiledHtml(
            `<div static={{ class: 'c', dangerouslySetInnerHTML: { __html: raw } }} />`,
            { raw }
        );
        const walker = renderToString(
            h('div', {
                static: { class: 'c', dangerouslySetInnerHTML: { __html: raw } },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('a fragment child flattens with no wrapper', () => {
        const a = 'A & B';
        const compiled = compiledHtml(
            `<div><>{a}<span>x</span></></div>`,
            { a }
        );
        const walker = renderToString(
            h('div', {
                static: {
                    children: [a, h('span', { static: { children: text('x') } })],
                },
            }) as Schema
        );
        expect(compiled).toBe(walker);
    });

    it('void elements emit no closing tag and match the walker', () => {
        const src = 'x.png';
        const compiledImg = compiledHtml(
            `<img static={{ src, alt: 'a' }} />`,
            { src }
        );
        const walkerImg = renderToString(
            h('img', { static: { src, alt: 'a' } }) as Schema
        );
        expect(compiledImg).toBe(walkerImg);
        expect(compiledImg).toBe('<img src="x.png" alt="a">');

        const compiledBr = compiledHtml(`<br />`, {});
        expect(compiledBr).toBe(renderToString(h('br', {}) as Schema));
        expect(compiledBr).toBe('<br>');

        // A void element nested in a normal parent (the common <head> case).
        const compiledHead = compiledHtml(
            `<head><meta static={{ charset: 'utf-8' }} /><title>T</title></head>`,
            {}
        );
        const walkerHead = renderToString(
            h('head', {
                static: {
                    children: [
                        h('meta', { static: { charset: 'utf-8' } }),
                        h('title', { static: { children: text('T') } }),
                    ],
                },
            }) as Schema
        );
        expect(compiledHead).toBe(walkerHead);
        expect(compiledHead).toBe('<head><meta charset="utf-8"><title>T</title></head>');
    });
});
