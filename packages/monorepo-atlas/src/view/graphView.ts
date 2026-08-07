import { h } from '@exodra/core';
import type { TExoSchema } from '@exodra/core';
import type {
    TExoGraphEdge,
    TExoGraphModel,
    TExoGraphNode,
    TExoMember,
    TExoRelation,
} from '../model/types';
import { EXO_BOX_MEMBERS } from '../model/boxLimits';
import type { TExoGraphLayout, TExoPoint } from '../layout/types';
import {
    matchesQuery,
    buildNeighbourhood,
    combine,
    type TExoNeighbourhood,
    type TExoViewState,
} from './viewState';

/**
 * The graph as an Exodra tree.
 *
 * Two properties drive every decision here:
 *
 *  - it must render on the SERVER. Geometry is already known (the layout ran at
 *    build time), so the whole picture is static markup that needs no script to
 *    appear — `renderToString` produces the finished SVG.
 *  - a filter or a focus change must not rebuild it. Structure is built once;
 *    what the reader changes is bound per element, so flipping a signal writes
 *    a handful of attributes instead of reconciling several hundred nodes.
 *
 * Colour never appears here — every mark paints from a CSS custom property, so
 * a host restyles the graph without this file knowing.
 */
export type TExoGraphViewOptions = {
    /**
     * A picture rather than a viewport: a `viewBox` so it scales in whatever box
     * a page gives it, and no pan/zoom transform. This is what a server-rendered
     * page wants — there is no pointer to pan with, and an SVG without a viewBox
     * has no intrinsic size to scale.
     */
    static?: boolean;
};

export function createGraphView(
    model: TExoGraphModel,
    layout: TExoGraphLayout,
    state: TExoViewState,
    options: TExoGraphViewOptions = {}
): TExoSchema {
    const neighbourhood = buildNeighbourhood(model);
    const placed = new Map(layout.nodes.map(node => [node.id, node]));

    const edges = model.edges
        .map(edge => renderEdge(edge, layout, model, state, neighbourhood))
        .filter((schema): schema is TExoSchema => schema !== undefined);

    const nodes = model.nodes
        .map(node => renderNode(node, placed.get(node.id), state, neighbourhood))
        .filter((schema): schema is TExoSchema => schema !== undefined);

    return h('svg', {
        static: {
            class: 'exo-graph-canvas',
            'data-width': layout.width,
            'data-height': layout.height,
            role: 'img',
            'aria-label': `Dependency graph: ${model.nodes.length} ${model.granularity}s`,
            ...(options.static
                ? {
                      viewBox: `0 0 ${layout.width} ${layout.height}`,
                      preserveAspectRatio: 'xMidYMid meet',
                  }
                : {}),
            children: [
                umlMarkers(),
                // ONE transformed group: panning and zooming move a single
                // attribute, never the hundreds of nodes inside it.
                h('g', {
                    static: {
                        class: 'exo-graph-viewport',
                        children: [
                            // Edges first so nodes paint over them.
                            h('g', {
                                static: { class: 'exo-graph-edges', children: edges },
                            }),
                            h('g', {
                                static: { class: 'exo-graph-nodes', children: nodes },
                            }),
                        ],
                    },
                    ...(options.static
                        ? {}
                        : {
                              bindables: {
                                  transform: combine([state.viewport], () => {
                                      const { x, y, k } =
                                          state.viewport.getValue();
                                      // Translation rounds to a tenth of a
                                      // pixel; SCALE must not. At k = 0.4 a
                                      // rounding step of 0.1 is a 25% jump, so
                                      // a slow pinch does nothing until it
                                      // suddenly does far too much — which is
                                      // exactly what a broken zoom feels like.
                                      return `translate(${round(x)},${round(y)}) scale(${k.toFixed(4)})`;
                                  }),
                              },
                          }),
                }),
            ],
        },
    });

}

const isTypeOnly = (edge: TExoGraphEdge): boolean =>
    edge.kinds.length === 1 && edge.kinds[0] === 'type-only';

