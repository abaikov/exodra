// AXIS `reactive-update` — UHTML's 1000 spans, the counterpart of
// `participants/lit/reactive.tsx` and
// `marko/MkReactive.marko`. The axis reflects 1000 value changes to the DOM, three times over.
//
// UHTML IS ON THE FINE-GRAINED SIDE, with Solid, voby, sinuous, Mikado's reactive properties and
// the schema core rather than with Svelte, React, Marko and Lit — and unlike Lit, which sits on
// the coarse side because `lit-html` has no reactivity and `@lit-labs/signals` is not installed,
// uhtml ships its own: `signal`, `computed`, `effect`, `untracked` and `batch` are exported from
// the package itself (they are `@webreflection/alien-signals`, a Preact-signals-shaped wrapper
// over alien-signals). A caller can create a thousand of them in plain JS and write them one at a
// time, which is exactly what this axis asks for.
//
// THE GRANULARITY IS A COMPONENT, so each span is one. That is not a flourish — it is where
// uhtml's reactivity actually lives. `createEffect` in `rabbit.js` wraps a component's call in
// `effect()`, so every signal READ during that call subscribes THAT component's effect and a
// write re-runs THAT component alone: one `Component(props)` call, one `Hole` allocated, one
// `getHole` → `Hole.update`, one `.data` write. Around it, `<${Span} v=${sig}/>` leaves no
// element of its own: the `<template>` placeholder the parser produces is REPLACED by the
// component's own DOM (`node.replaceWith(dom(hole))`).
//
// THE ALTERNATIVE WAS TRIED ON PAPER AND REJECTED FOR A REASON WORTH STATING. Interpolating the
// signal OBJECT into a text hole (`<span>${sig}</span>`) is also supported — `update.js` types it
// `COMMENT | SIGNAL` and `comment_signal` reads `.value` — but that read happens while the
// ENCLOSING component is running, so a thousand of them inside one component would subscribe that
// one effect to all thousand signals: any single write would re-run the whole thing and re-commit
// all thousand spans. That would not be a fine-grained participant, it would be the coarse
// program with a thousand extra reads, and it would make this axis's number meaningless. Read off
// `uhtml/src/dom/rabbit.js` and `update.js`, not measured.
//
// WHAT ONE WRITE COSTS, so the number can be attributed rather than guessed: alien-signals'
// `signalOper` stores the value, `propagate`s to the one subscriber and `flush()`es inside the
// call; the effect re-runs `Span(props)`, which allocates one `Hole` for the same cached
// template; `getHole` sees the same `t` and calls `Hole.update`, which walks that hole's ONE
// entry, sees the string changed, and calls `comment_hole` → `getText`, which holds the Text node
// in a WeakMap keyed by the hole's marker and does `node.data = value`. That last write is the
// same one every other fine-grained participant makes; everything above it is what this axis is
// comparing.
//
// NOTHING TO FLUSH: the write propagates and flushes before returning (`signalOper` calls
// `flush()` whenever `batchDepth` is 0). No counterpart to `flushSync`/`tick`/`run` is needed.
import { html, render, signal } from 'uhtml';

/** What uhtml's `signal()` returns. Its own typing is `(...args: any[]) => any`. */
export type TUhtmlSignal<T> = { value: T };
const sig = signal as unknown as <T>(value: T) => TUhtmlSignal<T>;

/** The outside surface of the mounted spans, plus the thousand sources this axis writes. */
export interface TUhtmlReactive {
    /** The thousand signals, in span order — the axis writes these one at a time. */
    readonly values: readonly TUhtmlSignal<string>[];
    destroy(): void;
}

/**
 * ONE SPAN, and the unit of reactivity: its effect is subscribed to its own signal and nothing else.
 *
 * `prettier-ignore` HERE AND ON THE `render` BELOW, and it is not cosmetic. A newline inside a
 * `html` quasi is a TEXT NODE, every axis gates its participants on byte-identical markup, and
 * Prettier's embedded-HTML formatter rewrote precisely this shape across the whole suite once —
 * after which the mount axis refused to run for seventeen hours and nobody noticed, because nobody
 * ran it. `.prettierrc` carries `embeddedLanguageFormatting: "off"` as the first lock; these are the
 * second, so a version bump cannot quietly undo it.
 */
// prettier-ignore
const Span = (props: { v: TUhtmlSignal<string> }): unknown => html`<span>${props.v.value}</span>`;

export function mountUhtmlReactive(
    input: { values: readonly string[] },
    host: HTMLElement
): TUhtmlReactive {
    const sigs = input.values.map((v) => sig(v));
    // prettier-ignore
    render(host, () => html`<div>${sigs.map((s) => html`<${Span} v=${s} />`)}</div>`);
    return {
        values: sigs,
        destroy: () => {
            // Nothing to unwind: a thousand effects subscribed to a thousand signals this mount
            // owns, referenced by nothing else, so the graph is garbage together once the caller
            // drops the container.
        },
    };
}
