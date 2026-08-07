# @exodra/profiler

> ⚠️ **DEPRECATED.** This package profiled the per-node `ExoNode` base class, which
> has been removed — the DOM and string renderers no longer share a base. Use
> **[`@exodra/dom-profiler`](../dom-profiler)** to profile the live DOM renderer
> (`ExoNodeDom`); it works in the browser and under jsdom.
>
> What remains here is the generic, renderer-agnostic `profileClass` /
> `ClassProfiler`, which patch any class's prototype methods. The package is
> otherwise unmaintained, and importing it logs a deprecation warning.

## What this package still exports

That is the whole public API:

```typescript
import { profileClass, ClassProfiler } from '@exodra/profiler';
import type { ProfilableClass, ProfileMetrics, ProfileCallback } from '@exodra/profiler';
```

Everything the older README described — `startProfiling`, `stopProfiling`,
`withProfiler`, the `Profiler` component, `profileExoNode`, `ExodraProfiler` —
targeted the removed `ExoNode` base and is **gone**. None of it was quietly
re-added under another name.

## Profiling the renderer — use `@exodra/dom-profiler`

```typescript
import { profileDom } from '@exodra/dom-profiler';

const profiler = profileDom();
// …render and interact…
console.table(profiler.getReport());   // heaviest first
profiler.stop();                        // restore the originals, get the final report
```

## `profileClass` — timing any class's methods

Generic and unrelated to Exodra's internals: it wraps a class's prototype methods
and reports how long each call took. Useful for a store, a parser, anything.

```typescript
import { profileClass } from '@exodra/profiler';

class Repository {
    findAll() {
        /* … */
    }
    save() {
        /* … */
    }
}

// The callback is the second positional argument and fires per method call.
profileClass(Repository, ({ className, method, duration }) => {
    if (duration > 5) {
        console.warn(`${className}.${method} took ${duration.toFixed(1)}ms`);
    }
});

// Narrow the surface if the class is large:
profileClass(Repository, onSample, { methods: ['findAll'] });
profileClass(Repository, onSample, { excludeMethods: ['toString'] });
```

`ProfileMetrics` carries `{ className, method, duration, timestamp, args? }`.
`profileClass` patches the prototype in place and returns `void` — there is no
un-patch, so apply it to a class you control, in a session you are measuring.

`ClassProfiler` is the same thing as a class, if you would rather hold the instance.

## Installation

```bash
npm install --save-dev @exodra/dom-profiler   # what you probably want
npm install --save-dev @exodra/profiler       # only for profileClass
```

## License

MIT
