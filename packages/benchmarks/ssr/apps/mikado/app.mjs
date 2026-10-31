// Shared SSR-bench app — MIKADO 0.8.400 flavour. The SAME spec the Exodra, Solid, Qwik and
// Marko apps in this directory implement: a list of N interactive rows, each a counter button
// whose click increments its own number. Non-trivial on purpose so hydration/resume cost is
// visible (N rows to wire vs. wire-on-demand).
//
// WHY MIKADO IS IN THIS SUITE. It is the only participant besides Exodra that is a template
// with holes, has BOTH a server renderer and hydration, and needs no compiler plugin to get
// them: the server half hands `mikado/ssr` the path of `row.html` and the client half hands
// `Mikado.compile()` the same file's text, both at run time. That makes it the only honest
// comparison for the shape of thing Exodra claims — and its addressing model is the same bet,
// reached from a different direction: every dynamic position in a template is an INTEGER INDEX
// into a flat path array, built once per row by walking the node and then memoised on it.
//
// ------------------------------------------------------------------- THE TEMPLATE, `row.html`
//
//   <li class="row" data-id="{{! data.i }}"><span class="row__label">Item {{! data.i }}</span>
//   <button class="row__btn" data-b="{{! data.i }}" click="inc">{{! data.count }}</button></li>
//
// A Mikado view is "one template, N instances, inside a root element the view owns", so the
// template is the ROW, not the list: the `<ul class="list">` around it is written by
// `server.mjs` and is the element `client.mjs` mounts on — exactly as the Exodra participant
// wraps `renderExoRows` in a `<ul>` it writes itself.
//
// THAT FILE MUST STAY ONE LINE WITH NO COMMENTS, and this is where the reasons are recorded
// because these comments are minified out of the client bundle while anything inside
// `row.html` is shipped to the browser verbatim (the client bundle carries the template SOURCE
// as a string; only the server-side compiler strips HTML comments). A comment there would be
// documentation charged to Mikado's JS-bytes column.
//
//   - NO WHITESPACE BETWEEN TAGS. Both compilers drop whitespace-only text nodes and the SSR
//     emitter runs with `compression: true`, so nothing indents the output. Keeping the source
//     free of inter-tag whitespace means the DOM the server sends and the template tree the
//     client compiles cannot disagree about how many child nodes a row has — and hydration
//     walks those two structures in lockstep (`mikado/src/factory.js`, `construct()` with a
//     vnode: firstChild, then nextSibling per template child). A mismatch does not throw; it
//     silently falls back to building a factory from scratch.
//
//   - `{{! … }}` IS THE SSR-ONLY ESCAPE FORM. On the server the value goes through Mikado's
//     escaper; on the client the marker is stripped and the value is written with
//     `nodeValue`/`setAttribute`, which need no escaping. Same deal every other participant
//     gets — escaped on the server, written raw on the client — so the server halves are doing
//     equal work.
//
//   - `click="inc"` IS MIKADO'S EVENT ROUTING and it is deliberate. Mikado delegates: ONE
//     global listener per event type, and the route name lives in the markup, so a row needs
//     no per-row wiring at load. The cost is the attribute on every row. It is NOT stripped to
//     flatter the byte count — it is Mikado's cost of doing business, the same way Solid's
//     `data-hk` and Marko's resume comments are theirs, and it is paid for in the HTML-bytes
//     column. (The CLIENT benchmark suite's Mikado app wires one listener by hand instead,
//     because that suite's gate compares innerHTML byte for byte against a reference that has
//     no such attribute. This suite's gate compares the app's SHAPE and charges for markers in
//     bytes, so here the idiomatic form is the honest one.)
//
//   - NO `key` ATTRIBUTE. Mikado's keyed mode makes the compiler emit `key="…"` into the SSR
//     output, which hydration then uses to seed its live pool. This app never reorders, removes
//     or refetches a row — the list is rendered once and only counters change — so a key would
//     buy nothing and cost one attribute per row on the wire. A keyed variant is a one-word
//     change to `row.html` and belongs in the suite as a SECOND row, measured next to this one,
//     not as a silent default.

export const DEFAULT_N = 1000;

/**
 * How many rows the SERVER renders.
 *
 * `globalThis.__N__` is read at call time, not at import time — the sweeps (`hyd.mjs`,
 * `sweep.mjs`) change it between renders. `measure.mjs` sets nothing and everyone falls
 * through to the same `DEFAULT_N`, which is what keeps the participants' row counts equal
 * there.
 *
 * The CLIENT does not use this. It asks the view how many rows it adopted (`view.length` after
 * `mount(root, true)`), which is the same number by construction and cannot fall out of step
 * with the markup even if a harness forgets the inline `window.__N__` script.
 */
export function rowCount() {
    return globalThis.__N__ ?? DEFAULT_N;
}

/**
 * The store: one object per row, and the only place a counter's value lives — real state on
 * both sides, never a literal baked into the template. The server renders `count: 0` out of
 * the store it built; the click handler in `client.mjs` mutates `count` on the store object
 * and asks the view to update that row.
 *
 * A fresh array per call, because `renderBody()` is timed in a seven-render loop and every
 * other participant allocates its rows inside the timed region too.
 */
export function makeStore(n) {
    const store = new Array(n);
    for (let i = 0; i < n; i++) store[i] = { i, count: 0 };
    return store;
}

/** The name of the route `row.html` carries in its `click` attribute. */
export const ROUTE = 'inc';
