import { renderThemeCss } from '../theme/renderThemeCss';

/**
 * Structure and state, in CSS. Colour comes from the custom properties the theme
 * layer declares, so a host restyles the graph without touching this file.
 *
 * State lives here rather than in the marks for the same reason the geometry
 * does: a focus change writes ONE class per affected element, and the browser
 * does the rest — no re-render, no per-node style computation in JavaScript.
 */
export function renderGraphCss(scope = '.exo-graph'): string {
    return `${renderThemeCss(scope)}

${scope} {
    background: var(--exo-surface);
    color: var(--exo-ink);
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
${scope} .exo-graph-canvas {
    display: block;
    width: 100%;
    height: auto;
}

${scope} .exo-node {
    fill: var(--exo-kind-other);
    stroke: var(--exo-surface);
    stroke-width: 2;
    transition: opacity 120ms ease-out;
}
${scope} .exo-node--runtime { fill: var(--exo-kind-runtime); }
${scope} .exo-node--tooling { fill: var(--exo-kind-tooling); }
${scope} .exo-node--app { fill: var(--exo-kind-app); }

/* A broken rule is never carried by colour alone: the dashed ring reads without
   colour vision, in print, and in forced-colors mode. */
${scope} .exo-node.is-violating {
    stroke: var(--exo-status-critical);
    stroke-width: 3;
    stroke-dasharray: 5 3;
}

/*
 * A box with members is a card: plain background, colour on the edge and in the
 * title band, text in the page's own ink. Anything else means reading a
 * monospaced signature on top of a fully saturated fill.
 */
${scope} .exo-node--card {
    fill: var(--exo-plane);
    stroke-width: 1.5;
}
${scope} .exo-node--card.exo-node--runtime { stroke: var(--exo-kind-runtime); }
${scope} .exo-node--card.exo-node--tooling { stroke: var(--exo-kind-tooling); }
${scope} .exo-node--card.exo-node--app { stroke: var(--exo-kind-app); }
${scope} .exo-node--card.exo-node--other { stroke: var(--exo-border); }
${scope} .exo-node-band { opacity: 0.16; pointer-events: none; }
${scope} .exo-node-band--runtime { fill: var(--exo-kind-runtime); }
${scope} .exo-node-band--tooling { fill: var(--exo-kind-tooling); }
${scope} .exo-node-band--app { fill: var(--exo-kind-app); }
${scope} .exo-node-band--other { fill: var(--exo-kind-other); }
${scope} .exo-node-group--card .exo-node-label { fill: var(--exo-ink); }
${scope} .exo-node-group--card .exo-node-stereotype { fill: var(--exo-ink-secondary); }
${scope} .exo-node-group--card .exo-node-member { fill: var(--exo-ink-secondary); }
${scope} .exo-node-group--card .exo-node-divider {
    stroke: var(--exo-border);
    opacity: 1;
}

${scope} .exo-node-label {
    fill: var(--exo-surface);
    font-size: 12px;
    font-weight: 600;
    pointer-events: none;
}
${scope} .exo-node-stereotype {
    fill: var(--exo-surface);
    font-size: 10px;
    opacity: 0.85;
    pointer-events: none;
}
${scope} .exo-node-divider { stroke: var(--exo-surface); stroke-width: 1; opacity: 0.5; }
${scope} .exo-node-member {
    fill: var(--exo-surface);
    font-size: 10px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    /* Off by default so a drag over a box pans instead of selecting text; the
       linked runs turn it back on for themselves. */
    pointer-events: none;
}
/* UML's own marks: a static is underlined, an abstract is italic. */
${scope} .exo-node-member--static { text-decoration: underline; }
${scope} .exo-node-member--abstract { font-style: italic; }
${scope} .exo-node-member--more {
    fill: var(--exo-ink-muted);
    font-style: italic;
}
${scope} .exo-node-group { cursor: pointer; }

/*
 * The panel is where a box's contents are readable in full: a diagram that says
 * "… 32 more" has to have somewhere to send the reader.
 */
${scope} .exo-graph-member-list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
}
${scope} .exo-graph-member-list li {
    display: grid;
    grid-template-columns: 1.2em 1fr auto;
    gap: 2px 6px;
    padding: 4px 0;
    border-top: 1px solid var(--exo-border);
}
${scope} .exo-graph-member-list code {
    font-size: 12px;
    line-height: 1.45;
    overflow-wrap: anywhere;
}
${scope} .exo-graph-visibility {
    color: var(--exo-ink-muted);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    cursor: help;
}
${scope} .exo-graph-modifier {
    align-self: start;
    color: var(--exo-ink-secondary);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border: 1px solid var(--exo-border);
    border-radius: 3px;
    padding: 0 4px;
}
${scope} .exo-graph-doc {
    grid-column: 2 / -1;
    margin: 2px 0 0;
    color: var(--exo-ink-secondary);
    font-size: 12px;
    line-height: 1.5;
}
/*
 * The drawing and the panel, side by side and the same height.
 *
 * Beside, not on top. A panel floating over the canvas is a piece of canvas that
 * cannot be dragged — and it sits exactly where the reader just clicked, so the
 * dead patch is the one they are most likely to grab. One row, one scroll each,
 * nothing sticky pretending to be a header.
 */
${scope} .exo-graph-body {
    display: flex;
    align-items: stretch;
}
${scope} .exo-graph-body > .exo-graph-stage {
    flex: 1 1 auto;
    /* Without this a flex item refuses to shrink below its content. */
    min-width: 0;
}
${scope} .exo-graph-link {
    color: var(--exo-kind-runtime);
    text-decoration: underline;
    text-decoration-style: dotted;
    cursor: pointer;
}

/* Too narrow for two columns: the panel goes under the drawing and gives back
   most of the height it was using. */
@media (max-width: 860px) {
    ${scope} .exo-graph-body { flex-wrap: wrap; }
    ${scope} .exo-graph-body > .exo-graph-details.is-open {
        flex-basis: 100%;
        width: 100%;
        max-height: 40vh;
        border-left-width: 0;
        border-top: 1px solid var(--exo-border);
    }
    ${scope} .exo-graph-details-body { width: 100%; }
    ${scope} .exo-graph-search input { min-width: 9rem; }
}

/*
 * While a package's insides are on their way. Fetching is usually instant from
 * cache and distinctly not instant on a phone — and a double-click that appears
 * to do nothing gets clicked again.
 */
${scope} .exo-graph-status {
    position: absolute;
    left: 50%;
    top: 12px;
    transform: translateX(-50%);
    z-index: 3;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    background: var(--exo-plane);
    border: 1px solid var(--exo-border);
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.18);
    font-size: 0.85em;
}
${scope} .exo-graph-status--error {
    border-color: var(--exo-status-critical);
    color: var(--exo-status-critical);
}
${scope} .exo-graph-spinner {
    width: 0.85em;
    height: 0.85em;
    border-radius: 50%;
    border: 2px solid var(--exo-border);
    border-top-color: var(--exo-kind-runtime);
    animation: exo-graph-spin 0.7s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
    ${scope} .exo-graph-spinner { animation: none; }
}
@keyframes exo-graph-spin { to { transform: rotate(360deg); } }

${scope} .exo-graph-doc--lead {
    grid-column: auto;
    margin: 0 0 10px;
    font-size: 13px;
}
${scope} .exo-node-link {
    text-decoration: underline;
    text-decoration-style: dotted;
    cursor: pointer;
    pointer-events: auto;
}
${scope} .exo-node-link:hover { text-decoration-style: solid; }

/* UML notation. The line style and the arrowhead together say what the tie is:
   solid + hollow triangle is "is a", dashed + hollow triangle is "implements",
   filled diamond is "owns", dashed + open arrow is "merely uses". */
${scope} .exo-edge--inheritance { stroke-dasharray: none; }
${scope} .exo-edge--realization { stroke-dasharray: 6 4; }
${scope} .exo-edge--composition { stroke-dasharray: none; }
${scope} .exo-edge--association { stroke-dasharray: none; }
${scope} .exo-edge--dependency { stroke-dasharray: 4 4; opacity: 0.75; }
${scope} .exo-marker-hollow {
    fill: var(--exo-plane);
    stroke: var(--exo-edge-strong);
    stroke-width: 1.5;
}
${scope} .exo-marker-filled { fill: var(--exo-edge-strong); }
${scope} .exo-marker-open {
    fill: none;
    stroke: var(--exo-edge-strong);
    stroke-width: 1.5;
}
${scope} .exo-node-group { cursor: pointer; }

${scope} .exo-edge {
    fill: none;
    stroke: var(--exo-edge);
    transition: opacity 120ms ease-out;
}
/* Erased at build time — drawn as absent as it is at runtime. */
${scope} .exo-edge--type-only { stroke-dasharray: 4 4; opacity: 0.7; }
/* A code-split boundary, not a load-time dependency. */
${scope} .exo-edge--dynamic { stroke-dasharray: 1 5; stroke-linecap: round; }
${scope} .exo-edge.is-violating { stroke: var(--exo-status-critical); }

/* Focus: the touched neighbourhood stays, everything else recedes. Recede, not
   hide — the shape of the whole graph is the context that makes a focus mean
   something. */
${scope} .is-dimmed { opacity: 0.12; }
${scope} .is-related { opacity: 1; }
${scope} .exo-node.is-focused {
    stroke: var(--exo-edge-strong);
    stroke-width: 3;
}
${scope} .exo-edge.is-related { stroke: var(--exo-edge-strong); }

/* A search marks BOTH sides: the misses recede and the hits thicken. Dimming
   alone is hard to spot on a drawing made mostly of small boxes. */
${scope} .exo-node.is-unmatched { opacity: 0.12; }
${scope} .exo-node-group:has(.exo-node.is-unmatched) text { opacity: 0.12; }
${scope} .exo-node.is-match { stroke-width: 3; }

/* Keyboard users have to be able to SEE where they are. */
${scope} .exo-graph-stage:focus-visible {
    outline: 2px solid var(--exo-kind-runtime);
    outline-offset: -2px;
}

@media (prefers-reduced-motion: reduce) {
    ${scope} .exo-node,
    ${scope} .exo-edge { transition: none; }
}

/* ── chrome ─────────────────────────────────────────────────────────────────
   Shipped WITH the library, not left to the host. A host restyles by
   overriding the custom properties; it should not have to write a stylesheet
   before the thing looks like anything. */
${scope} {
    border: 1px solid var(--exo-border);
    border-radius: 8px;
    /* clip, not hidden: both keep the corners tidy, but hidden makes this a
       scroll container, and a sticky child of a scroll container never sticks —
       which is what the inspector card depends on. (This whole stylesheet is a
       template literal: no backticks in it.) */
    overflow: clip;
    font-size: 0.9rem;
    line-height: 1.5;
}
${scope} .exo-graph-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem 1rem;
    padding: 0.6rem 0.9rem;
    border-bottom: 1px solid var(--exo-border);
    background: var(--exo-surface);
}
${scope} .exo-graph-search {
    display: flex;
    align-items: baseline;
    /* Wide enough that the count does not read as part of the field — a search
       input's own clear button already sits right at that edge. */
    gap: 0.75rem;
    margin-right: auto;
}
${scope} .exo-graph-search input {
    font: inherit;
    color: var(--exo-ink);
    background: var(--exo-plane);
    border: 1px solid var(--exo-border);
    border-radius: 6px;
    padding: 0.25rem 0.55rem;
    min-width: 15rem;
}
${scope} .exo-graph-search input::placeholder { color: var(--exo-ink-muted); }
${scope} .exo-graph-search-count {
    color: var(--exo-ink-muted);
    font-size: 0.8em;
    white-space: nowrap;
}
${scope} .exo-graph-relation-swatch { overflow: visible; }
${scope} .exo-graph-legend--relations .exo-graph-legend-item { gap: 0.3rem; }
${scope} .exo-graph-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    margin-right: auto;
}
${scope} .exo-graph-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--exo-ink);
}
${scope} .exo-graph-swatch {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
    background: var(--exo-kind-other);
}
${scope} .exo-graph-swatch--runtime { background: var(--exo-kind-runtime); }
${scope} .exo-graph-swatch--tooling { background: var(--exo-kind-tooling); }
${scope} .exo-graph-swatch--app { background: var(--exo-kind-app); }
${scope} .exo-graph-breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.9rem;
    border-bottom: 1px solid var(--exo-border);
    color: var(--exo-ink-secondary);
}
${scope} .exo-graph-breadcrumb button,
${scope} .exo-graph-open {
    border: 1px solid var(--exo-border);
    border-radius: 5px;
    padding: 0.25rem 0.6rem;
    background: transparent;
    color: var(--exo-ink);
    cursor: pointer;
    font: inherit;
}
${scope} .exo-graph-open { margin-bottom: 0.6rem; }
${scope} .exo-graph-breadcrumb button:hover,
${scope} .exo-graph-open:hover { background: var(--exo-plane); }

${scope} .exo-graph-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    color: var(--exo-ink);
}

/* A window onto the drawing, not a box that scrolls it: the reader drags to
   move and pinches to zoom, so the surface must not scroll underneath them. */
${scope} .exo-graph-stage {
    position: relative;
    height: 65vh;
    min-height: 24rem;
    /* The drawing is bigger than its box and is moved by dragging, so the box
       has to cut it off. */
    overflow: hidden;
    background: var(--exo-plane);
    /* The browser must not claim the gesture: touch-action stops it scrolling
       or pinch-zooming the page, and user-select stops a drag from selecting
       the labels instead of moving the graph — which is what makes panning feel
       broken rather than merely imperfect. */
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
}
${scope} .exo-graph-stage:active { cursor: grabbing; }
${scope} .exo-graph-stage .exo-graph-canvas {
    width: 100%;
    height: 100%;
}

${scope} .exo-graph-zoom {
    position: absolute;
    right: 0.6rem;
    bottom: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}
${scope} .exo-graph-zoom button {
    width: 2rem;
    height: 2rem;
    border: 1px solid var(--exo-border);
    border-radius: 5px;
    background: var(--exo-surface);
    color: var(--exo-ink);
    cursor: pointer;
    font: inherit;
    line-height: 1;
}
${scope} .exo-graph-zoom button:hover { background: var(--exo-plane); }

/*
 * A drawer. Shut it takes no width at all, so the drawing has the whole stage;
 * selecting something slides it in.
 *
 * It PUSHES the drawing rather than covering it. Sliding it over the canvas
 * would be cheaper to animate, and it would also make the part of the canvas
 * under it undraggable — which is the bug this layout exists to avoid.
 */
${scope} .exo-graph-details {
    flex: 0 0 0;
    width: 0;
    /* The same height as the drawing beside it, with its own single scroll —
       the panel must not stretch the page to the length of a class with forty
       members. */
    max-height: 65vh;
    overflow: hidden;
    overscroll-behavior: contain;
    border-left: 0 solid var(--exo-border);
    color: var(--exo-ink);
    transition:
        flex-basis 180ms ease-out,
        width 180ms ease-out;
}
${scope} .exo-graph-details.is-open {
    flex-basis: 22rem;
    width: 22rem;
    overflow-y: auto;
    border-left-width: 1px;
}
/* ONE box holds the contents and the padding. It keeps its own width while the
   drawer moves, so the text slides out of view instead of reflowing narrower on
   every frame — and every rule below can go on assuming the panel is padded. */
${scope} .exo-graph-details-body {
    box-sizing: border-box;
    width: 22rem;
    padding: 0.9rem;
}
${scope} .exo-graph-details-head {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
}
${scope} .exo-graph-details-head h3 { flex: 1; }
${scope} .exo-graph-stereotype-tag {
    color: var(--exo-ink-muted);
    font-size: 0.8em;
}
${scope} .exo-graph-close {
    border: 0;
    background: none;
    color: var(--exo-ink-muted);
    font-size: 1.3rem;
    line-height: 1;
    padding: 0 0.2rem;
    cursor: pointer;
}
${scope} .exo-graph-close:hover { color: var(--exo-ink); }

@media (prefers-reduced-motion: reduce) {
    ${scope} .exo-graph-details { transition: none; }
}
${scope} .exo-graph-details h3 { margin: 0 0 0.5rem; font-size: 1.05rem; }
${scope} .exo-graph-details h4 {
    margin: 1rem 0 0.35rem;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--exo-ink-secondary);
}
${scope} .exo-graph-facts {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 0.9rem;
    margin: 0;
}
${scope} .exo-graph-facts dt { color: var(--exo-ink-secondary); }
${scope} .exo-graph-facts dd { margin: 0; }
${scope} .exo-graph-edge-list { list-style: none; margin: 0; padding: 0; }
${scope} .exo-graph-edge-list > li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--exo-border);
}
${scope} .exo-graph-edge-name { font-weight: 600; }
${scope} .exo-graph-edge-kinds {
    color: var(--exo-ink-secondary);
    font-size: 0.85em;
}
${scope} .exo-graph-edge-list details { flex-basis: 100%; }
${scope} .exo-graph-edge-list summary {
    cursor: pointer;
    color: var(--exo-ink-secondary);
    font-size: 0.85em;
}
${scope} .exo-graph-edge-list details ul {
    margin: 0.25rem 0 0;
    padding-left: 1.1rem;
    color: var(--exo-ink-secondary);
    font-size: 0.85em;
    word-break: break-all;
}
${scope} .exo-graph-violation {
    flex-basis: 100%;
    margin-top: 0.35rem;
    padding: 0.45rem 0.7rem;
    border-left: 3px solid var(--exo-status-critical);
    border-radius: 3px;
    background: color-mix(in srgb, var(--exo-status-critical) 12%, transparent);
}
${scope} .exo-graph-violation p { margin: 0.25rem 0 0; font-size: 0.85em; }
${scope} .exo-graph-empty { color: var(--exo-ink-secondary); margin: 0; }
`;
}
