// AXIS `reactive-update` — SINUOUS's 1000 spans, the counterpart of
// `participants/lit/reactive.tsx` and
// `marko/MkReactive.marko`. The axis reflects 1000 value changes to the DOM, three times over.
//
// SINUOUS IS ON THE FINE-GRAINED SIDE, with Solid, voby, Mikado's reactive properties and the
// schema core rather than with Svelte, React, Marko and Lit — and that is the framework rather
// than a choice made for it. `observable()` is a value a caller creates in plain JS and can hold
// a thousand of, and handing one to `h` as a CHILD is what binds it to a position: `h.js` sees a
// function child, appends an empty Text node as an end mark and calls `api.insert` inside
// `api.subscribe`, so the closure re-runs on every write and touches that one position.
//
// WHAT ONE WRITE ACTUALLY COSTS IT, so the number can be attributed rather than guessed:
// `observable`'s setter stores the value, copies its observer Set (`data._runObservers = new
// Set(data._observers)`), marks each observer stale and calls it; the observer is the closure
// `insert` created, which re-runs the computation — `_unsubscribe(update)` first, which walks the
// computation's children and observables and re-links them, then the insert itself. With the
// previous value a string and the new one a string, `insert` takes its string fast path and does
// `(endMark.previousSibling || el.lastChild).data = value` — the SAME final `.data` write the
// other fine-grained participants make. Everything before it is what this axis is comparing. The
// re-subscription per write is Sinuous's design (there is no static dependency graph — a
// computation's dependencies are re-collected each run) and it is the one structural difference
// from Solid and the schema core on this axis.
//
// THE SPAN'S TEXT IS THE OBSERVABLE ITSELF, `h('span', null, sig)`, which is the README's own
// idiom (`h('div', 'Counter ', counter)`). No wrapper closure: an observable IS a function, so
// passing it directly is both the shortest and the least this participant can be charged.
//
// WHAT IT PUTS IN THE DOM THAT THE REFERENCE DOES NOT: one EMPTY TEXT NODE per span, the end mark
// `h` adds before the reactive position. It serialises to nothing in `innerHTML` and it is not an
// element, so it changes neither the byte diff nor the element count, and the value's own Text
// node is the span's `firstChild` — which is what the axis's gate reads when it checks that a
// sweep MUTATED the text node rather than replacing it.
//
// NOTHING TO FLUSH: the observer runs inside the write. No counterpart to `flushSync`/`tick`/`run`
// exists or is needed.
import { h } from 'sinuous';
import { observable, root } from 'sinuous/observable';

/** What Sinuous's `observable()` returns: read with no argument, write with one. */
export type TSinuousObservable<T> = {
    (): T;
    (next: T): T;
};

/** The outside surface of the mounted spans, plus the thousand sources this axis writes. */
export interface TSinuousReactive {
    /** The thousand observables, in span order — the axis writes these one at a time. */
    readonly values: readonly TSinuousObservable<string>[];
    destroy(): void;
}

/** See `apps/sinuous/sinuous.tsx`: the shipped `.d.ts` omits the disposer `root()` passes. */
const withRoot = root as unknown as <T>(fn: (dispose: () => void) => T) => T;

const o = observable as unknown as <T>(value: T) => TSinuousObservable<T>;

export function mountSinuousReactive(
    input: { values: readonly string[] },
    host: HTMLElement
): TSinuousReactive {
    const sigs = input.values.map((v) => o(v));
    let dispose: () => void = () => {};
    const div = withRoot((d) => {
        dispose = d;
        return h(
            'div',
            null,
            sigs.map((s) => h('span', null, s))
        ) as HTMLElement;
    });
    host.appendChild(div);
    return {
        values: sigs,
        destroy: () => {
            dispose();
            div.remove();
        },
    };
}
