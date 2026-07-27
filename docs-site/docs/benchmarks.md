---
title: Benchmarks
sidebar_position: 2
---

# Benchmarks

Six benchmarks, five frameworks, one machine. We put Exodra head‑to‑head with
**Solid, Voby, Svelte, and React** — each doing the same job through *its own*
idiomatic API, never forced onto another's path. Voby is the wildcard: a newer
fine‑grained / no‑vDOM library on its own `oby` signals, thrown in to see how a
fresh signals framework lands.

One caveat, said once so we can move on: this is **our** harness, not a third
party's, and the numbers drift with hardware, browser, and versions. Treat them as
*directional* — then run them yourself, it takes a minute:

```bash
npm run bench
```

## The suite — six axes, no filler

The suite is deliberately small — **six benchmarks, one per axis** that matters
for a UI framework, no overlap. All five frameworks run **interleaved** in one
process (order rotated every round, so a load spike can't bias one), GC before
each sample, full spread reported. Each scenario is sized above the browser's
~0.1 ms timer clamp. Crucially, **each framework performs the task via its own
idiomatic API** — no framework is forced onto another's path.

| Axis | What it measures | Result |
|------|------------------|--------|
| **list-update** | Targeted list mutations via the **imperative** engine (move / insert / remove / append) | **Exodra #1** — ~19× vs Solid, ~65× vs Svelte, ~585× vs React |
| **reconcile** | **Declarative** keyed diff — replace a 200-row list with a shuffled order, ×30 | **Exodra #1** — ~1.2× vs Solid, ~4.7× vs Svelte, ~10.7× vs React |
| **app-update** | Fat batch on **the app** — 80 cards, details toggle + dynamic tag list ×5 | **Exodra #1** — ~1.2× vs Solid, ~1.3× vs Svelte, ~5× vs React |
| **reactive-update** | 1000 value changes → DOM, ×3 | **Exodra #1** — ~1.6× vs Solid, ~2.7× vs Svelte, ~8.8× vs React |
| **toggle** | Conditional mount/unmount, ×50 | Tie (Exodra ≈ Solid ≈ Svelte; React ~4× slower) |
| **initial-render** | Mounting **the same app** app-update updates (80 cards, details toggle + dynamic tag lists) | Solid #1, **Exodra #2** — ~1.2× behind Solid, ~2.6× ahead of Svelte, ~4× ahead of React (and **leanest heap**) |

Example medians from representative runs (ms) — plus retained heap:

| Axis | unit | Exodra | Solid | Voby | Svelte | React |
|------|------|--------|-------|------|--------|-------|
| list-update | ms/80 ops | **0.10** | 2.20 | 6.50 | 13.1 | 108.9 |
| reconcile | ms/30 reconciles | **3.20** | 3.67 | 3.63 | 15.1 | 35.5 |
| app-update | ms/5 rounds | **4.84** | 5.56 | 5.58 | 6.62 | 23.3 |
| reactive-update | ms/3000 changes | **1.20** | 2.10 | 2.00 | 5.60 | 18.0 |
| toggle | ms/50 toggles | 0.20 | 0.20 | 0.30 | 0.20 | 1.10 |
| initial-render | ms/mount | 0.80 | **0.62** | 1.00 | 2.26 | 3.18 |
| *retained heap* | MB/app | 0.23 | 0.32 | **0.16** | 0.46 | 0.43 |

Voby tracks Solid closely on every same‑paradigm axis (it *is* the same
paradigm) and holds the leanest heap of all five — it's a tiny runtime‑only
library. Where Exodra pulls clear of both is **list-update**, because there it
uses imperative ops, not a keyed diff — see below.

## What the numbers are telling us

- **Imperative list ops are a blowout.** Exodra's list is an *engine*, not a
  guess: `move` / `insert` / `remove` / `push` hit the DOM directly for a change you
  already know. Solid, Svelte and React have no imperative list API, so the *same*
  mutation becomes a state‑set their keyed block has to diff. When you know exactly
  what changed, telling the renderer beats making it re‑derive — and 0.1 ms vs 2.2 ms
  is the size of that gap.
- **Declarative reconcile — Exodra takes this one too.** When you instead just
  hand over a new array, Exodra's `updateChildren` does a **minimal‑move** keyed
  reconcile (it keeps the longest already‑in‑order run in place — the LIS — and moves
  only the rest, exactly like the best compilers). On a 200‑row shuffle it edges
  Solid (~1.2×) and is far ahead of Svelte (~4.7×) and React (~10.7×, vDOM). So
  Exodra leads **both** list paths — imperative *and* declarative.
- **Fat real‑app update — Exodra #1.** 80 cards, each toggling a details block and
  growing/shrinking a **dynamic tag list**, driven by real clicks; tags reconciled
  declaratively with node reuse verified for all four. Exodra ~1.2× vs Solid, ~1.3×
  vs Svelte, ~5× vs React. The bench **asserts every framework's clicks actually
  mutate the DOM** before timing (React needs `flushSync`, or it would measure
  nothing).
- **Fine‑grained reactive updates — home turf.** Writing many signals straight to
  the DOM (Exodra, Solid) beats reconciling an array (Svelte, React); among the
  fine‑grained pair, Exodra edges Solid.
- **Toggle — a three‑way tie** between Exodra, Solid and Svelte; React trails.
- **Voby — a fine‑grained peer that tracks Solid.** Voby is deliberately
  Solid‑lineage (same signals‑no‑vDOM model, `For`/`Show`, built on `oby`), so its
  numbers sit right next to Solid's everywhere — which is the real story of the
  current crop of fast newcomers: they've *converged* on the fine‑grained model.
  Exodra is neck‑and‑neck with it on the same‑paradigm axes and pulls away only
  where the model differs — imperative list ops (list-update). Two real
  under‑the‑hood differences explain the small same‑paradigm gaps: Voby wires
  reactivity at **runtime** (no compiler pre‑sorting static vs reactive), and its
  `oby` core **batches** writes through a scheduler (we flush it with `oby.tick`,
  the way React uses `flushSync`) — whereas Exodra writes straight to the DOM. That
  scheduler is why the reactive‑update gap (~1.7×) is the widest of the small ones;
  it's a deliberate trade on Voby's side (glitch‑free batching) as much as a cost.
- **Initial render — Solid leads, Exodra a close second** (well ahead of Svelte and
  React). This mounts **the exact same app** the update axes then update — 80
  fully‑dynamic cards — so mount and update cost are measured on ONE app. Solid's
  compile‑time HTML‑template `cloneNode` still edges Exodra on first mount (~1.2×),
  but the gap is narrow.

**Memory.** On this app Exodra retains ~0.23 MB per mounted app — clearly under
Solid (~0.32 MB), with Svelte and React heavier (~0.43–0.46 MB). The **leanest is
Voby** (~0.16 MB): it's a minimal runtime‑only library with no per‑node schema
records, so it carries less. Exodra's per‑node records (the WeakMap that powers
identity reconcile) cost a little heap for cheap fine‑grained updates and exact
node reuse — a trade, not a free win. (Memory is app‑shaped.)

