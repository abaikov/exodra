import { describe, expect, it } from 'vitest';
import { layoutModel, nodeWidth } from '../layoutModel';
import type { TExoGraphModel } from '../../model/types';

const node = (id: string, layer: number) => ({
    id,
    label: id,
    kind: 'runtime' as const,
    layer,
    violations: [],
});

const edge = (from: string, to: string) => ({
    id: `${from}→${to}`,
    from,
    to,
    kinds: ['value' as const],
    weight: 1,
    evidence: [],
    violations: [],
});

const MODEL: TExoGraphModel = {
    granularity: 'package',
    nodes: [node('core', 0), node('dom', 1), node('ssr', 2), node('string', 1)],
    edges: [
        edge('dom', 'core'),
        edge('string', 'core'),
        edge('ssr', 'string'),
        edge('ssr', 'core'),
    ],
    rules: {},
};

const layout = layoutModel(MODEL);
const at = (id: string) => layout.nodes.find((n) => n.id === id)!;

describe('layoutModel', () => {
    it('places every node and routes every edge', () => {
        expect(layout.nodes).toHaveLength(4);
        expect(layout.edges).toHaveLength(4);
        for (const routed of layout.edges) {
            expect(routed.points.length).toBeGreaterThanOrEqual(2);
        }
    });

    it('puts a dependency AFTER what depends on it', () => {
        // Ranks run left to right, so the chain reads ssr → string → core.
        expect(at('core').x).toBeGreaterThan(at('dom').x);
        expect(at('core').x).toBeGreaterThan(at('ssr').x);
        expect(at('string').x).toBeGreaterThan(at('ssr').x);
    });

    it('lays a shallow graph as a column, not a band', () => {
        // A wide band has to be shrunk to fit a page, and its labels with it.
        expect(layout.width).toBeLessThan(layout.height * 3);
    });

    it('can still be laid top-to-bottom on request', () => {
        const topDown = layoutModel(MODEL, { rankdir: 'TB' });
        const core = topDown.nodes.find((n) => n.id === 'core')!;
        const dom = topDown.nodes.find((n) => n.id === 'dom')!;
        expect(core.y).toBeGreaterThan(dom.y);
    });

    it('reports a canvas that contains the drawing', () => {
        for (const placed of layout.nodes) {
            expect(placed.x).toBeGreaterThanOrEqual(0);
            expect(placed.y).toBeGreaterThanOrEqual(0);
            expect(placed.x + placed.width).toBeLessThanOrEqual(layout.width);
            expect(placed.y + placed.height).toBeLessThanOrEqual(layout.height);
        }
    });

    it('does not overlap boxes', () => {
        for (let i = 0; i < layout.nodes.length; i++) {
            for (let j = i + 1; j < layout.nodes.length; j++) {
                const a = layout.nodes[i];
                const b = layout.nodes[j];
                const apart =
                    a.x + a.width <= b.x ||
                    b.x + b.width <= a.x ||
                    a.y + a.height <= b.y ||
                    b.y + b.height <= a.y;
                expect(apart, `${a.id} overlaps ${b.id}`).toBe(true);
            }
        }
    });

    it('is DETERMINISTIC — the artefact is committed and diffed', () => {
        const again = layoutModel(MODEL);
        expect(again).toEqual(layout);

        // …and independent of the order the model happens to arrive in.
        const shuffled: TExoGraphModel = {
            ...MODEL,
            nodes: [...MODEL.nodes].reverse(),
            edges: [...MODEL.edges].reverse(),
        };
        expect(layoutModel(shuffled)).toEqual(layout);
    });

    it('sizes a box to its label', () => {
        expect(nodeWidth('a')).toBe(96); // floor: still a box, not a dot
        expect(nodeWidth('a-very-long-package-name')).toBeGreaterThan(96);
        expect(at('core').width).toBe(nodeWidth('core'));
    });

    it('ignores a self-edge instead of drawing a loop', () => {
        const withSelf = layoutModel({
            ...MODEL,
            edges: [...MODEL.edges, edge('core', 'core')],
        });
        expect(withSelf.edges.some((e) => e.id === 'core→core')).toBe(false);
        expect(withSelf.nodes).toHaveLength(4);
    });

    it('survives a cycle', () => {
        const cyclic = layoutModel({
            ...MODEL,
            edges: [edge('a', 'b'), edge('b', 'a')],
            nodes: [node('a', 0), node('b', 0)],
        });
        expect(cyclic.nodes).toHaveLength(2);
        expect(cyclic.edges).toHaveLength(2);
    });

    it('honours spacing options', () => {
        const roomy = layoutModel(MODEL, { rankSpacing: 200 });
        expect(roomy.width).toBeGreaterThan(layout.width);
    });
});

describe('an empty graph', () => {
    it('reports a zero canvas, not an infinite one', () => {
        const empty = layoutModel({
            granularity: 'package',
            nodes: [],
            edges: [],
            rules: {},
        });
        expect(empty.width).toBe(0);
        expect(empty.height).toBe(0);
        expect(empty.nodes).toEqual([]);
    });
});
