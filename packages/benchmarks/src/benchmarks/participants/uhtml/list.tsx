// AXIS `list-update` — UHTML's row list, the counterpart of `participants/lit/list.tsx`,
// `svelte/SvList.svelte` and `marko/MkList.marko`, holding the same 300 `{ id, text }` rows every
// other participant on that axis holds.
//
// WHY UHTML IS IN THIS COMPARISON — the `parts` model in its lightest form, reaching each hole by
// a recorded PATH rather than by re-walking the clone — is argued once at the top of
// `apps/uhtml/uhtml.md`, along with why the update path here is a component plus a signal rather
// than a repeated `render()`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// WHICH SIDE OF THIS AXIS, and it is the DECLARATIVE one — with Solid, Svelte, React, voby, Marko
// and Lit rather than with `exodraOps` and `mikado`.
//
// That is a property of uhtml. An array in a hole is committed by `udomdiff` (`src/dom/diff.js`,
// WebReflection's own list differ), which takes the WHOLE previous node list and the whole new
// one; there is no move/insert/remove entry point anywhere in the library, and no handle on a
// rendered row to say "row 0 moved to 150" to. The pieces udomdiff is written out of are not
// exported either — `diff.js` is internal, and what a caller gets is `render`, `html`, `svg`,
// `unsafe`, the signal utilities, `Hole` and `fragment`.
//
// KEYED BY `r.id`, through uhtml's `key` attribute — the README's own list feature ("`key`
// attribute to ensure *same DOM node* within a list of nodes"), and the same row identity every
// other participant on this axis keys by. WHAT IT DOES, so the number can be attributed: a `key`
// hole is consumed by the template (`update.js` returns a `KEY` entry whose commit is skipped, so
// nothing reaches the DOM) and the materialised hole is registered in a per-template `Keyed` map
// of key → WeakRef(node) → hole. On a re-render, `holed()` pairs the new holes with the old ones
// POSITIONALLY, and `Hole.update` notices its key no longer matches and redirects: it looks the
// incoming key up in that map and updates the hole that owns it, returning ITS node. udomdiff
// then moves the nodes into the order the returned node list gives.
//
// WITHOUT the key that redirect never happens: the i-th new row would be rendered into the i-th
// old row's DOM, which survives these ops by leaving every node where it is and rewriting its
// text. That passes both halves of the axis's gate — right final order, every node kept — while
// being a materially cheaper program than the keyed reconcile everyone else runs, so
// `list-reconcile.tsx` asserts the keying directly for this participant, exactly as it does for
// Lit, Marko and Mikado.
//
// NOTHING TO FLUSH: alien-signals propagates and flushes inside the write, so each of the 80 ops
// has committed by the time the commit callback returns.
import { html, render, signal } from 'uhtml';

/** The row this axis holds — structurally the `Row` that `list-reconcile.tsx` declares. */
export type TUhtmlRow = { id: number; text: string };

/** What uhtml's `signal()` returns. Its own typing is `(...args: any[]) => any`. */
type TUhtmlSignal<T> = { value: T };
const sig = signal as unknown as <T>(value: T) => TUhtmlSignal<T>;

/** The outside surface of a mounted uhtml list — the same two calls Lit's and Marko's have. */
export interface TUhtmlList {
    update(input: { rows: readonly TUhtmlRow[] }): void;
    destroy(): void;
}

// THE MARKUP IS ONE UNBROKEN LINE — a tagged template keeps every byte it is given (uhtml only
// trims the ends), and this axis reads the rendered rows back, so a whitespace Text node between
// `<ul>` and its rows is a node no other participant has.
//
// A line may be broken INSIDE a `${…}` and nowhere else — that whitespace is JavaScript's, not
// markup's. `prettier-ignore` is here because a repo-wide `prettier --write` once
// reflowed the embedded HTML in every `html` tagged template in this package; `.prettierrc` now
// also carries `"embeddedLanguageFormatting": "off"`.
/**
 * A KEY SPACE PER MOUNT — the same correctness fix as `reconcile.tsx` beside this file, and for the
 * same reason: uhtml scopes `key` to the TAGGED-TEMPLATE CALL SITE, not to the list, so every
 * instance written from the one literal below shares one key space. Two live instances with
 * overlapping ids alias to the same DOM nodes, the later one steals them out of the earlier one's
 * `<ul>`, and the next diff throws `NotFoundError` from `replaceChild`. That is why this axis could
 * only run at `batch 1`, and batch is the instrument for beating Chromium's 100 µs clock.
 *
 * Cost to the participant: one integer addition per row per render. A per-instance `Map` would put
 * a hash lookup on uhtml that no other participant pays, which is the handicap this suite exists to
 * avoid.
 */
const KEY_SPAN = 10_000_000;
let nextKeyBase = 0;

// prettier-ignore
const List = (props: { rows: TUhtmlSignal<readonly TUhtmlRow[]>; keyBase: number }): unknown =>
    html`<ul>${props.rows.value.map((r) => html`<li key=${props.keyBase + r.id}>${r.text}</li>`)}</ul>`;

export function mountUhtmlList(
    input: { rows: readonly TUhtmlRow[] },
    host: HTMLElement
): TUhtmlList {
    const rows = sig<readonly TUhtmlRow[]>(input.rows);
    // ONE render call for the life of the list; every later op goes through the component's
    // effect. See `apps/uhtml/uhtml.md` for why this is not a repeated `render()`.
    const keyBase = (nextKeyBase += KEY_SPAN);
    // prettier-ignore
    render(host, () => html`<${List} rows=${rows} keyBase=${keyBase} />`);
    return {
        update: (next) => {
            // A new array every time — the axis hands one over per op — so alien-signals'
            // identity check (`this.value !== (this.value = value)`) always lets the write
            // through.
            rows.value = next.rows;
        },
        destroy: () => {
            // Nothing to unwind: the component's effect is subscribed to a signal this mount
            // owns, uhtml's own registry is a WeakMap keyed by the host, and the `Keyed` map
            // holds WeakRefs. It all dies with the container the caller removes.
        },
    };
}
