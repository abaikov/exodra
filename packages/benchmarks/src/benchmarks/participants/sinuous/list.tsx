// AXIS `list-update` — SINUOUS's row list, the counterpart of `participants/lit/list.tsx`,
// `svelte/SvList.svelte` and `marko/MkList.marko`, holding the same 300 `{ id, text }` rows every
// other participant on that axis holds.
//
// WHY SINUOUS IS IN THIS COMPARISON — template plus fine-grained reactivity, built element by
// element with no compiler — is argued once in `apps/sinuous/sinuous.md`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHICH SIDE OF THIS AXIS, and it is the DECLARATIVE one — with Solid, Svelte, React, voby, Marko
// and Lit rather than with `exodraOps` and `mikado`.
//
// That is a property of Sinuous and not a placement chosen for it. Its list renderer is
// `sinuous/map`, and `map(items, expr)` subscribes to `items` and reconciles the WHOLE array it
// reads against the whole array it read last time. There is no move/insert/remove entry point on
// it — it returns a `DocumentFragment` and keeps its state in a closure, so there is no handle to
// say "row 0 moved to 150" to. Nothing else in the library owns a list: `h`'s other reactive
// position, a function child, replaces its whole content when it changes.
//
// RECONCILED BY ROW IDENTITY — `map`'s reconciler indexes the new array in a `Map` keyed by the
// ITEMS themselves and compares them with `===`, which is the same row identity every other
// participant on this axis keys by (React `key={r.id}`, Svelte `{#each rows as r (r.id)}`, Marko
// `by="id"`, Lit `repeat(rows, r => r.id, …)`, Solid/voby `<For>` by item identity, and the
// schema core by the `Row` object itself). The `Row` objects are the same ones the axis's ops
// shuffle, so a kept row is recognised without a key.
//
// NO PER-ROW UPDATE. A row's text never changes here — only its POSITION does — so the row body
// is a plain string child rather than a function, and no subscription is created for it. That is
// what makes this row comparable: Solid's `<For>` and Marko's `<for by>` move nodes and leave
// their text alone, and the schema core's row wiring is `set`, not `bind`. A function child would
// have been 300 subscriptions that could never fire.
//
// ONE THING THIS ROW PAYS THAT NO OTHER PARTICIPANT DOES, and it is stated here because nothing
// in the output would reveal it and because it makes Sinuous's number WORSE rather than better.
// `map.js` looks a survivor up with
//
//     tmp = I.get(a[i]);
//     if (tmp) { P[tmp] = i; length++ } else { toRemove.push(i) }
//
// — and a row whose NEW index is `0` gets `tmp === 0`, which is falsy, so it is treated as
// not-found: its node is REMOVED and a fresh one is built in its place. (stage0's `reconcile`,
// which `map.js`'s own header credits as its ancestor, guards the same lookup with `I.has(…)` and
// does not have this.) On this axis it fires on the `move` op — which puts a new item at index 0
// and takes the general path — so one of the 300 rows is rebuilt per round, 20 per measured
// region, on top of the reconcile everyone else runs. It is read off `sinuous/src/map.js` at
// 0.32.1, not measured, and it is left exactly as the library does it: the point of the row is
// what Sinuous costs, not what a patched Sinuous would cost.
//
// NOTHING TO FLUSH: `sinuous/observable` runs its observers synchronously inside the write, so
// each of the 80 ops has committed by the time the commit callback returns.
import { h } from 'sinuous';
import { observable, root } from 'sinuous/observable';
import { map } from 'sinuous/map';

/** The row this axis holds — structurally the `Row` that `list-reconcile.tsx` declares. */
export type TSinuousRow = { id: number; text: string };

/** The outside surface of a mounted Sinuous list — the same two calls Lit's and Marko's have. */
export interface TSinuousList {
    update(input: { rows: readonly TSinuousRow[] }): void;
    destroy(): void;
}

/** See `apps/sinuous/sinuous.tsx`: the shipped `.d.ts` omits the disposer `root()` passes. */
const withRoot = root as unknown as <T>(fn: (dispose: () => void) => T) => T;

type TSinuousObservable<T> = {
    (): T;
    (next: T): T;
};
const o = observable as unknown as <T>(value: T) => TSinuousObservable<T>;

export function mountSinuousList(
    input: { rows: readonly TSinuousRow[] },
    host: HTMLElement
): TSinuousList {
    // The caller's array is taken as it is, not copied: the axis already hands over a fresh
    // `data.slice()` per op, and `map`'s reconciler keeps its own copy of what it rendered
    // (`return b.slice()`), so a defensive copy here would be an allocation no other participant
    // makes. Sinuous's observable does not compare before notifying, so every write reconciles.
    const rows = o<TSinuousRow[]>(input.rows as TSinuousRow[]);
    let dispose: () => void = () => {};
    const ul = withRoot((d) => {
        dispose = d;
        return h(
            'ul',
            null,
            map(rows, (r: TSinuousRow) => h('li', null, r.text))
        ) as HTMLElement;
    });
    host.appendChild(ul);
    return {
        update: (next) => {
            rows(next.rows as TSinuousRow[]);
        },
        destroy: () => {
            dispose();
            ul.remove();
        },
    };
}
