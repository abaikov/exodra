---
title: What the abstraction costs
---

# What the abstraction costs

"V8 collapses abstractions" is folklore. It is true often enough to be repeated
and false often enough to ruin a render loop, and quoting it is not evidence of
anything. This page is the version of that claim this project is willing to
defend: **one measurement, one mechanism read out of the code, and a plain
statement of what the measurement could not see.**

## The measurement

The change under test: the DOM renderer stopped reaching `attachExoChildren`
through a static module import and started taking its children reconciler from a
replaceable plugin interface — stored on the plan, read through the composed
surface, called through that field. On the day of the run that interface was still resolved
through a named lookup in a runtime map; that map has since been deleted and the reconciler is now
the plain `children` field on the backend, which is strictly less indirection than
what was measured here.

Measured on the mount axis of `packages/benchmarks` — the 80-card todo app,
batch 20, 100 rounds, medians — through `scripts/compare-axis.mjs`:

|                                     |           |
| ----------------------------------- | --------- |
| Normalised move on the `exodra` row | **+0.1%** |
| That row's noise floor              | **±3.3%** |
| Controls in the drift estimate      | 10        |

**What that entitles anyone to say, and it is less than it looks.** The gate
prints it in its own words (`compare-axis.mjs:328`):

> `· exodra: +0.1% — inside this row's ±3.3% floor, so this run CANNOT say the change was free`

So the honest sentence is: _this pair of runs could not see a cost, and it could
have seen one of 3.3% or more._ Anything that indirection cost on this axis is under
3.3% of a mount. It is not zero, because a run cannot measure zero; it is under
the resolution of the best comparison this project knows how to make.

For scale, the same axis's medians on the same day, ms/mount, lower first
(`packages/benchmarks/.gate/initial-render.slots.json`, printed from that file):
stage0 0.345, mikado 0.355, **exodra 0.405**, solid 0.490, marko 0.505, sinuous
0.870, react 0.980, svelte 0.980, uhtml 1.075, lit 1.105, voby 1.155. Absolute
numbers do not compare across runs — the table on
[Benchmarks](../benchmarks.md) quotes `initial-render.tmpl-full-2026-11-01`, a
different run, and reads differently.

## How the gate knows

A before/after read straight off two printed tables is mostly a reading of the
laptop. The file that does this comparison opens with the demonstration:
`packages/benchmarks/scripts/compare-axis.mjs:10-19` records three runs of one
axis with a single library line changed between runs 1 and 2 and **nothing**
changed between 1 and 3 — participants the change could not touch (mikado,
solid, stage0, react) moved 10-19%.

Four things make the number above mean something:

1. **Every axis runs a dozen participants interleaved in one browser session.**
   Whatever the ones that are not ours did between two runs is the machine.
   A control is a participant named in the explicit `FOREIGN` list of libraries
   this repository does not write (`compare-axis.mjs:128-142`, `:185`), and a name
   in neither list stops the comparison (`:217-224`) — mechanical, so a new row of
   ours cannot quietly be counted as a control and flatten the drift it should be measured against.
2. **Drift is the median of the controls' ratios** (`compare-axis.mjs:228`), and
   our row's move is divided by it.
3. **The resolution is what is left of the controls afterwards.** A perfect pair
   of runs leaves every control at 1.000; how far the worst _typical_ one sits
   from 1 is the smallest move the comparison can call a move. It is the 80th
   percentile of the residuals and not the maximum (`compare-axis.mjs:257-260`) —
   re-derived from the two recordings on 2026-08-16, the ten controls' residuals
   after drift are 0.28, 0.28, 0.31, 0.44, 0.54, 0.56, 1.55, 3.31, 6.63 and
   16.93% — six under 1%, the 80th percentile at 3.31%, and `react` at 16.93%.
   A maximum would have put the floor at ±16.9% and blinded the gate over one
   row nothing in the change could touch. (This paragraph said "nine of ten
   under 1%" until the residuals were recomputed; the count was wrong and the
   conclusion was not, since the argument rests on the 5× gap between the 80th
   percentile and the maximum.)
4. **Plus a per-row quantum floor.** `performance.now()` is clamped at ~0.1 ms,
   so a median moves in tick steps; the gate takes the larger of the pooled
   scatter and one tick on that row (`compare-axis.mjs:287-288`). Batching
   divides the tick: unbatched, the `exodra` mount row carries ±23.8% and the
   gate is blind, which is why the run above is at batch 20.

That fourth rule was not reasoned into existence. The gate's first self-test —
two recordings of an **unchanged** build — reported `exodraKept` as a real +2.1%
regression, because the pooled scatter said 2.1% was outside the noise
(`compare-axis.mjs:271-273`).

## The mechanism, read from the code

A cost that does not show up should be explainable, or the measurement is just
luck. Here is where the indirection actually happens.

