// AXIS `reactive-update` — LIT's 1000 spans, the counterpart of `svelte/SvReactive.svelte` and
// `marko/MkReactive.marko`. The axis reflects 1000 value changes to the DOM, three times over.
//
// WHICH LIT, and WHERE THE FLUSH IS: `lit-html`'s standalone `render()`, which commits
// synchronously inside the call — argued once, with the source it is read from, at the top of
// `list.tsx` beside this file.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────
// LIT IS ON THE COARSE SIDE OF THIS AXIS, with Svelte, React and Marko rather than with Exodra,
// Solid, voby and the schema core. That is a property of Lit, not a handicap chosen for it.
//
// The fine-grained participants hold a THOUSAND SEPARATE SOURCES and write them one at a time,
// each write reaching one DOM position directly. Lit has nothing of that shape for a caller to
// hold. `lit-html` has no reactivity at all — it is a template renderer, and its unit of update
// is a RENDER ROOT: `render(template, container)` owns that container's children and re-runs the
// whole template. Its component layer, `LitElement`, is reactive at the granularity of a
// PROPERTY OF A COMPONENT: a write calls `requestUpdate()` and re-renders that whole component.
// Neither is a signal a caller can create in plain JS, keep a thousand of, and write.
//
// `@lit-labs/signals` WOULD BE the fine-grained answer — `SignalWatcher` plus `watch()` binds a
// signal to a single part and updates that part alone — and IT IS NOT INSTALLED. `node_modules/
// @lit-labs` contains exactly one package, `ssr-dom-shim`, which is a transitive dependency of
// `@lit/reactive-element`, and `packages/benchmarks/package.json` depends on `lit` only. Adding
// it would be adding a package to make one axis read better, which is a different decision from
// adding a participant, and it is not made here. If it is ever installed, the honest move is a
// SECOND Lit row on this axis (`lit` coarse and `litSignals` fine-grained) rather than swapping
// this one out — the coarse number is the one that describes how Lit is written today.
//
// SO THE IDIOMATIC PROGRAM IS SVELTE'S AND REACT'S: hand the root one new array of 1000 values
// and let the list path push the changes down. For Lit that is `render()` with a new array of
// template results.
//
// WHAT THAT COSTS IT, so the number can be attributed rather than guessed. `values.map(…)` is
// committed by `ChildPart`'s ITERABLE path (`_commitIterable`), which keeps one nested
// `ChildPart` per INDEX and reuses them positionally — position is the key, which is exactly
// what React's `key={i}`, Svelte's `{#each values as v, i (i)}` and Marko's index default do on
// this axis. Because the array is the same length every sweep, not one marker is inserted or
// removed: each item part is handed a `TemplateResult` whose prepared `Template` is the one it
// already holds, so `_commitTemplateResult` takes its `this._$committedValue?._$template ===
// template` branch and calls `TemplateInstance._update(values)` — re-binding, not re-cloning and
// not re-walking, because the parts were found by the `TreeWalker` at clone time. What is left
// at the bottom of each of the thousand is the span's own text part, and `_commitText` writes
// `this._$startNode.nextSibling.data = value` when the previously committed value was also a
// primitive. So the final write is `.data` on a Text node — the SAME final write the
// fine-grained participants make. Everything Lit does to get there from one array is what this
// axis is measuring, and the gate below pins the `.data` claim rather than asserting it.
//
// PLAIN `.map()` RATHER THAN `repeat()`, and that is the same judgement `MkReactive.marko` makes
// with its missing `by=`. lit.dev's own guidance is that `repeat` is for when DOM identity
// matters and `map` is cheaper when it does not; here nothing is reordered, every index keeps
// its value slot, and keying by identity would be work no other participant on this axis does.
// The `map` directive from `lit/directives/map.js` is the same program (it is a generator that
// yields `f(value, i)`), so this is `Array.prototype.map` for one fewer indirection and no
// difference in what commits.
//
// ONE LINE, NO INDENTATION — see `list.tsx` beside this file; this axis diffs markup byte for byte.
import { html, nothing, render } from 'lit';

/** The outside surface of the mounted spans — the same two calls Marko's mounted template has. */
export interface TLitReactive {
    update(input: { values: readonly string[] }): void;
    destroy(): void;
}

// prettier-ignore — the markup must stay on one line with no whitespace between tags, because a
// newline inside a `html` quasi is a TEXT NODE and the axis gates every participant on byte-identical
// markup. Prettier's embedded-HTML formatter rewrote exactly this shape across the suite once and
// the mount axis could not run for seventeen hours. `.prettierrc` carries
// `embeddedLanguageFormatting: "off"` as the first lock; this is the second, so a version bump or a
// contributor flipping that flag back cannot silently kill the gate again.
// prettier-ignore
const spansTemplate = (values: readonly string[]) => html`<div>${values.map((v) => html`<span>${v}</span>`)}</div>`;

export function mountLitReactive(
    input: { values: readonly string[] },
    host: HTMLElement
): TLitReactive {
    render(spansTemplate(input.values), host);
    return {
        update: (next) => {
            render(spansTemplate(next.values), host);
        },
        destroy: () => {
            render(nothing, host);
        },
    };
}