function renderNode(
    node: TExoGraphNode,
    box: { x: number; y: number; width: number; height: number } | undefined,
    state: TExoViewState,
    neighbourhood: TExoNeighbourhood
): TExoSchema | undefined {
    if (!box) return undefined;

    // A chip and a class box are read differently: a chip has nothing in it but
    // its name, so its FILL carries identity; a box full of code has to be a
    // calm background with the colour moved to its edge and its title band, or
    // the text sits on a slab of saturated colour and nobody can read it.
    const card = (node.members?.length ?? 0) > 0;
    const base = `exo-node exo-node--${node.kind}${card ? ' exo-node--card' : ''}`;
    const violated = node.violations.length > 0 ? ' is-violating' : '';

    return h('g', {
        static: {
            class: card ? 'exo-node-group exo-node-group--card' : 'exo-node-group',
            transform: `translate(${box.x},${box.y})`,
            'data-node': node.id,
            children: [
                h('rect', {
                    static: {
                        width: box.width,
                        height: box.height,
                        rx: 6,
                        ry: 6,
                    },
                    bindables: {
                        // Identity and state in one attribute: a focus change
                        // writes this string and nothing else moves.
                        class: combine([state.focus, state.query], () => {
                            const focus = state.focus.getValue();
                            // A search speaks first: while one is running, the
                            // question on screen is "where is this name", and
                            // everything that does not answer it steps back.
                            const query = state.query.getValue();
                            // Two marks, not one: the misses step back AND the
                            // hits step forward. Dimming alone is hard to read
                            // on a drawing that is mostly small boxes.
                            const search =
                                query === ''
                                    ? ''
                                    : matchesQuery(node.label, query)
                                      ? ' is-match'
                                      : ' is-unmatched';
                            if (focus === null) {
                                return base + violated + search;
                            }
                            if (focus === node.id) {
                                return `${base}${violated} is-focused`;
                            }
                            return neighbourhood.nodes.get(focus)?.has(node.id)
                                ? `${base}${violated} is-related${search}`
                                : `${base}${violated} is-dimmed${search}`;
                        }),
                    },
                }),
                ...(card ? [titleBand(node, box)] : []),
                ...nameCompartment(node, box),
                ...memberCompartment(node, box),
            ],
        },
        bindables: {
            // Visibility is separate from identity on purpose: filters and focus
            // change independently, so they must not invalidate each other.
            style: combine(
                [state.showExternal, state.violationsOnly],
                () => (visible() ? '' : 'display:none')
            ),
        },
    });

    function visible(): boolean {
        if (!state.showExternal.getValue() && node.kind === 'other') return false;
        if (state.violationsOnly.getValue() && node.violations.length === 0) {
            return false;
        }
        return true;
    }
}

function renderEdge(
    edge: TExoGraphEdge,
    layout: TExoGraphLayout,
    model: TExoGraphModel,
    state: TExoViewState,
    neighbourhood: TExoNeighbourhood
): TExoSchema | undefined {
    const routed = layout.edges.find(candidate => candidate.id === edge.id);
    if (!routed || routed.points.length < 2) return undefined;

    const kindClass = edge.relation
        ? relationClass(edge.relation)
        : isTypeOnly(edge)
          ? 'exo-edge--type-only'
          : edge.kinds.includes('dynamic')
            ? 'exo-edge--dynamic'
            : 'exo-edge--value';
    const base = `exo-edge ${kindClass}`;
    const violated = edge.violations.length > 0 ? ' is-violating' : '';
    const nodeById = new Map(model.nodes.map(node => [node.id, node]));

    return h('path', {
        static: {
            d: toPath(routed.points),
            'data-edge': edge.id,
            // Thickness carries weight: how many imports stand behind the edge.
            'stroke-width': Math.min(1 + Math.log2(edge.weight + 1), 4),
            // The arrowhead IS the relationship — an edge without one cannot
            // say which way it points, let alone what kind of tie it is.
            ...(edge.relation
                ? { 'marker-end': `url(#exo-arrow-${edge.relation})` }
                : {}),
        },
        bindables: {
            class: combine([state.focus], () => {
                const focus = state.focus.getValue();
                if (focus === null) return base + violated;
                return neighbourhood.edges.get(focus)?.has(edge.id)
                    ? `${base}${violated} is-related`
                    : `${base}${violated} is-dimmed`;
            }),
            style: combine(
                [state.showExternal, state.showTypeOnly, state.violationsOnly],
                () => (visible() ? '' : 'display:none')
            ),
        },
    });

    function visible(): boolean {
        if (!state.showTypeOnly.getValue() && isTypeOnly(edge)) return false;
        if (state.violationsOnly.getValue() && edge.violations.length === 0) {
            return false;
        }
        if (!state.showExternal.getValue()) {
            if (nodeById.get(edge.from)?.kind === 'other') return false;
            if (nodeById.get(edge.to)?.kind === 'other') return false;
        }
        return true;
    }
}

