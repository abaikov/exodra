---
title: Profiler
---

# Profiler

[`@exodra/dom-profiler`](https://www.npmjs.com/package/@exodra/dom-profiler)
profiles the Exodra **DOM renderer** (`ExoNodeDom`): it patches the renderer's
methods (`buildTree`, `updateChildren`, `setupBindings`, `applyStatic`, …) to
record how long each takes and how often it runs. There is no profiling built into
the core — it is added at runtime when you import this package, and removed again
when you `stop()`.

It works **wherever `ExoNodeDom` runs** — the browser, [jsdom](../guides/testing.md),
or plain Node with a DOM shim — because timing uses `performance.now()` with a
`Date.now()` fallback and it needs no browser‑only APIs.

## Installation

```bash
npm install --save-dev @exodra/dom-profiler
```

## Basic usage

```ts
import { profileDom } from '@exodra/dom-profiler';
import { mount } from '@exodra/dom';

const profiler = profileDom();      // patch ExoNodeDom (global, reversible)

mount(app, container);              // exercise the renderer

console.table(profiler.stop());     // per-method report; also restores the class
```

`profileDom` patches `ExoNodeDom` **globally** (every instance is profiled) and
**reversibly** — `stop()` restores the original methods.

- `getReport()` — aggregated timings so far, heaviest first.
- `reset()` — clear collected samples, keep profiling active.
- `stop()` — restore `ExoNodeDom` and return the final report.

### Focusing on specific methods

```ts
const profiler = profileDom({
  methods: ['buildTree', 'updateChildren', 'setupBindings'], // allow-list
  // excludeMethods: ['createDomElement'],                    // or deny-list
});
```

### Under jsdom

Since it only uses `performance.now()`/`Date.now()`, it profiles the renderer the
same way inside a jsdom test (or any Node DOM environment):

```ts
// @vitest-environment jsdom
import { profileDom } from '@exodra/dom-profiler';
import { mount } from '@exodra/dom';

const profiler = profileDom();
const container = document.createElement('div');
document.body.appendChild(container);
mount(app, container);
console.table(profiler.stop());
```

## Report format

`getReport()` / `stop()` return one entry per profiled method, sorted by total
time:

```ts
interface TExoDomProfileEntry {
  method: string;   // e.g. 'buildTree'
  count: number;    // how many times it ran
  totalMs: number;  // total wall time
  avgMs: number;    // totalMs / count
  maxMs: number;    // slowest single call
}
```

## Profiling any class

The underlying `profileClass` patches the prototype methods of **any** class and
returns a `restore()` — use it to profile your own services:

```ts
import { profileClass } from '@exodra/dom-profiler';

const restore = profileClass(MyService, (sample) => {
  console.log(`${sample.className}.${sample.method}: ${sample.durationMs}ms`);
}, {
  methods: ['load', 'save'],    // optional allow-list
  excludeMethods: ['toString'], // optional deny-list
});

// ...exercise MyService...
restore(); // put the original methods back
```

## Deprecated: `@exodra/profiler`

The older
[`@exodra/profiler`](https://www.npmjs.com/package/@exodra/profiler) package is
**deprecated**. It profiled the per‑node `ExoNode` base class, which has been
removed — the DOM and string renderers no longer share a base. Its generic
`profileClass` still works on any class, but use **`@exodra/dom-profiler`** to
profile the live DOM renderer.

## Links

- npm: [`@exodra/dom-profiler`](https://www.npmjs.com/package/@exodra/dom-profiler)
- GitHub: [`packages/dom-profiler`](https://github.com/abaikov/exodra/tree/master/packages/dom-profiler)
