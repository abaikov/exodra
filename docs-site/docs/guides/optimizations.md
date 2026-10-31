---
title: Optimizations
---

# Optimizations

Most of what an optimization guide usually contains — memoize this, hoist that,
add a key here — is not needed in Exodra, because the core does it
structurally rather than as an opt-in. (A key exists, but as a plugin for the case
where the data layer cannot supply identity — see below.) What is left is a short list of choices a
component author actually makes, and an explanation of what the core is already
doing so you can tell which of those choices matter.

For numbers, see [Benchmarks](../benchmarks.md). Nothing on this page restates
one — a figure kept in two places drifts.

## What the core does without being asked

### The schema is compiled once per process

A component's schema is built when its module loads, and the first render
compiles it — once, for the life of the process — into three things:

- **a prototype element**, parsed from the schema's markup inside an inert
  `<template>`, which every instance is a `cloneNode` of;
- **a walk plan**, a flat list of single hops (`firstChild` / `nextSibling`)
  reaching only the elements that carry a port. A subtree with no ports in it is
  emitted as markup and **never walked into** at render time;
- **a setter per port**, already bound to its attribute name and its element's
  namespace, so filling a port is two array loads and one indirect call with no
  branch on the port's kind.

A render is therefore: clone the prototype, replay the walk, run the wiring
function. There is no template parsing per render, no props object, no tree
diff and no per-node type dispatch.

Clone-and-patch is not an optimization applied to code that qualifies for it
here: it is what a component *is*, and there is no un-templated path to fall
back to. So there is no cache key to set, no heuristic to satisfy, and no
"this subtree was too dynamic to hoist" case to discover in production.

### Static costs nothing

Anything passed to `el()` is folded into the prototype's markup. It has no slot
in the instance's node array, no setter, no subscription and no work at update
time. That is the single biggest lever an author has, and it is the default: a
value only becomes a port when you declare one.

### The prototype is moved into the page's document

A `<template>`'s contents belong to a different document, `cloneNode` preserves
the owner, and inserting a foreign-owned subtree makes the DOM adopt it node by
node on **every** insertion. So the compiler imports the verified prototype into
the page's document once, and every instance skips that walk. It is skipped for
schemas containing elements whose adoption does work (`<img>` and friends),
because starting a fetch at module load would undo the inertness the
`<template>` parse exists for.

### Reconciliation is by identity, and there is a fast path per shape

`reconcileExoOrder`, called from a transition, reconciles a children port against
a list **by object identity** — the item reference is the key, and there is no `key` prop on this
path. (Where identity is unavailable, `EXO_KEYED_LIST_VOCABULARY` from
`@exodra/list-reconcile` is the opt-in pack, adding `c.keyedList`; it costs one
`keyOf` call per item and a key→item `Map` per update on top of what this list
pays.) The diff tries cheaper shapes first: the common head and tail by identity,
then a middle that is only inserted or only removed, done in place; only a middle
whose survivors changed order reaches the general case, which moves the minimum
number of nodes by keeping the longest increasing subsequence in place
(`packages/list-reconcile/src/reconcileExoOrder.ts`).

