// @vitest-environment jsdom
//
// Characterizes what client hydration actually does with DYNAMIC content today:
// render a schema to an SSR string, put it in the DOM, hydrate() against it, then
// drive reactivity and check the hydrated DOM responds. Where hydrate fails to
// resolve components / split text, reactivity does not wire to the SSR nodes.
// Pins the baseline; the `it.fails` flip to `it` as hydrate becomes resolution-
// aware. Touches only the hydrate path — never mount/buildTree.

import { describe, expect, it } from 'vitest';
import { h, text } from '@exodra/core';
import { createExoBindable } from '../../reactivity/src/createExoBindable';
import { createExoBindableList } from '../../reactivity/src/createExoBindableList';
import { renderToString } from '@exodra/string';
import { hydrate } from '@exodra/dom';

type Schema = Parameters<typeof hydrate>[0];

// Put the SSR HTML in the DOM and hydrate the schema against its root node.
function ssrThenHydrate(schema: Schema): { root: HTMLElement; dispose: () => void } {
    const host = document.createElement('div');
    host.innerHTML = renderToString(schema as Parameters<typeof renderToString>[0]);
    const { dispose } = hydrate(schema, host.firstChild as Element);
    return { root: host, dispose };
}

describe('dynamic hydration', () => {
    it('a plain element wires its bindable after hydrate', () => {
        const label = createExoBindable('a');
        const schema = h('span', { bindables: { textContent: label } }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        expect(root.querySelector('span')?.textContent).toBe('a');
        label.setValue('b');
        expect(root.querySelector('span')?.textContent).toBe('b');
        dispose();
    });

    it('a component wraps reactive content — bindable wires after hydrate', () => {
        const label = createExoBindable('a');
        const Widget = () => h('span', { bindables: { textContent: label } });
        const schema = h('div', {
            static: { children: [h(Widget as never, {})] },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        expect(root.querySelector('span')?.textContent).toBe('a'); // initial SSR ok
        label.setValue('b');
        // FAILS today: hydrate does not resolve the component, so the span's
        // bindable is never subscribed and the DOM does not update.
        expect(root.querySelector('span')?.textContent).toBe('b');
        dispose();
    });

    it('adjacent text nodes: the second stays independently updatable', () => {
        const a = createExoBindable('a');
        const schema = h('div', {
            static: {
                children: [
                    { type: '#text', attrs: { bindables: { textContent: a } } },
                    text('b'),
                ],
            },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        // SSR is "ab" → one text node on parse; the schema has two text children.
        expect(root.querySelector('div')?.childNodes.length).toBe(2);
        a.setValue('X');
        expect(root.querySelector('div')?.textContent).toBe('Xb');
        dispose();
    });

    it('empty component mid-list: the trailing sibling wires correctly', () => {
        const Empty = () => null;
        const label = createExoBindable('b');
        const schema = h('ul', {
            static: {
                children: [
                    h('li', { static: { children: text('a') } }),
                    h(Empty as never, {}),
                    h('li', { bindables: { textContent: label } }),
                ],
            },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        const lis = root.querySelectorAll('li');
        expect(lis[1]?.textContent).toBe('b');
        label.setValue('c');
        // FAILS today: the empty component consumed no SSR node, so index-match
        // wires the last <li> to the wrong schema (or not at all).
        expect(root.querySelectorAll('li')[1]?.textContent).toBe('c');
        dispose();
    });

    // Regression: a reactive fragment (`<>{list}</>` / `<>{signal}</>`) hydrated its
    // server-rendered children once and then FROZE — the hydrate #fragment branch
    // never created start/end anchors or subscribed, so list/signal ops did nothing.
    const row = (t: string) => h('li', { static: { children: text(t) } });

    it('a reactive fragment LIST updates after hydrate (was frozen)', () => {
        const rows = createExoBindableList([row('a'), row('b')]);
        const schema = h('ul', {
            static: {
                children: [h('#fragment', { bindableLists: { children: rows } })],
            },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        const ul = root.querySelector('ul')!;

        expect(ul.textContent).toBe('ab'); // initial SSR content
        rows.insert(1, row('c'));
        expect(ul.textContent).toBe('acb');
        rows.remove(0);
        expect(ul.textContent).toBe('cb');
        rows.push(row('d'));
        expect(ul.textContent).toBe('cbd');
        dispose();
    });

    it('a reactive single-child fragment SIGNAL swaps after hydrate', () => {
        const child = createExoBindable(row('one'));
        const schema = h('ul', {
            static: {
                children: [h('#fragment', { bindables: { children: child } })],
            },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        const ul = root.querySelector('ul')!;

        expect(ul.textContent).toBe('one');
        child.setValue(row('two'));
        expect(ul.textContent).toBe('two');
        dispose();
    });

    it('static sibling + reactive fragment list (the docs pattern) updates after hydrate', () => {
        const rows = createExoBindableList([row('x')]);
        const schema = h('ul', {
            static: {
                children: [
                    h('li', { static: { children: text('S') } }),
                    h('#fragment', { bindableLists: { children: rows } }),
                ],
            },
        }) as Schema;
        const { root, dispose } = ssrThenHydrate(schema);
        const ul = root.querySelector('ul')!;

        expect(ul.textContent).toBe('Sx'); // static sibling stays put
        rows.push(row('y'));
        expect(ul.textContent).toBe('Sxy');
        rows.insert(0, row('w'));
        expect(ul.textContent).toBe('Swxy');
        dispose();
    });
});
