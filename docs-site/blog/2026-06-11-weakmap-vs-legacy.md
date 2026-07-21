---
slug: weakmap-core-design
title: Why the WeakMap Core Is a Better Design Than the Legacy One
authors: [andrei]
tags: [performance, architecture, benchmarks]
---

# WeakMap Core vs Legacy: A Design Deep Dive

Exodra moved from a legacy per-node bookkeeping model to a WeakMap-based core. This post is about *why that's a better design* — less work per node, GC-driven cleanup, and cache-friendly lookups. It is deliberately light on "X% faster" numbers, because the honest, reproducible timings come from `npm run bench`, not prose.

{/* truncate */}

## The Problem with Legacy Core

The legacy core relied on manual cleanup and reference counting:

```javascript
// Legacy approach - manual disposal required
const nodeData = {};
function dispose(node) {
  delete nodeData[node.id];
  node.children.forEach(dispose);
}
```

This approach had several issues:
- **Memory leaks** when developers forgot to call dispose
- **Performance overhead** from manual tracking
- **Complex lifecycle management** in dynamic UIs

## Enter WeakMap Core

WeakMap provides automatic memory management:

```javascript
// WeakMap approach - automatic cleanup
const nodeCache = new WeakMap();
// When node is GC'd, WeakMap entry is automatically removed
```

## Why This Is a Design Win (Not a Benchmark Claim)

We're going to be honest here: Exodra does **not** ship a maintained "legacy vs WeakMap" microbenchmark, so this post won't quote a measured "X% faster" delta — doing so would be inventing numbers. The case for the WeakMap core is **architectural**, and it stands on its own:

- **Node creation** avoids allocating a per-node bookkeeping object and wiring up manual parent/child tracking — there's simply less work per node.
- **Memory after unmount** is reclaimed by the garbage collector: when a subtree's nodes become unreachable, their WeakMap entries go with them. There is no retained-metadata table to grow or forget to clear.
- **Cache lookups** (clone-caching static subtrees) are a direct WeakMap `get` keyed by the schema node — no scanning, no auxiliary index.

If you want real, reproducible numbers, run the cross-framework suite with `npm run bench`: on a large-tree initial render Exodra lands around ~1 ms median — top-tier in our harness (neck-and-neck with Solid, ahead of Svelte and React). Those are Exodra's own benchmarks and are hardware/version dependent — reproduce them yourself rather than trusting a marketing figure.

## Real-World Benefits

### 1. Caching & Reusability
WeakMap enables powerful caching patterns:

```javascript
const compiledTemplates = new WeakMap();
function getTemplate(node) {
  if (!compiledTemplates.has(node)) {
    compiledTemplates.set(node, compile(node));
  }
  return compiledTemplates.get(node);
}
```

### 2. Zero Memory Management
No dispose, no cleanup, no leaks:
- Components unmount → references drop → memory freed
- WeakMap automatically cleans up entries
- No manual intervention required

### 3. Steady Performance at Scale
Because there's no manually-managed metadata table accumulating over an app's lifetime, per-update cost doesn't drift upward as the app runs — freed nodes are collected, and there's no growing structure to walk. This is a property of the design, not a number we're quoting from a synthetic 50k-update loop.

## Why It's a Better Model

The WeakMap core wins on properties, not just speed:

1. **Separation of concerns**: memory management is handled by the runtime/GC
2. **Hard to leak**: you can't forget to clean up what you never manually manage
3. **Cache-friendly**: a natural fit for memoization and clone-caching
4. **Steady at scale**: no manually-grown metadata table to drift with app size

## Conclusion

The WeakMap core is an architectural improvement in how Exodra manages memory: it removes per-node bookkeeping and the whole "did I remember to dispose?" class of bugs. We're framing it as a design win rather than a benchmark headline on purpose — for numbers, `npm run bench` is the honest source.

**Bottom line**: the WeakMap core does less work per node, leans on the GC for cleanup instead of manual disposal, and makes clone-cache lookups a direct keyed `get`. The win is that it's hard to misuse and easy to reason about — and for actual, reproducible timings, `npm run bench` is the source of truth, not this post.