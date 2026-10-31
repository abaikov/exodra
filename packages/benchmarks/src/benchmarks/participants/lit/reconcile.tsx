// AXIS `reconcile` — LIT's 200-row keyed list, the counterpart of `svelte/SvReconcile.svelte`
// and `marko/MkReconcile.marko`. The axis replaces the whole list with a shuffled order 30
// times: nothing is added, nothing is removed, every row survives and only the ORDER changes.
//
// WHICH LIT, and WHERE THE FLUSH IS: `lit-html`'s standalone `render()`, which commits
// synchronously inside the call — the argument and the source it is read from are written out
// once, at the top of `list.tsx` beside this file, rather than repeated in all four files.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// `repeat()` WITH A KEY FUNCTION, AND WHY THE DEFAULT WOULD HAVE BEEN A DIFFERENT BENCHMARK.
//
// Lit has two ways to render a list and lit.dev is explicit that they are not the same tool:
//
//   * `items.map(…)` (or the `map` directive, which is the same thing as a generator) commits
//     through `ChildPart`'s iterable path, which keeps one nested `ChildPart` per INDEX and
//     reuses them positionally. Handed a shuffled array it would move nothing at all and rewrite
//     200 texts instead. That is a materially cheaper program than the one every other
//     participant on this axis runs, and — this is the part that matters — it would PASS both
//     halves of the gate below: the bytes are identical either way, and every node survives.
//   * `repeat(items, keyFn, template)` is the keyed one. Given a key function it reconciles the
//     new keys against the old and MOVES the existing DOM.
//
// So `repeat()` with the row's identity as the key is what belongs here, and it is the same key
// every other participant uses: Solid's `<For>` keys by item identity and the items ARE the ids,
// React is `key={id}`, Svelte is `{#each rows as id (id)}`, Marko is `by=(id => id)`, and the
// schema core is handed the 200 permanent row objects and recognises a survivor with `===`.
//
// WHAT `repeat()` ACTUALLY DOES, so this axis's number can be attributed rather than guessed.
// `repeat.js`'s `update()` is a two-ended diff — its own comment credits ivi, Vue and snabbdom:
// head and tail pointers into the old parts and the new values, matching and updating in place
// while either end agrees, then falling back to lazily-built key→index Maps for the scrambled
// middle, moving parts with `insertPart` and dropping leftovers with `removePart`. That is a
// DIFFERENT algorithm from the one the schema core, Solid and Marko run (key→row Map, then move
// the minimum by keeping the longest increasing subsequence of old positions in place): a
// two-ended diff does not compute a minimum move set, so on a scramble it can move more nodes
// than LIS would. Which is exactly the kind of difference this axis exists to price, and the
// reason Lit belongs on it rather than the reason to leave it off.
//
// ONE LINE, NO INDENTATION — see `list.tsx` beside this file; this axis diffs markup byte for byte
// and a template literal keeps every byte it is given.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// THE MARKUP GATE WAS NOT WIDENED FOR THIS PARTICIPANT, and here is what it has to forgive.
//
// Lit marks every dynamic position in the DOM with a COMMENT: `<!--?lit$<n>$-->` where a part
// was prepared (`getTemplateHtml` writes `<?lit$<n>$>` into the html string and the parser turns
// it into a comment node, which `Template`'s walk records as the part's start node) and `<!---->`
// — `createComment('')` — for the boundaries `insertPart` puts around each item of a list. So a
// Lit tree carries dozens of comments the reference does not have.
//
// `markup-gate.ts` has stripped comments from BOTH sides since it was written, and not for Lit's
// benefit: Exodra marks a fragment's position with an empty comment anchor and the schema core
// marks it with nothing at all. Nothing in this row emits a comment of its own, so the strip
// cannot hide a real divergence, and the element count is printed beside every result precisely
// because a comment strip cannot cover an element.
//
// NOTHING ELSE IS STRIPPED, and nothing else needs to be. Lit's binding markers do not survive
// into the cloned DOM as attributes: an attribute binding is written into the prepared html as
// `name$lit$="lit$<n>$"`, and the `Template` constructor removes it from the template element
// (`node.removeAttribute(name)` in the walk) before anything is ever cloned from it. The one
// attribute in this row, `class="row"`, is static and sits in the template as itself.
import { html, nothing, render } from 'lit';
import { repeat } from 'lit/directives/repeat.js';

/** The outside surface of the mounted list — the same two calls Marko's mounted template has. */
export interface TLitReconcile {
    update(input: { rows: readonly number[] }): void;
    destroy(): void;
}

// THE MARKUP IS ONE UNBROKEN LINE, and a line may be broken INSIDE a `${…}` and nowhere else —
// that whitespace is JavaScript's, not markup's. `prettier-ignore` is here because a repo-wide
// `prettier --write` once reflowed the embedded HTML in every `html` tagged template in
// this package; `.prettierrc` now also carries `"embeddedLanguageFormatting": "off"`.
// prettier-ignore
const rowsTemplate = (rows: readonly number[]) =>
    html`<ul>${repeat(rows, (id) => id, (id) => html`<li class="row">#${id}</li>`)}</ul>`;

/**
 * `#${id}` renders as TWO nodes — the static Text `#` that lives in the prepared template, and
 * the Text node the child part commits — where the reference row has one Text node reading
 * `#0`. `innerHTML` serialises adjacent text nodes as adjacent characters, so the two sides are
 * byte-identical once the part's comment marker between them is stripped. It is written this way
 * because it is how the row reads in every other participant (`#${id}` in Marko, `` `#${id}` ``
 * in Solid, `#{id}` in Svelte) and not to save a concatenation.
 */
export function mountLitReconcile(
    input: { rows: readonly number[] },
    host: HTMLElement
): TLitReconcile {
    render(rowsTemplate(input.rows), host);
    return {
        update: (next) => {
            render(rowsTemplate(next.rows), host);
        },
        destroy: () => {
            render(nothing, host);
        },
    };
}
