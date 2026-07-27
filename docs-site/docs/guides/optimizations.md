---
title: Optimizations
---

# Optimizations

Exodra is fast by default. The optimizations here make specific **hot paths**
cheaper — they never gate correctness. You can reach for the hand-tuned ones
directly, and the compiler applies others automatically when you use the
[plugin](../tooling/vite-plugin.md).

## It works without any of this

Nothing below is required for an app to run correctly, and the always-on parts of
the model are already fast:

- **Three‑props, resolved at compile time.** `static` / `bindables` /
  `bindableLists` / `handlers` are separate buckets, so there is **no per‑prop
  runtime type dispatch** — the renderer knows what each key is by which bucket
  it's in. Static props cost nothing at update time (no subscription).
- **Fine‑grained updates, no virtual DOM.** A bindable writes **straight to the
  DOM node it's bound to** — no tree diff, no scheduler between the write and the
  `textContent`/attribute assignment.
- **Build once, mutate in place.** A node's DOM is built once; reactive changes
  mutate it, they don't rebuild.

### The trade behind "no scheduler"

Writing straight to the DOM is fast **precisely because** Exodra's core reactivity
does **no glitch‑batching** — there is no scheduler coalescing writes or
topologically ordering a derived graph the way Solid's or Voby's (`oby`) do. That
is a deliberate design choice with two sides:

- **The common case pays nothing.** A signal driving a DOM prop, or a `derive` off
  a single source (plain pub/sub), has no deep dependency graph — so there is
  nothing to glitch and nothing to batch. You skip the per‑write scheduler overhead
  entirely. (This is why Exodra edges the scheduler‑based fine‑grained libs on the
  `reactive-update` benchmark.)
- **Heavy multi‑source state delegates coherence upward.** If you build many
  interdependent values or computeds over collections, batching and glitch‑free
  consistency are **not** the view layer's job — you hand them to the data layer. A
  reactive store like [`@oimdb/*`](https://abaikov.github.io/oimdb/llms.txt) already
  owns a transactional queue: it coalesces writes, flushes a consistent snapshot,
  and feeds **already‑settled** values into bindables as plain direct writes. The
  batching didn't disappear — it lives where a transaction model already exists,
  instead of being duplicated inside the renderer.

So the direct‑write speed in the benchmarks is one face of a coin whose other face
is "core reactivity stays thin; the store owns coherence." Most apps never touch
that other face; data‑dense ones get a clean division of labour instead of two
schedulers.

So a hand‑written app — or one that opts into nothing below — still runs correctly
and quickly. The rest is about shaving specific costs.

## By hand

Things you control directly:

### Put values in the right bucket

`static` is baked and never subscribed; `bindables`/`bindableLists` are reactive.
Putting a constant in `bindables` needlessly creates a subscription; putting a
per‑instance-but-unchanging value in `static` is free. Match the bucket to how the
value actually behaves.

### Use the imperative list API for known mutations

A `bindableList` exposes `move` / `insert` / `remove` / `push` — each does a
**direct, targeted DOM operation** (O(1) per op), no diff:

```ts
rows.move(0, 3);      // one DOM move
rows.insert(2, item); // one DOM insert
rows.remove(5);       // one DOM remove
```

Prefer these over replacing the whole list (`setValue(newArray)` / `reset`), which
forces a **full keyed reconcile**. See [Lists](./lists.md). (This is why Exodra
leads the list‑update [benchmark](../benchmarks.md) by a wide margin — it does the
operation, other frameworks diff their way to it.)

### `cache:key` for a repeated static template

If you build the **same fully‑static subtree** many times, mark it with
`cache:key` — the renderer builds it once and clones the rest instead of
re‑creating every node:

```tsx
{items.map(() => <li cache:key={ROW} static={{ class: 'row' }}>—</li>)}
```

`cache:key` compiles to the 3rd argument of `h(type, attrs, cacheKey)` (see
[`@exodra/dom`](../api/dom.md)). The key must be **shared** across occurrences (one
symbol/string), and the subtree must be static — the key is your promise of that.

## With the compiler

When you compile with [`@exodra/vite-plugin`](../tooling/vite-plugin.md) /
[`@exodra/babel-plugin-jsx`](../tooling/babel-plugin.md) /
[`@exodra/babel-preset`](../tooling/babel-preset.md), you write plain JSX and the
compiler emits the optimized `h()` calls for you. It **never changes behavior** —
the output renders identically, just faster.

### Auto clone + patch of mostly‑static subtrees

A subtree written **inline inside a `.map()`/loop** whose structure is fixed —
even if it has a few reactive holes — is given an automatic `cacheKey`. At runtime
the renderer builds that skeleton **once** and, for every occurrence, **clones it
and patches only the holes** (reactive text/attributes, event handlers) instead of
building every node with `createElement`/`setAttribute`. For a list of cards this
turns per‑node construction into one native `cloneNode` + a couple of patches.

Honest limits:

- It fires for **inline** repeated JSX, not component invocations — a
  `<Card/>` component body is not templatized yet.
- It handles **scalar holes** (text, attribute, handler), not a dynamic
  child‑list nested inside a template.

### Static hoisting

A **fully‑static** repeated subtree (no reactive holes) is the zero‑hole case of
the above: built once, cloned per occurrence. Note this is a **clone‑cache keyed by
a shared symbol** — the `h()` call stays inline (a fresh schema object per
iteration); only the key is shared. Hoisting a shared schema **object** to a
variable is **not** how it works and would be rejected (a schema object may live in
only one position at a time).

If you don't use the compiler, none of this fires — but everything still works, and
you can add `cache:key` by hand.

## Measuring

Compare against Solid/Svelte/React with `npm run bench` (see
[Benchmarks](../benchmarks.md)), and profile the DOM renderer per method — in the
browser or under jsdom — with
[`@exodra/dom-profiler`](../tooling/profiler.md).
