/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { createExoBindable, createExoBindableList } from '@exodra/reactivity';
import { renderToString } from '@exodra/string';
import type { TExoListOp } from '@exodra/reactivity-types';
import { mount } from './mount';

/**
 * KNOWN, UNFIXED defects, pinned so they cannot get quietly worse and so a fix
 * has an executable definition of done. Each case is `it.fails`: it currently
 * FAILS, and the suite stays green while it does. When one is fixed, flip its
 * `it.fails` to `it` — the test is already the acceptance criterion.
 *
 * The theme is the same in most of them: the DOM renderer and the string
 * renderer disagree, so a page renders one way on the server and another way in
 * the browser.
 */

describe('DOM vs string renderer parity', () => {
    // The string renderer emits `dangerouslySetInnerHTML.__html` as raw markup
    // (ExoNodeString.renderNode). The DOM renderer has no case for it, so
    // applyStatic falls through to writeAttr and stamps a literal
    // `dangerouslysetinnerhtml="[object Object]"` attribute on the element while
    // the markup is never inserted.
    it('dangerouslySetInnerHTML inserts raw HTML in both renderers', () => {
        const build = () =>
            h('div', {
                static: { dangerouslySetInnerHTML: { __html: '<b>raw</b>' } },
            });
        expect(renderToString(build())).toBe('<div><b>raw</b></div>');

        const container = document.createElement('div');
        mount(build(), container);
        expect(container.innerHTML).toBe('<div><b>raw</b></div>');
    });

    // The string renderer treats a nullish textContent as "no value" and falls
    // back to children — its comment says a literal null must not print "null".
    // The DOM renderer does `element.textContent = String(value)` unguarded, so
    // it prints the word "null" (and, on the static path, blanks the children).
    it('a nullish bound textContent falls back to children', () => {
        const build = () =>
            h('p', {
                static: {
                    children: [h('span', { static: { textContent: 'kid' } })],
                },
                bindables: { textContent: createExoBindable<string | null>(null) },
            });
        const expected = renderToString(build());

        const container = document.createElement('div');
        mount(build(), container);
        expect(container.innerHTML).toBe(expected);
    });

    // ExoNodeString.resolveChildren runs a reactive list's value through
    // normalizeChildren; ExoNodeDom.childrenOf returns it verbatim. So a list
    // holding a primitive renders as text on the server and throws
    // ("cannot create a DOM node ... type is undefined") in the browser.
    it('a primitive inside a reactive children list renders as text', () => {
        const build = () =>
            h('ul', {
                bindableLists: {
                    children: createExoBindableList<unknown>([
                        'plain text',
                        h('li', { static: { textContent: 'b' } }),
                    ]),
                },
            });
        expect(renderToString(build())).toBe('<ul>plain text<li>b</li></ul>');

        const container = document.createElement('div');
        mount(build(), container);
        expect(container.innerHTML).toBe('<ul>plain text<li>b</li></ul>');
    });
});

describe('reactive list contract', () => {
    // TExoBindableList documents the value as "a stable array the ops describe
    // deltas into". ExoNodeDom.applyListOp splices the array it received from
    // getValue() — so for any implementation that honours that wording, the
    // renderer mutates the SOURCE list a second time and doubles every op.
    // (The built-in list hides this by handing out a fresh copy per read.)
    it('an implementation returning a stable array is not corrupted', () => {
        const items = [
            h('li', { static: { textContent: 'a' } }),
            h('li', { static: { textContent: 'b' } }),
        ];
        const subs = new Set<(op: TExoListOp<unknown>) => void>();
        const list = {
            getValue: () => items,
            onChange(cb: (op: TExoListOp<unknown>) => void) {
                subs.add(cb);
                return () => subs.delete(cb);
            },
        };

        const container = document.createElement('div');
        mount(h('ul', { bindableLists: { children: list } }), container);

        const c = h('li', { static: { textContent: 'c' } });
        items.push(c);
        for (const cb of subs) cb({ type: 'insert', index: 2, item: c });

        expect(items.length, 'source array must hold exactly 3 items').toBe(3);
        expect(container.innerHTML).toBe('<ul><li>a</li><li>b</li><li>c</li></ul>');
    });

    // Same contract, the other side of it: the built-in list allocates a fresh
    // array on every read, so its value is never stable.
    it('the built-in list returns a stable array reference', () => {
        const list = createExoBindableList([1, 2, 3]);
        expect(list.getValue()).toBe(list.getValue());
    });

    // The constructor aliases the caller's array instead of copying it, so a
    // later op mutates data the caller still owns. (Note this is the exact
    // opposite of the read side above: it copies where it should not, and
    // aliases where it should copy.)
    it('the built-in list does not mutate the caller array', () => {
        const source = [1, 2, 3];
        const list = createExoBindableList(source);
        list.push(4);
        expect(source).toEqual([1, 2, 3]);
    });
});

describe('diagnostics', () => {
    // A plain value in the `bindables` bucket used to produce a named dev
    // warning; the protocol migration deleted dev.ts (__DEV__ / devWarnOnce)
    // and nothing replaced it, so it now dies with "b.getValue is not a
    // function" — no attribute name, no schema, no hint about the right bucket.
    it('a non-bindable in the bindables bucket names itself', () => {
        const container = document.createElement('div');
        expect(() =>
            mount(
                h('div', { bindables: { id: 'oops-not-a-bindable' as never } }),
                container
            )
        ).toThrowError(/bindables\.id/);
    });
});
