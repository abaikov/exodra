/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { h } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';
import { mount } from './mount';

const SVG_NS = 'http://www.w3.org/2000/svg';
const HTML_NS = 'http://www.w3.org/1999/xhtml';

const container = (): HTMLElement => document.createElement('div');

describe('SVG', () => {
    it('creates <svg> and its descendants in the SVG namespace', () => {
        const host = container();
        mount(
            h('svg', {
                static: {
                    viewBox: '0 0 10 10',
                    children: [
                        h('g', {
                            static: {
                                children: [
                                    h('rect', { static: { width: '4', height: '4' } }),
                                ],
                            },
                        }),
                    ],
                },
            }),
            host
        );

        expect(host.querySelector('svg')!.namespaceURI).toBe(SVG_NS);
        expect(host.querySelector('g')!.namespaceURI).toBe(SVG_NS);
        expect(host.querySelector('rect')!.namespaceURI).toBe(SVG_NS);
        expect(host.querySelector('rect')).toBeInstanceOf(SVGElement);
    });

    it('leaves HTML outside an <svg> alone', () => {
        const host = container();
        mount(h('div', { static: { children: [h('span')] } }), host);
        expect(host.querySelector('div')!.namespaceURI).toBe(HTML_NS);
        expect(host.querySelector('span')!.namespaceURI).toBe(HTML_NS);
    });

    it('hands the namespace back to HTML inside foreignObject', () => {
        const host = container();
        mount(
            h('svg', {
                static: {
                    children: [
                        h('foreignObject', {
                            static: { children: [h('div', { static: { className: 'x' } })] },
                        }),
                    ],
                },
            }),
            host
        );
        expect(host.querySelector('foreignObject')!.namespaceURI).toBe(SVG_NS);
        expect(host.querySelector('div')!.namespaceURI).toBe(HTML_NS);
    });

    it('writes className as an attribute on SVG (the property is read-only there)', () => {
        const host = container();
        const tone = bindable('warm');
        mount(
            h('svg', {
                static: {
                    children: [
                        h('rect', {
                            static: { className: 'node' },
                            bindables: { className: tone },
                        }),
                    ],
                },
            }),
            host
        );

        const rect = host.querySelector('rect')!;
        expect(rect.getAttribute('class')).toBe('warm');
        tone.setValue('cold');
        expect(rect.getAttribute('class')).toBe('cold');
    });

    it('keeps the namespace for children built LATER by a reactive list', () => {
        const host = container();
        const nodes = list([h('rect', { static: { width: '1' } })]);
        mount(h('svg', { bindableLists: { children: nodes } }), host);

        nodes.push(h('circle', { static: { r: '2' } }));

        const circle = host.querySelector('circle')!;
        expect(circle.namespaceURI).toBe(SVG_NS);
        expect(host.querySelectorAll('svg > *')).toHaveLength(2);
    });

    it('keeps the namespace through a reactive single child', () => {
        const host = container();
        const child = bindable(h('rect', { static: { width: '1' } }));
        mount(h('svg', { bindables: { children: child } }), host);

        child.setValue(h('circle', { static: { r: '3' } }));
        expect(host.querySelector('circle')!.namespaceURI).toBe(SVG_NS);
    });

    it('keeps the namespace in a cache-key template clone', () => {
        const host = container();
        const marker = Symbol('svg-node');
        const item = () =>
            h('g', { static: { children: [h('rect', { static: { width: '2' } })] } }, marker);
        mount(h('svg', { static: { children: [item(), item()] } }), host);

        const rects = host.querySelectorAll('rect');
        expect(rects).toHaveLength(2);
        for (const rect of rects) expect(rect.namespaceURI).toBe(SVG_NS);
    });
});
