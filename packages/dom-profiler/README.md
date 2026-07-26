# @exodra/dom-profiler

Performance profiling for the Exodra **DOM renderer** (`ExoNodeDom`). Works in the
browser and under **jsdom** (or plain Node with a DOM shim) — timing uses
`performance.now()` with a `Date.now()` fallback, and it requires no browser-only
APIs.

> Replaces `@exodra/profiler`, which profiled the removed per-node `ExoNode` base.

## Usage

```ts
import { profileDom } from '@exodra/dom-profiler';
import { mount } from '@exodra/dom';

const profiler = profileDom();     // patch ExoNodeDom (global, reversible)

mount(app, container);             // exercise the renderer

console.table(profiler.stop());    // per-method count / total / avg / max (ms),
                                   // sorted by total time; also restores the class
```

`profileDom(options)` accepts `{ methods, excludeMethods }` to focus on specific
methods (e.g. `{ methods: ['buildTree', 'updateChildren', 'setupBindings'] }`).

- `getReport()` — aggregated timings so far (heaviest first).
- `reset()` — clear samples, keep profiling active.
- `stop()` — restore `ExoNodeDom` and return the final report.

## Generic profiler

The underlying `profileClass(SomeClass, callback, options)` patches any class's
prototype methods to time each call and returns a `restore()`. Use it to profile
your own classes.
