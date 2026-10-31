// AXIS `reconcile` — SINUOUS's 200-row keyed list, the counterpart of
// `participants/lit/reconcile.tsx` and
// `marko/MkReconcile.marko`. The axis replaces the whole list with a shuffled order 30 times:
// nothing is added, nothing is removed, every row survives and only the ORDER changes.
//
// WHY SINUOUS IS IN THIS COMPARISON is argued once in `apps/sinuous/sinuous.md`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// ITS RECONCILER IS THE SAME FAMILY AS THE SCHEMA CORE'S, which is what makes the row worth
// having on this axis: `sinuous/map`'s header credits stage0's `reconcile` and Ryan Carniato's
// dom-expressions, and the algorithm is prefix and suffix scans, then a Map from item to new
// index, then `longestPositiveIncreasingSubsequence` and one `insertBefore` per row that is not
// in the kept subsequence. A shuffle skips both scans immediately, so all 30 ops run the general
// case — the same code path the schema core, Solid and Marko run, against Lit's two-ended diff
// and Mikado's one-pass "longest distance".
//
// KEYED BY THE ITEM ITSELF — the row ids, compared with `===` in a `Map`, the same identity
// Solid's `<For>`, React's `key={id}`, Svelte's `(id)`, Marko's `by=(id => id)`, Lit's
// `repeat(rows, id => id, …)` and the schema core's 200 permanent row objects all use.
//
// ONE ROW PER SHUFFLE IS REBUILT RATHER THAN MOVED, and this file states it rather than letting
// the gate soften around it. `map.js` looks a survivor up with
//
//     tmp = I.get(a[i]);
//     if (tmp) { P[tmp] = i; length++ } else { toRemove.push(i) }
//
// so the row whose NEW index is `0` gets `tmp === 0` — falsy — and is treated as not-found: its
// node is removed and a fresh one built. (stage0's `reconcile`, which `map.js` credits as its
// ancestor, guards the same lookup with `I.has(…)`; Sinuous 0.32.1 does not.) A shuffle puts a
// different row at index 0 every time and the prefix scan never consumes it, so exactly one of
// the 200 rows is destroyed and rebuilt per shuffle, on top of the reordering everyone else does.
// It makes this row SLOWER, not faster, and it is left exactly as the library does it — the point
// of the participant is what Sinuous costs. The consequence for the axis is that Sinuous cannot
// meet the "all 200 original nodes survive" bar the other participants are held to; its gate in
// `reconcile.tsx` requires all but one per shuffle to survive, requires every survivor to still
// carry its ORIGINAL text (which is what tells a real reorder from a positional rewrite), and
// prints the count. Read off `sinuous/src/map.js`, not measured.
//
// NOTHING TO FLUSH: the observable's write runs its observers before returning, so each shuffle
// has committed by the time `update()` returns.
import { h } from 'sinuous';
import { observable, root } from 'sinuous/observable';
import { map } from 'sinuous/map';

/** The outside surface of the mounted list — the same two calls Lit's and Marko's have. */
export interface TSinuousReconcile {
    update(input: { rows: readonly number[] }): void;
    destroy(): void;
}

/** See `apps/sinuous/sinuous.tsx`: the shipped `.d.ts` omits the disposer `root()` passes. */
const withRoot = root as unknown as <T>(fn: (dispose: () => void) => T) => T;

type TSinuousObservable<T> = {
    (): T;
    (next: T): T;
};
const o = observable as unknown as <T>(value: T) => TSinuousObservable<T>;

export function mountSinuousReconcile(
    input: { rows: readonly number[] },
    host: HTMLElement
): TSinuousReconcile {
    const rows = o<number[]>(input.rows as number[]);
    let dispose: () => void = () => {};
    const ul = withRoot((d) => {
        dispose = d;
        // `#${id}` is one Text node, exactly the reference's row. The child is a plain string,
        // not a function: the text never changes on this axis, and a function child would be 200
        // subscriptions that could never fire — work no other participant here does.
        return h(
            'ul',
            null,
            map(rows, (id: number) => h('li', { class: 'row' }, `#${id}`))
        ) as HTMLElement;
    });
    host.appendChild(ul);
    return {
        update: (next) => {
            rows(next.rows as number[]);
        },
        destroy: () => {
            dispose();
            ul.remove();
        },
    };
}
