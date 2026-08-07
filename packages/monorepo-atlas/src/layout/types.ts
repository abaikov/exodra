/**
 * Geometry, computed at build time and shipped as data.
 *
 * Kept separate from the model on purpose: the model is what the graph MEANS,
 * this is where it sits on screen. A different layout engine, or a different
 * rank direction, changes only this half — and the view reads only this half
 * plus the model's ids.
 */

export type TExoPoint = { x: number; y: number };

export type TExoLayoutNode = TExoPoint & {
    id: string;
    /** Top-left corner, not the centre: what an SVG `<rect>` wants. */
    width: number;
    height: number;
};

export type TExoLayoutEdge = {
    id: string;
    /** Polyline from source to target, as routed by the layout engine. */
    points: readonly TExoPoint[];
};

export type TExoGraphLayout = {
    width: number;
    height: number;
    nodes: readonly TExoLayoutNode[];
    edges: readonly TExoLayoutEdge[];
};