/**
 * A polyline as a smooth path. The layout engine routes edges through waypoints;
 * drawing them as straight segments makes a dependency graph look like a circuit
 * board, so consecutive points are joined with a quadratic through their
 * midpoints — the standard trick, and it needs no extra geometry from the layout.
 */
export function toPath(points: readonly TExoPoint[]): string {
    if (points.length === 0) return '';
    if (points.length === 2) {
        return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
    }

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const point = points[i];
        const next = points[i + 1];
        const midX = round((point.x + next.x) / 2);
        const midY = round((point.y + next.y) / 2);
        d += `Q${point.x},${point.y} ${midX},${midY}`;
    }
    const last = points[points.length - 1];
    return `${d}L${last.x},${last.y}`;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/**
 * The name compartment: the stereotype in guillemets, then the name. UML puts
 * «interface» above the name rather than inventing a shape for it, and that is
 * what makes an interface readable as an interface in one glance.
 */
/**
 * The tinted strip behind a box's name.
 *
 * Drawn as a path rather than a rect because only the TOP corners are rounded —
 * a rounded rect would show its own curve where the divider is, and a square one
 * would poke out of the box's corners.
 */
function titleBand(
    node: TExoGraphNode,
    box: { width: number; height: number }
): TExoSchema {
    const height = node.stereotype ? 40 : 28;
    const r = 6;
    return h('path', {
        static: {
            class: `exo-node-band exo-node-band--${node.kind}`,
            d:
                `M0,${height} V${r} A${r},${r} 0 0 1 ${r},0 ` +
                `H${box.width - r} A${r},${r} 0 0 1 ${box.width},${r} ` +
                `V${height} Z`,
        },
    });
}

function nameCompartment(
    node: TExoGraphNode,
    box: { width: number; height: number }
): TExoSchema[] {
    const hasMembers = (node.members?.length ?? 0) > 0;
    const centred = !hasMembers && !node.stereotype;
    const out: TExoSchema[] = [];

    if (node.stereotype) {
        out.push(
            h('text', {
                static: {
                    class: 'exo-node-stereotype',
                    x: box.width / 2,
                    y: 15,
                    'text-anchor': 'middle',
                    textContent: `«${node.stereotype}»`,
                },
            })
        );
    }
    out.push(
        h('text', {
            static: {
                class: 'exo-node-label',
                x: box.width / 2,
                y: centred ? box.height / 2 : node.stereotype ? 31 : 21,
                ...(centred ? { 'dominant-baseline': 'central' } : {}),
                'text-anchor': 'middle',
                // What the thing IS, on hover over its name — the first place
                // a reader points when a box does not explain itself. The label
                // moves into a tspan because `textContent` and children are the
                // same slot: setting one would wipe the other.
                ...(node.doc
                    ? {
                          children: [
                              h('title', { static: { textContent: node.doc } }),
                              h('tspan', { static: { textContent: node.label } }),
                          ],
                      }
                    : { textContent: node.label }),
            },
        })
    );
    return out;
}

/**
 * The member compartment, under a dividing line — the part that makes this a
 * class diagram rather than a graph of names. Visibility marks are UML's own.
 */
