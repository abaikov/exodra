// AXIS `toggle` — STAGE0's shown-or-hidden panel LIST, the counterpart of
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
// WHY STAGE0 IS HERE, and why its row is a CEILING rather than a competitor's, is argued once at
// in `apps/stage0/stage0.md`. On THIS axis the ceiling is the most literal it gets anywhere in
// the suite: a show is N × (`panelTpl.cloneNode(true)`, one `collect`, one text write, one
// property write for the listener, one insertion); a hide is N × `remove()`. Every other
// participant's number is that program plus whatever its list block costs to express.
//
// `reconcile` IS STAGE0'S ONLY LIST API AND IT IS WHAT IS USED HERE — the same call
// `list.tsx` beside this file makes, with the panel as the row. Handed `[]` it removes every
// rendered node; handed N rows against an empty list it creates every one of them. There is no lighter path in
// the library and no move/insert/remove entry point to reach for, so this is both the idiomatic
// and the only program.
//
// NOTHING IS KEPT ACROSS THE HIDDEN STATE, which is what makes this comparable to the others.
// The removed nodes are dropped on the floor and the next show clones the prototype again — the
// same contract as Solid's `<For>` over an empty array, React's, Svelte's `{#each}`, Marko's
// `<for>`, Lit's, uhtml's and the schema core's — and NOT the contract of the axis's caching
// diagnostics (`exodraKept`, `mikadoPooled`). Parking the removed nodes in an array and
// re-appending them would be trivial here — more trivial than anywhere else, since stage0 has no
// lifecycle to unwind — which is exactly why it is stated rather than left to the reader, and why
// `toggle.tsx` asserts a NEW element after every hide+show rather than trusting this paragraph.
//
// THE BUTTON KEEPS ITS LISTENER, for the reason `participants/lit/toggle.tsx` and
// `MkToggle.marko` give: it
// does nothing, exactly as `noop` does nothing for Solid, React, Lit and the schema core's event
// port, but ATTACHING it is part of what a rebuild costs and dropping it would make this the one
// panel here that is cheaper to build. It is `.onclick =`, the README's own idiom, and not
// `stage0/syntheticEvents` — delegation would attach nothing per rebuild, which is a genuine
// advantage and belongs beside Mikado's row where it is priced, not hidden inside the ceiling.
// Neither form leaves anything in the markup.
//
// THE PANEL'S TEXT COMES FROM THE ROW, because every show on this axis carries DIFFERENT data —
// the two caching diagnostics would otherwise be re-attaching nodes that already read correctly,
// which is not what a pool buys anybody in a real tab switch. `#text` is a TEXT reference:
// `collector()` only recognises a text node whose data starts with `#`, and it blanks that data,
// so the clone carries one empty Text node the create callback fills.
//
// `noop` IS A MODULE CONSTANT, so the same function identity is attached on every show — the same
// treatment `toggle.tsx` gives every other participant.
//
// NOTHING TO FLUSH: the DOM is written inside `update()`. Stage0 has no queue.
import h from 'stage0';
import reconcile from 'stage0/reconcile';

const noop = (): void => {};

/** The row this axis holds — structurally the row `toggle.tsx` declares. */
export type TStage0ToggleRow = { id: number; text: string };

/** The outside surface of the mounted toggle — the same two calls Lit's and Marko's have. */
export interface TStage0Toggle {
    update(input: { rows: readonly TStage0ToggleRow[] }): void;
    destroy(): void;
}

// ONE LINE, NO INDENTATION — see `apps/stage0/stage0.tsx`; this axis diffs markup byte for byte,
// in four states, twice round.

/** The host the panels go into — the `<div>` the reference's host component renders. */
const hostTpl = h`<div></div>`;

/** The same four elements every participant on this axis builds and tears down, N times over. */
const panelTpl = h`<div class="panel"><h4>Panel</h4><p>#text</p><button #close>x</button></div>`;

/** Build one panel — `reconcile`'s create callback, and the only place a panel is built. */
const createPanel = (row: TStage0ToggleRow): HTMLElement => {
    const node = panelTpl.cloneNode(true) as HTMLElement;
    const refs = panelTpl.collect(node) as unknown as {
        readonly text: Text;
        readonly close: HTMLElement;
    };
    refs.text.nodeValue = row.text;
    refs.close.onclick = noop;
    return node;
};

export function mountStage0Toggle(
    input: { rows: readonly TStage0ToggleRow[] },
    host: HTMLElement
): TStage0Toggle {
    const root = hostTpl.cloneNode(true) as HTMLElement;
    host.appendChild(root);
    // What the DOM currently reads — `reconcile`'s `renderedValues`. Stage0 keeps no state of its
    // own about a list, so the caller holds the previous array; that is the library's contract,
    // not an accommodation made for this benchmark.
    let rendered: readonly TStage0ToggleRow[] = [];
    const commit = (rows: readonly TStage0ToggleRow[]): void => {
        reconcile(root, rendered as TStage0ToggleRow[], rows as TStage0ToggleRow[], createPanel);
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
            root.remove();
            rendered = [];
        },
    };
}
