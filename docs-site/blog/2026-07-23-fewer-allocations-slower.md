---
slug: fewer-allocations-made-it-slower
title: Fewer Allocations Made It Slower — A V8 Hidden-Class Lesson
authors: [andrei]
tags: [performance, benchmarks, design-decisions]
---

# When "Fewer Allocations" Costs You 11%

:::note This post measures a renderer that has been deleted

The iterative DOM **build walk** below — the per-node traversal frame, the context
object, the visitor wrapper — belonged to the `ExoNodeDom` three-props renderer,
which no longer exists (`packages/core/src/index.ts:10-12`,
`packages/dom/src/index.ts:9-10`). There is no per-render tree walk to allocate for
any more: a schema is compiled **once per process** into a prototype element, a walk
plan and a setter per port, and a row is a `cloneNode` plus one indirect call per
port (`packages/dom/src/index.ts:5-7`).

**The lesson is the part that survives**, and it is why the post is kept: V8 sizes an
object's in-object property store from the shape it is *constructed* with, so
building an object whole beats growing it afterwards — and "fewer allocations" is a
hypothesis about performance, not a finding, until it is measured.

It is kept because a post is a record of what was believed when it was written.
:::

I refactored Exodra's DOM build walk to allocate **less** per node. It came out **11% slower**. Here is exactly why — with the measurements that caught it and the one-line change that fixed it.

{/* truncate */}

## The change I expected to be free (or a win)

The DOM renderer builds a subtree with an iterative depth-first walk. Each node the walker touches used to allocate three short-lived objects:

- the traversal **frame** (`{schema, parent, index, …}`),
- a **context** object (`{element, scope}`) threaded to that node's children,
- and a **`{context, children}` wrapper** returned by the visitor.

I collapsed that. The visitor stopped *returning* a wrapper and started *writing* onto the frame directly, and I merged the context into the frame too — so `element` and `scope` became fields on the walk node itself:

```js
// before: visitor returns a fresh wrapper + context object per node
return { context: { element, scope }, children };

// after: visitor writes onto the node it was handed
node.element = element;
node.scope = scope;
node.children = children;
```

Three allocations per node became **one**. On a ~1200-node tree that is ~2400 fewer short-lived objects per build. Obvious win, right?

## The measurement said no

I ran a controlled A/B: the old build path and the new one, same tree, **same machine state**, interleaved sample-by-sample with a forced GC before each sample, reporting the full spread (not a single median).

```
             min     p25     median  p75     max     [ms/mount]
OLD    :   0.820   1.060   1.100   1.160   2.180
NEW    :   0.900   1.160   1.220   1.280   2.440
Δ median (NEW vs OLD): +10.9%  → NEW slower
```

Fewer allocations, **11% slower**. And note the shape of it: the slowdown is **uniform** — `min` moved +9.8%, `median` +10.9%, `max` +11.9%. That detail is the whole diagnosis.

## Reading the shape

A regression that lives only in the **tail** (p95/max) usually means **GC** — occasional pauses inside the timed region. But this shifted the **`min` too**. The cleanest, GC-free sample got slower. That can't be GC; it's **more CPU on every single node**. So the extra work had to be per-node, systematic, and small.

Which is strange, because I *removed* work (two allocations). Where did per-node CPU appear?

## The cause: V8 sizes properties at birth

V8 decides how many **in-object property slots** an object gets **when it is created**, from the shape of the literal. An object born as `{schema, parent, children}` gets room for exactly those three, stored inline and accessed by a fixed offset.

The new visitor then **added** `element` and `scope` *after* creation. Each addition:

1. drives a **hidden-class (map) transition**, and
2. once the object outgrows its in-object capacity, spills the overflow into a **separate out-of-line property store** — an extra allocation, and every later read of `element`/`scope` now goes through an indirection.

So I didn't remove an allocation for free. I traded a **cheap** one (a young-generation object the scavenger reclaims almost for nothing) for a **slower object representation** on all 1200 nodes. The old code, by contrast, built every object as a **complete literal** — all fields present at creation, everything in-object, no post-hoc growth. More objects, but each one cheap and flat.

The lesson in one line: **growing an object field-by-field is not the same cost as allocating it whole — even when "whole" means allocating more objects.**

## The proof (and the fix)

If the diagnosis is right, then giving the node **all its slots at birth** — so the visitor only writes into *existing* slots — should erase the gap without giving back the allocation win. It did:

```
             min     p25     median  p75     max     [ms/mount]
OLD          :   0.840   1.000   1.060   1.100   1.340
NEW (pre-sized): 0.780   1.020   1.080   1.120   1.280
Δ median: +1.9%  → tie (within noise)
```

Back to parity — and the pre-sized version actually beats the old code on `min` and `max`, while still allocating **one** object per node instead of three. Hypothesis confirmed, not asserted.

The shippable form keeps core generic: `walkSchema` doesn't know DOM field names, so the **caller supplies the node factory** and is responsible for pre-declaring its own context slots:

```js
// in the DOM renderer — node born with every slot the visitor will fill
const createBuildNode = (schema, parent) =>
    ({ schema, parent, children: undefined, element: undefined, scope: undefined });

walkSchema(root, visit, createBuildNode);
```

## What I'm taking away

- **"Fewer allocations" is not automatically faster.** Object *representation* (in-object vs. spilled backing store) and hidden-class transitions can dominate the allocation you saved — especially when the saved object was a cheap young-gen one.
- **Build objects complete.** One literal with every field beats creating a small object and growing it. Give V8 the final shape up front.
- **The shape of a regression names its cause.** Tail-only → suspect GC. `min` moved too → per-operation CPU. Look at the whole distribution, never a lone median.
- **Only a controlled A/B tells the truth.** The same change looked like anything from +8% to +18% against a third framework across runs — pure cross-run noise. Old-vs-new, one machine, interleaved, GC'd, was the only measurement that didn't lie.

The refactor shipped: the cleanup stayed, the allocation count dropped, and the build is no slower than before — because the node is now born whole.
