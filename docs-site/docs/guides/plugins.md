---
title: Plugins and the interfaces they implement
---

# Plugins and the interfaces they implement

`@exodra/dom` is composed, not configured. A backend is `new ExoDomBackend()` — no
constructor arguments — and every capability an application adds is a decorator
wrapped around it. A few of the backend's members are **named plugin interfaces**:
fields that hold an implementation, which a composition replaces or wraps, while
everything it did not name stays what it ships. This page is the reference — what a
plugin is, which fields exist, which packs ship, and where the interfaces stop.

[Sugar, not restrictions](../why/sugar-not-restrictions.md) is the mechanism and its
rationale; this page does not restate it.

## What a plugin is

A plugin is a **bag of method factories** — an object whose every entry receives
whatever stands under that name right now and returns what stands there next
(`packages/core/src/plugins/types/TExoPlugin.ts`):

```ts no-check
export type TExoPlugin = {
    readonly [name: string]: (next: never) => unknown;
};
```

`new ExoDomBackend()` calls `composeExoPlugins(this, …)` once, in its constructor,
to put the **exonode surface** on itself — `attr`, `text`, `on`, `one`, `list`,
`build`, `childList` and the rest (`packages/dom/src/dom/ExoDomBackend.ts`,
`packages/core/src/plugins/composeExoPlugins.ts`). Every pack an application composes
is a unary decorator wrapped around that finished object:

```ts no-check
withExoHydration(withExoCompiler(withExoDefaults(new ExoDomBackend())));
```

Each one is `(base) => composeExoPlugins(base, ENTRIES)`, and `composeExoPlugins`
mutates the object it is handed and returns it, so the whole chain keeps **one
identity** — which the schema cache requires, because it keys the backend by
pointer. The class fields and the exonode surface are already written when a
decorator runs, so a pack's factory receives the **shipped value** as `next`. That
is what makes replacing and wrapping the same act: a pack that never calls `next`
has replaced; one that calls it has wrapped.

There is no registry, no namespace and no `needs` / `provides`. A merged method
exists only where it was merged.

**The capability check is the type of the composed object.** Nobody declares a
capability set. A decorator states its contribution in its return type —
`withExoCompiler(base)` answers `TBase & TExoCompilerApi`,
`composeExoPlugins(base, EXO_KEYED_LIST_VOCABULARY)` answers `typeof base &
TExoKeyedListApi` — and they compose by intersection. A backend composed without
`withExoHydration` has no `hydrate`, in the type as well as at runtime.

**Where that check lands.** A machine that calls `c.keyedList` needs an exonode type
that has it, and the compile error appears **on the line that calls it**. It comes
from `render` and `hydrate` as well: both declare their component against
`this & TExoDomInstanceRecord`, so a component demanding a pack the backend never
merged is refused in the file that built the backend. `TExoDomNode` itself names
no pack — it is the instance's record plus the shipped surface
(`packages/dom/src/dom/EXO_DOM_NODE_VOCABULARY.ts`). Following a source
needs no pack at all: it is an effect that runs a transition writing through the
fill doors every exonode has, then subscribes.

**There is no protection against two packs claiming one name.** They are resolved
by **nesting order** — the outermost decorator runs last and is therefore the
outermost wrapper — and two that both replace without calling `next` leave only the
outer one, with nothing thrown.

## The fields a composition can replace

A bare backend carries `events`, `writers`, `createInstance` and `createChild` as class
field initialisers (`packages/dom/src/dom/ExoDomBackend.ts`). `withExoHydration`
adds two more. The API they make up is `TExoDomApi`
(`packages/dom/src/dom/types/TExoDomApi.ts`).

