// AXIS `list-update` — LIT's row list, the counterpart of `svelte/SvList.svelte` and
// `marko/MkList.marko`, holding the same 300 `{ id, text }` rows every other participant on that
// axis holds.
//
// WHY LIT IS IN THIS COMPARISON AT ALL is argued at length in `apps/lit/lit.md`: it is the closest
// neighbour to the schema core that has NO compiler — one prepared `<template>` per call site,
// cloned per instance and re-walked with a `TreeWalker` to find the dynamic positions, against a
// core that claims the walk is unnecessary because a port's address is a number decided once.
// Lit was on three axes and absent from the four where this suite's margins are widest, which
// reads as selection whether or not it was meant as one. This file and its three siblings
// (`reconcile.tsx`, `reactive.tsx`, `toggle.tsx` beside this file) close that.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHICH LIT: `lit-html`'s standalone `render(template, container)`, NOT `LitElement`.
//
// Two reasons, and the first is the same one `apps/lit/lit.md` gives: a `<row-list>` custom
// element would be an EXTRA ELEMENT in the tree, and three of the four axes Lit is joining diff the
// rendered HTML against a reference byte for byte and print the element count beside it. There
// is no way to host a LitElement without adding its host element to the DOM.
//
// The second is about the measurement rather than the markup. `LitElement` batches: a property
// write calls `requestUpdate()` and the actual render happens on a microtask, which the caller
// then has to `await el.updateComplete`. Every measured region in this suite is synchronous, so
// a LitElement participant would need its update awaited — and `abBench` times a synchronous
// function. What LitElement's batching BUYS is coalescing several property writes into one
// render; on these four axes each measured step is exactly one state change to one root, so
// there is nothing to coalesce and the batched and unbatched programs do identical work.
//
// WHERE THE FLUSH IS: nowhere, and that is not an omission. `render()` commits synchronously —
// in `lit-html.js` it is
//
//     export const render = (value, container, options) => {
//         const partOwnerNode = options?.renderBefore ?? container;
//         let part = partOwnerNode['_$litPart$'];
//         if (part === undefined) {
//             const endNode = options?.renderBefore ?? null;
//             partOwnerNode['_$litPart$'] = part = new ChildPart(
//                 container.insertBefore(createMarker(), endNode), endNode, undefined, options ?? {});
//         }
//         part._$setValue(value);      // ← the DOM write happens inside this call
//         return part;
//     };
//
// with no queue, no scheduler and no microtask anywhere in the path (read off
// `node_modules/lit-html/development/lit-html.js`; the shipped `lit-html.js` is the same code
// minified). So the DOM write has landed by the time `render()` returns, which is what the
// measured region requires, and Lit needs no counterpart to react's `flushSync`, svelte's
// `flushSync`, voby's `tick` or marko's `run`.
//
// AND IT IS THE PRODUCTION BUILD, which this suite has been burned by before — every React and
// Solid number it published for months was a measurement of a DEBUG build. Lit ships a
// `development` export condition (`lit-html`'s exports map has `browser.development ->
// ./development/lit-html.js` against `browser.default -> ./lit-html.js`) and Vite's dev server
// includes the `development` condition by DEFAULT, so the debug build is what a normal config
// would serve. `vite.config.ts` lists `resolve.conditions` explicitly — `['browser', 'module',
// 'import', 'default']`, with `development` absent — and repeats it in
// `optimizeDeps.esbuildOptions.conditions`, which is what kept Solid off `dist/dev.js`, and it
// covers Lit for free. Verify the same way that note prescribes: `node_modules/.vite/deps/lit.js`
// must contain no `DEV_MODE` (the development build is full of it).
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHY LIT IS ON THE DECLARATIVE SIDE OF THIS AXIS — the judgement call `list-reconcile.tsx`'s
// header asks every participant to justify, stated rather than left to omission.
//
// `list-update` is two comparisons in one run: `exodra` (and `exodraOps`) are TOLD WHAT CHANGED
// through an imperative list API — `move(0, 150)`, `insert(75, row)`, `remove(200)`, `push(row)`
// — and everyone else is handed a NEW ARRAY and has to diff it. Lit belongs with the second
// group, and the whole of `lit-html/directives/` was read before concluding it:
//
//   * The list directives are `repeat`, `map`, `join`, `range`. Every one of them takes the
//     WHOLE iterable and produces the whole list; `repeat` is the keyed one and reconciles the
//     new array against the old (see `reconcile.tsx` beside this file for its algorithm). None of
//     them has a
//     move/insert/remove entry point.
//   * `lit-html/directive-helpers.js` DOES export `insertPart`, `removePart`, `clearPart` and
//     `setChildPartValue`, which is as close to an imperative list API as Lit gets — and it is
//     not one that application code can reach. Every one of them takes a `ChildPart`, and a
//     `ChildPart` is only handed out inside a `Directive`'s `update(part, args)`. There is no
//     way to get from a rendered `<li>` back to the part that owns it. Their own doc comments
//     say what they are for: "this should only be used to set/update the value of user-created
//     parts (i.e. those created using `insertPart`); it should not be used by directives to set
//     the value of the directive's container part". They are the pieces `repeat()` itself is
//     written out of — `repeat.js` imports exactly those four.
//
// So the imperative program is available to Lit only by writing a directive that owns its own
// parts, which is re-implementing `repeat()` with a mutation API bolted on. That is the
// hand-optimised participant this suite already has a cautionary tale about: the hand-written
// imperative `mikado` participant beat everyone until an idiomatic one was added beside it and
// came out 1.5× slower. So: `repeat()`, handed the new array, beside Solid / Svelte / React /
// voby / marko, and the number read against theirs.
//
// KEYED BY `r.id` — the same row identity every other participant on this axis keys by (React
// `key={r.id}`, Svelte `{#each rows as r (r.id)}`, Marko `by="id"`, Solid/voby `<For>` by item
// identity, and the schema core by the `Row` object itself). `repeat()`'s second argument is the
// key function; without it `repeat` falls back to keying by INDEX, which survives a `move` by
// leaving every node where it is and rewriting its text — a materially cheaper program that
// passes both halves of that axis's gate. `list-reconcile.tsx` therefore asserts the keying
// directly, by name, for this participant as it does for Marko.
//
// ONE LINE, NO INDENTATION, in the template literal. A tagged template keeps every byte it is
// given, so a template broken across indented lines would put whitespace text nodes into the DOM
// that no other participant emits. Keeping it on one line removes the question instead of
// answering it.
import { html, nothing, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

/** The row this axis holds — structurally the `Row` that `list-reconcile.tsx` declares. */
export type TLitRow = { id: number; text: string };

/**
 * The outside surface of a mounted Lit list, deliberately shaped like Marko's
 * `Marko.MountedTemplate` so the axis file drives both participants with the same two calls and
 * nothing about the scenario has to be written twice.
 */
export interface TLitList {
    update(input: { rows: readonly TLitRow[] }): void;
    destroy(): void;
}

// THE MARKUP IS ONE UNBROKEN LINE, and a line may be broken INSIDE a `${…}` and nowhere else —
// that whitespace is JavaScript's, not markup's. `prettier-ignore` is here because a repo-wide
// `prettier --write` once reflowed the embedded HTML in every `html` tagged template in
// this package; `.prettierrc` now also carries `"embeddedLanguageFormatting": "off"`.
// prettier-ignore
const listTemplate = (rows: readonly TLitRow[]) =>
    html`<ul>${repeat(rows, (r) => r.id, (r) => html`<li>${r.text}</li>`)}</ul>`;

/**
 * Mount the list into `host` and hand back the two-call driver.
 *
 * `destroy()` renders `nothing`, which clears the render root's part and removes its nodes —
 * Lit's equivalent of `root.unmount()`, and like every other participant's teardown it runs in
 * the scenario's `cleanup`, outside the timed region. There is nothing else to release: Lit
 * holds no subscriptions, its parts hang off the nodes and its listeners are owned by the
 * elements they are on, so the rest dies with the container the caller removes.
 */
export function mountLitList(input: { rows: readonly TLitRow[] }, host: HTMLElement): TLitList {
    render(listTemplate(input.rows), host);
    return {
        update: (next) => {
            render(listTemplate(next.rows), host);
        },
        destroy: () => {
            render(nothing, host);
        },
    };
}
