// AXIS `reconcile` — UHTML's 200-row keyed list, the counterpart of
// `participants/lit/reconcile.tsx` and
// `marko/MkReconcile.marko`. The axis replaces the whole list with a shuffled order 30 times:
// nothing is added, nothing is removed, every row survives and only the ORDER changes.
//
// WHY UHTML IS IN THIS COMPARISON is argued once in `apps/uhtml/uhtml.md`, along with why
// the update path here is a component plus a signal rather than a repeated `render()`.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// IT BRINGS A FIFTH RECONCILE STRATEGY TO THIS AXIS, which is the reason the row is worth having.
// The field is already: key→row Map plus longest-increasing-subsequence (the schema core, Solid,
// Marko, stage0 and sinuous), a two-ended diff (Lit's `repeat()`), and a one-pass "longest
// distance" (Mikado). uhtml commits an array of nodes through `udomdiff` (`src/dom/diff.js`),
// which is a two-ended scan with `parentNode.insertBefore`/`replaceChild` fast paths for the
// common head/tail/reverse cases and a `Map` of the future nodes for the scrambled middle — and,
// unlike the LIS strategies, it does NOT compute a minimum move set.
//
// AND IT REACHES THAT DIFF THROUGH A SECOND MECHANISM NOBODY ELSE HERE HAS, which is what the
// number will actually contain. A shuffle re-renders the list template, so `holed()` pairs the
// 200 new holes with the 200 live ones POSITIONALLY; each pair's keys then disagree, and
// `Hole.update` redirects — it looks the incoming key up in the template's `Keyed` map
// (key → WeakRef(node) → hole), updates THAT hole with the new values, and returns its node. So
// every shuffle is 200 keyed lookups producing the future node list, and then udomdiff over it.
// Where Solid or the schema core resolve a survivor by identity and move the minimum, uhtml pays
// a map lookup per row first. That is uhtml's design, stated here rather than left to be guessed
// at from a number.
//
// KEYED BY THE ROW ID via the `key` attribute — the README's own list feature, and the same
// identity Solid's `<For>`, React's `key={id}`, Svelte's `(id)`, Marko's `by=(id => id)`, Lit's
// `repeat(rows, id => id, …)` and the schema core's 200 permanent row objects all use. WITHOUT
// it the redirect never happens and the i-th new row renders into the i-th old row's DOM: not one
// node moves, 200 texts are rewritten, the bytes come out identical and every node survives — a
// much cheaper program that passes everything except the keying check the gate in `reconcile.tsx`
// runs for exactly this reason.
//
// THE `key` ATTRIBUTE DOES NOT REACH THE MARKUP: an interpolated attribute is never written into
// the template uhtml serialises (the parser records its path and name instead), and `key`'s
// commit is skipped entirely (`valueOf` only records `this.k = length`). The one thing this
// participant leaves that the reference does not is the `<!--◦-->` anchor udomdiff inserts before,
// which `markup-gate.ts` strips from both sides.
//
// NOTHING TO FLUSH: alien-signals propagates and flushes inside the write, so each shuffle has
// committed by the time `update()` returns.
import { html, render, signal } from 'uhtml';

/** What uhtml's `signal()` returns. Its own typing is `(...args: any[]) => any`. */
type TUhtmlSignal<T> = { value: T };
const sig = signal as unknown as <T>(value: T) => TUhtmlSignal<T>;

/** The outside surface of the mounted list — the same two calls Lit's and Marko's have. */
export interface TUhtmlReconcile {
    update(input: { rows: readonly number[] }): void;
    destroy(): void;
}

// THE MARKUP IS ONE UNBROKEN LINE — this axis diffs markup byte for byte, so a newline plus
// indentation anywhere in the QUASIS is a whitespace Text node the reference does not have. A line
// may be broken INSIDE a `${…}` and nowhere else; that whitespace is JavaScript's, not markup's.
// `prettier-ignore` is here because a repo-wide `prettier --write` once reflowed the
// embedded HTML in every `html` tagged template in this package; `.prettierrc` now also carries
// `"embeddedLanguageFormatting": "off"`.
//
// `#${id}` renders as TWO nodes — the static Text `#` that lives in the prepared template, and
// the Text node the hole commits — where the reference row has one Text node reading `#0`.
// `innerHTML` serialises adjacent text nodes as adjacent characters, so the two sides are
// byte-identical. It is written this way because it is how the row reads in every other
// participant, not to save a concatenation.
/**
 * A KEY SPACE PER MOUNT, and it is a correctness fix rather than a tuning knob.
 *
 * uhtml scopes `key` to the TAGGED-TEMPLATE CALL SITE, not to the list and not to the render root:
 * the `Keyed` map lives on the template (`uhtml/src/dom/rabbit.js:36,196`) and templates are cached
 * in a module-level `WeakMap` keyed by the `TemplateStringsArray`
 * (`uhtml/src/dom/index.js:46,53-59`). So every instance written from the ONE literal below shares
 * ONE key space. With `key=${id}` and ids 0..N, mounting the same list twice makes the second
 * instance's rows overwrite the first's entries; the first then redirects through the map, is handed
 * the SECOND instance's nodes, and physically steals them out of its `<ul>`. The next diff calls
 * `replaceChild` on a node that is no longer a child and throws `NotFoundError`.
 *
 * That is why this axis could only ever run at `batch 1` — and batch is the instrument for beating
 * Chromium's 100 µs clock, so without this the axis could not be measured tightly at all.
 *
 * WHAT IT COSTS THE PARTICIPANT: one integer addition per row per render, inside the timed region.
 * The alternative — a per-instance `Map<id, token>` — would put a hash lookup per row on uhtml and
 * nobody else, which is a handicap this suite exists to avoid. The keys stay primitives and stay
 * id-derived, so the keying gate ("the node that read #0 at mount still reads #0 after the shuffle")
 * still tests what it tested.
 */
const KEY_SPAN = 1_000_000;
let nextKeyBase = 0;

// prettier-ignore
const Rows = (props: { rows: TUhtmlSignal<readonly number[]>; keyBase: number }): unknown =>
    html`<ul>${props.rows.value.map((id) => html`<li class="row" key=${props.keyBase + id}>#${id}</li>`)}</ul>`;

export function mountUhtmlReconcile(
    input: { rows: readonly number[] },
    host: HTMLElement
): TUhtmlReconcile {
    const rows = sig<readonly number[]>(input.rows);
    // One span per mount, so two live instances of this axis cannot alias each other's rows.
    const keyBase = (nextKeyBase += KEY_SPAN);
    // prettier-ignore
    render(host, () => html`<${Rows} rows=${rows} keyBase=${keyBase} />`);
    return {
        update: (next) => {
            rows.value = next.rows;
        },
        destroy: () => {
            // Nothing to unwind — see `list.tsx` beside this file.
        },
    };
}
