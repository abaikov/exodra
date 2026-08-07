/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { mount } from '@exodra/dom';
import { renderToString } from '@exodra/string';
import { layoutModel } from '../layout/layoutModel';
import { createGraphView, toPath } from './graphView';
import { createViewState } from './viewState';
import type { TExoGraphModel } from '../model/types';

const node = (id: string, kind: 'runtime' | 'tooling' | 'app' | 'other') => ({
    id,
    label: id,
    kind,
    layer: 0,
    violations: [],
});

const MODEL: TExoGraphModel = {
    granularity: 'package',
    nodes: [
        node('core', 'runtime'),
        node('dom', 'runtime'),
        node('vite-plugin', 'tooling'),
        node('lodash', 'other'),
        // Reaches core but never dom — so focusing dom must dim it.
        node('router', 'runtime'),
    ],
    edges: [
        {
            id: 'dom→core',
            from: 'dom',
            to: 'core',
            kinds: ['value'],
            weight: 3,
            evidence: [],
            violations: [],
        },
        {
            id: 'dom→lodash',
            from: 'dom',
            to: 'lodash',
            kinds: ['value'],
            weight: 1,
            evidence: [],
            violations: [],
        },
        {
            id: 'vite-plugin→core',
            from: 'vite-plugin',
            to: 'core',
            kinds: ['type-only'],
            weight: 1,
            evidence: [],
            violations: [],
        },
        {
            id: 'router→core',
            from: 'router',
            to: 'core',
            kinds: ['value'],
            weight: 1,
            evidence: [],
            violations: [],
        },
        {
            id: 'vite-plugin→dom',
            from: 'vite-plugin',
            to: 'dom',
            kinds: ['value'],
            weight: 1,
            evidence: [],
            violations: [
                {
                    rule: 'runtime-does-not-import-build-tooling',
                    severity: 'error',
                    comment: 'Build-time code must not reach the runtime.',
                },
            ],
        },
    ],
    rules: {},
};

const LAYOUT = layoutModel(MODEL);

function render() {
    const state = createViewState();
    const host = document.createElement('div');
    document.body.appendChild(host);
    mount(createGraphView(MODEL, LAYOUT, state), host);
    return { state, host };
}

describe('server rendering', () => {
    it('produces the finished picture without any script', () => {
        const html = renderToString(
            createGraphView(MODEL, LAYOUT, createViewState(), { static: true })
        );
        expect(html.startsWith('<svg')).toBe(true);
        // A static picture needs an intrinsic size; the interactive one gets its
        // mapping from the pan/zoom transform instead.
        expect(html).toContain(`viewBox="0 0 ${LAYOUT.width} ${LAYOUT.height}"`);
        expect(html).not.toContain('exo-graph-viewport" transform');
        // Every node is there, labelled — labels are what makes the palette
        // readable, so they are not optional.
        for (const graphNode of MODEL.nodes) {
            expect(html).toContain(`data-node="${graphNode.id}"`);
            expect(html).toContain(`>${graphNode.label}<`);
        }
        expect(html).toContain('data-edge="dom→core"');
    });

    it('carries the same initial filter state as the client would', () => {
        const html = renderToString(
            createGraphView(MODEL, LAYOUT, createViewState(), { static: true })
        );
        // External nodes are hidden by default — server and client agree.
        expect(html).toMatch(/data-node="lodash"[^>]*style="display:none"/);
    });
});

describe('in the DOM', () => {
    it('renders real SVG elements', () => {
        const { host } = render();
        expect(host.querySelector('svg')!.namespaceURI).toBe(
            'http://www.w3.org/2000/svg'
        );
        expect(host.querySelectorAll('.exo-node-group')).toHaveLength(5);
        expect(host.querySelectorAll('path[data-edge]')).toHaveLength(5);
    });

    it('marks node kind and rule violations in the class, not in colour', () => {
        const { host } = render();
        const domNode = host.querySelector('[data-node="dom"] rect')!;
        expect(domNode.getAttribute('class')).toContain('exo-node--runtime');

        const violating = host.querySelector('[data-edge="vite-plugin→dom"]')!;
        expect(violating.getAttribute('class')).toContain('is-violating');
    });

    it('focus dims the rest WITHOUT rebuilding the graph', () => {
        const { state, host } = render();
        const before = host.querySelector('[data-node="core"] rect')!;

        state.focus.setValue('dom');

        const after = host.querySelector('[data-node="core"] rect')!;
        // Same element object: attributes were written, nothing re-created.
        expect(after).toBe(before);
        expect(after.getAttribute('class')).toContain('is-related');
        expect(
            host.querySelector('[data-node="router"] rect')!.getAttribute('class')
        ).toContain('is-dimmed');
        expect(
            host.querySelector('[data-node="dom"] rect')!.getAttribute('class')
        ).toContain('is-focused');
    });

    it('clearing focus restores every node', () => {
        const { state, host } = render();
        state.focus.setValue('dom');
        state.focus.setValue(null);
        for (const rect of host.querySelectorAll('.exo-node-group rect')) {
            expect(rect.getAttribute('class')).not.toContain('is-dimmed');
            expect(rect.getAttribute('class')).not.toContain('is-focused');
        }
    });

    it('hides external packages by default and shows them on demand', () => {
        const { state, host } = render();
        const external = host.querySelector('[data-node="lodash"]')!;
        expect(external.getAttribute('style')).toBe('display:none');

        state.showExternal.setValue(true);
        expect(external.getAttribute('style')).toBe('');
        // …and the edge into it comes back too.
        expect(
            host.querySelector('[data-edge="dom→lodash"]')!.getAttribute('style')
        ).toBe('');
    });

    it('can hide type-only edges — they do not exist at runtime', () => {
        const { state, host } = render();
        const typeOnly = host.querySelector('[data-edge="vite-plugin→core"]')!;
        expect(typeOnly.getAttribute('class')).toContain('exo-edge--type-only');
        expect(typeOnly.getAttribute('style')).toBe('');

        state.showTypeOnly.setValue(false);
        expect(typeOnly.getAttribute('style')).toBe('display:none');
        // A value edge is unaffected.
        expect(
            host.querySelector('[data-edge="dom→core"]')!.getAttribute('style')
        ).toBe('');
    });

    it('violations-only keeps just what breaks a rule', () => {
        const { state, host } = render();
        state.violationsOnly.setValue(true);
        expect(
            host.querySelector('[data-edge="vite-plugin→dom"]')!.getAttribute('style')
        ).toBe('');
        expect(
            host.querySelector('[data-edge="dom→core"]')!.getAttribute('style')
        ).toBe('display:none');
    });

    it('draws a heavier edge thicker', () => {
        const { host } = render();
        const heavy = Number(
            host.querySelector('[data-edge="dom→core"]')!.getAttribute('stroke-width')
        );
        const light = Number(
            host
                .querySelector('[data-edge="vite-plugin→core"]')!
                .getAttribute('stroke-width')
        );
        expect(heavy).toBeGreaterThan(light);
    });
});

describe('toPath', () => {
    it('draws a straight line between two points', () => {
        expect(toPath([{ x: 0, y: 0 }, { x: 10, y: 20 }])).toBe('M0,0L10,20');
    });

    it('smooths a routed polyline instead of drawing corners', () => {
        const d = toPath([
            { x: 0, y: 0 },
            { x: 5, y: 10 },
            { x: 10, y: 20 },
        ]);
        expect(d.startsWith('M0,0')).toBe(true);
        expect(d).toContain('Q');
        expect(d.endsWith('L10,20')).toBe(true);
    });

    it('is empty for no points', () => {
        expect(toPath([])).toBe('');
    });
});
