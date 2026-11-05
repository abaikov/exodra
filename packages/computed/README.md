# @exodra/computed

The **declarative** half of an Exodra machine. `@exodra/core` gives you
`createExoMachine(schema)` and its `withExo*` decorators, where a handler reads its slot and
writes its port itself. `withExoComputedMachine` is one more decorator over that machine, so you
can instead say what a port **is** —
a function of some fields — and let a commit decide what re-runs.

It is a package of its own because of what a page
that never derives anything should not carry: the field→slot inversion, the
chain of wakes, the pending word and the commit walk over it. `npm run
check:computed-shake` is the gate that keeps that a fact rather than an
intention, and it asks the question by MODULE IDENTITY out of esbuild's
metafile rather than by byte count.

## Installation

```bash
npm install @exodra/computed
```

## What it depends on

**`@exodra/core`, and nothing else** — not a backend, not a reactivity system,
not a third party. A field is a bit in a word and a derivation is a function of
fields; the one thing written at the end goes through `connector.set(port,
value)`, which every backend answers, so this runs unchanged against the DOM
renderer, the server renderer and `@exodra/term`.

The direction is one way and it is enforced, not asserted: the
`computed-names-only-core` rule in `.dependency-cruiser.cjs` fails the build if
anything here names another package, and `core-is-zero-dep` fails it if core
names this one back.

**Four types come the other way and stay in core.**
`TExoMachine`, `TExoMachineNode` and `TExoMachineInitialState` are the
machine this one decorates. `TExoMachineEffect` is the odd one and the reason is
worth stating: `kept()` and `restartEffect()` are methods on **every** node,
merged onto it by `EXO_BASE_NODE_VOCABULARY`, so the types they name belong where
that implementation is. Import all four from `@exodra/core`.

## The two doors

| door                                                         | where the declarations are made           | compiled                                                |
| ------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------- |
| `withExoComputedMachine(createExoMachine(SCHEMA), (b) => …)` | once, at module load, inside the callback | once, when the callback returns                         |
| `exoWiring((w, c, params) => …)`                             | inside a **wire**, per instance           | once, by the first instance; the program is then shared |

The first is what an application writes. The second exists for a component
whose derivations are only known per instance — the block is the same vocabulary
(`w.field`, `w.derive`, `w.fill`, `w.effect`, `w.transition`, `w.done`), and a
block that never calls `done()` is refused by name rather than rendering empty
(`packages/computed/src/wiring/exoWiring.ts:23-29`).

## The vocabulary

Every call is made on `b`, inside the callback handed to
`withExoComputedMachine(machine, (b) => …)`; whatever the callback returns becomes
`machine.transitions`. The machine handed in must have no effects yet — the decorator orders
them itself: the initial fill first, the author's `b.effect`s in declaration order, the wake
chains last. A wire or handlers can be added before or after with `withExoWire` and
`withExoHandlers`.

```ts no-check
const cardMachine = withExoComputedMachine(createExoMachine(cardSchema), (b) => {
    const title = b.field('');
    b.derive(CardPorts.heading, [title], (value) => value.toUpperCase());
    const rename = b.transition((c, next: string) => title.set(c, next));
    return { rename };
});
```

| call                       | what it declares                                                                        |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `b.field(seed)`            | a value the instance holds, given a bit in the pending word                             |
| `b.mounted()`              | a field the engine sets once the instance is in its document                            |
| `b.derive(port, from, by)` | this port **is** `by(...from)`; it runs inside the commit's walk and may not disturb it |
| `b.fill(from, run)`        | run this when any of `from` moves — the instance is handed over, not the values         |
| `b.effectOn(from, start)`  | the same wake set, for something with a teardown                                        |
| `b.effect(start)`          | an effect with no wake set; returns its handle                                          |
| `b.transition(apply)`      | a function that applies `apply` and then **settles**: one commit, whatever moved        |

**For a derivation the declared list is both the wake set and the argument
list. For `fill` and `effectOn` it is the wake set alone** — each is handed the
instance, so an author can read a field he did not declare, that slot then does
not wake when it moves, and nothing says so
(`packages/computed/src/computed/types/TExoComputedBuilder.ts:7-11`).

Declaration order is execution order and **must be topological**. A derivation
runs inside the walk; there is no second pass to catch a value that was
computed after the thing that reads it.

## Batching

`EXO_HOLD_VOCABULARY` merges a `hold(of, body)` onto a backend. Inside the body the
instance's **wake table is parked**, so a hundred field writes produce one
commit at the end instead of a hundred. Re-entering a hold on the same instance
is a no-op rather than a second park
(`packages/computed/src/wiring/constants/EXO_HOLD_VOCABULARY.ts:21`).

Nothing on the hot path reads the held set, which is what separates it from a
batch-depth counter, and it is a linear scan rather than a `Set` because its
length is the nesting depth of open holds.

## The 31-bit cap

`EXO_MACHINE_LIMIT` is **31**, not 32, and `exoFieldBit(index)` refuses an
index at or past it where the number is **written** rather than at the first
commit that quietly ran the wrong derivation.

The pending word is a JavaScript number used as a bitfield through `1 <<
index`, and that operator coerces to a signed 32-bit integer: `1 << 31` is
negative and `1 << 32` is `1`. A field numbered 32 would therefore be handed a
bit that already belongs to field 0 — two fields sharing one bit, each waking
the other's derivations, with no error anywhere. Thirty-one fields is the
largest set for which every bit is distinct and positive.

A component that needs more state than that is not blocked: `c.state` in
`@exodra/core` holds any object in a slot, uncapped, and pays no pending word
because nothing derives from it.

## The compiled program

`compileExoMachine` turns the declarations into `TExoMachineProgram` — a flat
record of typed arrays. A **slot** is one position in a single sequence
(derivations first, then bodies) and one bit of the pending word;
`fieldMarks[field]` is the set of slots that field wakes.

That shape is the point of the exercise. A commit is a walk over the bits of an
integer, indexing typed arrays — no map, no allocation, no traversal of a
declaration tree. The per-instance state it needs is **a row of the instance's
slot table and not a field on the instance**, so an undecorated instance has no
such row, no `null` standing in for one, and no branch
(`packages/computed/src/machine/types/TExoMachineProgram.ts:19-23`).

The passes are separate modules — `commitExoMachine`, `runExoMachineSlots`,
`fillExoMachineDerivations`, `chainExoMachineWakes`, `exoMachineSettle`,
`bindExoMachineReads` — because `scripts/check-computed-shake.mjs` names them
one by one, with the sentence that puts each on the computed side of the line.
A module that stops being reachable only from a derivation is a decision
somebody makes in that file, in the open.

## The browser build

Unlike `@exodra/list-reconcile`, this package ships a CDN pair —
`dist/exodra.global.js` for a `<script>` tag and `dist/exodra.esm.js` for
`<script type="module">`. A page composes `withExoComputedMachine` **itself**;
it is application code, not something a backend inlines, and it was inside
`window.Exodra.core` before the extraction. `@exodra/core` is external in both,
so a page that loads them both ships one core.

## License

MIT
