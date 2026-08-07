import { bindable } from '@exodra/reactivity';
import type { TExoWritableBindable } from '@exodra/reactivity-types';

// Re-exported so the view imports its reactive tools from one place. `combine`
// used to live here as a local stopgap; it is a framework primitive now.
export { combine } from '@exodra/reactivity';
import type { TExoGraphModel } from '../model/types';

/**
 * Everything the reader can change about the picture, as reactive values.
 *
 * The whole point of holding this as signals rather than as a "re-render the
 * graph" callback is that a filter or a focus change must NOT rebuild several
 * hundred SVG nodes. Each node binds its own class and visibility; flipping a
 * signal writes attributes on the nodes that care and touches nothing else.
 */
/**
 * How the reader moves between levels: the package graph, and what is inside a
 * package. Supplied by whoever mounts the explorer, because only they know
 * whether the deeper data exists and how to fetch it.
 */
export type TExoDrill = {
    /** Is there an inside to open for this node? */
    canOpen(id: string): boolean;
    /** Open it. */
    open(id: string): void;
    /** Go back up, when there is an up. */
    back?: () => void;
    /** What the reader is looking at now, for the breadcrumb. */
    title?: string;
};

export type TExoViewState = {
    /** Node the reader is inspecting, or null. Drives highlight and dimming. */
    focus: TExoWritableBindable<string | null>;
    /** Show packages from outside the workspace (npm dependencies). */
    showExternal: TExoWritableBindable<boolean>;
    /** Show edges that are erased at build time (`import type`). */
    showTypeOnly: TExoWritableBindable<boolean>;
    /** Show only what breaks an architecture rule. */
    violationsOnly: TExoWritableBindable<boolean>;
    /**
     * What the reader is looking for, by name.
     *
     * Dimming rather than hiding: a box that vanishes takes its edges with it,
     * and the answer to "where does this live" is the part of the picture around
     * it. The geometry must not move while somebody is reading it.
     */
    query: TExoWritableBindable<string>;
    /** Absent at the deepest level, or when there is nothing to drill into. */
    drill?: TExoDrill;
    /**
     * Pan and zoom, as one value. A graph is bigger than any container it is put
     * in, and scrolling a box is not the same thing: readers expect to drag it
     * and to zoom where the pointer is.
     */
    viewport: TExoWritableBindable<TExoViewport>;
};

export type TExoViewport = { x: number; y: number; k: number };

export const IDENTITY_VIEWPORT: TExoViewport = { x: 0, y: 0, k: 1 };
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

/** Zoom about a point, so what is under the pointer stays under the pointer. */
export function zoomAt(
    viewport: TExoViewport,
    factor: number,
    pointerX: number,
    pointerY: number
): TExoViewport {
    const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.k * factor));
    // Solve for the translation that keeps (pointerX, pointerY) fixed.
    const scale = k / viewport.k;
    return {
        k,
        x: pointerX - (pointerX - viewport.x) * scale,
        y: pointerY - (pointerY - viewport.y) * scale,
    };
}

/** The transform that makes a drawing of this size fill a box of that size. */
export function fitViewport(
    drawing: { width: number; height: number },
    box: { width: number; height: number },
    padding = 16
): TExoViewport {
    if (drawing.width <= 0 || drawing.height <= 0) return IDENTITY_VIEWPORT;
    const k = Math.min(
        MAX_ZOOM,
        Math.max(
            MIN_ZOOM,
            Math.min(
                (box.width - padding * 2) / drawing.width,
                (box.height - padding * 2) / drawing.height
            )
        )
    );
    return {
        k,
        x: (box.width - drawing.width * k) / 2,
        y: (box.height - drawing.height * k) / 2,
    };
}

export function createViewState(drill?: TExoDrill): TExoViewState {
    return {
        drill,
        viewport: bindable<TExoViewport>(IDENTITY_VIEWPORT),
        focus: bindable<string | null>(null),
        // External packages are ~half the nodes and none of the architecture;
        // measured on this repo they stretch the drawing from 2160px to 5390px.
        showExternal: bindable(false),
        showTypeOnly: bindable(true),
        violationsOnly: bindable(false),
        query: bindable(''),
    };
}

/**
 * Which nodes and edges a focus touches: the focused node itself, everything it
 * depends on, and everything that depends on it — one hop.
 *
 * Precomputed once per model rather than per focus change, because the question
 * "who touches X" is asked for every node on every focus change; walking the
 * edge list each time would be O(nodes × edges) per click.
 */
export type TExoNeighbourhood = {
    /** node id → ids of nodes one hop away in either direction */
    nodes: ReadonlyMap<string, ReadonlySet<string>>;
    /** node id → ids of edges touching it */
    edges: ReadonlyMap<string, ReadonlySet<string>>;
};

export function buildNeighbourhood(model: TExoGraphModel): TExoNeighbourhood {
    const nodes = new Map<string, Set<string>>();
    const edges = new Map<string, Set<string>>();

    const touch = (map: Map<string, Set<string>>, key: string, value: string): void => {
        const set = map.get(key);
        if (set) set.add(value);
        else map.set(key, new Set([value]));
    };

    for (const node of model.nodes) {
        nodes.set(node.id, new Set([node.id]));
        edges.set(node.id, new Set());
    }
    for (const edge of model.edges) {
        touch(nodes, edge.from, edge.to);
        touch(nodes, edge.to, edge.from);
        touch(edges, edge.from, edge.id);
        touch(edges, edge.to, edge.id);
    }

    return { nodes, edges };
}

/** Does this node answer the reader's search? Case-insensitive substring. */
export function matchesQuery(label: string, query: string): boolean {
    return query === '' || label.toLowerCase().includes(query.toLowerCase());
}