function memberCompartment(
    node: TExoGraphNode,
    box: { width: number; height: number }
): TExoSchema[] {
    const members = node.members ?? [];
    if (members.length === 0) return [];

    // The box draws what fits; the count of what it could not is a line of its
    // own, so the reader knows there IS more and can open the panel for it.
    const shown = members.slice(0, EXO_BOX_MEMBERS);
    const hidden = members.length - shown.length;

    const top = node.stereotype ? 40 : 28;
    return [
        h('line', {
            static: {
                class: 'exo-node-divider',
                x1: 0,
                y1: top,
                x2: box.width,
                y2: top,
            },
        }),
        ...shown.map((member, index) => {
            const prefix = `${member.visibility ?? ' '} `;
            const parts = member.parts ?? [];
            return h('text', {
                static: {
                    // UML's own marks: statics underlined, abstracts italic.
                    class: member.modifier
                        ? `exo-node-member exo-node-member--${member.modifier}`
                        : 'exo-node-member',
                    x: 8,
                    y: top + 14 + index * 15,
                    children:
                        parts.length > 0
                            ? [
                                  // A type name is a place to go, not just text:
                                  // a signature that names something on the same
                                  // diagram should take you there.
                                  h('tspan', { static: { textContent: prefix } }),
                                  ...parts.map(part =>
                                      h('tspan', {
                                          static: part.link
                                              ? {
                                                    class: 'exo-node-link',
                                                    'data-link': part.link,
                                                    textContent: part.text,
                                                }
                                              : { textContent: part.text },
                                      })
                                  ),
                                  ...tooltip(member),
                              ]
                            : [
                                  h('tspan', {
                                      static: { textContent: `${prefix}${member.text}` },
                                  }),
                                  ...tooltip(member),
                              ],
                },
            });
        }),
        ...(hidden > 0
            ? [
                  h('text', {
                      static: {
                          class: 'exo-node-member exo-node-member--more',
                          x: 8,
                          y: top + 14 + shown.length * 15,
                          textContent: `… ${hidden} more — click to see all`,
                      },
                  }),
              ]
            : []),
    ];
}

/**
 * What the box could not say: the whole signature, and what the author wrote
 * about it. A native `<title>` is the one tooltip that works before any script
 * runs and on a server-rendered page.
 */
function tooltip(member: TExoMember): TExoSchema[] {
    const text = [member.full ?? member.text, member.doc]
        .filter(Boolean)
        .join('\n\n');
    if (!text) return [];
    return [h('title', { static: { textContent: text } })];
}

/**
 * UML arrowheads, defined once and referenced by every edge.
 *
 * The notation carries the meaning: a hollow triangle is "is a", a filled
 * diamond is "owns one", an open arrow is "uses". Without them a diagram of
 * boxes and lines cannot say which way anything points, let alone what the
 * relationship is.
 */
function umlMarkers(): TExoSchema {
    const marker = (
        id: string,
        path: string,
        klass: string,
        refX: number
    ): TExoSchema =>
        h('marker', {
            static: {
                id,
                viewBox: '0 0 12 12',
                refX,
                refY: 6,
                markerWidth: 12,
                markerHeight: 12,
                orient: 'auto-start-reverse',
                markerUnits: 'userSpaceOnUse',
                children: [h('path', { static: { class: klass, d: path } })],
            },
        });

    return h('defs', {
        static: {
            children: [
                // Hollow triangle — inheritance and realization.
                marker('exo-arrow-inheritance', 'M0,0 L12,6 L0,12 z', 'exo-marker-hollow', 12),
                marker('exo-arrow-realization', 'M0,0 L12,6 L0,12 z', 'exo-marker-hollow', 12),
                // Filled diamond — composition.
                marker('exo-arrow-composition', 'M0,6 L6,2 L12,6 L6,10 z', 'exo-marker-filled', 12),
                // Open arrow — association and dependency.
                marker('exo-arrow-association', 'M1,1 L11,6 L1,11', 'exo-marker-open', 11),
                marker('exo-arrow-dependency', 'M1,1 L11,6 L1,11', 'exo-marker-open', 11),
            ],
        },
    });
}

/** Which marker an edge ends with, and how its line is drawn. */
export function relationClass(relation: TExoRelation | undefined): string {
    return relation ? `exo-edge--${relation}` : '';
}
