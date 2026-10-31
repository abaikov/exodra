---
slug: three-attributes-architecture
title: Three Attributes Architecture - Maximum Performance Without Runtime Checks
authors: [andrei]
tags: [architecture, performance, design-decisions]
---

# Why We Split Attributes Into Three Categories

:::note This post describes a renderer that has been deleted

Everything below is written about the `ExoNodeDom` three-props runtime — `h(type,
attrs)`, `static` / `bindables` / `bindableLists`, `defineComponent`, and the
`@exodra/babel-plugin-jsx` compiler. **None of that exists any more.** `@exodra/core`
states the deletion in its own barrel (`packages/core/src/index.ts:10-12`), as does
`@exodra/dom` (`packages/dom/src/index.ts:9-10`), and the babel plugin has been
replaced by `@exodra/babel-plugin-schema`. Do not write code from this post, and do
not hand it to an assistant as a description of Exodra.

**What survived is the argument, not the API.** A component is now one value
carrying two halves — a *schema* built once at module load, and a *wiring function*
run per instance (`exoComponent(build, P => wire)`). The schema declares **ports**;
the wiring fills them with a verb that says *how*: `c.set` once, `c.bind` kept in
step, `c.on` a listener, `c.bindList` a reconciled children port. The bucket is gone;
"the renderer never has to ask what kind of value this is" is exactly why. See
[Core Concepts](/docs/core/concepts) and [Getting Started](/docs/getting-started).

It is kept because a post is a record of what was believed when it was written.
:::

Every reactive framework faces the same dilemma: how to handle different types of properties efficiently. Most frameworks choose developer convenience over performance. We chose performance.

{/* truncate */}

## The Problem: Runtime Type Checking Kills Performance

Traditional frameworks mix all props together:

```jsx
// React/Solid approach - looks simple, but...
<div id="static" onClick={handler} items={list}>
```

Behind the scenes, the framework must check EVERY prop:
```javascript
// What frameworks do internally
for (const prop of props) {
  if (isEvent(prop)) handleEvent(prop);
  else if (isReactive(prop)) setupReactivity(prop);
  else if (isList(prop)) setupListTracking(prop);
  else setStaticProp(prop);
}
```

## The Cost Adds Up

Consider a typical app with 10,000 elements and ~5 props each — roughly 50,000 prop reads. In a runtime-dispatch model, each read asks the same question ("is this reactive? an event handler? a plain attribute?") and does it *on every render cycle*. Any single check is trivially cheap; the point is that it's work you keep paying. Exodra pays it once, at compile time, and never again at runtime.

**Death by a thousand cuts.**

## Our Solution: Three Attributes Architecture

We explicitly separate attributes at compile time:

```jsx
// Exodra approach - explicit and fast
<div 
  static={{ id: 'container', class: 'box' }}
  bindable={{ onClick: handler }}
  bindableList={{ items: list }}
/>
```

## Zero Runtime Checks

With Three Attributes, the runtime knows exactly what to do:

```javascript
// Static attributes - set once, never check again
if (attributes.static) {
  Object.assign(element, attributes.static);
}

// Bindable attributes - set up reactivity
if (attributes.bindable) {
  setupBindings(element, attributes.bindable);
}

// Lists - optimize for array operations
if (attributes.bindableList) {
  setupListBinding(element, attributes.bindableList);
}
```

No type checking. No guessing. No overhead.

## Performance Impact

We don't ship a "runtime-type-checking" variant of Exodra to A/B against, so we won't quote a made-up "with checks vs without" delta. What we *can* show is how the architecture holds up against other reactive frameworks.

In the project's benchmark suite (`npm run bench`), rendering a large tree — the
case that actually does work at a measurable scale — Exodra lands in the **top
tier**: close to Solid and well ahead of React and Svelte. Full numbers, including
retained heap and honest caveats, live on the dedicated
[Benchmarks](/docs/benchmarks) page — with the fair print that Solid is still
faster on first mount. We're not claiming a permanent "fastest" crown from our own
harness.

*Updated August 2026: this post originally said Solid's memory footprint was
smaller than ours. Later measurement on the corrected harness reversed that —
Exodra retains the least of the five. The mount-speed ordering was, and remains,
in Solid's favour.*

Fine-grained updates (a single signal or list op) complete in **sub-millisecond**
time for both Exodra and Solid — below the timer's resolution — so we treat those
as a tie, not a headline multiplier.

Caveats worth stating plainly: this is Exodra's **own** harness (headless Chromium
via Playwright), not an independent benchmark, and numbers move with hardware and
framework versions. Run `npm run bench` and see for yourself. The point isn't "we
win every micro-benchmark" — it's that pre-separating props at compile time
removes a class of per-update work, and that shows up on real render workloads.

## Why Not Just Use a Compiler?

"Why not let a compiler figure this out?"

We do! Our Babel plugin transforms JSX into Three Attributes. But here's the key: **the runtime still knows the separation**. 

Other frameworks compile to a mixed format and still need runtime checks. We compile to a pre-separated format that needs zero runtime decisions.

## Developer Experience

Yes, it's more verbose. But it's also:

1. **Explicit** - You know exactly what's reactive and what's not
2. **Predictable** - No surprising re-renders from static props
3. **Debuggable** - Clear separation in DevTools
4. **Fast** - Measurably, significantly faster

## The Philosophy

We believe developers should control performance, not hope for it. By making the cost visible, we make it avoidable.

Every `bindable` prop is a conscious choice. Every `static` prop is a performance win. Every `bindableList` is optimized for its specific use case.

## Real-World Impact

We won't quote before/after figures from a "production app" you can't re-run — that's how you end up trusting invented numbers. What you *can* run is the benchmark suite: `npm run bench` renders a large tree, and Exodra lands in the top tier in our harness — on par with Solid, ahead of Svelte and React (hardware/version dependent). The architectural claim doesn't hinge on the exact figure: pre-separating props at compile time removes a category of per-update work, and that shows up on real render workloads.

## Conclusion

The Three Attributes Architecture isn't about following trends or making things "simple." It's about giving developers the tools to build genuinely fast applications.

We didn't want to drag type checking everywhere. So we didn't. We separated attributes at the architecture level, eliminated runtime overhead, and gave you maximum performance.

**The cost of clarity is verbosity. The reward is speed.**