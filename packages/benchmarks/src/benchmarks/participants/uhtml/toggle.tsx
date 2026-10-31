// AXIS `toggle` — UHTML's shown-or-hidden panel LIST, the counterpart of
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
// WHY UHTML IS IN THIS COMPARISON is argued once in `apps/uhtml/uhtml.md`, along with why
// the update path here is a component plus a signal rather than a repeated `render()`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// AN ARRAY IN A HOLE IS BOTH THE LIST AND THE CONDITIONAL, and that is uhtml's shape rather than
// a choice made for it. A hole is typed at PARSE time from the first value it sees: an array
// becomes `COMMENT | ARRAY` and commits through `udomdiff`, anything else becomes a plain
// `COMMENT` hole that expects the same KIND of value every time — handing one a template result
// on one render and a string on the next is the case `Hole.update` guards with
// `errors.invalid_interpolation` in debug mode. So the hidden state is `[]` and the shown state is
// an array of N panels, through the same hole.
//
// AND IT DESTROYS AND REBUILDS, like everything else this axis compares. `[]` makes udomdiff
// remove every panel node outright (nothing is retained — the `Hole`s that owned them are dropped
// with the array), and the next show is N FRESH `Hole`s, each of whose `valueOf()` does
// `document.importNode(fragment, true)`, replays the recorded paths to its holes and inserts the
// result. That is the same contract as Solid, React, Svelte, Marko, Lit, stage0, sinuous and the
// schema core here — and NOT the contract of this axis's caching diagnostics (`exodraKept`,
// `mikadoPooled`).
//
// NO `key` ON THE PANEL, and that is a decision rather than an omission. uhtml's `key` attribute
// exists so a re-render can REDIRECT a hole to the live node that already carries that key —
// `Hole.update` looks the incoming key up in a per-template `Keyed` map of key → WeakRef(node) →
// hole. On this axis nothing is ever live to redirect to: every show is preceded by a hide that
// emptied the array, so there is no survivor, and a key could only add a map write per panel per
// show. The list axes (`list.tsx`, `reconcile.tsx` beside this file) key for the opposite reason —
// there every row survives and the key is the whole mechanism. Positional pairing is correct here
// and `toggle.tsx`'s gate asserts the consequence directly: the panel nodes after a hide+show must
// be NEW elements.
//
// THE PREPARED TEMPLATE IS NOT RE-PARSED PER SHOW, and it would be a different (much worse)
// measurement if it were: `create()` caches the parsed template in a `WeakMap` keyed by the
// tagged literal's `strings` array, and a tagged template literal's strings array is the same
// object every time control passes that call site. So every show re-`importNode`s one cached
// fragment N times. That is the same arrangement Marko, Lit, stage0 and the schema core get.
//
// THE BUTTON KEEPS ITS LISTENER, for the reason `participants/lit/toggle.tsx` and
// `MkToggle.marko` give: it
// does nothing, exactly as `noop` does nothing for Solid, React, Lit and the schema core's event
// port, but ATTACHING it is part of what a rebuild costs. `@click=${noop}` is uhtml's generic
// event form (`addEventListener`), and an interpolated attribute never reaches the markup.
//
// `noop` IS A MODULE CONSTANT — the same treatment `toggle.tsx` gives every other participant.
//
// WHAT IS LEFT IN THE DOM THAT THE REFERENCE DOES NOT HAVE: the `<!--◦-->` anchor udomdiff
// inserts before, in both states. `markup-gate.ts` strips comments from both sides.
//
// NOTHING TO FLUSH: alien-signals propagates and flushes inside the write, so a transition has
// committed by the time `update()` returns.
import { html, render, signal } from 'uhtml';

const noop = (): void => {};

/** The row this axis holds — structurally the row `toggle.tsx` declares. */
export type TUhtmlToggleRow = { id: number; text: string };

/** What uhtml's `signal()` returns. Its own typing is `(...args: any[]) => any`. */
type TUhtmlSignal<T> = { value: T };
const sig = signal as unknown as <T>(value: T) => TUhtmlSignal<T>;

/** The outside surface of the mounted toggle — the same two calls Lit's and Marko's have. */
export interface TUhtmlToggle {
    update(input: { rows: readonly TUhtmlToggleRow[] }): void;
    destroy(): void;
}

// THE MARKUP IS ONE UNBROKEN LINE — this axis diffs markup byte for byte, in four states, twice
// round, and the HIDDEN state is the whole tree, so one newline inside the outer `<div>` is the
// difference between `<div></div>` and `<div>\n    \n</div>`.
//
// A LINE MAY BE BROKEN INSIDE A `${…}` AND NOWHERE ELSE — that whitespace is JavaScript's, not
// markup's. `.prettierrc` has `"embeddedLanguageFormatting": "off"` and the template carries
// `prettier-ignore`, because a repo-wide `prettier --write` once reflowed exactly this
// template and killed this axis.
// prettier-ignore
const Toggle = (props: { rows: TUhtmlSignal<readonly TUhtmlToggleRow[]> }): unknown =>
    html`<div>${props.rows.value.map(
        (r) =>
            html`<div class="panel"><h4>Panel</h4><p>${r.text}</p><button @click=${noop}>x</button></div>`
    )}</div>`;

export function mountUhtmlToggle(
    input: { rows: readonly TUhtmlToggleRow[] },
    host: HTMLElement
): TUhtmlToggle {
    const rows = sig<readonly TUhtmlToggleRow[]>(input.rows);
    // ONE render call for the life of the mount; every later transition goes through the
    // component's effect. See `apps/uhtml/uhtml.md` for why this is not a repeated `render()`.
    render(host, () => html`<${Toggle} rows=${rows} />`);
    return {
        update: (next) => {
            // A different array every time — the axis alternates between an empty one and two
            // generations of panels — so alien-signals' identity check
            // (`this.value !== (this.value = value)`) always lets the write through.
            rows.value = next.rows;
        },
        destroy: () => {
            // Nothing to unwind — see `list.tsx` beside this file.
        },
    };
}
