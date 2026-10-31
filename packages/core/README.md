# @exodra/core

The backend-agnostic half of the Exodra renderer: what a component **is**, how
its ports are numbered, the context tokens, the event-handler signature and the
escapers.

It renders nothing by itself — `@exodra/dom` compiles a schema into nodes and
`@exodra/string` into markup — and it names no data layer: a machine follows
outside data in an effect that subscribes to whatever store the application has.

**It calls no DOM API.** Not one: no `insertBefore`, no `removeChild`, no
`document`. It names no DOM _type_ either — `TExoEventHandler` is generic over
the event and the node, and each backend supplies its own pair — because the same
schema has to run on a server and in a terminal. The placement passes that do
call those methods are `@exodra/list-reconcile`.

## Installation

```bash
npm install @exodra/core
```

## A component is one value

| Half            | When it runs         | What it is                                                                           |
| --------------- | -------------------- | ------------------------------------------------------------------------------------ |
| the **schema**  | once, at module load | the constant shape — static markup, plus the **ports** where values may later be put |
| the **machine** | once per instance    | the code that fills those ports, through a backend's **exonode**                      |

`TExoMachine` — `{ declaration, forms, createInitialState, wire?, effects, handlers }` — is the
whole shape and the only one. It is plain data: `createExoMachineBuilder(schema)` assembles it,
and the JSX compiler emits the same object literal directly, with `EXO_NO_EFFECTS` and
`EXO_NO_HANDLERS` standing in for the empty lists. `createInitialState` runs once per instance
and what it returns is what the instance keeps; `wire` is the re-runnable transition that
writes ports from `params`.

`forms` is where every backend caches what it compiled `declaration` into, at
`forms[backend.backendType]`. A backend takes its `backendType` from
`nextExoBackendType()` once, in its constructor, so core names no backend and two
backends never share an index. Machines over one declaration may share one `forms`
array: a compile reads the declaration and the backend and nothing else.

A value that every backend of an application must understand — the template `c.foreign(t)`
reads, one field per backend — is checked with `exoBackendCompatible`:

```ts no-check
const BACKENDS = { app: exoBackendTypeOf(APP), server: exoBackendTypeOf(SERVER) } as const;

const CHART = exoBackendCompatible(BACKENDS, 'foreign', {
    createDom: (c) => exoForeignNode(c, canvas),
    createStr: () => exoForeignMarkup('<canvas></canvas>'),
});
```

`TExoBackendCompatible<TTypes, TDoor>` intersects what door `TDoor` accepts on every listed
backend type, so a missing half is a compile error, and a listed backend without the door
answers `{ backendWithoutDoor: 'server' }` — its key, by name. At runtime the call returns the
value unchanged. The names live only in the application's own object; core sees numbers.

Everything expensive happens once per component for the life of the process.
What a render repeats is: clone the prepared element, then one indirect call per
port. A port is named by **identity**, so an initial state cannot count wrong
and never looks anything up.

```typescript
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

type TRow = { readonly id: string; readonly title: string };

/** What a row reads, by its POSITION. An initial state is handed an exonode and an index;
 *  there are no props anywhere, so the data is reached through the index. */
const ROWS: TRow[] = [];

const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        li.el('span', { class: 'row__label' }, (span) => {
            label = span.textPort();
        });
    });
    return { id, label };
});
const mRow = createExoMachineBuilder<TExoMachineNode, unknown, TRow>(ROW_SCHEMA);
mRow.createInitialState((_c, index) => ROWS[index]);
mRow.wire((c) => {
    c.attr(ROW_SCHEMA.ports.id, c.state.id);
    c.text(ROW_SCHEMA.ports.label, c.state.title);
});
export const ROW = mRow.done();
```

`createExoSchema` runs the builder once, at module load, and keeps what it returned as
`schema.ports`; `createExoMachineBuilder` is handed that schema, and the wire names
its ports through it. That makes the order structural — a wire cannot be written
before the ports it fills exist.

The three fill doors are `attr`, `text` and `html` (`TExoFillDoors`), one per kind
of port a value can be put in. There is no single `set`.

## The builder