## The verdict

Exodra rides at the front with Solid and Voby — the no‑vDOM, fine‑grained pack that
leaves Svelte and React in the dust on anything update‑heavy. The trade it makes is
deliberate, and it's the right one: pay a hair more up front wiring the tree (~1.3×
behind Solid at first mount) to fly on every update after. Apps mount once and then
update for the rest of their lives — so Exodra leading all four update axes and
tying toggle is the half of the story that actually runs in production.

Not a clean sweep, and we won't pretend otherwise: Solid keeps the first‑mount
crown, Voby the lightest heap. But the most interesting result isn't any single
number — it's Voby landing *right next to Solid*. That's the tell: **the fine‑grained
model is now table stakes.** Everyone fast is fine‑grained. So Exodra's real edge was
never "we have signals too" — it's the stuff nobody else ships: imperative list ops,
an explicit static/reactive split, and identity reconcile.

**Where these numbers come from (the model behind them).** None of this is
micro‑tuning — each result falls out of a specific architectural choice:

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

## How it runs

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

## Grain of salt

- **First mount is the noisy one.** The Solid‑vs‑Exodra mount gap wobbles run‑to‑run
  — don't build a religion on a single number there.
- **Ratios travel; milliseconds don't.** Your machine will spit out different
  absolute times with a similar *shape*. Trust the ranking, not the digits.