Per update the common paths allocate **nothing**. See
[Lists & Reconciliation](./lists.md) and
[Core Concepts → Identity & reconciliation](../core/concepts.md#identity--reconciliation).

### The trade behind "no scheduler"

Writing straight to the DOM is fast **precisely because** Exodra does **no
glitch-batching** — there is no scheduler coalescing writes
or topologically ordering a derived graph the way Solid's or Voby's (`oby`) do.
That is a deliberate design choice with two sides:

- **The common case pays nothing.** An effect following one value into one port,
  or a transition computing a value from a single read, has no deep dependency graph — so there is nothing to glitch
  and nothing to batch. You skip the per-write scheduler overhead entirely.
- **Heavy multi-source state delegates coherence upward.** If you build many
  interdependent values or computeds over collections, batching and glitch-free
  consistency are **not** the view layer's job — you hand them to the data layer.
  A reactive store like [`@oimdb/*`](https://oimdb.org/llms.txt)
  already owns a transactional queue: it coalesces writes, flushes a consistent
  snapshot, and feeds **already-settled** values into ports as plain direct
  writes. The batching did not disappear — it lives where a transaction model
  already exists, instead of being duplicated inside the renderer.

So the direct-write speed in the [benchmarks](../benchmarks.md) is one face of a
coin whose other face is "the renderer stays thin; the store owns coherence."
Most apps never touch that other face; data-dense ones get a clean division of
labour instead of two schedulers.

## The choices that are actually yours

### Declare it in `el()`, not as a port

A port costs a slot in the instance's node array and one call per instance; a
static attribute costs nothing at any point after module load. Anything that is
the same for every instance belongs in `el()`.

### `c.attr` in the wire when it cannot change, an effect when it can

`c.attr` is two array loads and a call, retaining nothing. An effect that follows a
value additionally subscribes, and its unsubscribe is held by the instance until it
goes. Following a value that never changes buys a subscription for nothing.

### `c.list` for a fixed run, `reconcileExoOrder` for a live one

A fixed list is rendered once: no row records, no shown order, no diff, no
teardown. It is not `reconcileExoOrder` over a constant array — the difference is
everything the reconciler exists for.

### Let the data layer hand you the delta

`reconcileExoOrder` takes the order shown and the order wanted and lets the diff
compute the delta (`packages/list-reconcile/src/reconcileExoOrder.ts`) — that path
is the one tuned for the shapes lists actually take. A producer that already knows
the exact mutation (a command stream, a drag-reorder) and wants it performed as-is
drives `c.childList(port)`'s `insert` / `move` / `remove` itself, from a
transition, in `O(1)` per operation.

### A shared handler instead of a closure for a repeated handler

`c.on(port, handler, subject)` takes either shape. A **closure** is the general
answer and costs one function per row. A **shared handler** — a module-level
function taking `(event, subject)`, see
[`@exodra/core`](../api/core.md#event-handlers) — holds nothing about any row, so
one function object serves every row of a template; which row it fired on
arrives as the third argument of the fill, which the wiring function already
holds and therefore does not allocate.

This is also what delegation is written against: `createExoDelegatedEvents(names)`
attaches one root listener per event name instead of one listener per element,
and it **refuses a fill with no subject** rather than leaving a handler that
cannot tell which row it is answering for. See
[Events as a plugin](../api/dom.md#events-as-a-plugin).

### Give hydration something it can adopt cheaply

A child list on a hydrating page adopts the rows the server printed rather than refusing
them, and it costs **no placeholder and no record**: opening the list collects the served
rows into a cursor, and `c.build` wires the instance straight onto the next one
(`packages/dom/src/dom/EXO_ADOPT_CURSOR.ts:16-21`). The initial state runs once, on the
server's element (`packages/dom/src/hydrate/buildAdoptedExoChild.ts:27-29`). When the data
wants more rows than the markup has, the cursor answers `null` and the rest are built the
client way.

How much the hydrating path costs on a real page is **unmeasured**.
See [SSR & Hydration](./ssr.md).

## Writing the schema in JSX

[`@exodra/babel-plugin-schema`](./jsx.md) compiles an `exoJsx(…)` schema
declaration — literal attributes as markup, every port named where it stands — into
a module-level `createExoNamedSchema()`. Hoisting the schema to module scope is not
a mode it offers — a rebuilt schema is a different program, because every backend
indexes its prepared plan by the schema's ports.

Hand-written components need no compiler at all — nothing on this page depends
on a build step.

## Measuring

Compare against Solid/Svelte/React with the suite in `packages/benchmarks` (the
exact commands are under [Benchmarks → Reproduce](../benchmarks.md#reproduce)),
and profile with
[`@exodra/dom-profiler`](../tooling/profiler.md) — `profileDom()` for a
per-method breakdown of the renderer, `profilePorts(component)` for where one
component's time goes port by port.