| Field | Interface | Shipped value | What replacing it decides |
|---|---|---|---|
| `events` | `TExoEventsApi` | `EXO_DIRECT_EVENTS` — one listener per element | how a listener reaches the DOM |
| `writers` | `TExoWritersApi` | `EXO_SHIPPED_WRITERS` | how a value reaches an element |
| `createInstance` / `createChild` | `TExoDomRecordFactories` | the two record factories built in the constructor | the shape of every record rendered |
| `hydrateSurface` *(optional)* | `TExoDomRecordFactories` | absent — `withExoHydration` installs it | whether this backend can adopt markup |
| `parserStability` *(optional)* | `TExoParserStability` | absent — `withExoHydration` installs it | the refusals for a schema the HTML parser would reshape |

`TExoEventsApi` has four members — `name`, `port(event)`, `attach`, and an optional
`install(root)` (`packages/dom/src/events/types/TExoEventsApi.ts`). `TExoWritersApi`
has four — `name`, `attr(name, proto, kind, at)`, `markupCarries(name, proto)` and
`text(proto)` (`packages/dom/src/backend/types/TExoWritersApi.ts`). Both are read
once per port while a schema compiles, never per write.

`createInstance` and `createChild` must be replaced **together**, or a module has made
a third record shape.

:::caution A wrapper is silent on an adopted page
**A pack that wraps an exonode method hydration also claims never runs on a
hydrated page.** `withExoHydration` builds its own adopting surface — an object
whose prototype is the composed backend — and merges the adopting bodies onto it
through `exoVocabulary`, whose factories are `() => method`: they **ignore `next`**,
so they replace rather than wrap (`packages/core/src/plugins/exoVocabulary.ts`). The
names it claims are `portNodeWriter`, `portNodeReader`, `on`, `one`, `list`,
`build` and `foreign`, the child-list seams `childListEndNode`, `childListStartNode` and
`openChildList`, and its own `publishChildListEnd`, `adoptFromNode` and `adoptStopNode`
(`packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts`).

A name adoption does not claim falls through to the composed backend, so a wrapper
on it does run on an adopted page; one on a claimed name does not
(`packages/dom/src/hydrate/tests/exo-composed-hydrate.test.ts`).
:::

### What a replacement has to do

**`events`.** `port(event)` runs once per event port per schema, at compile time,
and is the only place a pack may refuse a name. `attach` is fixed per pack and runs
on every fill. Two rules the type cannot state, both because getting either wrong
double-dispatches silently: **namespace the event slots** — the property names a
pack writes on the element come from `exoEventSlotsFor(packId, event)` with a pack
id unique to the pack — and **build every port datum with
`createExoEventPortData`**, so every datum in the process shares one hidden class.
`install` is honoured by `render` and `hydrate` and by nothing else. `hydrate` reads
`this.events` off the backend it was composed onto, so a page hydrates with the
pack it renders with (`packages/dom/src/hydrate/withExoHydration.ts`).
`packages/dom/src/events/tests/third-pack.test.ts` is a third pack written from the
package barrel alone.

**`writers`.** `attr` and `text` are the two writers; `proto` is the prototype
element and must not be closed over. `markupCarries` answers "would a browser handed
this markup, and no fill, be in the state this value asks for?" — hydration reads it
to decide which ports it may silence and which keep their live writer. A text writer
is handed the element unless the function it returns sets `takesTextNode`. *Inert
case:* a pack whose `attr` and `text` return no-op setters renders an element with
neither the attribute nor the text
(`packages/dom/src/backend/tests/exo-composed-writers.test.ts`).

## Composing a backend

`new ExoDomBackend()` and a chain of `with*` decorators around it is the one
expression an application writes:

```ts
import {
    EXO_PORT_TEXT,
    composeExoPlugins,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    withExoCompiler,
    withExoDefaults,
} from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const GreetingPorts = exoPorts({ label: EXO_PORT_TEXT });

const greetingSchema = createExoSchema(GreetingPorts, (b) => {
    b.el('h1', null, (h1) => {
        h1.textPort(GreetingPorts.label);
    });
});
const greetingBuilder = createExoMachineBuilder<TExoDomNode>(greetingSchema);
greetingBuilder.wire((c) => {
    c.text(GreetingPorts.label, 'Hello');
});
const Greeting = greetingBuilder.done();

/** ONE pack per application, at module level: it keys the schema cache with the backend. */
const DELEGATED = createExoDelegatedEvents(['click', 'input']);

/** ONE backend, at module level. The chain reads inside-out. */
const backend = withExoCompiler(
    withExoDefaults(
        // A bare implementation is merged as the one-entry plugin it is.
        composeExoPlugins(new ExoDomBackend(), { events: () => DELEGATED })
    )
);

const dispose = backend.render(Greeting, document.getElementById('app') as Element);
```