| Call                   | Declares                                                              | Hands back         |
| ---------------------- | --------------------------------------------------------------------- | ------------------ |
| `el(tag, attrs?, fn?)` | a child element with its **static** attributes, and optionally a body | the builder        |
| `text(value)`          | static text                                                           | the builder        |
| `port(name)`           | a port for one **attribute**                                          | `TExoAttrPort`     |
| `eventPort(name)`      | a port for one **listener** (emits no markup, still takes a slot)     | `TExoEventPort`    |
| `textPort()`           | a port for the **whole text content** of the current element          | `TExoTextPort`     |
| `childrenPort()`       | a port for a **variable-length sequence of children**                 | `TExoChildrenPort` |
| `refPort()`            | a **reference to the current element**, with no way to write to it    | `TExoRefPort`      |

A port is minted inside a nested closure and escapes to the record the builder
returns, so its holder is declared before the call that mints it — which is why
each call has a name to declare it with. Each type pins its port's kind, and the
first four are `TExoPort`s (what every writing signature takes) while
`TExoRefPort` deliberately is not.

An attribute whose value varies is not an attribute here — it is a port. A
children port **is a child**: it renders exactly where the call appears, so it
may stand between static siblings.

### Document order

Ports are numbered after the whole shape is known, by walking it in document
order: per element, its attribute and event ports in declaration order, then its
content port, then its static children recursively; a children port is numbered
where it stands among them.

That ordering is the **contract between the backends**. They never speak to each
other; they agree because both index their prepared schemas by these numbers.

## `createExoSchema` and `createExoStatic`

-   `createExoSchema(build)` — the schema half alone, which `createExoMachineBuilder(schema)`
    builds a machine over. It is also what a compiler that hoists the shape to module
    scope calls, and what the schema compilers call.
-   `createExoStatic(build)` — a component with **nothing to fill**: an icon, a
    separator, a conditional block's body. It throws at construction (`EXO0019`)
    if the builder declared ports, and the machine it carries is one shared frozen
    plan that fills nothing, so every static component in the process carries the
    same object. Its `createInitialState` is `null` and it has no `wire`.
-   `createExoNamedSchema(build)` is the naming form of `createExoSchema` — a
    separate name rather than an overload, because `TPorts` stands in the cursor's
    argument position in one and in its return position in the other.

## Naming ports

A port-declaring call can file itself under a name from an interface you declare, and the name is
checked against the **kind** of port that call mints:

```typescript
import type { TExoAttrPort, TExoSchemaCursor, TExoTextPort } from '@exodra/core';

interface TCardPorts {
    index: TExoAttrPort;
    title: TExoTextPort;
}

declare const card: TExoSchemaCursor<TCardPorts>;

card.port('data-i', 'index'); // compiles
// @ts-expect-error — does not compile: `title` is a text port
card.port('data-i', 'title');
```

`TExoPortName<TPorts, TPort>` is the whole mechanism: no runtime half, no registry, nothing a
render ever reads. Two consequences fall out of the assignability direction. A key declared as the
wide `TExoPort` accepts all four writable calls and refuses `refPort`, whose kind is not in
`TExoPortKind`; a key declared as one of the five accepts exactly its own call.

The check is **opt in**. `TExoSchemaCursor` defaults its port parameter to `unknown` — a cursor
nobody has told which ports exist — and then every string is accepted and the name is a plain
record key. That is what a JavaScript caller, a compiler emitting cursor calls, and
`createExoStatic`'s `(cursor: TExoSchemaCursor) => void` all have; refusing every name in that
position would make naming unusable from JavaScript.

## The initial state and the wire

What runs once per instance is the machine's `createInitialState`:

```ts no-check
type TExoMachineInitialState<TWiring, TValue = unknown> = (
    enode: TWiring,
    index: number
) => TValue;
```

`m.wire((c, params) => …)` is the other half: a transition that writes ports only and may run
again with new `params`, so it keeps no state of its own.

**One declaration, every backend** — generic over the exonode and nothing else.
`createExoMachineBuilder<TWiring>` requires `TWiring extends TExoMachineNode`, so a machine
for every backend names `TExoMachineNode` (the calls every backend has: `attr`, `text`,
`html`, `on`, `provide`, `inject`, `onTeardown`, `readState`) or
`TExoChildrenWiring & TExoMachineNode` (that plus `one`, `list`, `build`), all exported from here.

