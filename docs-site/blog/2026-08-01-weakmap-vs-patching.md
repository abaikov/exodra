---
slug: weakmap-vs-patching
title: WeakMaps Are the Cleaner Separation — Patching Is Faster
authors: [andrei]
tags: [performance, architecture, design-decisions, benchmarks]
---

# WeakMaps Are the Cleaner Separation — Patching Is Faster

:::note This post measures a renderer that has been deleted

The `WeakMap<schema, record>` measured below, the `{type, attrs}` schema objects it
was keyed by, and the `ExoNodeDom` renderer around them are **gone**
(`packages/core/src/index.ts:10-12`, `packages/dom/src/index.ts:9-10`). The
measurement stands as a measurement; the code it was taken on does not exist.

**And the conclusion moved on three times.** This post's fix was "put the record in a slot
on the schema object". After that the record became a `TExoNodeDom` that the CHILD owns
(`packages/dom/src/dom/types/TExoNodeDom.ts`), with the element pointing back under
`Symbol.for('exo.child')` — and on 2026-08-30 that back-pointer was removed outright, so an
element carries nothing at all. The "16% of an initial mount / 2.4–2.8× faster" figure that
used to be quoted for it is **withdrawn**: it was measured for a schema→record table, never
for an element-keyed one. What replaced it is the axis `child-mark` / `pool`, which prices
an element expando against a `WeakMap` entry directly.

It is kept because a post is a record of what was believed when it was written.
:::

