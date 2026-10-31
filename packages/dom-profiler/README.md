# @exodra/dom-profiler

Performance profiling for Exodra's **DOM renderer**. Works in the browser and
under **jsdom** (or plain Node with a DOM shim) — timing uses `performance.now()`
with a `Date.now()` fallback, and it requires no browser-only APIs.

> Replaces `@exodra/profiler`, which profiled the removed per-node `ExoNode` base.

## What can be measured, and what cannot

A render in the schema core is a **clone**, a **replay of a walk**, and one
indirect call per **port**. None of the first two is a method with a name, so
there is nothing there to patch. Two things do have names, and this package
instruments both:

| instrument       | patches                       | answers                                                     |
| ---------------- | ----------------------------- | ----------------------------------------------------------- |
| `profileDom(B)`  | one backend's **connector methods** | which **calls my wiring makes** cost — `attr`, `text`, `list` |
| `profilePorts(C)`| one schema's **setter table** | which **place in my template** costs — `attr:style`, `text`  |

Neither sees the clone or the walk. If a report accounts for a fraction of a
render you measured elsewhere, the rest is those two, and it is not addressable
from here.

## The observer effect

**Wrapping the hot path measures a different program than the one that runs
unwrapped.** A setter's body is often a single `setAttribute`; the wrapper around
it — two clock reads, a `try`/`finally`, a map lookup — costs several times that,
and it defeats the inlining the unwrapped table relies on. The **ratios** inside
one report are the useful output. The absolute numbers are the profiler's, not
the renderer's, and a benchmark run with a profiler active is not measuring
Exodra.

The same holds per method. `attr` is two array loads and a call, so its wrapper
costs more than its body; every profiled call additionally pays two
`performance.now()` reads, a `try`/`finally` and a map lookup that the unwrapped
program does not.

There is one cost that is not a per-call count. A composed backend is the
prototype of every connector on every schema's stack, so writing to it invalidates
the prototype validity cell: every inline cache that had resolved `c.attr` through
it is dropped and re-warms on the next call. That happens **twice** — once when
profiling starts, once when it is restored — and it pushes in the same direction
as everything else here.

What it costs when it is **off** is nothing at all. `restore()` puts the original
function back, so the program afterwards is the program before, with no flag and
no branch left standing. Turning it on costs one closure and one property write
per patched name, and the same again at restore.

None of these numbers is measured. They are counts of the operations the wrapper
adds; treat any absolute figure a report gives you as unattributed.

## Per-method: `profileDom(backend)`

```ts setup
import type { TExoDomMachine } from '@exodra/dom';

declare const APP: TExoDomMachine;
declare const container: Element;
declare const theme: { setValue(value: string): void };
```

```ts
import { profileDom } from '@exodra/dom-profiler';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend()); // ONE, at module level — it is the schema cache key

const profiler = profileDom(backend); // patch that backend's connector methods (reversible)

backend.render(APP, container);       // exercise the renderer

console.table(profiler.stop());      // per-method count / total / avg / max (ms),
                                     // sorted by total time; also restores the backend
```

**It takes the backend, and it must be the one your page renders through.** A
connector is data whose prototype *is* the composed backend, so `attr`, `text`,
`html`, `on`, `one`, `list`, `build`, `childList`, `onTeardown` and the rest of
`EXO_DOM_NODE_VOCABULARY` are that object's own properties — that is the surface,
and it is exactly what a wiring function calls. Hand it a *different* backend,
even one composed identically, and you get an empty report: composition is
compared by pointer, which is the same rule `profilePorts` states.

`profileDom(backend, options)` accepts `{ methods, excludeMethods }` to focus on
specific methods (e.g. `{ methods: ['attr', 'text', 'list'] }`). `methods`
**narrows** the connector set rather than replacing it, so no option can reach
anything outside it.

### Why the profiled list is read off the pack

The names come from `Object.keys(EXO_DOM_NODE_VOCABULARY)` rather than a hand-written
list, so a method added to or removed from the DOM connector is picked up or
dropped without touching this package. The exclusions that follow from it are a
correctness rule, not tidiness:

- **The plugin-interface fields** on a backend — `events`, `writers`,
  `createInstance`, `createChild` and the `hydrateSurface` a hydrating composition
  adds — are functions too, and every
  one of them is **spent into a schema** when that schema compiles. Wrapping one would
  do nothing for a declaration already compiled, because the schema holds the unwrapped
  function; and it would **bake the wrapper permanently** into any schema first
  rendered while profiling was on, surviving `stop()`. That is the "nothing left
  patched" promise broken silently, in whichever schema happened to be new.
- **`render` and `hydrate`**, for the plainer reason that they are entry points
  rather than anything a wiring function calls.

### Why it patches instead of composing

Every other capability in this renderer composes — `withSomething(new
ExoDomBackend())` — and `composeExoPlugins` hands each entry the current
implementation as `next`, which is exactly "wrap the shipped method". A
`withExoProfiling()` pack would need no patching at all. Two things it cannot do,
and they are this instrument's whole contract:

- **It cannot be turned on after the fact.** A pack is an argument to the
  constructor, and a backend is built once, at module level, because it is the
  schema cache key. Composing a profiler means building a *second* backend — a
  second key, a recompile of every declaration, and a profile of a composition the page
  does not render through.