**There are no props.** The initial state takes the exonode and an `index`, which is the
instance's position **at arming time and nothing more** — a reconciler moves
nodes, it does not re-arm them, so a component that needs a live position is
told it by a transition. A row that must differ from its neighbours reads what it needs
out of state keyed by that index.

**What an initial state RETURNS is what the instance keeps.** The value lands in
`enode.state` and is read back with `enode.readState<T>()`. `c.one` and
`c.build` both hand back **the child's exonode**, so a parent reaches a child's
transitions through them.

**Watching a source is an effect, not a door.** `m.effect((c) => { show(c); return
store.subscribe(() => show(c)); })` draws through a transition, which writes with the
fill doors, and returns the unsubscribe the instance runs when it ends — so one
machine serves the browser, the server and the terminal. There is no `c.bind`, and no
backend decides what a source is.

**Filling is the one act whose behaviour is not identical on all backends.** The
signature is; but during **hydration** `attr`, `text` and `html` **repair** — each
reads what the server printed, compares, and writes only on disagreement. So a
value that differs between the server and the browser (a clock, a session, a flag
that flipped while the bundle downloaded) is corrected whether or not anything is
watching it, and watching a source buys the **subscription** rather than the first
write's correctness. The narrower rule this replaced put the compare behind a
`bind` door; there is no such door, so the compare belongs to the fill. An event
port is the one port adoption writes outright: attaching it is the content of
hydration.

A backend's own exonode type is what a machine names when it touches that backend
alone: `createExoMachineBuilder<TExoDomNode>` for `@exodra/dom`, `<TExoStrNode>` for
`@exodra/string`, `<TExoTermNode>` for `@exodra/term`; hydration reuses
the DOM one. Those types name **one backend's exonode** — a
type, not a class; the object an initial state is handed IS that instance's own record, and
the composed backend is its prototype — and `TExoMachine` is contravariant in its
exonode, so a machine built as `createExoMachineBuilder<TExoDomNode>` is browser-only and
cannot be handed to the server's renderer. Reach for one only when the machine
genuinely touches a member no server backend has (`c.childList`,
`c.openChildList`, a `c.portNodeReader()` whose nodes are `Element`s).

## Contexts

```typescript
import { exoContextToken } from '@exodra/context';

export const THEME = exoContextToken<string>('theme');
```

A token is an **identity**, not a string, so two packages cannot collide on a
name. `provide` and `inject` are **methods on the connector**, in the backends —
there is nothing to import, because a context exists only while a wiring runs.
`inject` of a token nobody provided is `undefined`, not a throw.

`exoContextFrame` / `readExoContext` are the shared half, for a backend supplied from
outside this repo. Types: `TExoContextToken`, `TExoContextFrame`.

> **Contexts are not reactive by themselves.** What is provided is what a
> consumer holds forever. Put a _source_ in the context and follow it in an effect.

## Event handlers

```ts
type TExoEventHandler<TEvent = unknown, TNode = unknown> = (
    this: TNode,
    event: TEvent,
    subject?: unknown
) => void;
```

An event port is filled with `c.on(port, handler, subject)` and every backend
calls `handler.call(node, event, subject)`. That takes a **closure** (one
function per row, built knowing its row) or a **shared handler** — a module-level
function holding nothing about any row, so one function object serves the whole
template and the row arrives as the subject instead of being captured. The second
form is what makes event delegation possible at all.

```ts
type TRow = { readonly done: { getValue(): boolean; setValue(next: boolean): void } };

function toggleDone(_event: unknown, subject?: unknown): void {
    const cell = (subject as TRow).done;
    cell.setValue(cell.getValue() === true ? false : true);
}
// in the initial state:  c.on(P.click, toggleDone, row);
```

A wrong-kinded port is refused by the **types**: `on` takes a `TExoEventPort`,
`one` and `list` take a `TExoChildrenPort`, and the five port types differ in
their `kind` field alone, so `c.on(textPort, …)` does not compile. No connector
compares `port.kind` for these doors.

## Everything else

