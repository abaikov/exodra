// AXIS `toggle` — LIT's shown-or-hidden panel LIST, the counterpart of `svelte/SvToggle.svelte`
// and `marko/MkToggle.marko`. The axis tears a block of panels out of the document and builds it
// again with different data, over and over — a tab switch, a route change, a page of a paginated
// table, a "show more"/"show less".
//
// IT USED TO BE ONE PANEL AND NOW IT IS A LIST OF THEM, for one reason: at one panel the whole
// axis measured 0.100 ms for every participant and 0.000 for its two caching diagnostics, which
// is the browser's timer clamp and not a result. The scenario did not change — build a subtree,
// throw it away, build it again — only its size did. See `toggle.tsx` for the arithmetic.
//
// WHICH LIT, and WHERE THE FLUSH IS: `lit-html`'s standalone `render()`, which commits
// synchronously inside the call — argued once, with the source it is read from, at the top of
// `list.tsx` beside this file.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// `${rows.map(…)}` IS THE MECHANISM, and the empty array is the hidden state. Lit's default list
// commits through `ChildPart._commitIterable`, which keeps one nested `ChildPart` per position:
// handed an empty iterable it clears them all — `_$clear()` walks from a part's start marker to
// its end marker removing every node between — and handed N panels against an empty list it
// creates N fresh nested parts, clones the prepared `<template>` N times and re-walks each clone
// with a `TreeWalker` to attach its parts.
//
// `repeat()` IS DELIBERATELY NOT USED, and the reason is the scenario rather than a preference.
// `repeat`'s key function exists so a re-render can find the node that already carries a key and
// MOVE it; on this axis every show is preceded by a hide that emptied the list, so there is never
// a survivor to find and the key maps could only be built and thrown away. The list axes
// (`list.tsx`, `reconcile.tsx` beside this file) use `repeat()` for the opposite reason — there
// every row survives and the keying is what is being measured. `toggle.tsx`'s gate asserts the
// consequence directly: the panel nodes after a hide+show must be NEW elements.
//
// SO EVERY SHOW IS A FULL REBUILD, the same thing Solid, React, Svelte, Marko, stage0, uhtml,
// sinuous and the schema core are each paying for here. What differs is HOW: the schema core
// rebuilds with one `cloneNode(true)` of a prepared four-node prototype plus one `insertBefore`
// per panel, Marko rebuilds from a cloned prototype too, stage0 clones and reads its collected
// references — and Lit clones a prepared `<template>` AND THEN WALKS THE CLONE to find the
// dynamic positions in it. Lit is the honest control for exactly that walk, which is why it
// belongs on this axis and not only on the app ones.
//
// THE PREPARED TEMPLATE IS NOT RE-PARSED PER SHOW, and it would be a different (much worse)
// measurement if it were. `_$getTemplate` caches the prepared `Template` in a module-level
// `templateCache` keyed by the tagged literal's `strings` array, and a tagged template literal's
// strings array is the same object every time control passes that call site. The nested `html`
// for the panel sits at a fixed call site inside `toggleTemplate`, so every panel of every show
// reuses one prepared template and only re-clones it. That is the same arrangement Marko, stage0,
// uhtml and the schema core get, which is what makes the comparison a fair one.
//
// `cache()` IS DELIBERATELY NOT USED EITHER. `lit/directives/cache.js` keeps the DOM of the
// branch you switched away from in a `DocumentFragment` and puts it back, which would make this
// participant the analogue of `exodraKept` — a diagnostic that must never be quoted against the
// competing rows. If a `litCached` row is ever wanted, it belongs beside `exodraKept` and
// `mikadoPooled` with the same warning.
//
// THE BUTTON KEEPS ITS LISTENER, for the reason `MkToggle.marko` gives: it does nothing, exactly
// as `noop` does nothing for Solid, React and the schema core's event port, but ATTACHING it is
// part of what a rebuild costs and dropping it would make this the one participant whose panel is
// cheaper to build. `@click` emits no attribute — the `Template` constructor removes the
// binding's marker attribute from the template element (`node.removeAttribute(name)` in its walk)
// before anything is cloned from it — so it cannot show up in the markup diff.
//
// `noop` IS A MODULE CONSTANT, so the same function identity is handed to every event part on
// every show. That is not a micro-optimisation dressed up: `toggle.tsx` hands its other
// participants the same module-level `noop`, so a fresh closure per panel would be this
// participant allocating something none of the others allocate.
//
// THE MARKUP IS ONE UNBROKEN LINE — see `list.tsx` beside this file; this axis diffs markup byte
// for byte, in four states, twice round, and the HIDDEN state is the whole tree, so a single
// newline inside the outer `<div>` is the difference between `<div></div>` and
// `<div>\n    \n</div>`.
//
// A LINE MAY BE BROKEN INSIDE A `${…}` AND NOWHERE ELSE — that whitespace is JavaScript's, not
// markup's. `.prettierrc` has `"embeddedLanguageFormatting": "off"` and the template below carries
// `prettier-ignore`, because a repo-wide `prettier --write` once reflowed exactly this
// template and killed this axis for seventeen hours.
import { html, nothing, render } from 'lit';

const noop = (): void => {};

/** The row this axis holds — structurally the row `toggle.tsx` declares. */
export type TLitToggleRow = { id: number; text: string };

/** The outside surface of the mounted toggle — the same two calls Marko's mounted template has. */
export interface TLitToggle {
    update(input: { rows: readonly TLitToggleRow[] }): void;
    destroy(): void;
}

// prettier-ignore
const toggleTemplate = (rows: readonly TLitToggleRow[]) =>
    html`<div>${rows.map(
        (r) =>
            html`<div class="panel"><h4>Panel</h4><p>${r.text}</p><button @click=${noop}>x</button></div>`
    )}</div>`;

export function mountLitToggle(
    input: { rows: readonly TLitToggleRow[] },
    host: HTMLElement
): TLitToggle {
    render(toggleTemplate(input.rows), host);
    return {
        update: (next) => {
            render(toggleTemplate(next.rows), host);
        },
        destroy: () => {
            render(nothing, host);
        },
    };
}