A while back I wrote about [why Exodra's WeakMap core beats the legacy one](/blog/weakmap-core-design). Everything in that post is still true about *design*. This one is about what happened when I finally measured it: the renderer's `WeakMap<schema, record>` was costing about **11% of every mount**, and moving the record onto a slot on the schema object got it back.

{/* truncate */}

## The design that was right

Exodra keeps a bookkeeping record per node — its element, its children, its disposers, the resolved schema its lifecycle hooks come from. That record has to be reachable from the schema.

A `WeakMap<schema, record>` is the textbook answer, and it earns it:

- **The user's objects stay clean.** A schema is a plain `{type, attrs}` object the user (or the compiler) created. The renderer needs somewhere to keep state *about* it without writing *into* it.
- **Lifetime is free.** Nothing to clear on dispose. When the schema goes, the record goes.
- **Instances don't collide.** Two renderers over the same schema each have their own table, so neither can see the other's state.

That is a real separation of concerns, not a formality. I'd still reach for it first in any code that isn't a hot loop.

## Then I counted

The question that matters isn't "is a WeakMap lookup fast?" — it is **how many of them happen per unit of work.** So I patched `WeakMap.prototype` with counters before Exodra loaded, and rendered a real 1000-row tree.

```
build 3001 dom nodes      6002 get + 3001 set    →  3 ops per node
3000 fine-grained updates    0 ops               →  0
reconcile 1000 items      1001 get               →  1 op per item
```

Two things jumped out.

**The update path never touches it.** Zero operations for three thousand signal writes. Bindings hold direct element references, so the map isn't in the loop at all. Any optimization here could not possibly help the axes Exodra was already winning.

**The build path pays three times per node.** Two of those were `record()` doing a get-then-insert. The third turned out to be an entirely separate problem: a post-build traversal of the whole tree, looking up every node's record just to find the handful with an `onExoMount` hook. That one I deleted outright — the build already holds each schema, so it queues the hooks as it goes, and the commit is a flat drain. Worth **4–7%** of mount on its own, before any change to how records are stored.

That left the honest question: what does the remaining get-plus-insert actually cost?

## The measurement

A `WeakMap` lookup is a hash on object identity. A property load is a shape check and an offset. Both are "fast". The gap is the point:

```
read   weakmap.get               18.0 ns
read   slot (built whole)         6.6 ns    →  2.7× faster
read   slot (grown later)         7.2 ns
create+set  weakmap              77.4 ns
create+set  slot                 18.8 ns    →  4.1× faster
```

I expected polymorphism to eat this. A property load stays fast while a call site sees a few object shapes and falls off a cliff past four, and `h()` already emits more than one shape. It held up better than I thought:

```
1 shape    slot  6.6 ns   weakmap 18.0 ns   →  2.7×
2 shapes   slot  7.7 ns   weakmap 18.5 ns   →  2.4×
4 shapes   slot  6.5 ns   weakmap 18.3 ns   →  2.8×
8 shapes   slot 12.4 ns   weakmap 17.7 ns   →  1.4×
```

Even fully megamorphic, the slot wins. It degrades; it doesn't lose.

## The change

`h()` now emits the slot as part of the object:

```js
// packages/core/src/factory/h.ts
return cacheKey === undefined
    ? { type, attrs, exoRecord: undefined }
    : { type, attrs, cacheKey, exoRecord: undefined };
```

Writing `exoRecord: undefined` at construction is not cosmetic — it is the whole trick. A schema that *grows* the field later takes a hidden-class transition on every node, which is exactly the failure mode from [Fewer Allocations Made It Slower](/blog/fewer-allocations-made-it-slower). Build the object whole; assign into the slot afterwards.

The renderer then drops the map, and with it a single-entry memo that only existed to collapse repeat lookups:

```js
private record(schema) {
    let rec = schema.exoRecord;
    if (rec === undefined) schema.exoRecord = rec = {};
    return rec;
}
```

## What it bought

Mount of a 3001-node tree, old bundle against new bundle, orders alternated, forced GC before each timed region, 51 rounds:

```
                     median   trimmed-mean   min
WeakMap records      1.710      1.660       1.420 ms
schema slot          1.520      1.466       1.280 ms
                  →  10–14% faster, reproduced across two runs
```

On the public initial-render axis — mounting an 80-card app, all frameworks interleaved in one process — the two build-path changes together moved Exodra from **~1.29× behind Solid to ~1.06× behind**. Worth being precise about what that does *not* mean: Solid still wins the axis, and it wins it consistently rather than on average — on a re-measurement it led at every percentile (min 0.54 vs 0.60 ms, median 0.60 vs 0.64), with the two spreads barely overlapping. The gap narrowed; it did not close. Retained heap went *down* too, from ~0.23 MB to ~0.22 MB: one pointer per schema is cheaper than a hash table plus an entry per node.

## What it cost

This is the part I'd want to read in someone else's post, so:

**Dispose has to release the slot now.** The WeakMap handed a fresh, empty table to every new renderer for free. A slot on the schema does not — the record outlives the renderer that made it. Mount a schema, dispose it, mount it again, and the second mount trips the "rendered in two live positions" guard, because `dispose()` detaches only the *root*: every inner node still has a parent and still looks live. So the final dispose now walks its subtree clearing slots, while removals that might reattach later deliberately don't.

**A schema now belongs to one renderer.** Rendering the same schema object in two live positions was already forbidden; this extends it to two renderer instances. That's a real capability gone, in exchange for a number.

**The schema type carries a renderer-owned field.** It's documented as private and never read by user code, but it is there in the type, and honesty requires admitting that the separation the WeakMap gave us was genuinely cleaner.

## The actual lesson

Not "WeakMaps are slow" — they're fine, and the design argument for them is unchanged. The lesson is that **the cost of an abstraction is its per-operation price multiplied by how often the hot path pays it**, and I had never measured the second factor. Once I did, the answer was blunt: the update path paid it zero times, so nothing was there to win, and the build path paid it three times per node, so that's where all of it was.

If your side table is consulted once per event, keep it. If it's consulted once per node per mount, count first.

One more thing fell out of this work, and it wasn't a performance bug. Rewriting how the renderer traverses its logical tree exposed that a static `#fragment` was a dead end in that tree: nothing below `<>…</>` ever ran its disposers or fired `onExoUnmount`, so a signal bound inside one stayed subscribed after dispose. That leak had been sitting there the whole time. Sometimes the value of an optimization is the parts of the code you're forced to look at properly.