| Export                                                                                                   | Purpose                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TExoNode`                                                                                               | the opaque value `c.build(...)` returns and a backend's child list accepts                                                                                                                                                                                     |
| `createExoOne(component, props)`, `TExoOne`                                                              | which component stands in a position **right now**. **No door takes one today** — the `bindOne`/`bindMany` calls that read them are gone, so the pair is exported and unconsumed                                                                               |
| `escapeExoText`, `escapeExoAttributeValue`                                                               | the escapers **both** backends use, so their bytes agree                                                                                                                                                                                                      |
| `EXO_VOID_ELEMENTS`, `EXO_DOM_PROPERTIES`, `EXO_RAW_TEXT_ELEMENTS`, `exoAttribute`, `exoDomPropertyKind` | what an element and an attribute name mean. `exoAttribute` answers from the NAME alone and caches; `exoDomPropertyKind` is the same question asked of a TAG, and the two disagree on purpose — `value` is live state on an `<input>` and nothing on a `<div>` |
| `assertExoChildrenPort`, `assertExoNoTextAfterChildrenPort`, `assertExoIntactRawTextBoundary`            | the refusals every backend shares, so the server and the browser refuse the same shapes in the same words                                                                                                                                                     |
| `EXO_PORT_ATTR`, `EXO_PORT_TEXT`, `EXO_PORT_CHILDREN`, `EXO_PORT_EVENT`                                  | the port kinds, as plain constants                                                                                                                                                                                                                            |

### `exoAttribute` — four facts its source does not show

**The cache is bounded and clears rather than refuses.** `attr('data-' + key, …)` is legitimate
and a server process lives for months, so the key space is unbounded; without the bound this is a
leak and not a cache. Clearing at the ceiling keeps ONE code path — a refusal would need a second.
The limit is 512 and is loose on purpose, because clearing fails as a cliff and not as a slope: the
counted ceiling of distinct attribute names in this repository is 41.

**`className` is not lowercased.** Lowercasing produces `classname`, which is a different
attribute. It is the one name the spec special-cases alongside `class`.

**The spec carries the MARKUP spelling, not the live one.** `setAttribute` does not lowercase in
foreign content, so the name a setter may use on an SVG element comes off the parsed prototype
instead of off this spec.

**The property lookup is an own-property test, and that is not defensive tidying.** A bare
`EXO_DOM_PROPERTIES[name]` walks the prototype chain: `exoAttribute('constructor')` answered a
FUNCTION — truthy and `!== undefined` — so it took the property branch and repaired a hydrated page
to `constructor=""`. It is `hasOwnProperty.call` and not `Object.hasOwn` because this package's
`lib` target is below es2022.

## Machines: the imperative half is here, the declarative half is not

`createExoMachineBuilder(schema)` is here, with `armExoNode`, `stopExoEffects` and
the `TExoMachine*` types that spell them. You call `wire`, `effect`,
`on`, `transition` and `done` on what it returns; a handler reads its state with
`c.readState(K)` and writes its port with `c.attr(port, value)` or
`c.text(port, value)`, and nothing is derived from anything. There are no props
and no seed: a value that belongs to one instance arrives as a transition
argument. `wire` is the re-runnable transition that writes ports from `params`.

An instance's effects can be switched off and on again without losing the instance.
`disconnectExoNode(node)` runs every effect's stop and keeps the node; a
`restartEffect` a stop triggers on the way out establishes nothing.
`connectExoNode(node, component)` starts every effect again from the
plan. `stopExoEffects` stays the terminal one: after it, `connectExoNode`
starts nothing. Paired with a child list's `detach`/`attach`, a row can leave the
document, stop listening to its sources, and come back listening:

```ts no-check
const row = rows.detach(i);
disconnectExoNode(row);
rows.attach(row, j);
connectExoNode(row, ROW);
```

Only machine effects are covered. A subscription an initial state registered through
`c.onTeardown` lives in a closure and cannot be started again.

One effect at a time: `m.effect(...)` hands back the effect's handle, `c.stopEffect(handle)`
ends that one and leaves the rest running, and `c.restartEffect(handle)` starts it again. The
effect is off when `stopEffect` returns even if its own stop restarted it on the way out.

**`withExoComputedMachine`, `exoTransition`, `exoWiring` and everything that
compiles a field into a slot are [`@exodra/computed`](https://github.com/abaikov/exodra/blob/master/packages/computed/README.md),
and this package exports none of them.** Say `m.field(0)` and `m.derive(port,
[field], by)` instead of writing the port, and a page pays for the inversion
table, the pending word and the commit walk — which is exactly what a page
that never derives anything must not pay. The split is what makes that
choosable rather than assumed; `npm run check:computed-shake` is what keeps it
true.

The direction is one way. `@exodra/computed` names `TExoMachineBuilder`,
`TExoMachine`, `TExoMachineWiring` and `TExoMachineEffect` from here;
nothing here names anything of its, and `.dependency-cruiser.cjs` fails the
build if that reverses.

`TExoMachineStateHandle` and `TExoMachineEffect` stay here for a reason worth stating:
`kept()` and `restartEffect()` are methods on **every** node, merged by
`EXO_BASE_NODE_VOCABULARY`, so the types belong where the implementation is.

## The plugin system

A **plugin** is a bag of method factories. Each entry receives whatever stands
under that name right now — `next` — and returns what stands there instead;
`composeExoPlugins` applies them to a backend, once, at startup.

```typescript
import { composeExoPlugins } from '@exodra/core';
import type { TExoPlugin, TExoMergedPluginMethods } from '@exodra/core';