- **We're not the ones to trust here — the harness is.** Every framework's app lives
  in `packages/benchmarks/src`, and the whole run is one command. Go poke holes.

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

Neither is universally faster. This is a genuine **trade‑off that depends on the
shape of your app**, so the real answer is a map, not a trophy. We built the
same three apps in Exodra, Solid, and Qwik — production builds, served statically,
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

## Keep the magnitudes in perspective

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

## What each model is actually built for

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

## Why, in one breath

- **Hydration is cheap.** Wiring even 30,000 nodes is ~150 ms of CPU — so *skipping*
  hydration saves little.
- **Bytes over a slow network dominate.** Under Fast 3G, the payload (HTML **plus**
  JS) is what sets TTI.
- Resumability trades **JS you'd download eagerly** for **HTML that carries resume
  state** (which grows with node count) plus a **lazy core on first interaction**.
  On a well‑code‑split app the eager JS was already small, so that trade tends to
  cost a little more than it saves — most visibly on long lists, where the per‑node
  HTML tax adds up.

## The fine print

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

## Where Qwik genuinely wins

A few things cut squarely in Qwik's favour, and our tests don't flatter it — so
state them plainly:

- **The list penalty is bandwidth‑bound, and it largely disappears on a fast
  connection.** Qwik's only real weakness on long lists is its heavier HTML, and
  that's a *bytes* problem. Re‑run the 1000‑row cases on broadband (30 Mbit, 20 ms,
  no CPU throttle) and the gap collapses:

  | App (N = 1000) — TTI (ms) | Exodra | Solid | Qwik |
  |---|---|---|---|
  | Uniform list — Fast 3G | 1085 | 1268 | 2320 |
  | Uniform list — **broadband** | 441 | 327 | **347** |

  On broadband the uniform list is a **dead heat** — Qwik ties Solid and edges
  Exodra. Give it bandwidth and the HTML tax is essentially free. (On the structured
  todo hydration still leads, but everything is within a few hundred ms.)

- **Our "click immediately" metric is the worst case for Qwik.** We fire the first
  click the instant the page commits. A real user takes a beat first — and during
  that beat Qwik *prefetches* its runtime and handler chunks, so by the time a human
  actually clicks, the code is usually already there. Against realistic think‑time,
  Qwik's first‑interaction number improves; ours is deliberately pessimistic for it.

- **These apps are interaction‑dense on purpose — not Qwik's home turf.** We built
  things where you touch the interactive parts right away. Qwik is designed for the
  opposite: content‑heavy pages with *sparse* interactivity, where the code for
  everything you *don't* touch never loads at all. On that shape its ceiling —
  **~O(1) initial JS no matter how large the app grows** — is a real architectural
  advantage a hydration framework can only approach with disciplined manual
  splitting.

- **And you get that splitting for free.** No `lazy()`, no route‑split config, no
  "oops, we shipped 400 KB" — the compiler handles it. On a large team that alone is
  worth a lot.

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

## The verdict

For **interactive, data‑dense UIs** — dashboards, tables, feeds, long lists — a
small eager bundle beats resumability under real network conditions, and Exodra's
lean HTML puts it **first or tied in every case we measured**, with a widening lead
as the app grows. For a **very large app where most of the surface is never
touched**, or a team that wants **zero‑config chunking**, resumability is a
genuinely appealing model — at the cost of a heavier HTML payload and a lazy
runtime core on the first interaction. Pick by your app's shape, and measure your
own.
