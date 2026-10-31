---
title: Profiler
---

# Profiler

[`@exodra/dom-profiler`](https://www.npmjs.com/package/@exodra/dom-profiler)
times Exodra's DOM renderer. There is no profiling built into the core — it is
added at runtime when you import this package, and removed again when you
`stop()`.

It works **wherever the renderer runs** — the browser, [jsdom](../guides/testing.md),
or plain Node with a DOM shim — because timing uses `performance.now()` with a
`Date.now()` fallback and it needs no browser-only APIs.

## What can be measured, and what cannot

A render in the schema core is a **clone**, a **replay of a walk**, and one
indirect call per **port**. Neither the clone nor the walk is a method with a
name, so there is nothing there to patch. Two things do have names:

| instrument | patches | answers |
| --- | --- | --- |
| `profileDom(backend)` | the **composed backend** you hand it | which **calls your wiring makes** cost — `attr`, `text`, `list`, `one` |
| `profilePorts(C)` | one schema's **setter table** | which **place in your template** costs — `attr:style`, `text` |

:::caution Wrapping the hot path measures a different program
A setter's body is often a single `setAttribute`; the wrapper around it — two
clock reads, a `try`/`finally`, a map lookup — costs several times that, and it
defeats the inlining the unwrapped table relies on. Read the **ratios** inside
one report. The absolute numbers are the profiler's, not the renderer's, and a
benchmark run with a profiler active is not measuring Exodra.
:::

## Installation

```bash
npm install --save-dev @exodra/dom-profiler
```

## Per-method: `profileDom(backend)`

```ts setup
import type { TExoCompilerApi, TExoDomBackend, TExoDomMachine } from '@exodra/dom';

declare const APP: TExoDomMachine;
declare const container: Element;
declare const backend: TExoDomBackend & TExoCompilerApi;
declare const theme: { setValue(value: string): void };
```

```ts
import { profileDom } from '@exodra/dom-profiler';

// Patch the backend the application already built — reversible.
const profiler = profileDom(backend);

backend.render(APP, container);     // exercise the renderer

console.table(profiler.stop());     // per-method report; also restores the backend
```

**It takes the backend**, and that is the whole of what changed when a connector
stopped being a class. A connector is a plain object whose prototype is the
composed backend, and the connector methods are own properties of that backend, so
there is no shared prototype to reach: the object an application constructed and
named is the target. Pass the one the page renders through — profiling a second
backend built for the purpose would be a second plan-cache key, a recompile of
every schema, and a report about a composition nobody renders with.

The names it wraps are the keys of `EXO_DOM_NODE_VOCABULARY` — `attr`, `text`,
`html`, `on`, `one`, `list`, `onTeardown` and the rest of the exonode
surface, which is exactly what a wiring function calls. Patching covers every
exonode on every plan's stack **of that backend** and is **reversible**.

The six plugin-interface fields are deliberately **not** wrapped, and the reason is
not tidiness: each is spent into a plan when that plan compiles, so wrapping one
would do nothing for a schema already compiled and would bake the wrapper
permanently into any schema first rendered while profiling was on — surviving
`stop()`. `render` and `hydrate` are excluded too, as entry points rather than
things a wiring function calls.

- `getReport()` — aggregated timings so far, heaviest first.
- `reset()` — clear collected samples, keep profiling active.
- `stop()` — put the backend's own methods back and return the final report.

An update is timed too: a transition writes through `c.attr` / `c.text`, which are
the wrapped names, so every write an effect or a handler makes while profiling is
on lands in the report.

Two things it will not show you:

- **A static component's instances.** They never touch a connector.
- **Hydration.** The adopting surface is a separate object — its prototype is the
  backend, but its own methods shadow the ones this patched — so an adopted page is
  not profiled by this.

## Per-port: `profilePorts(component)`

```ts
import { profilePorts } from '@exodra/dom-profiler';

const profiler = profilePorts(APP, backend);   // BEFORE the render
const dispose = backend.render(APP, container);
theme.setValue('dark');                        // updates go through the wrapped setters

console.table(profiler.stop());
// port  label        count  totalMs  avgMs  maxMs
//    2  attr:style      41    3.902  0.095  0.31
//    5  text            41    0.284  0.007  0.02
```

It takes a **component** (or a bare schema) and wraps the entries of its compiled
plan's setter table, so a report names the template position to look at rather
than the method that was called. It is **opt-in and per schema**: a setter table
belongs to one plan, and there is no registry of plans to walk.

Two rules, both structural:

- **Start it before the render to see the render.** Every fill indexes
  `schema.setters[port.index]` afresh — `attr`, `text` and `html` all do, and so
  does the shared writer `portNodeWriter()` hands out — so a profiler started
  after the render still times every later update; what it loses is the initial
  fills, which is most of the mount.
- **An event port and a ref port are invisible, and they always will be.** `on`
  reads the event pack's body off the schema rather than the setter table, and a
  ref port has no writer at all; the table's entries for both are
  `exoUnsettableEvent` and `exoUnsettableRef`, which exist to throw. A **text**
  port, by contrast, *is* timed: the Text node it writes is a slot in the walk,
  so the write goes through the table like any attribute.

**Pass it the backend the page renders from.** The second parameter is
**required** and it must be the **same object**:

```ts
import { composeExoPlugins } from '@exodra/core';
import { ExoDomBackend, createExoDelegatedEvents, withExoCompiler } from '@exodra/dom';
import { profilePorts } from '@exodra/dom-profiler';

// once, at module level
const delegatedBackend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
  events: () => createExoDelegatedEvents(['click']),
});

const profiler = profilePorts(APP, delegatedBackend);
delegatedBackend.render(APP, container);
```

A plan is compiled per **(schema, backend)** and the backend is compared by
pointer, so profiling under one backend while the page renders under another
compiles a second plan under a key no render ever uses: the profiler then wraps a
setter table nothing calls, nothing throws, and the report comes back **empty**.
`new ExoDomBackend()` returns a fresh object per call — and a `with*` decorator
mutates and returns whatever it was handed, so the identity that matters is the one
the outermost call produced. Construct the chain once and pass that value to both.

The parameter has no default for exactly that reason. A default would have to name
a shipped composition here, and every application that composed anything at all
would then be profiled under a key it never rendered through.

### Focusing on specific methods

```ts
import { profileDom } from '@exodra/dom-profiler';

const profiler = profileDom(backend, {
  methods: ['attr', 'text', 'list'],      // allow-list
  // excludeMethods: ['onTeardown'],      // or deny-list
});
```

An allow-list **narrows** the connector set rather than replacing it: naming a
method the connector does not have profiles nothing, and naming none profiles the
whole surface.

### Under jsdom

Since it only uses `performance.now()`/`Date.now()`, it profiles the renderer the
same way inside a jsdom test (or any Node DOM environment):

```ts
// @vitest-environment jsdom
import { profileDom } from '@exodra/dom-profiler';

const profiler = profileDom(backend);
const root = document.createElement('div');
document.body.appendChild(root);
backend.render(APP, root);
console.table(profiler.stop());
```

## Report format

`getReport()` / `stop()` return one entry per profiled method, sorted by total
time:

```ts
interface TExoDomProfileEntry {
  method: string;   // e.g. 'attr'
  count: number;    // how many times it ran
  totalMs: number;  // total wall time
  avgMs: number;    // totalMs / count
  maxMs: number;    // slowest single call
}
```

## Profiling any class, or any object

`profileClass` patches the prototype methods of **any** class and returns a
`restore()` — use it to profile your own services. Its twin,
`profileMethods(target, label, callback, options?)`, does the same for
the **own** properties of a plain object, and is what `profileDom` is built on now
that a backend is an object rather than a class:

```ts
import { profileClass } from '@exodra/dom-profiler';

declare class MyService { load(): Promise<void>; save(): Promise<void>; }

const restore = profileClass(MyService, (sample) => {
  console.log(`${sample.className}.${sample.method}: ${sample.durationMs}ms`);
}, {
  methods: ['load', 'save'],    // optional allow-list
  excludeMethods: ['toString'], // optional deny-list
});

// ...exercise MyService...
restore(); // put the original methods back
```

## Links

- npm: [`@exodra/dom-profiler`](https://www.npmjs.com/package/@exodra/dom-profiler)
- GitHub: [`packages/dom-profiler`](https://github.com/abaikov/exodra/tree/master/packages/dom-profiler)