const withLogging: TExoPlugin = {
    attr: (next) => function (this: never, ...args: unknown[]) {
        console.log(args[0]);
        return (next as (...a: unknown[]) => unknown).apply(this, args);
    },
};
```

A backend calls it in its own constructor to put its exonode surface on itself,
and every shipped decorator is `(base) => composeExoPlugins(base, ENTRIES)`, so an
application usually names the decorator rather than this —
`withExoHydration(withExoDefaults(new ExoDomBackend()))` **is** the composition. It
is exported because a one-entry plugin written inline needs it:
`composeExoPlugins(new ExoDomBackend(), { events: () => DELEGATED })`. It **mutates**
the object it is handed and returns it, which is why a chain keeps one identity.

Three things make it a real plugin boundary rather than a config object:

-   **Replacing and wrapping are one act.** That is what `super` gave a prototype
    chain and it is the only reason this is not `Object.assign`. A plugin that never
    calls `next` has replaced; one that calls it has wrapped.
-   **A plugin cannot resolve on a hot path.** A factory runs once, at merge, and is
    handed no connector, no schema and no child — so there is nothing per-row it
    _could_ consult. Merging also leaves each overridden name as an **own property**
    on one flat object, so a call at runtime walks no chain and consults no map.
-   **The capability check is the type of the composed object.** Nobody declares a
    capability set. A decorator declares its own contribution in its return type —
    `withExoHydration(base)` answers `TBase & TExoHydrationApi` — and `TExoMergedPluginMethods`
    computes it for one that would rather infer. A machine touching a name only one
    composition carries needs an exonode type that has it, and the compile error
    lands **on the line that calls it**; it lands at the entry point too, because
    `ExoDomBackend.render` and `hydrate` declare their component against
    `this & TExoDomInstanceRecord` rather than against a flat parameter, so a
    component demanding a name nobody merged is refused in the file that built the
    backend.

    **No shipped pack adds an exonode method.** Every one of them replaces a
    **field** — `events`, `writers`, or the hydrating surface — so "compose pack X
    and your machine may call `c.X`" is only ever true of a pack the **application**
    writes.

The one hazard, stated because it is silent: **order is the caller's**. Composition
is a chain of unary `with*` decorators around the backend, so it reads inside-out:
the outermost decorator claims a name last and is the outermost wrapper, and two
plugins that both replace `writers` without calling `next` leave only the outer
one with nothing thrown.

Types: `TExoPlugin`, `TExoPluginMethods`, `TExoMergedPluginMethods`.
The replaceable names themselves live in the backend — see the two fields
`@exodra/dom` gives its plugin interfaces (`events` and `writers`), the record
factories beside them (`createInstance`, `createChild`), and the decorators that fill
them: `withExoHydration`, `withExoDefaults`, `withExoReclaimingText` and
`withExoPropertyWriters`. `new ExoDomBackend()` — which takes no constructor
arguments at all — is a complete working composition.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