- **It cannot be turned off.** `composeExoPlugins` writes own properties and keeps
  no record of what stood under them, so nothing can un-compose a pack. The
  nearest thing is a permanent wrapper holding a flag — a branch on every `attr` of
  every row for the life of the process, in exchange for a `stop()` that leaves
  the program changed.

So patching stays, and the target is legitimate: an object the application
constructs and names, not a class's shared prototype.

**The connector is the surface there is.** A render is a clone, a replay of a walk
over an `Int32Array`, and `schema.setters[i]` — none of which is a method anyone can
name. What a *wiring function* does is entirely calls into the connector, so
patching it answers "which of the things my components ask for cost the most",
which is the question a component author can act on.

- `getReport()` — aggregated timings so far (heaviest first).
- `reset()` — clear samples, keep profiling active.
- `stop()` — restore the backend's own methods and return the final report.

Two things it will not show you:

- **A static component's instances.** They never touch a connector — they are a
  clone and a walk.
- **Hydration.** A hydrating render answers on `TExoHydrateNode`:
  `withExoHydration` merges `EXO_HYDRATE_NODE_VOCABULARY` onto a *second* object whose
  prototype is the backend, so every name hydration declares — `attr`, `text`,
  `html`, `on`, `one`, `list`, `build`, `openChildList`, `portNodeWriter`,
  `portNodeReader`, the child-list anchors — shadows the
  wrapped one and is timed by nothing. The three it does not declare (`onTeardown`,
  `portTable`, `childList`) still reach this profiler.

## Per-port: `profilePorts(component)`

```ts
import { profilePorts } from '@exodra/dom-profiler';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const profiler = profilePorts(APP, backend);   // BEFORE the render, SAME backend
const dispose = backend.render(APP, container);
theme.setValue('dark');                        // updates go through the wrapped setters

console.table(profiler.stop());
// port  label        count  totalMs  avgMs  maxMs
//    2  attr:style      41    3.902  0.095  0.31
//    5  text            41    0.284  0.007  0.02
```

It takes a **component** (or a bare declaration) and wraps the entries of its compiled
schema's setter table. A setter is chosen once, at compile time, and bound to
everything about its port that cannot change — so the entry that dominates a
report names the template position to look at.

It is **opt-in and per declaration**, not global: a setter table belongs to one schema,
and there is no registry of schemas to walk.

Two rules, both structural rather than incidental:

- **Start it before the render to see the render.** Every fill indexes
  `schema.setters[port.index]` afresh — `attr`, `text` and `html` all do, and so
  does the shared writer `portNodeWriter()` hands out — so a profiler started
  after the render still times every later update; what it loses is the initial
  fills, which is most of the mount.
- **An event port and a ref port are invisible, and they always will be.** `on`
  reads the event pack's body off the schema rather than the setter table, and a
  ref port has no writer at all; the table's entries for both are
  `exoUnsettableEvent` and `exoUnsettableRef`, which exist to throw. They are
  labelled in the report so a declaration's whole port list shows, and they can never
  carry a non-zero time. A **text** port, by contrast, *is* timed: the Text node
  it writes is a slot in the walk, so the write goes through the table like any
  attribute.

**Pass it the same backend you render from.** The second parameter is the
`ExoDomBackend` itself, and it is **required** — there is nothing to default it to
and no way to name half of it:

```ts
import { composeExoPlugins } from '@exodra/core';
import { ExoDomBackend, createExoDelegatedEvents, withExoCompiler } from '@exodra/dom';
import { profilePorts } from '@exodra/dom-profiler';

// ONE backend, at module level, for the render AND the profiler.
const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    events: () => createExoDelegatedEvents(['click']),
});

const profiler = profilePorts(APP, backend);
backend.render(APP, container);
```

A schema is compiled per **(declaration, backend)** and the backend is compared by
pointer, so profiling one backend while the page renders under another compiles a
second schema and wraps a setter table nobody calls: nothing throws and the report
comes back **empty**. A `new ExoDomBackend()` written at either call site is a
fresh key — and a `with*` decorator mutates and returns what it is handed, so the
identity that matters is the one the outermost call produced. Build the chain once
and pass that object to both.

That is not a hypothetical. Under the layer this replaced the key had two halves
and this profiler named only one of them, twice; requiring the whole object is what
makes "the same value" something a caller can actually do.

## Generic profiler

`profileMethods(object, label, callback, options)` patches every own function
property of one object to time each call and returns a `restore()` that puts the
originals back. It is reversible, promise-aware and throw-safe, and it is what
both instruments above are built on.

An object rather than a class, because a DOM connector's methods are not on a
class: a connector is data whose prototype is the **composed backend**, and the
methods are that object's own properties, put there by `composeExoPlugins`. There is
no prototype to patch, and the object that replaced it is the thing an application
constructs, names and renders through.

A **getter or a non-writable slot is skipped**, not made writable — a patch that
has to change a descriptor's shape cannot honour "put the object back exactly as
it was".

`profileClass(SomeClass, callback, options)` is the same loop pointed at
`Class.prototype`, which is an object whose own properties are its methods. Use it
on your own classes; it imports nothing from Exodra.

Both take `options`: `{ methods }` restricts the patch to those names (default:
every own function property), `{ excludeMethods }` removes names from it.
