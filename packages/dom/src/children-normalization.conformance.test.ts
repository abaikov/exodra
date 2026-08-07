/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { renderToString } from '@exodra/string';
import { mount } from './mount';

/**
 * ONE set of rules, TWO implementations. The live renderer and the snapshot
 * renderer each normalise children with their own code — deliberately, because
 * `ExoNodeDom.normalizeChildren` is a hot build-path routine with a
 * no-allocation fast path that the one-shot renderer has no reason to carry.
 *
 * What must NOT differ is the RESULT. Every case below is asserted against both
 * renderers at once, so a change to either implementation that shifts behaviour
 * fails here. (This is how the `bigint` gap surfaced: SSR printed `10`, the DOM
 * renderer treated it as a schema and threw.)
 */
const cases: Array<{ name: string; children: unknown; html: string }> = [
    { name: 'a plain string child', children: ['hi'], html: '<p>hi</p>' },
    { name: 'a number child', children: [42], html: '<p>42</p>' },
    { name: 'a bigint child', children: [10n], html: '<p>10</p>' },
    { name: 'zero (not falsy-dropped)', children: [0], html: '<p>0</p>' },
    { name: 'an empty string', children: [''], html: '<p></p>' },
    { name: 'null holes', children: [null, 'a', null], html: '<p>a</p>' },
    { name: 'undefined holes', children: [undefined, 'a'], html: '<p>a</p>' },
    {
        name: 'boolean holes (a `cond && <x/>` that failed)',
        children: [false, 'a', true],
        html: '<p>a</p>',
    },
    {
        name: 'nested arrays are flattened',
        children: [['a', ['b', 'c']], 'd'],
        html: '<p>abcd</p>',
    },
    {
        name: 'mixed primitives and elements',
        children: ['a', h('b', { static: { textContent: 'B' } }), 1],
        html: '<p>a<b>B</b>1</p>',
    },
    {
        name: 'a clean element list (the fast path)',
        children: [
            h('b', { static: { textContent: 'B' } }),
            h('i', { static: { textContent: 'I' } }),
        ],
        html: '<p><b>B</b><i>I</i></p>',
    },
    { name: 'an empty array', children: [], html: '<p></p>' },
    { name: 'a single non-array child', children: 'solo', html: '<p>solo</p>' },
];

describe('children normalization is identical in both renderers', () => {
    it.each(cases)('$name', ({ children, html }) => {
        const schema = h('p', {
            static: { children: children as never },
        });

        const container = document.createElement('div');
        mount(schema, container);
        expect(container.innerHTML, 'DOM renderer').toBe(html);

        expect(renderToString(schema), 'string renderer').toBe(html);
    });
});