**Once per process.** `new ExoDomBackend()` calls `composeExoPlugins(this, …)` once,
in its constructor, to put the exonode surface on itself
(`packages/dom/src/dom/ExoDomBackend.ts`); every pack an application composes is
a unary decorator wrapped around the finished object —
`withExoHydration(withExoCompiler(new ExoDomBackend()))` — and each one is another
`composeExoPlugins` call, which mutates and returns the same object. That is the
whole of the resolution. There is no namespace, no slot registry and no provider
ordering: a plugin is a bag of factories, each receiving what already stands under
its name (`packages/core/src/plugins/types/TExoPlugin.ts`), and merging leaves the
overridden names as own properties on one flat object. An application that composes nothing holds
the shipped implementations in plain fields and pays for no lookup at all.

**Once per mounted root.** `render` reads `this.events` for the strategy's
`install` hook and passes `this` — the backend itself — into `exoDomSchemaOf`
(`packages/dom/src/dom/ExoDomBackend.ts`). Nothing is interned and no record is
minted: the key a caller hands down is the object it already holds.

**Once per (schema, backend).** Two interfaces are read as **fields** at this
frequency, and both reads are inside `compileExoDomSchema`, beside the build of the
`<template>` prototype that already happens there: `backend.events` at the top of it
(`packages/dom/src/dom/compileExoDomSchema.ts:699`), then `backend.writers` where the
setters are built (`compileExoDomSchema.ts:796`):

```ts no-check
// packages/dom/src/dom/compileExoDomSchema.ts
const writers = backend.writers;
```

The plan is cached on the machine, at the index the backend took when it was
constructed (`packages/dom/src/dom/exoDomSchemaOf.ts`):

```ts no-check
const held = machine.forms[backend.backendType];
if (held !== undefined) return held as TExoDomSchema;
```

One array read, one compare, return — whatever the number of backends in the
process. It was two compares (`plan.events === events && plan.runtime === runtime`)
until the interfaces became fields on one object.

**Once per instance.** There is no separate receiver to build. The object a wire
is handed **is** the instance record, minted by one constructor per composed
surface, whose prototype **is** that surface:

```ts no-check
// packages/dom/src/dom/factories/createExoDomInstanceFactory.ts
function ExoDomInstanceBody(this: TExoDomInstanceRecord, schema: TExoDomSchemaBase): void {
    this.nodes = EXO_EMPTY_NODES;
    // …twelve own fields, in one fixed order…
    this.live = null;
}
ExoDomInstanceBody.prototype = surface;
```

**One call per surface**, because every constructor function carries its own
initial map: two calls for one composition would split that composition's
instances across two hidden classes. `new` rather than an object literal with a
`__proto__` key is measured, and the note at that line says by how much.

**Per filled children port: nothing the composition decides.** The port methods are
shipped exonode methods, and the reconciler is whatever function a transition called over
them — one from `createExoChildrenReconciler`, or one of the application's own.

**Per list row, per update, per dispatched event: nothing.** Nothing below this
line consults a composition. A plugin's factory receives `next` and runs **once**,
at merge, in the backend's constructor — it is handed no exonode, no plan and no
child, so there is nothing per-row it _could_ consult
(`packages/core/src/plugins/types/TExoPlugin.ts`). "Resolve once, at composition, never per
row" is the shape of what a plugin is given rather than a rule it is asked to
follow.

## Why the call site stays monomorphic — and what would break it

This part is **read and reasoned, not profiled.** No inline-cache state was
inspected; what follows is the argument for why the shape is favourable, and it
should be read as a hypothesis consistent with the measurement rather than as its
explanation.

The field **load** is monomorphic because every instance record is built by one
constructor, writing one fixed field order, so every one of them in the process
shares a hidden class. (It has been a `class`, and an object literal with a
`__proto__` key; it is a constructor again, and the property that matters here is
the same one throughout — a fixed field order.) That holds regardless of
composition.

The **call** is monomorphic when the process has one composition: each entry of
`schema.setters` is then always the same function object for its port, so a call
site sees one callee.
An application that builds **one backend at module level** — the shape a nested
`with*` chain is meant for — has exactly that.

What would change it, stated plainly:

-   **Two compositions live at once.** A page that renders one root under the
    shipped composition and another under a swapped one puts two different
    writer or event-attach functions through the same call site. Whether that costs anything
    measurable has not been measured here.
-   **A backend per render.** This is the one that is not a micro-cost. The backend
    **is** the cache key and it is compared by pointer, so a
    `new ExoDomBackend()` written inside a component or a route handler takes a new
    `backendType` and **recompiles every schema, markup parse included, on every
    render**. It is not a slower render; it is a different program.
    `warnExoFormGrowth` (`packages/core/src/machine/warnExoFormGrowth.ts`) says so out
    loud in development once a machine holds eight schemas.

## What this measurement does not cover

-   **One interface, one axis.** The A/B was the children reconciler on the mount
    axis. The event strategy was already threaded as a parameter before it became a
    named field, so it was not part of this comparison, and neither were the value
    writers.
-   **Update, reconcile and toggle axes were not compared.** The reasoning above
    says the per-row path is untouched; the reasoning is not a measurement.
-   **Hydration was not compared.**
-   **A cost between 0% and 3.3% would be invisible here.** On a 0.405 ms mount
    that is up to ~0.013 ms per mounted app. If that matters to you, run the gate
    yourself: `node scripts/run-one-axis.js <axis> --record=<label>` twice, then
    `node scripts/compare-axis.mjs <axis> <before> <after>`.
