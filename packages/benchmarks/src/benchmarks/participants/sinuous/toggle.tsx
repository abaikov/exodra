// AXIS `toggle` — SINUOUS's shown-or-hidden panel LIST, the counterpart of
// `participants/lit/toggle.tsx`,
// `svelte/SvToggle.svelte` and `marko/MkToggle.marko`. The axis tears a block of panels out of the
// document and builds it again with different data, over and over — a tab switch, a route change,
// a page of a paginated table, a "show more"/"show less".
//
// IT USED TO BE ONE PANEL AND NOW IT IS A LIST OF THEM, for one reason: at one panel the whole
// axis measured 0.100 ms for every participant and 0.000 for its two caching diagnostics, which
// is the browser's timer clamp and not a result. The scenario did not change — build a subtree,
// throw it away, build it again — only its size did. See `toggle.tsx` for the arithmetic.
//
// A FUNCTION CHILD IS SINUOUS'S SHOW/HIDE, and it is still what this file uses. There is no
// `<Show>`, no `{#if}` and no directive: `h.js` sees a function child, appends an empty Text node
// as an end mark, and calls `api.insert` inside `api.subscribe`, so the closure re-runs on every
// write to an observable it read. Returning a new value removes everything between the current
// start and the end mark (`api.rm`) and adds what came back; returning `null` removes and adds
// nothing. An ARRAY of nodes is a supported return — `castNode` wraps a non-Node in
// `api.h([], value)`, i.e. a `DocumentFragment`, and `frag()` marks its start when it holds two
// or more children — so "N panels or nothing" is one closure and one mechanism.
//
// `sinuous/map` IS DELIBERATELY NOT USED HERE, and the reason is the scenario rather than a
// preference. `map` exists to RECONCILE a list against the one it rendered last time; on this
// axis every show is preceded by a hide that emptied the list, so there is never a survivor to
// find and its reconcile would be handed an empty old array every time. The function child is
// what a Sinuous author writes to show or hide a block, and it is what the list axes' sibling
// file (`list.tsx` beside this one, which does use `map`) exists to measure the other way round.
//
// SO IT DESTROYS AND REBUILDS, exactly like the others this axis compares. Nothing is kept across
// the hidden state: `h(…)` is called afresh inside the closure on every show, which means four
// `document.createElement` calls, three `insertBefore`s and one `addEventListener` PER PANEL. That
// is the same contract as Solid, React, Svelte, Marko, Lit, stage0, uhtml and the schema core here
// — and NOT the contract of this axis's caching diagnostics (`exodraKept`, `mikadoPooled`), which
// is worth saying out loud because keeping the nodes in a variable and returning the same ones
// would be a two-line change here. `toggle.tsx`'s gate asserts the consequence rather than
// trusting this paragraph: the panel nodes after a hide+show must be NEW elements.
//
// AND IT IS WHERE SINUOUS DIFFERS MOST FROM THE REST OF THE FIELD ON THIS AXIS: everyone else
// rebuilds from a prepared prototype (the schema core, Marko, stage0 and uhtml clone one, Lit
// clones one and re-walks it), while Sinuous has no prototype at all and builds every element one
// call at a time. This axis is the cleanest place in the suite to read what that costs, and at N
// panels per show it is finally above the timer's resolution.
//
// THE BUTTON KEEPS ITS LISTENER, for the reason `participants/lit/toggle.tsx` and
// `MkToggle.marko` give: it
// does nothing, exactly as `noop` does nothing for Solid, React, Lit and the schema core's event
// port, but ATTACHING it is part of what a rebuild costs. Sinuous's `property()` routes an `on…`
// prop through `addEventListener` with a shared `eventProxy` and keeps the handler in
// `el._listeners` — an expando, so nothing reaches the markup.
//
// `noop` IS A MODULE CONSTANT, so the same identity is attached on every show — the same
// treatment `toggle.tsx` gives every other participant.
//
// NOTHING TO FLUSH: the observer runs inside the write, so a transition has committed by the time
// `update()` returns.
import { h } from 'sinuous';
import { observable, root } from 'sinuous/observable';

const noop = (): void => {};

/** The row this axis holds — structurally the row `toggle.tsx` declares. */
export type TSinuousToggleRow = { id: number; text: string };

/** The outside surface of the mounted toggle — the same two calls Lit's and Marko's have. */
export interface TSinuousToggle {
    update(input: { rows: readonly TSinuousToggleRow[] }): void;
    destroy(): void;
}

/** See `apps/sinuous/sinuous.tsx`: the shipped `.d.ts` omits the disposer `root()` passes. */
const withRoot = root as unknown as <T>(fn: (dispose: () => void) => T) => T;

type TSinuousObservable<T> = {
    (): T;
    (next: T): T;
};
const o = observable as unknown as <T>(value: T) => TSinuousObservable<T>;

export function mountSinuousToggle(
    input: { rows: readonly TSinuousToggleRow[] },
    host: HTMLElement
): TSinuousToggle {
    const rows = o<readonly TSinuousToggleRow[]>(input.rows);
    let dispose: () => void = () => {};
    const view = withRoot((d) => {
        dispose = d;
        return h('div', null, () => {
            const list = rows();
            // `null`, NOT `[]`, for the hidden state. An empty array would be cast to an EMPTY
            // `DocumentFragment` and kept as `current`, and the next transition would try to
            // remove a range starting at a fragment that holds nothing; `null` is the value
            // `insert` has a branch for ("removes and adds nothing"), and it is what this
            // participant's hidden state has always been on this axis.
            if (list.length === 0) return null;
            const out: HTMLElement[] = [];
            for (let i = 0; i < list.length; i++) {
                out.push(
                    h(
                        'div',
                        { class: 'panel' },
                        h('h4', null, 'Panel'),
                        h('p', null, list[i].text),
                        h('button', { onclick: noop }, 'x')
                    ) as HTMLElement
                );
            }
            return out;
        }) as HTMLElement;
    });
    host.appendChild(view);
    return {
        update: (next) => {
            // Sinuous's observable does not compare before notifying, so every write re-runs the
            // closure — which is what this axis wants: the array is a different one every time.
            rows(next.rows);
        },
        destroy: () => {
            dispose();
            view.remove();
        },
    };
}
