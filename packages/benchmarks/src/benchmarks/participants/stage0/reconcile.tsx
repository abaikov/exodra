// AXIS `reconcile` — STAGE0's 200-row keyed list, the counterpart of
// `participants/lit/reconcile.tsx` and
// `marko/MkReconcile.marko`. The axis replaces the whole list with a shuffled order 30 times:
// nothing is added, nothing is removed, every row survives and only the ORDER changes.
//
// WHY STAGE0 IS HERE, and why its row is a CEILING rather than a competitor's, is argued once at
// in `apps/stage0/stage0.md`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHAT ITS RECONCILER ACTUALLY IS, because on this axis that is the whole point of the row.
//
// `stage0/reconcile` is the SAME FAMILY of algorithm as the schema core's, Solid's and Marko's —
// its own header credits ivi for the shape and Surplus for the fast paths, and sinuous's `map`
// credits stage0 in turn. A shuffle skips its prefix and suffix scans immediately, so every op
// runs the general case: a `Map` from item to new index, a `P` array of old positions, then
// `longestPositiveIncreasingSubsequence(P)` and one `insertBefore` per row that is not in the
// kept subsequence. That is the same minimum-move strategy the schema core runs, which makes
// this row the cleanest reading this axis has: the two programs differ in the bookkeeping around
// the move set and in nothing else.
//
// It differs from every other participant in ONE respect that matters for reading the number: it
// works with the DATA directly and holds NO nodes array between ops. `renderedValues` is the
// caller's previous array and the nodes are found by walking `firstChild`/`nextSibling` when the
// general case is reached. So it allocates less per op than a renderer that keeps a row record,
// and it re-walks the list when it has to move anything. Both halves of that are stage0's, not
// this file's.
//
// KEYED BY THE ITEM ITSELF — the row ids, compared with `===` in a `Map`, the same identity
// Solid's `<For>`, React's `key={id}`, Svelte's `(id)`, Marko's `by=(id => id)`, Lit's
// `repeat(rows, id => id, …)` and the schema core's 200 permanent row objects all use.
// `stage0/keyed`, which reads a named key off each item, is for immutable data re-created per
// render; the ids here are the same numbers throughout, which is what `reconcile` is for.
//
// NO UPDATE CALLBACK, and on this axis that is a fairness setting rather than a saving.
// `reconcile`'s fifth argument runs against every kept row and defaults to `noOpUpdate`. A
// shuffle changes no text at all, and nobody else here rewrites text: Solid's `<For>`, Marko's
// `<for by>`, Lit's `repeat()` and the schema core all move nodes and leave their text alone.
// (This is the same setting `mikado`'s `{ cache: true }` buys it on this axis, arrived at from
// the other direction.)
//
// NOTHING TO FLUSH: `reconcile` writes to the DOM inside the call.
import h from 'stage0';
import reconcile from 'stage0/reconcile';

/** The outside surface of the mounted list — the same two calls Lit's and Marko's have. */
export interface TStage0Reconcile {
    update(input: { rows: readonly number[] }): void;
    destroy(): void;
}

// ONE LINE, NO INDENTATION — see `apps/stage0/stage0.tsx`; this axis diffs markup byte for byte.

/** The `<ul>` the rows live in. */
const listTpl = h`<ul></ul>`;

/**
 * ONE ROW: `<li class="row">#0</li>`, exactly the reference's bytes.
 *
 * `#text` is stage0's TEXT reference marker and it is consumed by the compile step — `collector()`
 * blanks the text node's data while `h` walks the template, before anything is cloned from it — so
 * the `#` that reaches the DOM is the one the create callback writes, as part of `#${id}`. The
 * reference row is one Text node reading `#0`; so is this one.
 */
const rowTpl = h`<li class="row">#text</li>`;

const createRow = (id: number): HTMLElement => {
    const node = rowTpl.cloneNode(true) as HTMLElement;
    const refs = rowTpl.collect(node) as unknown as { readonly text: Text };
    refs.text.nodeValue = `#${id}`;
    return node;
};

export function mountStage0Reconcile(
    input: { rows: readonly number[] },
    host: HTMLElement
): TStage0Reconcile {
    const ul = listTpl.cloneNode(true) as HTMLElement;
    host.appendChild(ul);
    // Stage0 keeps no state about a list, so the caller holds the previous order. That is the
    // library's contract (`renderedValues` is an argument), not an accommodation.
    let rendered: readonly number[] = [];
    const commit = (rows: readonly number[]): void => {
        reconcile(ul, rendered as number[], rows as number[], createRow);
        rendered = rows;
    };
    commit(input.rows);
    return {
        update: (next) => {
            commit(next.rows);
        },
        destroy: () => {
            ul.remove();
            rendered = [];
        },
    };
}
