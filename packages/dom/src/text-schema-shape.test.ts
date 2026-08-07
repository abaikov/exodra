/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { createTextSchema, h, text } from '@exodra/core';
import { renderToString } from '@exodra/string';
import { mount } from './mount';

// Both renderers wrap primitive children in a `#text` schema with a LOCAL copy of
// the literal instead of calling core's `createTextSchema`: the factory sits in
// per-child normalisation and a cross-package call does not inline (measured
// 12-17ns for the literal vs 30-35ns for the import). The copies are only safe
// while their shape is pinned to the canonical one — that is this file's job.
describe('#text schema shape is identical everywhere', () => {
    it('core: text() and createTextSchema agree', () => {
        expect(text('hi')).toEqual(createTextSchema('hi'));
        expect(createTextSchema('hi')).toMatchObject({
            type: '#text',
            attrs: { static: { textContent: 'hi' } },
        });
    });

    it('the DOM renderer produces the canonical shape for a primitive child', () => {
        const container = document.createElement('div');
        // A primitive child goes through normalizeChildren -> the local factory.
        mount(h('p', { static: { children: ['hi'] } }), container);
        expect(container.innerHTML).toBe('<p>hi</p>');
    });

    it('the string renderer produces the canonical shape for a primitive child', () => {
        expect(renderToString(h('p', { static: { children: ['hi'] } }))).toBe(
            '<p>hi</p>'
        );
    });

    it('a core-built text schema renders identically in both renderers', () => {
        const schema = h('p', { static: { children: [text('hi')] } });
        const container = document.createElement('div');
        mount(schema, container);
        expect(container.innerHTML).toBe('<p>hi</p>');
        expect(renderToString(schema)).toBe('<p>hi</p>');
    });
});
