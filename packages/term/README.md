# @exodra/term

A fourth rendering backend, written only against `@exodra/core`'s exported connector surface. It
compiles the same schema `@exodra/dom` and `@exodra/string` compile, into a live retained plain-text
tree: elements are lines, attributes print beside them, a text port is the line's content, a children
port is an indented block, an event port is a listener `exoTermFire` runs by name.

It is private on purpose. It exists as the proof that a backend can be supplied from outside the
three shipped ones, and as the record of what that costs.

```ts
import { ExoTermBackend } from '@exodra/term';
import type { TExoTermMachine } from '@exodra/term';

declare const COUNTER: TExoTermMachine;

const backend = new ExoTermBackend();
const screen = backend.renderScreen(COUNTER, 3);
```

## The import rule

`src/` outside `src/doc/` imports `@exodra/core` and `@exodra/context` and nothing else — no
file reaches `@exodra/dom` or `@exodra/string`, at runtime or in a type, and no source of data is
on the list either, because a backend writes ports and places children while keeping one in step
with a source is a machine effect the application writes.
`src/backend/tests/imports-only-core.test.ts`
states the exact inventory and is what holds it. `src/doc/` holds to the same rule: the README
components it copies are machines built from `@exodra/core` alone.

## The acceptance test

`src/doc/readme-counter.ts` and `src/doc/readme-todos.ts` are copied character for character out of
the repository's root `README.md`, between `// >>> BEGIN VERBATIM` and `// <<< END VERBATIM` markers
that `src/doc/tests/readme-verbatim.test.ts` reads. That test also asserts WHICH lines were removed, so the
removal cannot quietly grow to cover an inconvenient one. The removed lines are entry points, which
no backend can share, plus the demo `todos.push(...)`, which a module cannot perform at import time
without running before any test can observe the state before it.

`src/doc/types/TExoTermRunsTheReadmeCounter.ts` asserts the portability claim at compile time. It lives in `src/`
and not in a `.test.ts` because every tsconfig here excludes `**/*.test.ts` and vitest transpiles
without checking types, so `npm run typecheck` is the only thing that would catch it going red.

The wide assertion passes by METHOD BIVARIANCE, and that is why `TExoTermSurface` is written in
method shorthand throughout. `TExoChildrenWiring.one` takes `TExoMachine<TExoChildrenWiring>`
and `TExoTermNode.one` takes `TExoMachine<this>`, which resolves to `TExoTermMachine`; those
parameter types are not
related by subtyping in either direction, and the assignment succeeds only because TypeScript
compares method parameters bivariantly. Were the three component-taking members — `build`, `one`
and `list` — declared as properties with
function types, `strictFunctionTypes` would make them contravariant and no backend could satisfy the
interface with its own component alias.

## What a pack can compose here

The METHODS, plus the one FIELD `createInstance` — the seam a pack replaces to give instances fields,
since methods compose and fields do not. `@exodra/dom` carries three more plugin-provided fields
(`events`, `writers`, `createChild`, and a `hydrateSurface` once hydration is composed in) and this
backend has none of them: there is no event system to attach through, no anchor to reconcile around
(a region here IS an array), no writers pack — `exoTermWriterForPort` picks the writer at compile
time with no seam over it — and no second record factory, because a row here is the same object a
root is. Composing
a pack that replaces `writers` here is SILENTLY INERT, because nothing on this side reads that
name — `composeExoPlugins` writes any name and refuses none, so a pack meaning to serve two backends
has to say what it does on each.

## Why `renderScreen` and not `render`

`@exodra/dom`'s entry is `render(component, parent)` and `@exodra/string`'s is `render(component)`,
both mounting one instance. There is no parent to append into here and no children port above the
roots, so `roots` being an array is the shape a caller reads; and the output is still ALIVE when the
call returns, unlike the server's, while not already somewhere the caller can see, unlike the
browser's. So it takes a COUNT and hands back a SCREEN — roots, a serialiser, a disposer.

It is not renamed to `render` for symmetry: one name over three incompatible second parameters means
`backend.render(APP, document.body)` written against the wrong import takes an element as `n` and
fails somewhere inside `new Array()` rather than at the call.

## Why a constructor and not `{ __proto__: backend, … }`

`packages/benchmarks/src/benchmarks/axes/mechanism/receiver-spelling.ts` prices the four spellings head on — five
straight-line programs, no `@exodra` import — over three fields and a shared method, 400 000 objects
per timed region:

