# @exodra/test-utils

The shared harness for this repository's own test suites. It is **private and never
built** — consumers reach the source through the alias in the root `vitest.config.ts`,
the same way every other `@exodra/*` import resolves during a test run. Nothing here
ships to a user.

The bar for a helper landing here is that every copy of it was **byte-identical**
across the suites, and that its behaviour is something a test *depends on* rather than
something a test happens to get. Two helpers that differ by one line are not one
helper with a flag.

## The exports

| Export | For |
| --- | --- |
| `host()` | A fresh container **in** `document.body` |
| `detachedHost()` | A fresh container that is **not** in the document |
| `source(initial)` | A writable cell that can be asked how many listeners it has |
| `TExoTestSource<T>` | That cell's type |
| `buildRow(b)` | The benchmark's row shape, built into a schema |
| `TExoTestRowPorts` | The five ports `buildRow` returns |
| `describeIfPresetBuilt(url)` | `describe`, or `describe.skip` if the Babel preset's dist is missing |

## `host()` and `detachedHost()`

They sit side by side, with the same signature and different behaviour, precisely
because the difference between them — whether the container is in the document —
decides whether delegated events fire, whether jsdom attempts a navigation, and
whether `document.querySelector` can see the render. **The name is the
documentation**; a detached container spelled `host()` next to thirty attached ones
spelled `host()` is a trap.

A test that renders into a **connected** element gets, from the browser and from
jsdom, behaviour a detached tree simply does not have:

- `document.querySelector` / `document.getElementById` can see what was rendered;
- events bubble past the container to `document`, which is what every delegated
  listener is attached to, so a delegation test can only be written against a
  connected host;
- focus, `document.activeElement` and the form-control activation behaviour exist at
  all;
- `isConnected` is `true`, and code that checks it takes its connected branch.

`detachedHost()` costs exactly those four, and is the right choice when a case
**asserts that something works while disconnected** — context lookup walking a
detached parent chain, a subtree built before it is inserted — or when it wants
nothing the document provides and should say so at the call site rather than leave a
reader wondering whether a missing `appendChild` was an oversight.

### What `detachedHost()` refuses to buy: silence around anchors

It is tempting to reach for it because a test that clicks an `<a>` prints
`Not implemented: navigation to another Document`, and it does not work. jsdom's
"cannot navigate" check is `localName !== "a" && !isConnected`
(`HTMLHyperlinkElementUtils-impl.js`), so an anchor runs its activation behaviour
whether or not it is in a document — as the HTML spec says and as a real browser does;
only `<area>` and friends are gated on being connected.
`router/src/components/tests/exo-link.test.ts` is
detached **and** prints those lines anyway, and the only thing that would stop them
is cancelling the default whose survival is what those cases assert.

### `host()` never cleans up, deliberately

Every call adds one more `<div>` to `document.body` and leaves it there for the rest
of the file. That is what every copy of this helper did: each case gets an **empty**
container of its own, so no case can read another's nodes and no case has to remember
to clean up. Do not "fix" it with an `afterEach` that empties the body — a test that
keeps a reference to a rendered node and asserts on it after a later render would
start failing for a reason that is not about the code under test.

## `source()` and `TExoTestSource`

A shared value several machines follow, in its smallest form: `getValue` / `setValue` /
`onChange`, the shape a machine's effect subscribes to —

```ts no-check
m.effect((c) => {
    show(c);
    return data.onChange(() => show(c));
});
```

— plus the one thing no real store exposes.

`subscribers()` is the addition, and it is the only reason the tests hand-roll a cell
at all: an effect that keeps its subscription after teardown holds the element, the
machine and everything they close over alive for as long as the source lives. **Counting
listeners on the source is the leak assertion**, and no shipped source can be asked
that question.

Behavioural guarantees, because tests depend on each of them:

- `setValue` notifies **synchronously**, before it returns. Every assertion in the
  suites that use this reads the DOM on the line after a `setValue`, with no flush and
  no `await`.
- `setValue` notifies **unconditionally** — there is no equality check, so writing the
  value it already holds still fires. Several cases turn on that: an "identical write"
  must still reach the element, or must still be seen to be skipped by the code under
  test rather than by the harness.
- Listeners are notified over a **copy** of the set (`Array.from`), so a listener that
  unsubscribes — or subscribes — while being notified cannot corrupt the walk.
  Teardown caused by an update is exactly that case.
- A `Set` backs it, so subscribing the **same** function twice counts once. No test
  subscribes one function twice today; if one ever needs to, it wants an array-backed
  source.
