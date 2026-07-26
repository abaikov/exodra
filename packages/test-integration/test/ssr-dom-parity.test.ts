// @vitest-environment jsdom
//
// The SSR-string ↔ client-hydration contract, as a node-STRUCTURE gate.
//
// Client hydration (ExoNodeDom.hydrate) index-matches the *parsed* SSR DOM
// against the schema's children. So the real question is not "do the HTML
// strings match" — adjacent text nodes serialize identically yet PARSE to a
// different node count — but "does the parsed SSR tree have the same node shape
// as what the schema builds (and thus expects on hydrate)". We compare the DOM
// ExoNodeDom mounts against the DOM the SSR string parses to.
//
// Matching cases assert equal shape. Known divergences are pinned as the Step-0
// baseline (SSR emits no anchor for empty/dynamic slots; adjacent text collapses)
// and will flip to equality as the marker contract lands. NONE of this touches
// the SPA build/mount path.

import { describe, expect, it } from 'vitest';
import { h, text } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';
import { renderToString } from '@exodra/string';
import { mount } from '@exodra/dom';

type Schema = Parameters<typeof mount>[0];

// A structural signature: element → tag[child,child], text → #t, comment → #c.
function sig(n: Node): string {
    if (n.nodeType === 3) return '#t';
    if (n.nodeType === 8) return '#c';
    const el = n as Element;
    const kids = Array.from(el.childNodes).map(sig).join(',');
    return `${el.tagName.toLowerCase()}[${kids}]`;
}

// Shape of the DOM ExoNodeDom builds (the client's own structure).
function domSig(schema: Schema): string {
    const c = document.createElement('div');
    const { dispose } = mount(schema, c);
    const s = Array.from(c.childNodes).map(sig).join(',');
    dispose();
    return s;
}

// Shape of the SSR string once the browser PARSES it (what hydrate walks).
function ssrSig(schema: Schema): string {
    const c = document.createElement('div');
    c.innerHTML = renderToString(schema as Parameters<typeof renderToString>[0]);
    return Array.from(c.childNodes).map(sig).join(',');
}

describe('SSR ↔ hydration node-structure parity', () => {
    it('plain element + text: same shape', () => {
        const s = h('div', { static: { id: 'x', children: text('hi') } }) as Schema;
        expect(ssrSig(s)).toBe(domSig(s));
    });

    it('nested elements: same shape', () => {
        const s = h('section', {
            static: {
                children: [
                    h('h1', { static: { children: text('T') } }),
                    h('p', { static: { children: text('body') } }),
                ],
            },
        }) as Schema;
        expect(ssrSig(s)).toBe(domSig(s));
    });

    it('component with element output: same shape', () => {
        const Card = () => h('article', { static: { children: text('x') } });
        const s = h('div', { static: { children: [h(Card as never, {})] } }) as Schema;
        expect(ssrSig(s)).toBe(domSig(s));
    });

    it('reactive list children: same shape', () => {
        const s = h('ul', {
            bindableLists: {
                children: list([
                    h('li', { static: { children: text('a') } }),
                    h('li', { static: { children: text('b') } }),
                ]),
            },
        }) as Schema;
        expect(ssrSig(s)).toBe(domSig(s));
    });

    it('reactive single child: same shape', () => {
        const child = bindable(h('span', { static: { children: text('x') } }));
        const s = h('div', { bindables: { children: child } }) as Schema;
        expect(ssrSig(s)).toBe(domSig(s));
    });

    // --- expected structural divergences, BRIDGED by hydrate ----------------
    //
    // SSR is minimal by design (no markers): an empty component emits nothing,
    // adjacent text collapses. The client's fresh build differs (a comment anchor,
    // two text nodes). This is FINE — hydrate is resolution-aware: it consumes 0
    // nodes for an empty component and splits collapsed text, so reactivity still
    // wires to the right SSR nodes. The real contract is proven in
    // hydration-dynamic.test.ts; here we just pin the (acceptable) shapes so a
    // change in either serializer is noticed.

    it('empty component: SSR omits it, client build anchors it (hydrate bridges)', () => {
        const Empty = () => null;
        const s = h('div', { static: { children: [h(Empty as never, {})] } }) as Schema;
        expect(ssrSig(s)).toBe('div[]'); // SSR: nothing
        expect(domSig(s)).toBe('div[#c]'); // fresh build: comment anchor
    });

    it('empty component mid-list: SSR omits, client anchors (hydrate bridges)', () => {
        const Empty = () => null;
        const s = h('ul', {
            static: {
                children: [
                    h('li', { static: { children: text('a') } }),
                    h(Empty as never, {}),
                    h('li', { static: { children: text('b') } }),
                ],
            },
        }) as Schema;
        expect(ssrSig(s)).toBe('ul[li[#t],li[#t]]');
        expect(domSig(s)).toBe('ul[li[#t],#c,li[#t]]');
    });

    it('adjacent text: SSR collapses to one node, build keeps two (hydrate splits)', () => {
        const s = h('div', { static: { children: [text('a'), text('b')] } }) as Schema;
        expect(ssrSig(s)).toBe('div[#t]'); // "ab" parses to one text node
        expect(domSig(s)).toBe('div[#t,#t]'); // fresh build: two text nodes
    });
});