```
    { __proto__: expr, a, b, c }   111.5 ns per object
    new Ctor(a, b, c)                4.75
    Object.create(P) + 3 stores      4.75
    { a, b, c, m }, no key           4.75

    protoLiteral ↔ ctor     +106.750 ns/obj   427 grains   own resolution 0.002500 ms
    protoLiteral ↔ plain    +106.625 ns/obj   427 grains
    create ↔ ctor             +0.250 ns/obj     1 grain     NOT RESOLVED
```

THE PRICE IS THE KEY, NOT THE PROTOTYPE: `plain` is the same literal with the key removed and it
ties `new`. The instrument's own killer held — `ctor ↔ hoisted`, one allocation plus a constructor
frame against neither, resolved at 13 grains — so the axis can see a single allocation and not only
elephants.

WHAT DOES NOT CARRY ACROSS, because that axis says so itself: it measures no `@exodra` package, its
objects carry three fields where this one carries ten, and it prices an object built, called once and
dropped. The MECHANISM is what transfers — one prototype install per object, independent of how many
fields follow it — and the nanoseconds are that axis's, on that scene, not this one's. On this
backend the saving sits beside a much larger per-instance cost, since the recursive stamp allocates
an object per ELEMENT, so its SHARE of a terminal render is smaller than the number alone reads.
Neither share is measured.

`Object.create` measured level with `new` and either would have done. `new` is chosen because
`Object.create(backend)` followed by assignments grows the object out of its in-object slots, while
V8 sizes a constructor's in-object store from the fields the constructor body assigns. Only the
CREATION half of that is measured; the layout half is reasoning, not a reading.

## The shared refusals this backend inherits

`EXO_VOID_ELEMENTS` — a `<br>` with content. This backend could print one happily; it refuses so a
schema is accepted or refused identically everywhere.

## Escaping, and the test for the next backend

Nothing is escaped anywhere in this package, and `EXO_RAW_TEXT_ELEMENTS` is not imported.
`escapeExoText` and `escapeExoAttributeValue` exist because the server's bytes and the DOM
prototype's bytes must be the same bytes or hydration ends. This backend produces neither markup nor
bytes anyone will re-parse, so escaping would corrupt the output rather than protect it: a `<` in a
label is a `<`.

THE TEST FOR A NEW BACKEND IS WHETHER IT PRODUCES BYTES A PARSER WILL READ BACK. If it does, it owes
the raw-text table, and the decision it must not skip is `assertExoIntactRawTextBoundary` — the
schema-build refusal that holds the `</script>` boundary up once nothing is escaping.

## Lifetimes are this package's own invention

`@exodra/core` has `TExoNode`, an opaque token whose whole documented property is its identity, and
no statement anywhere that such a token has a LIFETIME — no `dispose`, no `unmount`, no rule saying
who is responsible for a subscription a wire took out. `@exodra/dom` solved it privately;
`@exodra/string` never had to, because it subscribes to nothing. So `disposeExoTermChild`,
`TExoTermScreen.dispose` and the `disposers` field are unchecked by anything above: a reconciler
cannot ask a `TExoNode` to end itself.

## Schema caching

`exoTermSchemaOf` stores a compiled schema at `machine.forms[backend.backendType]`, the same array
`@exodra/dom` and `@exodra/string` store theirs in. Every backend object takes its own `backendType`
from `nextExoBackendType()` when it is constructed, so core knows no backend's name and a backend
written outside this repository caches its schema the same way.

Nothing measured argues for the array over a WeakMap. The `weakmap.get` 18.0 ns against a slot at
6.6 ns figures are WITHDRAWN and must not be re-quoted: they came from a blog post whose own opening
note says the renderer it measured has been deleted, and `packages/benchmarks/measurements/` holds no
weakmap-against-slot run. The case for the chain is that it needs no line in core, and that a link
ON the declaration dies with the declaration where a module-level `Map` would hold every component a process
ever rendered alive forever.

The backend is in the cache key because an instance takes its methods off `schema.backend` as its
prototype, so a schema shared between two backends hands one backend's instances the other's methods.
A BACKEND BUILT PER RENDER IS THEREFORE A COMPILE PER RENDER, of every declaration it touches. A
reconciled list whose rows are not all one component pays a schema lookup per row per update, because
`c.createExoNode` resolves `exoTermSchemaOf(component, backend)` for whichever component that row's
builder named; what a lookup costs is UNMEASURED —
`packages/benchmarks/measurements/` holds no recording that prices one.
