// Shared SSR-bench app — SCHEMA + WIRING flavour (the renderer core now shipped as
// `@exodra/core` + `@exodra/dom` + `@exodra/string`). The SAME spec the Solid, Qwik and Marko
// apps in this directory implement: a list of N interactive rows, each
// a counter button whose click increments its own number. Non-trivial on purpose so
// hydration/resume cost is visible (N event listeners to wire vs. wire-on-demand).
//
// The markup is meant to be identical to the others', byte for byte modulo each
// framework's own hydration markers — `ssr/gate.mjs` compares all participants and fails
// if they diverge, because a participant that renders less is a free win no timing
// harness detects.
//
// WHAT THIS PARTICIPANT EXISTS TO EXERCISE: the split between a schema (the constant
// half of a component, built once at module load) and a WIRING FUNCTION (the varying
// half, run per instance). There is no template string to parse per backend and no
// second implementation of the row: `server.mjs` hands the COMPONENT below to the string
// backend and `client.mjs` hands the SAME value to hydration, so the wiring they run is
// the same function object by construction. Neither knows which one it is filling — a
// port is named by identity, and every backend agrees on where that port is because
// `createExoSchema` numbered them once.
//
// The imports are PACKAGE SPECIFIERS: the backend-agnostic half is `@exodra/core`, the server
// backend is `@exodra/string` and the hydrating one is `@exodra/dom`. esbuild resolves them out
// of those packages' `dist`, so `npm run build` at the repo root has to have run.
//
// The reported number is a BUNDLE SIZE — what an application importing exactly these names
// ships.
import { composeExoMachine, createExoMachine, createExoSchema, withExoHandlers } from '@exodra/core';

export const DEFAULT_N = 1000;

/**
 * THE ROW MACHINE, declared ONCE for the life of the module — which is the whole point of a
 * schema: the shape is constant, so it is parsed, numbered and planned once instead of once per
 * row. Everything passed to `el()` here is static and is folded into the prepared markup;
 * everything that varies per row is a PORT.
 *
 * Written with no whitespace between elements, like every other participant's row: a template
 * carrying indentation serialises that whitespace into the page and would show up in the gate as
 * extra text nodes.
 *
 * ONE VALUE for both halves: `server.mjs` renders it and `client.mjs` hydrates it, so nothing but
 * this module decides what a row is. The initial state runs on the server, where a write lands in
 * the markup, and in the browser, where hydration compares and the click handler is attached; the
 * counter is this instance's own state and the click is a transition on it.
 *
 * Deliberately NOT filled in document order, for the same reason the core's own tests are not: an
 * initial state names ports by identity, so the order must not matter.
 */
const ROW_SCHEMA = createExoSchema((b) => {
    let id;
    let label;
    let mark;
    let click;
    let count;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        li.el('span', { class: 'row__label' }, (span) => {
            label = span.textPort();
        });
        li.el('button', { class: 'row__btn' }, (btn) => {
            mark = btn.port('data-b');
            click = btn.eventPort('click');
            count = btn.textPort();
        });
    });
    return { id, label, mark, click, count };
});
const R = ROW_SCHEMA.ports;
function counted(c) {
    c.state.count += 1;
    c.text(R.count, c.state.count);
}
export const ROW = composeExoMachine(
    createExoMachine(ROW_SCHEMA, {
        createInitialState: (c, i) => {
            c.text(R.count, 0);
            c.attr(R.id, i);
            c.attr(R.mark, i);
            c.text(R.label, 'Item ' + i);
            return { count: 0 };
        },
    }),
    (m) => withExoHandlers(m, (on) => on(R.click, (c) => counted(c))),
);

/**
 * THE LIST — the `<ul class="list">` as a MACHINE rather than a string the server wrote around
 * the rows, because that is what makes the whole page adoptable: `hydrate(machine, parent)`
 * adopts `parent`'s first element child as ONE instance, and `c.list` adopts the rows inside it.
 *
 * A FIXED list and not a reconciled one: the count is known and this page never changes it, so it
 * pays for no diff, no registry and no subscription — and on the adopting side it is the one
 * children call that needs no end-of-list walk.
 */
const LIST_SCHEMA = createExoSchema((b) => {
    let rows;
    b.el('ul', { class: 'list' }, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
export const LIST = createExoMachine(LIST_SCHEMA, {
    createInitialState: (c) => {
        c.list(LIST_SCHEMA.ports.rows, ROW, Array.from({ length: rowCount() }, (_, i) => i));
    },
});

/**
 * How many rows to render or adopt.
 *
 * N is a runtime value — the server sets `globalThis.__N__` before rendering and the
 * client reads the same name off `window` from the inline script `hyd.mjs`'s shell
 * carries — exactly as the Exodra and cursor apps do it, so ONE client bundle serves
 * every N in a sweep. `measure.mjs`'s shell carries no such script, and then both halves
 * fall through to the same `DEFAULT_N`, which is what keeps the server's row count and
 * the client's identical there.
 */
export function rowCount() {
    return globalThis.__N__ ?? DEFAULT_N;
}
