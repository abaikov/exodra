---
title: Benchmarks
sidebar_position: 2
---

# Benchmarks

These are Exodra's **own** benchmarks — not an independent third‑party comparison.
They run in headless Chromium (Playwright) over a Vite build and compare Exodra
against Solid, Svelte, and React on the same workloads. Numbers move with
hardware and framework versions, so treat them as a directional signal and
**reproduce them yourself**:

```bash
npm run bench
```

## Headline: initial render of a large tree

This is the case that does real, measurable work (millisecond scale), so it's the
one worth taking seriously. Median time to build and mount a large component tree:

| Framework  | Median   | Relative     |
|------------|----------|--------------|
| **Exodra** | **~1.05 ms** | —        |
| Solid      | ~1.9 ms  | 1.8× slower  |
| Svelte     | ~4.4 ms  | 4.2× slower  |
| React      | ~5.05 ms | 4.8× slower  |

Exodra leads here because there's no virtual‑DOM diffing and no per‑prop runtime
type dispatch — the static/reactive/event split is resolved at compile time.

## Fine‑grained updates

Single‑operation updates (one signal write, one list op) complete in **well under
a millisecond** for both Exodra and Solid — below the timer's resolution, so the
**median is effectively 0 ms for everyone**. We report the *average* below only to
show Exodra is in the same class, not to claim a meaningful multiplier. Treat
these as "both are effectively instant."

| Benchmark              | Exodra (avg) | Solid (avg) | Svelte (avg) |
|------------------------|--------------|-------------|--------------|
| Conditional render     | ~0.009 ms    | ~0.025 ms   | ~0.075 ms    |
| List operations        | ~0.001 ms    | ~0.020 ms   | ~0.021 ms    |
| Advanced list ops      | ~0.004 ms    | ~0.033 ms   | —            |
| Nested components       | ~0.001 ms   | ~0.001 ms   | —            |
| Multiple signals       | ~0.014 ms    | ~0.024 ms   | —            |
| Effect performance     | ~0.001 ms    | ~0.002 ms   | —            |
| Signal operations      | ~0 ms        | ~0 ms       | —            |

(Not every micro‑benchmark implements every framework — dashes mean "not
measured in this case.")

## Methodology

- **Harness:** headless Chromium driven by Playwright, running against a Vite
  build of the benchmark app (`packages/benchmarks`).
- **Sampling:** each case runs many iterations after a warm‑up; we report the
  **median** (and, for sub‑millisecond cases, the average) per run.
- **What's measured:** the timed region is the framework's update/render work for
  that operation — verification of the resulting DOM happens *outside* the timed
  region.
- **Verification:** every Exodra case asserts the DOM actually changed (e.g.
  `Item 0` is present/absent) before its numbers count — a benchmark that renders
  nothing is a failed benchmark, not a fast one.

## Honest caveats

- These are **our** benchmarks. A framework author's own harness always deserves
  a skeptical eye — run it yourself.
- Micro‑benchmarks that land under the timer's resolution are **ties**, not wins.
  The initial‑render macro‑benchmark is the meaningful comparison.
- Results depend on hardware, browser, and the exact versions of each framework.
- The goal isn't "we win every line" — it's that removing virtual‑DOM diffing and
  per‑update type dispatch shows up on real render workloads.

## Reproduce

```bash
git clone https://github.com/abaikov/exodra.git
cd exodra
npm install
npm run bench
```