- Unsubscribing is idempotent: calling the returned disposer twice is harmless and
  leaves `subscribers()` where it was.
- `getValue` does **not** count reads, and `setValue` notifies with **no** argument —
  a plain notification, so a consumer must re-read and diff.

**What it refuses.** It is not for a source that must report **reads**, and not for one
that carries an **operation** alongside the value. A list is reconciled by handing
`reconcileExoOrder` the whole array read back through `getValue()`, so no operation is
needed.

### Why the callback's parameter list is a rest of `never`

`(...event: never[]) => void` is the honest statement of what this cell does, in both
directions at once:

- **Towards the caller:** `never` is the type of an argument that is never produced, so
  the signature says "no value will reach your parameter". `setValue` notifies with
  **no** argument — a listener that declares a parameter reads `never`, which is the
  type that cannot be relied on, and must therefore go back to `getValue()`.
- **Towards the consumer:** a rest parameter has no fixed arity and `never` sits under
  every type, so a subscriber declared `(event: unknown) => void` or `() => void` is
  accepted without a cast, and the cell can be handed to code written against a store
  whose listeners take an event.

`subscribers()` counts one entry per distinct function handed to `onChange`.

## `buildRow()`

The benchmark's row — two attributes, two text ports, one listener:

```html
<li class="row" data-id=…>
  <span class="row__label">…</span>
  <button class="row__btn" data-b=… onclick=…>…</button>
</li>
```

**Why this shape and not a simpler one:** it is the shape the published numbers were
measured on, so a case written against it is a case written against something a user
has seen. It also happens to reach every port kind that has a markup form — an
attribute on the element that carries the port, an attribute on a descendant, a text
port on an empty element, a text port on an element with siblings, and an **event**
port, which takes a slot while emitting no markup and is therefore the one that
catches a backend numbering its ports differently from its counterpart.

**It is shared because the parity is the point.** The DOM and the string backend are
deliberately separate implementations; what they owe each other is the same bytes from
the same shape. Two copies of this function that drift by one attribute turn a parity
failure into a passing pair of tests.

The ports are returned rather than read off the schema afterwards: a wiring function
names a port by **identity**, so it has to be handed the objects.

## `describeIfPresetBuilt(import.meta.url)`

`describe` if `babel-preset-exodra`'s dist is built, `describe.skip` if it is not.

```ts
import { describeIfPresetBuilt } from '@exodra/test-utils';

const d = describeIfPresetBuilt(import.meta.url);
d('rollup-plugin-exodra', () => {});
```

The three bundler plugins (rollup, esbuild, bun) are thin: each hands the file to the
canonical Babel pipeline, which lives in `babel-preset-exodra` and is loaded from its
**built** CommonJS entry. A test of such a plugin is therefore a test of the built
preset too, and in a fresh clone — or right after `npm run clean` — that dist does not
exist. Failing there would be reporting "the plugin is broken" for "you have not run
the build yet", so the suites announce themselves skipped instead. It **warns** on the
console when it skips, because a silently empty suite is how a whole package's
coverage disappears without anyone noticing.

It probes `babel-preset-exodra/dist/index.cjs` — the exact specifier the plugins
`require()` at runtime. Probing anything else, the package root or the source, would
answer a different question from the one the plugin will ask.

**Why the caller passes `import.meta.url`:** `require()` resolves relative to the
module that owns it, and each plugin package declares `babel-preset-exodra` as its own
dependency. The probe must resolve from the **calling** test file, exactly as the
plugin will at runtime, and not from wherever this shared helper happens to live.
Every call site passes `import.meta.url` and nothing else.

### The return type is written out, and that is what keeps a tool alive

`typeof describe` is wrong — the two branches return **different** vitest types
(`SuiteAPI` and a chainable one), and neither is assignable to the other. Leaving it
unannotated is worse: the union has to be inferred, inference reduces it, and reducing
a pair of chainable APIs whose modifiers return the API again has no fixed point.
TypeScript's own checker survives that; a ts-morph pass over it does not.
**`npm run atlas` died on exactly that with `RangeError: Maximum call stack size
exceeded` inside the assignability machinery, and it was still dying with an
eight-times-larger stack** — because the expansion has no fixed point rather than
merely a deep one.

So the annotation is neither of the two: `TExoDescribeLike` is the shape every call
site uses. All three callers (`esbuild-`, `rollup-` and `bun-plugin-exodra`'s
`plugin.test.ts`) do exactly `d('name', () => { … })`; not one reaches for `.each`,
`.only` or `.skipIf`. Writing that shape means nothing has to be computed, by tsc or
by any tool reading these types. The atlas reads what is here.
