---
title: Benchmarks
sidebar_position: 2
---

# Benchmarks

These are Exodra's **own** benchmarks — not an independent third‑party comparison.
They run in headless Chromium (Playwright) over a Vite build and compare Exodra
against **Solid, Svelte, and React** on the same workloads. Numbers move with
hardware, browser, and framework versions, so treat them as a **directional**
signal and reproduce them yourself:

```bash
npm run bench
```

## The suite: six axes

The suite is deliberately small — **six benchmarks, one per axis** that matters
for a UI framework, no overlap. All four frameworks run **interleaved** in one
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

Example medians from one run (ms) — plus retained heap:

| Axis | unit | Exodra | Solid | Svelte | React |
|------|------|--------|-------|--------|-------|
| list-update | ms/80 ops | **0.10** | 1.90 | 6.50 | 58.5 |
| reconcile | ms/30 reconciles | **2.53** | 2.93 | 12.0 | 27.0 |
| app-update | ms/5 rounds | **4.24** | 5.18 | 5.50 | 21.5 |
| reactive-update | ms/3000 changes | **1.20** | 1.90 | 3.20 | 10.6 |
| toggle | ms/50 toggles | 0.30 | 0.30 | 0.20 | 1.10 |
| initial-render | ms/mount | 0.86 | **0.72** | 2.26 | 3.56 |
| *retained heap* | MB/app | **0.23** | 0.31 | 0.46 | 0.46 |

## The honest read

- **Targeted list updates (imperative) — Exodra wins by a wide margin.** Exodra's
  list is an **imperative engine**: `move` / `insert` / `remove` / `push` directly
  mutate the DOM for a known change, no diff. Solid, Svelte and React have no
  imperative list API, so each mutation is a state‑set their keyed block must diff —
  Exodra does far less work. When you *know* the change, express it as an op.
- **Declarative reconcile (keyed diff) — Exodra also wins.** When you instead just
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
- **Fine‑grained reactive updates — Exodra wins.** Writing many signals straight to
  the DOM (Exodra, Solid) beats reconciling an array (Svelte, React); among the
  fine‑grained pair, Exodra edges Solid.
- **Toggle — a three‑way tie** between Exodra, Solid and Svelte; React trails.
- **Initial render — Solid leads, Exodra a close second** (well ahead of Svelte and
  React). This mounts **the exact same app** the update axes then update — 80
  fully‑dynamic cards — so mount and update cost are measured on ONE app. Solid's
  compile‑time HTML‑template `cloneNode` still edges Exodra on first mount (~1.2×),
  but the gap is narrow.

**Memory.** On this app Exodra retains the **least** per mounted app (~0.23 MB),
clearly under Solid (~0.31 MB), with Svelte and React heavier (~0.46 MB) — the
per‑node records buy cheap fine‑grained updates *and*, here, the smallest footprint.
(Memory is app‑shaped.)

## The bottom line

**Exodra is top‑tier**, in the same class as Solid — the two no‑vDOM/compiled
front‑runners, both far ahead of Svelte and React on the update‑heavy work. The
architecture makes a deliberate trade: it **spends a little more building the tree up
front** (wiring fine‑grained bindings; ~1.2× behind Solid on first mount) **to move
faster on every update after** — it leads all four update axes (imperative list ops
by a lot, declarative reconcile, the fat real‑app batch, fine‑grained reactivity),
ties toggle, and holds the least memory. Since apps mount once and update
continuously, that's the trade worth making. No clean sweep — Solid keeps the
first‑mount crown — but on the work an app actually spends its life doing, Exodra is
at or ahead of the front.

## Clone + patch (a mount optimization — not exercised here)

Exodra's compiler can mark a **mostly‑static repeated subtree** (a list item written
inline in a `.map()`) with a cache key; the renderer then builds the skeleton once
and **clones + patches only the holes** per occurrence instead of building every
node. It narrows the first‑mount gap to Solid on static‑heavy lists. The unified
benchmark app above is **fully dynamic** (every card has a conditional block and a
reactive list), so nothing here is clone‑cacheable and this path doesn't fire — the
~1.2× mount gap is the honest all‑dynamic case. See the
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
- **Fair flushing:** Svelte batches updates asynchronously — we call
  `flush()` (`svelte/internal`) per operation so its reconcile lands in the timed
  region (otherwise it flushes after, reading as a bogus 0 ms). React batches too —
  we use `flushSync` per operation. Exodra and Solid are synchronous.
- **Interleaved:** all frameworks alternate every round, order rotated, so machine
  load is shared. GC (`--js-flags=--expose-gc`) before each sample; only the
  operation under test is timed (setup/teardown are untimed). Full spread reported
  (min / p25 / median / p75 / max) per framework.
- **Memory:** retained heap via forced GC + `performance.memory.usedJSHeapSize`
  (`--enable-precise-memory-info`) around one mounted app. Directional.

## Honest caveats

- These are **our** benchmarks — a framework author's own harness deserves a
  skeptical eye. Run it yourself.
- We do **not** claim "fastest framework." Exodra is top‑tier alongside Solid: it
  leads every update axis (imperative list ops by a lot, declarative reconcile, the
  fat app‑update, reactive updates), ties toggle, retains the least memory on this
  app, and is a close second to Solid on first mount.
- Results depend on hardware, browser, and framework versions; the initial‑render
  delta is noisy run‑to‑run.

## Reproduce

```bash
git clone https://github.com/abaikov/exodra.git
cd exodra
npm install
npm run bench
```
