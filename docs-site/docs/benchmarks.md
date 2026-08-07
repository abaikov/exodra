---
title: Benchmarks
sidebar_position: 2
---

# Benchmarks

This suite compares Exodra against **Solid, Voby, Svelte, and React** across six
workloads. Each framework performs the task through its own idiomatic API; none is
forced onto another's path. Voby is a newer fine‑grained, no‑virtual‑DOM library
built on its own `oby` signals, included as a recent point of comparison.

These are Exodra's own benchmarks, not an independent third‑party comparison, and
the numbers depend on hardware, browser, and framework versions. Treat them as
directional and reproduce them:

```bash
npm run bench
```

## The suite

The suite is deliberately small — **six benchmarks, one per axis** that matters
for a UI framework, no overlap. All five frameworks run **interleaved** in one
process (order rotated every round, so a load spike can't bias one), GC before
each sample, full spread reported. Each scenario is sized above the browser's
~0.1 ms timer clamp. Crucially, **each framework performs the task via its own
idiomatic API** — no framework is forced onto another's path.

| Axis | What it measures | Result |
|------|------------------|--------|
| **list-update** | Targeted list mutations via the **imperative** engine (move / insert / remove / append) | **Exodra #1** — ~18× vs Solid, ~64× vs Svelte, ~570× vs React |
| **reconcile** | **Declarative** keyed diff — replace a 200-row list with a shuffled order, ×30 | **Exodra #1** — ~1.1× vs Solid, ~4× vs Svelte, ~10× vs React |
| **app-update** | Fat batch on **the app** — 80 cards, details toggle + dynamic tag list ×5 | **Exodra #1** — ~1.2× vs Solid, ~1.4× vs Svelte, ~5.7× vs React |
| **reactive-update** | 1000 value changes → DOM, ×3 | **Exodra #1** — ~1.8× vs Solid, ~3× vs Svelte, ~10× vs React |
| **toggle** | Conditional mount/unmount, ×50 | Tie (Exodra ≈ Solid ≈ Svelte; React ~5× slower) |
| **initial-render** | Mounting **the same app** app-update updates (80 cards, details toggle + dynamic tag lists) | **Roughly tied with Solid** (medians within noise, identical best case), ~3.5× ahead of Svelte, ~5× ahead of React — and **leanest heap** |

Example medians from representative runs (ms) — plus retained heap:

| Axis | unit | Exodra | Solid | Voby | Svelte | React |
|------|------|--------|-------|------|--------|-------|
| list-update | ms/80 ops | **0.10** | 1.80 | 3.90 | 6.40 | 57.3 |
| reconcile | ms/30 reconciles | **2.07** | 2.30 | 2.43 | 8.53 | 20.3 |
| app-update | ms/5 rounds | **5.44** | 6.60 | 6.54 | 7.42 | 31.0 |
| reactive-update | ms/3000 changes | **1.10** | 2.00 | 1.90 | 3.30 | 11.3 |
| toggle | ms/50 toggles | 0.20 | 0.20 | 0.30 | 0.20 | 1.10 |
| initial-render | ms/mount | 0.72 | **0.70** | 1.48 | 2.54 | 3.52 |
| *retained heap* | MB/app | **0.21** | 0.32 | 0.33 | 0.46 | 0.44 |

:::note These numbers are approximate

Treat the absolute milliseconds as indicative, not as a spec. They move between
machines, browser versions and even sessions — a re-run on the same commit can shift
every framework by 10–20% in the same direction, and library versions drift too. What
is stable is the **shape**: which side of an order of magnitude each framework sits
on, and the ratios *within a single interleaved run* (every axis measures all
frameworks in one process, order rotated, so a slow machine slows everyone equally).
Read "~18× faster on list-update" and "roughly tied on initial-render", not "exactly
0.10 ms".
:::

Voby is close to Solid on every same‑paradigm axis (it is the same paradigm), being a
small runtime‑only library. Exodra's clear lead over both is on list-update, where it
uses imperative operations rather than a keyed diff.

## Results

- **Imperative list updates — largest margin.** Exodra's list exposes `move` /
  `insert` / `remove` / `push`, each applying a known change to the DOM directly,
  with no diff. Solid, Svelte, and React have no imperative list API, so the same
  mutation is a state change their keyed block must diff. Measured: 0.10 ms vs
  1.80 ms (Solid).
- **Declarative reconcile.** Given a new array instead, Exodra's `updateChildren`
  performs a minimal‑move keyed reconcile — it keeps the longest already‑in‑order
  run (the LIS) in place and moves only the rest. On a 200‑row shuffle it is ~1.1×
  Solid, ~4× Svelte, and ~10× React (vDOM). Exodra leads both list paths,
  imperative and declarative.
- **Fat application update.** 80 cards, each toggling a details block and
  growing/shrinking a dynamic tag list, driven by real clicks; tags are reconciled
  declaratively with node reuse verified for every framework. Exodra is ~1.2×
  Solid, ~1.4× Svelte, and ~5.7× React. The harness asserts that each framework's
  clicks actually mutate the DOM before timing (React requires `flushSync`).
- **Fine‑grained reactive updates.** Writing many signals straight to the DOM
  (Exodra, Solid) is faster than reconciling an array (Svelte, React); among the
  fine‑grained pair, Exodra is ahead of Solid.
- **Toggle.** Effectively a tie between Exodra, Solid, and Svelte; React is slower.
- **Voby — a fine‑grained peer that tracks Solid.** Voby is deliberately
  Solid‑lineage (same signals‑no‑vDOM model, `For`/`Show`, built on `oby`), so its
  numbers sit next to Solid's across the board, reflecting a broader convergence of
  the current fast newcomers on the fine‑grained model.
  Exodra is neck‑and‑neck with it on the same‑paradigm axes and pulls away only
  where the model differs — imperative list ops (list-update). Two real
  under‑the‑hood differences explain the small same‑paradigm gaps: Voby wires
  reactivity at **runtime** (no compiler pre‑sorting static vs reactive), and its
  `oby` core **batches** writes through a scheduler (we flush it with `oby.tick`,
  the way React uses `flushSync`) — whereas Exodra writes straight to the DOM. That
  scheduler is why the reactive‑update gap (~1.7×) is the widest of the small ones;
  it's a deliberate trade on Voby's side (glitch‑free batching) as much as a cost.
- **Initial render — level with Solid** (and well ahead of Svelte and React). This
  mounts **the exact same app** the update axes then update — 80 fully‑dynamic cards
  — so mount and update cost are measured on ONE app. Solid's compile‑time
  HTML‑template `cloneNode` used to edge Exodra here by ~1.2×; two changes to the
  build path closed it — mount hooks are now collected while the tree is built
  instead of by a second traversal afterwards, and each node's bookkeeping record
  lives in a slot on its schema rather than in a `WeakMap` keyed by it (a hash lookup
  on object identity costs several times a property load, and the build pays one per
  node). Medians now sit within noise of each other and the best cases are identical.

**Memory.** On this app Exodra retains ~0.21 MB per mounted app, under Solid and Voby
(~0.32 MB each), with Svelte and React heavier (~0.44–0.46 MB). Exodra keeps a
bookkeeping record per node — that is what powers identity reconcile and exact node
reuse — but it hangs off a slot on the node's schema rather than a side table, so it
costs a pointer per node and nothing else.

Treat the memory row as the **least stable** number here: it is app‑shaped, sensitive
to when the heap is sampled, and it has moved more than the timing rows between runs
(Voby in particular has measured anywhere from ~0.16 to ~0.33 MB across sessions). The
safe reading is that the fine‑grained libraries all sit in the same fraction‑of‑a‑
megabyte band, well under the vDOM ones — not that any of them has a settled lead.

## Summary

Exodra is in the same performance class as Solid and Voby — the no‑virtual‑DOM,
fine‑grained group, all well ahead of Svelte and React on update‑heavy work. It leads
the four update axes, ties toggle, and is now level with Solid on first mount too, so
the mount‑vs‑update trade the architecture used to carry has largely gone away.

The reasoning is about where the cost lands. A few milliseconds added to a mount is
a one‑time cost at page open, below the threshold most users notice. The same few
milliseconds added to an update recur on every interaction — and in a per‑frame
workload such as virtual scrolling, drag‑reordering, or a live‑updating list, they
recur many times a second, where they translate directly into dropped frames.
Optimising the repeated cost at the expense of the one‑time cost is the deliberate
choice.

It is not a clean sweep: Solid is fastest on first mount, and Voby has the smallest
heap. A broader observation is that Voby's numbers sit alongside Solid's across the
board — the fine‑grained model is now common to the fast frameworks. Exodra's
differentiation is therefore not fine‑grained reactivity itself, but the surrounding
choices: imperative list operations, an explicit static/reactive split, and
identity‑based reconciliation.

**Where these numbers come from.** Each result follows from a specific
architectural choice rather than micro‑tuning:

- the **explicit static/reactive split** (compile‑time buckets) → no per‑prop
  runtime dispatch and zero cost for static parts — see
  [Core Concepts → Three Props](./core/concepts.md#three-props-architecture);
- **direct‑to‑DOM writes with no scheduler** → fast updates, at the cost of no
  glitch‑batching in core (coherence is delegated to the store) — see
  [Optimizations → the trade behind "no scheduler"](./guides/optimizations.md#the-trade-behind-no-scheduler);
- **identity reconcile** (schema object = the key) → exact node reuse and the
  minimal‑move keyed diff — see
  [Core Concepts → Identity & Reconciliation](./core/concepts.md#identity--reconciliation);
- **imperative list ops** (`move`/`insert`/`remove`) → O(delta) list-update, the
  primitive the other frameworks don't expose.

Read those pages for the *why*; the numbers here are just what the design produces.

## Clone + patch (a mount optimization — not exercised here)

Exodra's compiler can mark a **mostly‑static repeated subtree** (a list item written
inline in a `.map()`) with a cache key; the renderer then builds the skeleton once
and **clones + patches only the holes** per occurrence instead of building every
node. It narrows the first‑mount gap to Solid on static‑heavy lists. The unified
benchmark app above is **fully dynamic** (every card has a conditional block and a
reactive list), so nothing here is clone‑cacheable and this path doesn't fire — the
~1.2× mount gap is the un‑cherry‑picked all‑dynamic case. See the
[Optimizations guide](./guides/optimizations.md) for where clone+patch applies.

## Methodology

- **Harness:** headless Chromium (Playwright) over a Vite build of
  `packages/benchmarks`. One shared A/B harness (`src/harness.ts`) drives all six
  axes; each bench is `src/benchmarks/<axis>.tsx`. initial‑render and app‑update
  mount the **same** app (`src/benchmarks/todo-app.tsx`) — one measures its mount, the
  other its update.
- **Idiomatic API per side:** for lists we measure BOTH paths — Exodra's imperative
  ops (`move`/`insert`/…) in *list-update*, and the declarative keyed diff
  (`bindables.children` ↔ Solid `<For>` / Svelte `{#each}` / React keyed map) in
  *reconcile*. Conditionals via Solid `<Show>` / Svelte `{#if}` / React `&&` / Exodra
  fragment. No framework is forced onto another's path.
- **Fair flushing:** frameworks that batch DOM writes asynchronously are forced to
  commit **inside** the timed region, or they'd read as a bogus ~0 ms. Svelte —
  `flush()` (`svelte/internal`) per op; React — `flushSync` per op; Voby — `oby.tick()`
  per op (its scheduler's synchronous flush). Exodra and Solid are synchronous.
  A framework with **no** sync‑flush hook can't be measured fairly here and is
  excluded — that's why **VanJS is not in the suite**: it batches to a macrotask and
  exposes no flush, so its update work happens after the timer stops.
- **Same structure, or it doesn't count:** a separate gate
  (`scripts/verify-structure.mjs`) mounts every framework's app and asserts they
  render the **identical** DOM (same node counts) — a framework that silently
  under‑renders would look fast for doing less. The app‑update axis additionally
  asserts, per framework, that one interaction actually mutates the DOM **and reuses**
  the kept node (not a rebuild) before timing.
- **Interleaved:** all frameworks alternate every round, order rotated, so machine
  load is shared. GC (`--js-flags=--expose-gc`) before each sample; only the
  operation under test is timed (setup/teardown are untimed). Full spread reported
  (min / p25 / median / p75 / max) per framework.
- **Memory:** retained heap via forced GC + `performance.memory.usedJSHeapSize`
  (`--enable-precise-memory-info`) around one mounted app. Directional.

## Caveats

- First‑mount timings are the noisiest; do not over‑interpret a single run.
- Ratios are more portable than absolute times, which are machine‑dependent.
- These are the framework author's own benchmarks. Each framework's implementation
  is in `packages/benchmarks/src`; reproduce the full run with `npm run bench`.

## Reproduce

```bash
git clone https://github.com/abaikov/exodra.git
cd exodra
npm install
npm run bench
```

---

# SSR & hydration: which model wins where

Server rendering gets HTML on screen fast; the interesting question is
**time‑to‑interactive (TTI)** — when the first click actually *does* something —
and the **bytes** it costs to get there. Two models compete:

- **Hydration** (Exodra, Solid, React…): the server sends HTML, the client
  downloads a JS bundle, rebuilds the component tree, and wires up listeners.
- **Resumability** (Qwik): the server serializes enough state into the HTML that
  the client can *resume* without re‑running components — it ships almost no JS up
  front and lazy‑loads code per interaction.

Neither is universally faster. This is a genuine trade‑off that depends on the
shape of the application, so the result is a set of trade‑offs rather than a single
ranking. We built the same three apps in Exodra, Solid, and Qwik — production builds, served statically,
driven by real Chromium under **Fast 3G + 4× CPU throttling** (the conditions
where payload size actually matters), median of 5 runs. Both models were set up
the way you'd ship them: code‑split, prefetch on.

## The map — TTI (ms, lower is better)

| App | Exodra | Solid | Qwik |
|-----|--------|-------|------|
| Landing — static page + a few interactive islands | **509** | 493 | 643 |
| Todo — 200 cards (tags + nested comments + authors) | **995** | 1207 | 1498 |
| Todo — 1000 cards (long list) | **3206** | 4332 | 4937 |
| Uniform interactive list — 1000 rows | **1085** | 1268 | 2320 |

The HTML weight tells the same story from the other side (gzipped, 1000‑card todo):
Exodra **~20 KB**, Solid ~39 KB, Qwik ~68 KB.

## Interpreting the numbers

Keep the numbers in perspective before drawing conclusions:

- **The page *appears* at essentially the same time regardless of framework.**
  First Contentful Paint on every app here is ~**210–270 ms** for all three — a
  30–60 ms spread that's below what a person notices. SSR does its job everywhere;
  the framework choice shows up in **when it becomes interactive**, not in when it
  paints.
- **The interactivity gaps are modest on light apps and only clearly matter at
  scale.** On the landing and the small todo they're ~130–500 ms — real, but near
  the edge of perception (rule of thumb: &lt;100 ms feels instant, ~1 s keeps flow,
  &gt;3–4 s is where people bounce). They grow into the "obviously worth it" range
  only on the heavy cases — e.g. the 1000‑row uniform list, where it's ~1.1 s vs
  ~2.3 s.
- **We chose pessimistic conditions on purpose.** Fast 3G + 4× CPU throttling is
  there to make payload *visible*; on a decent phone or desktop over a good
  connection everything is far faster and the absolute gaps shrink proportionally.
  Read these as **how the models rank and why**, not as "your users wait seconds."

## What each model suits

**Resumability (Qwik)** has a real, underrated strength: **automatic chunking.**
You don't hand‑write `lazy()` — the compiler splits every handler and component
for you, and a large app is route‑split automatically. It ships ~0 JS up front, so
it shines when **most of a large page is never interacted with** (true islands):
code for the parts you don't touch simply never loads. If a team tends to *forget*
to code‑split, Qwik removes that failure mode by construction — that's a genuine
ergonomic win.

**Hydration with a small eager bundle** (Exodra, Solid) wins when the interactive
bundle is already modest: the framework (~6 KB) loads *during* initial load, so the
**first interaction is instant**. Qwik loads its runtime core (~18 KB) lazily on
the first interaction, so the very first click pays a download a hydration app
already paid cheaply.

**Exodra** carries the **leanest HTML** of the three — no per‑node hydration
markers (Solid emits `data-hk` keys), no per‑node resume state (Qwik serializes it
into the markup). That advantage compounds on data‑dense UIs and long lists, which
is why Exodra leads or ties across the map and pulls ahead as the app grows.

## Why

- **Hydration is cheap.** Wiring even 30,000 nodes is ~150 ms of CPU — so *skipping*
  hydration saves little.
- **Bytes over a slow network dominate.** Under Fast 3G, the payload (HTML **plus**
  JS) is what sets TTI.
- Resumability trades **JS you'd download eagerly** for **HTML that carries resume
  state** (which grows with node count) plus a **lazy core on first interaction**.
  On a well‑code‑split app the eager JS was already small, so that trade tends to
  cost a little more than it saves — most visibly on long lists, where the per‑node
  HTML tax adds up.

## Caveats

- **This assumes you code‑split.** Qwik's advantage is largest — and can flip the
  result outright — against a hydration SPA that ships **one giant un‑split
  bundle**. That's a configuration failure, not a property of hydration; and it's
  exactly what Qwik's automatic chunking spares you. A hydration app that
  lazy‑loads its heavy parts closes most of the gap.
- **Real apps defer heavy dependencies.** A video player, a rich editor, a charting
  library — none belong in the first‑interaction path. Everyone benefits from
  deferring them: automatically in Qwik, via `lazy()` / dynamic `import()` in a
  hydration framework. An app that eagerly ships a heavy widget will lose to
  *either* model, cleanly.
- **App shape is everything.** These are interactive apps (you touch things). A page
  that's 95% static text with one tiny island is closer to Qwik's ideal — though
  even there a hydration framework barely pays to "hydrate" the static parts, since
  they aren't reactive.
- **These are our numbers.** Reproduce them — the harness is in
  `packages/benchmarks/ssr` (real prod builds + Playwright with CDP throttling).

## Where Qwik has an edge

Several factors favour Qwik that these tests do not capture:

- **The list penalty is bandwidth‑bound and largely disappears on a fast
  connection.** Qwik's only significant weakness on long lists is its heavier HTML,
  which is a bytes problem. Re‑run the 1000‑row cases on broadband (30 Mbit, 20 ms,
  no CPU throttle) and the gap closes:

  | App (N = 1000) — TTI (ms) | Exodra | Solid | Qwik |
  |---|---|---|---|
  | Uniform list — Fast 3G | 1085 | 1268 | 2320 |
  | Uniform list — **broadband** | 441 | 327 | **347** |

  On broadband the uniform list is roughly even — Qwik ties Solid and slightly edges
  Exodra. With sufficient bandwidth the HTML overhead is negligible. (On the
  structured todo, hydration still leads, but within a few hundred ms.)

- **The "click immediately" metric is a worst case for Qwik.** The harness fires the
  first click the instant the page commits. A real user pauses first, and during
  that pause Qwik prefetches its runtime and handler chunks, so by the time a person
  actually clicks the code is usually already present. Against realistic think‑time,
  Qwik's first‑interaction figure improves; this measurement is deliberately
  pessimistic for it.

- **These applications are interaction‑dense, which is not the scenario Qwik
  targets.** Qwik is designed for content‑heavy pages with sparse interactivity,
  where the code for everything not touched never loads. On that shape its ceiling
  — roughly O(1) initial JS regardless of app size — is an architectural advantage a
  hydration framework can only approach with disciplined manual splitting.

- **That splitting is automatic.** No `lazy()`, no route‑split configuration, and no
  risk of shipping an unintentionally large bundle; the compiler handles it. On a
  large team this is a meaningful benefit.

Read the results as "**for interaction‑dense UIs over constrained networks**."
Narrow that to a fast connection, or widen the app toward mostly‑static, and the gap
closes or flips. Different tools, different targets — genuinely.

## Server render throughput

Everything above is about the *client*. The other half of SSR is how fast the
**server** turns a tree into an HTML string — the number that bounds how many pages
a box can render per second. It is rarely a page's bottleneck (the network dominates
time‑to‑first‑byte), but it caps throughput under load, so we measured it.

For a 1,000‑node list on one core (warm, directional — reproduce yourself):

| Path | ms / 1,000 nodes |
|------|------------------|
| Runtime walker (`renderToString`, no build step) | **~0.70** |
| Compiled (`mode: 'ssr'` — templates baked, only holes escaped) | **~0.35** |
| Solid `renderToString` (compiled, reference) | ~0.23 |

Both Exodra paths are well under a millisecond per 1,000 nodes, so **you can
server‑render freely** — it won't be the thing you optimize. The zero‑config walker
already renders a large page in a fraction of a millisecond; the compiler roughly
halves that again and lands within ~1.5× of Solid's compiled output, close to the
practical floor (a flat string concatenation with correct escaping of dynamic holes).

Two things got it there — the mechanics, not the headline: the walker was tightened (a single‑scan escape
fast‑path, no per‑node dedup allocation for ordinary elements, cheaper attribute
handling) for ~4× over its first cut; and the SSR compiler skips the per‑attribute
name classification for compile‑time‑known attribute names, which alone is ~4× faster
*per attribute* and ~20% on attribute‑dense pages. None of it changes a byte of
output — the compiled and walked HTML are asserted identical, so hydration can't
drift.

## Summary

For **interactive, data‑dense UIs** — dashboards, tables, feeds, long lists — a
small eager bundle beats resumability under real network conditions, and Exodra's
lean HTML puts it **first or tied in every case we measured**, with a widening lead
as the app grows. For a **very large app where most of the surface is never
touched**, or a team that wants **zero‑config chunking**, resumability is a
genuinely appealing model — at the cost of a heavier HTML payload and a lazy
runtime core on the first interaction. Pick by your app's shape, and measure your
own.
