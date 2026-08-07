import dagre from '@dagrejs/dagre';
import type { TExoGraphModel } from '../model/types';
import type { TExoGraphLayout, TExoLayoutEdge, TExoLayoutNode } from './types';

/**
 * Turn the model into coordinates — at BUILD time, never in the browser.
 *
 * Positions are a pure function of the graph, so computing them once and
 * shipping them has three consequences worth the trouble:
 *
 *  - no layout engine reaches the page. dagre unpacks to ~850 kB and elkjs to
 *    ~8 MB; neither has any business in a docs page whose graph cannot change.
 *  - the SVG can be server-rendered, because the geometry is already known. The
 *    first paint is the finished diagram, before any script runs.
 *  - the output is diffable. The generated artefact is committed and verified,
 *    so the layout must be DETERMINISTIC — hence the sorting below, which pins
 *    the insertion order dagre would otherwise inherit from the model.
 *
 * Edges point from dependent to dependency, and dagre's default top-to-bottom
 * ranking then places a dependency BELOW whatever needs it: the foundation ends
 * up at the bottom of the picture, which is how architecture is read.
 */
export type TExoLayoutOptions = {
    /**
     * Which way the ranks run. `LR` puts each rank in a COLUMN, which is what a
     * page can actually show: a shallow graph laid top-to-bottom becomes a
     * single wide band that has to be shrunk to fit, and its labels with it.
     */
    rankdir?: 'TB' | 'LR';
    /** Horizontal gap between nodes in the same rank. */
    nodeSpacing?: number;
    /** Vertical gap between ranks. */
    rankSpacing?: number;
    /** Height of a node box. */
    nodeHeight?: number;
    /** Padding around the whole drawing. */
    padding?: number;
    /** Approximate advance width per label character, in px. */
    charWidth?: number;
};

const DEFAULTS: Required<TExoLayoutOptions> = {
    rankdir: 'LR',
    nodeSpacing: 28,
    rankSpacing: 64,
    nodeHeight: 40,
    padding: 24,
    charWidth: 7.4,
};

export function layoutModel(
    model: TExoGraphModel,
    options: TExoLayoutOptions = {}
): TExoGraphLayout {
    const settings = { ...DEFAULTS, ...options };
    const graph = new dagre.graphlib.Graph({ multigraph: false, compound: false });

    graph.setGraph({
        rankdir: settings.rankdir,
        nodesep: settings.nodeSpacing,
        ranksep: settings.rankSpacing,
        marginx: settings.padding,
        marginy: settings.padding,
    });
    graph.setDefaultEdgeLabel(() => ({}));

    // Sorted insertion: dagre resolves ties by insertion order, so an unsorted
    // model would move nodes around between runs and the committed artefact
    // would never stop changing.
    const nodes = [...model.nodes].sort((a, b) => a.id.localeCompare(b.id));
    const edges = [...model.edges].sort((a, b) => a.id.localeCompare(b.id));

    for (const node of nodes) {
        // A class box carries its members, so it brings its own size; a plain
        // label falls back to one line sized by its text.
        graph.setNode(node.id, {
            width: node.width ?? nodeWidth(node.label, settings.charWidth),
            height: node.height ?? settings.nodeHeight,
        });
    }
    for (const edge of edges) {
        // A self-edge has no meaning here and makes dagre allocate a loop.
        if (edge.from === edge.to) continue;
        graph.setEdge(edge.from, edge.to);
    }

    dagre.layout(graph);

    const laidOutNodes: TExoLayoutNode[] = nodes.map(node => {
        const box = graph.node(node.id);
        return {
            id: node.id,
            // dagre reports centres; a renderer wants the top-left corner.
            x: round(box.x - box.width / 2),
            y: round(box.y - box.height / 2),
            width: round(box.width),
            height: round(box.height),
        };
    });

    const laidOutEdges: TExoLayoutEdge[] = [];
    for (const edge of edges) {
        if (edge.from === edge.to) continue;
        const points = graph.edge(edge.from, edge.to)?.points ?? [];
        laidOutEdges.push({
            id: edge.id,
            points: points.map((point: { x: number; y: number }) => ({
                x: round(point.x),
                y: round(point.y),
            })),
        });
    }

    const size = graph.graph();
    // dagre reports -Infinity for a graph with nothing in it; a canvas of
    // negative infinity propagates into the viewBox and breaks the SVG.
    const finite = (value: number | undefined): number =>
        typeof value === 'number' && Number.isFinite(value) ? value : 0;
    return {
        width: round(finite(size.width)),
        height: round(finite(size.height)),
        nodes: laidOutNodes,
        edges: laidOutEdges,
    };
}

/**
 * Wide enough for the label, floored so a one-character package still reads as a
 * box rather than a dot.
 */
export function nodeWidth(label: string, charWidth = DEFAULTS.charWidth): number {
    return Math.max(96, Math.round(label.length * charWidth) + 28);
}

// Half-pixel coordinates make for noisy diffs and blurry strokes; one decimal is
// finer than anything the eye resolves at this scale.
const round = (value: number): number => Math.round(value * 10) / 10;