`backend.render` mounts **one** instance and takes no count. A page of rows is a
children port filled by `c.list` or by `reconcileExoOrder` over `c.childList`
in some component's transition — see [Lists](./lists.md).

Three rules that decide whether this works at all:

- **Compose once, at module level.** Every backend object takes its own
  `backendType`, the index its schemas are cached at on `machine.forms`, so one built
  per render recompiles every schema, markup parse included, on every render.
  `warnExoFormGrowth` (`packages/core/src/machine/warnExoFormGrowth.ts`) says so out
  loud in a development build once a machine holds eight schemas.
- **Order is the caller's, and nothing refuses a collision.** Packs apply
  inside-out; the outermost decorator claims a name last and becomes the outermost
  wrapper. `withExoPropertyWriters` and `withExoReclaimingText` both claim `writers`
  and both delegate `text` to `next`, which is why either order keeps the reclaiming
  text writer.
- **A pack's factory cannot keep anything per-instance.** It runs **once**, at
  merge, and is handed `next` and nothing else. A method it returns must reach its
  siblings through `this` at call time, and must not be an arrow, or it has no
  `this` at all — a silent failure in both directions
  (`packages/core/src/plugins/types/TExoPlugin.ts`).

## The packs that ship

| Pack | Claims | Compose it when | Its cost | Its limitation |
|---|---|---|---|---|
| `withExoCompiler(base)` | `schema`, `render` | the page turns declarations into schemas | the compiler is in the bundle | a page whose schemas came off a build leaves it out and calls `mountExoSchema` instead |
| `withExoHydration(base)` | `hydrate`, `hydrateSurface`, `parserStability` | the page adopts markup `@exodra/string` printed | 3.2 kB gzipped that a client-only page never links | needs `withExoCompiler` beneath it; wrappers on the names it claims do not run while adopting |
| [`withExoChildList(base)`](../api/dom.md#withexochildlist) | `childList` on the exonode | a machine opens a child list — `reconcileExoOrder`, `c.keyedList`, the router's outlet, rows placed by hand | the commanded child list is in the bundle | without it the first `c.childList` throws [EXO0109](../errors.md#exo0109); `c.one` and a fixed `c.list` never need it |
| [`withExoForeignNamespaces(base)`](../api/dom.md#withexoforeignnamespaces) | `foreignNamespaces` | a schema contains `<svg>`, `<math>` or an SVG-only element | the SVG and MathML tables are in the bundle | without it such a schema is refused with [EXO0108](../errors.md#exo0108), or [EXO0110](../errors.md#exo0110) from a JSON declaration |
| `withExoDefaults(base)` | `writers` | an ordinary page — it is the safety bundle, holding `withExoReclaimingText` today | that of the pack inside it | none of its own |
| `withExoReclaimingText(base)` | `writers` (`text` only) | anything outside the renderer may rewrite visible text — a translator, an extension | one `firstChild` load and one `nodeType` test per text write | when the test fails it assigns `textContent`, which destroys everything inside the element |
| `withExoPropertyWriters(base, takesOver?)` | `writers` (`attr`, `markupCarries`) | a custom element takes an array, a `Date`, a `Map` or a callback | decided once per attribute port at compile time | the server is not composed, so byte parity is given up for taken-over ports |
| `createExoDelegatedEvents(names, options?)` | a value for `events` | many rows share the same handlers | one root listener per event name; dispatch walks from `e.target` to the root | a node moved out of its root stops responding; non-bubbling names are refused, high-frequency ones unless `allowHighFrequency` is set |
| `EXO_KEYED_LIST_VOCABULARY` (`@exodra/list-reconcile`) | `keyedList` on the exonode | rows arrive as fresh objects on every refetch, with no identity to reconcile by | one `keyOf` call per item and a key→item `Map` per update | it opens a child list, so the DOM backend needs `withExoChildList` beneath it; the row's data reaches it through the `update` argument, a transition the caller writes — there are no props |
| `EXO_DOM_FOREIGN_VOCABULARY` | `foreign` on the exonode | a children port must hold an element this renderer did not make | — | on an adopted page a foreign node is built fresh, never adopted, and the row the server printed for it is removed |

`createExoDelegatedEvents` returns a `TExoEventsApi` — a value for the `events`
field, not a decorator — so composing it is the one-entry factory
`() => DELEGATED`. `EXO_KEYED_LIST_VOCABULARY` and `EXO_DOM_FOREIGN_VOCABULARY` are
plugins merged with `composeExoPlugins(backend, VOCABULARY)`.

### `exo-reclaiming-text`

`withExoReclaimingText(base)` replaces `text` with `exoReclaimingText` and delegates
`attr` and `markupCarries` to `next` by call. `createExoReclaimingTextWriters(next)`
is the factory it is built on, for a caller filling the `writers` field itself
(`packages/dom/src/plugins/exo-reclaiming-text/index.ts`).

What it buys: the shipped writer stores into a Text node resolved at build time.
Anything rewriting visible text — a browser translator, an accessibility extension,
a userscript — replaces that node, and the store then lands on a node nobody
renders, with nothing thrown. `exoReclaimingText` re-reads `firstChild` on every
write and falls back to `textContent` when it is not a lone Text node.

Every text write reaches it, including the repeat writes a transition makes,
because those go through `c.text`. A wire that asked for `portNodeWriter()` is
the one route that bypasses it, because that closure loads the setter table once.

### `exo-property-writers`

The second implementation of `TExoWritersApi`. It turns a custom element's ports
into JavaScript property stores, so a component that accepts an array, a `Date`, a
`Map` or a callback can be reached from a schema at all
(`packages/dom/src/plugins/exo-property-writers/index.ts`).

Four exports:

- `withExoPropertyWriters(base, takesOver?)` — the decorator.
- `createExoPropertyWriters(next?, takesOver?)` — the factory it is built on, for a
  caller filling the `writers` field itself. Text is delegated to `next`; attribute
  ports the pack declines go to `EXO_SHIPPED_WRITERS`.
- `takesOverExoProperty(name, proto)` — the default predicate, exported so a
  narrower rule can be written as "the default, and also…". It takes a port only on
  a hyphenated tag, never for a name in `EXO_GLOBAL_ATTRIBUTES`, and never for a name
  containing `-` or `:`.
- `EXO_GLOBAL_ATTRIBUTES` — the set of global attribute names it leaves alone.

The predicate runs at compile time, once per attribute port, and must be pure in
its two arguments, because `attr` and `markupCarries` agree only by both asking it.
A taken-over port answers `markupCarries: false`, so hydration keeps its live writer
rather than silencing it. The one thing no member can fix is that **the server is
not composed for writers**: `@exodra/string` compiles through its own
`EXO_STR_WRITERS` (`packages/string/src/writers/EXO_STR_WRITERS.ts`), so it prints
the stringified attribute for the same port.

### Keys

The keyed pack is documented in full on [Lists](./lists.md#keys-when-identity-is-not-available).
It is `EXO_KEYED_LIST_VOCABULARY` from `@exodra/list-reconcile`, which puts
`c.keyedList(port, keyOf, build, update)` on the exonode over the free function
`createExoKeyedList(kids, keyOf, build, update)`. Both return a list whose
`reconcile(items)` a transition calls, and it runs the same `reconcileExoOrder` pass
the identity list runs, over `keyOf(item)` instead of the item.

## Keeping a subtree instead of recycling elements

There is no node source and no element pool. An element comes from one place,
`cloneExoNode(schema)` on the schema's prototype. What an application keeps instead
is **the whole exonode**: a child built once with `c.build` stays wired, subscribed
and filled for as long as the application holds it, and the child list moves it in
and out of the document without telling it.

```ts
import type { TExoChildrenPort } from '@exodra/core';
import type { TExoDomMachine, TExoDomNode } from '@exodra/dom';

export function keepPanel(c: TExoDomNode, port: TExoChildrenPort, panel: TExoDomMachine) {
    const kids = c.childList(port);
    const kept = c.build(panel);
    kids.insert(kept);
    return {
        hide: (): void => {
            kids.detach(0);
        },
        show: (): void => {
            kids.attach(kept, 0);
        },
    };
}
```

`detach(i)` takes the node out and runs **no** hook — nothing is unmounted or
disposed, so the exonode's subscriptions stay live and keep writing into a node that
is out of the document. `attach(child, i)` is `insert` without `mount`
(`packages/dom/src/dom/types/TExoChildList.ts`). A kept child is ended by putting it
back and calling `remove`, which runs its `unmount` and ends its subscriptions
(`packages/dom/src/dom/tests/make-exo-child-list.test.ts`). `detachAll()` takes every
child of the list in one call.

## A fourth backend

`@exodra/term` compiles the same schema into a **live plain-text tree** — elements
are lines, a text port is the line's content, a children port is an indented block,
and an event port is a listener a terminal input loop can fire by name
(`packages/term/src/index.ts`). It is in-repo and unpublished: its `package.json`
says `"private": true` and version `0.0.0`. The acceptance test is
`packages/term/src/doc/`: components copied character for character out of this
project's `README.md`, checked against it by a test, and run through this backend
(`packages/term/src/doc/tests/readme-verbatim.test.ts`).

It does not go through any of the fields above. `@exodra/term` is a separate
backend object written against the portable exonode surface:
`new ExoTermBackend(...plugins)` merges its surface onto itself and then the
plugins it is handed, and its entry point is `backend.renderScreen(component, n)`,
deliberately not named `render` (`packages/term/src/backend/ExoTermBackend.ts`).
Nothing hands the renderer itself to a composed name: an application chooses a
backend by importing it.

## What is not replaceable

**The renderer itself.** There is no plugin interface for a foreign backend, and
none for the element builder, the schema compiler, the child-list anchoring or
hydration's adoption pass. An element carries no pointer to its child, so there is
no element→child direction for a composition to take over; `exoNodeDom` takes a
child and refuses anything else (`packages/dom/src/dom/exoNodeDom.ts`).

**Where an element comes from.** `cloneExoNode` on the schema's prototype, with no
field to replace it. Keeping a subtree alive is the strategy that exists; recycling
an element under a different wiring is not.

**The children arm of the setter table.** `compileExoHydrateSchema` decides what an
adopting fill on a raw-markup port means by pointer-comparing its setter against
`setExoHtml`, so a replaceable children writer would turn a working adoption into a
refusal on every hydrated page
(`packages/dom/src/hydrate/compileExoHydrateSchema.ts`).

**The server's writers.** `@exodra/string` compiles through `EXO_STR_WRITERS` by
module import (`packages/string/src/schema/compileExoStrSchema.ts`), so replacing
what stands in `writers` is choosing a client-side behaviour the server does not
know about.

**The schema cache.** A machine carries one array, `forms`, and each backend stores
its schema at `machine.forms[backend.backendType]`
(`packages/core/src/machine/types/TExoMachine.ts`). A backend's own `backendType`
comes from `nextExoBackendType()` (`packages/core/src/backend/nextExoBackendType.ts`);
no name of any backend appears in core, so a backend written outside this
repository caches its schemas the same way. Hydration is not an index of its own:
its schema hangs off the DOM schema it derives from
(`packages/dom/src/hydrate/exoHydrateSchemaOf.ts`).
