// AXIS `list-update` — STAGE0's row list, the counterpart of `participants/lit/list.tsx`,
// `svelte/SvList.svelte` and `marko/MkList.marko`, holding the same 300 `{ id, text }` rows every
// other participant on that axis holds.
//
// WHY STAGE0 IS IN THIS COMPARISON, and why its row is a CEILING rather than a competitor's row,
// is argued once in `apps/stage0/stage0.md`: it is the clone-and-fill idea with nothing on
// top of it, so it is the number every other row's additions are subtracted from.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHICH SIDE OF THIS AXIS, and it is the DECLARATIVE one — with Solid, Svelte, React, voby, Marko
// and Lit rather than with `exodraOps` and `mikado`.
//
// `list-update` is two comparisons in one run: some participants are TOLD WHAT CHANGED through an
// imperative list API (`move(0, 150)`, `insert(75, row)`, …) and the rest are handed a NEW ARRAY
// and have to diff it. Stage0's only list API is `stage0/reconcile`, and it is a diff:
//
//     reconcile(parent, renderedValues, data, createFn, updateFn?, beforeNode?, afterNode?)
//
// — the whole previous array against the whole new one, a two-ended prefix/suffix scan followed
// by a key→position Map and a longest-increasing-subsequence move set, working with the DATA
// directly rather than through a nodes array (the file's own header credits ivi and Surplus, and
// sinuous's `map` in turn credits stage0). There is no move/insert/remove entry point anywhere in
// the library, and there is nothing else in it that owns a list.
//
// THE IMPERATIVE PROGRAM IS OF COURSE WRITABLE — with `parent.insertBefore` and a node the caller
// kept — and that is exactly why it is NOT written here. It would not be measuring stage0, it
// would be measuring the DOM, which is what `participants/floor/app.ts` exists for; and a
// hand-written imperative participant is the thing this suite already has a cautionary tale about (the hand-written
// `mikado` row beat everyone until an idiomatic one was put beside it and came out 1.5× slower).
// A ceiling is only worth reading if it is the library's own program.
//
// RECONCILED BY ROW IDENTITY — the items themselves, compared with `===` through a `Map`, which
// is the same row identity every other participant on this axis keys by (React `key={r.id}`,
// Svelte `{#each rows as r (r.id)}`, Marko `by="id"`, Lit `repeat(rows, r => r.id, …)`,
// Solid/voby `<For>` by item identity, and the schema core by the `Row` object itself). Stage0
// ships a `stage0/keyed` variant that reads a named key off each item instead; it is for
// immutable data that is re-created per render, and these rows are the same objects throughout,
// so `reconcile` is the one its README points at ("good for arrays with mutable data, because it
// compares array items directly").
//
// NO UPDATE CALLBACK. `reconcile`'s fifth argument runs against every row it keeps, and the
// default is `noOpUpdate`, which does nothing. A row's text never changes on this axis — only its
// POSITION does — so leaving the default in place is what makes this row comparable: Solid's
// `<For>` and Marko's `<for by>` move nodes and leave their text alone, and the schema core's row
// wiring is `set`, not `bind`. Passing a callback that rewrote 300 unchanged strings per op would
// be the mistake `mikado`'s `{ cache: true }` note on this axis exists to avoid.
//
// NOTHING TO FLUSH: `reconcile` writes to the DOM inside the call. Stage0 has no scheduler to
// queue into.
import h from 'stage0';
import reconcile from 'stage0/reconcile';

/** The row this axis holds — structurally the `Row` that `list-reconcile.tsx` declares. */
export type TStage0Row = { id: number; text: string };

/**
 * The outside surface of a mounted stage0 list, deliberately shaped like Lit's and Marko's so the
 * axis file drives every declarative participant with the same two calls.
 */
export interface TStage0List {
    update(input: { rows: readonly TStage0Row[] }): void;
    destroy(): void;
}

// ONE LINE, NO INDENTATION — see `apps/stage0/stage0.tsx`: `h` turns a newline plus indentation
// into a comment node, and this axis's gate reads the rendered rows back.

/** The `<ul>` the rows live in. No references — the rows are put in by `reconcile`. */
const listTpl = h`<ul></ul>`;

/**
 * ONE ROW. `#text` is a TEXT reference: `collector()` only recognises a text node whose data
 * starts with `#`, and it blanks that data, so the clone carries one empty Text node which the
 * create callback fills. The reference row is one Text node too.
 */
const rowTpl = h`<li>#text</li>`;

/** Build one row node — `reconcile`'s create callback, and the only place a row is built. */
const createRow = (row: TStage0Row): HTMLElement => {
    const node = rowTpl.cloneNode(true) as HTMLElement;
    const refs = rowTpl.collect(node) as unknown as { readonly text: Text };
    refs.text.nodeValue = row.text;
    return node;
};

export function mountStage0List(
    input: { rows: readonly TStage0Row[] },
    host: HTMLElement
): TStage0List {
    const ul = listTpl.cloneNode(true) as HTMLElement;
    host.appendChild(ul);
    // What the DOM currently reads — `reconcile`'s `renderedValues`. Stage0 keeps no state of its
    // own about a list, so the caller holds the previous array; that is the library's contract,
    // not an accommodation made for this benchmark.
    let rendered: readonly TStage0Row[] = [];
    const commit = (rows: readonly TStage0Row[]): void => {
        reconcile(ul, rendered as TStage0Row[], rows as TStage0Row[], createRow);
        rendered = rows;
    };
    commit(input.rows);
    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            // The nodes die with the container the caller removes; this is here so the two-call
            // surface matches every other participant's, and it runs in `cleanup`, untimed.
            ul.remove();
            rendered = [];
        },
    };
}
