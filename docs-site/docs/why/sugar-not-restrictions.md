---
title: Sugar, not restrictions
---

# Sugar, not restrictions

A framework earns its place by handing you shorter ways to say what you were
going to say anyway. It loses it the moment the short way is the **only** way —
when the one list on the page that needs a different reconciler, the one hot spot
that needs raw DOM, or the one subtree that belongs to somebody else's renderer
forces the whole application out.

So the rule this project holds itself to is: **every convenience is a layer over
something you can still reach.** `reconcileExoOrder` is a layer over the children
primitive — it maps items to rows and places them through the child list the backend already has, which is
what `reconcileExoOrder` takes as its first argument
(`packages/list-reconcile/src/reconcileExoOrder.ts`); keeping a port in step with outside data is a
transition that writes it plus an effect that calls the transition and subscribes, and
the composition is yours.

This page is about the last of those three — the named plugin interfaces, where a
part of the renderer is replaced rather than configured. What it costs is measured on
[What the abstraction costs](./abstractions-collapse.md); how much room is left
below the whole renderer, and every measured decision in one table, is on
[What the floor says](./what-the-floor-says.md); what other frameworks put behind
a fence, and how much of it is genuinely open here, is on
[Eight things frameworks forbid](./what-others-forbid.md).

## A plugin interface is a field on the backend, and a plugin is a bag of factories

One function in `@exodra/core` is the whole mechanism.

`composeExoPlugins(base, ...plugins)` composes a backend out of plugins, once, at
startup (`packages/core/src/plugins/composeExoPlugins.ts`). A plugin is an object whose
entries are **method factories** (`packages/core/src/plugins/types/TExoPlugin.ts`): each
receives whatever stands under that name right now — a method off the base's
prototype, a method an earlier plugin merged, or `undefined` for a name nobody has
used — and returns what stands there next.

```ts no-check
export type TExoPlugin = {
    readonly [name: string]: (next: never) => unknown;
};
```

There is no namespace, no registry, no `needs` / `provides`, and no resolution
pass. `new ExoDomBackend()` merges the connector surface onto itself in its
constructor — the class fields are already written when that runs — and every pack
an application composes is a unary decorator wrapped **around** the finished
object: `withExoHydration(withExoCompiler(new ExoDomBackend()))`. Each decorator is
`(base) => composeExoPlugins(base, ENTRIES)`, so the entries are still `(next) => …`
factories and a pack still never has to know whether it is replacing or wrapping.
`composeExoPlugins` mutates the object it is handed and returns it, so the whole
chain is **one identity** — which the plan cache requires, since it keys the
backend by pointer.

Three properties of that merge are what make "replace one thing" mean one thing:

- **Replacing and wrapping are the same act** — the property `super` gave a
  prototype chain. A plugin that never calls `next` has replaced; one that calls it
  has wrapped.
- **The last plugin to claim a name wins**, and the order is the nesting order —
  outermost last. That is the same last-provider-wins rule the deleted slot
  registry had, made visible at the composition site instead of resolved somewhere
  else, at the price that it now reads **inside-out** where a variadic constructor
  read left to right. It is also the one silent hazard: two plugins that both
  replace `writers` without calling `next` leave only the outer one, with nothing
  thrown.
- **The capability check is the type of the composed object.** Nobody declares a
  capability set. A decorator states its contribution in its return type —
  `composeExoPlugins(base, EXO_KEYED_LIST_VOCABULARY)` answers `typeof base &
  TExoKeyedListApi` — and they
  compose by intersection. A wire that touches `c.keyedList` infers a **connector**
  that has it, and a backend composed without the pack does not satisfy a parameter
  typed against that connector.

  **Where that refusal lands**, because the flattering version of this sentence was
  written here first: it is a **call-site** check. A wire written against a
  connector type without `keyedList` fails to compile on the line that calls it.
  The entry points perform it too, and against the composition they were built on:
  `ExoDomBackend.render` and `hydrate` declare their component against
  `this & TExoDomInstanceRecord`, so a component demanding a pack the backend never
  merged is refused in the file that built the backend. What no entry point can see
  is a pack composed and never named — `TExoDomNode` is the record plus the shipped
  surface and names none of them (`packages/dom/src/dom/types/TExoDomMachine.ts`).
  Following outside data needs no pack: a transition writes the port with
  `c.text` / `c.attr`, the fill doors every exonode has, and an effect calls it and
  subscribes.

A merged method **exists only where it was merged**. A slot is a name the engine
has to declare before anybody can fill it, so every capability that ever shipped
left a slot, a field on the plan or a field on every child behind it — a context
field on a page that never provides a context. The merge is here for what it makes
expressible.

## What `@exodra/dom` puts behind a plugin interface

Each is a **field on the backend**:

| Field | Interface | What ships in it |
|---|---|---|
| `events` | `TExoEventsApi` | `EXO_DIRECT_EVENTS` — one listener per element |
| `writers` | `TExoWritersApi` | `EXO_SHIPPED_WRITERS` — how a value reaches an attribute or a text node |
| `createInstance` / `createChild` | `TExoDomRecordFactories` | the two record factories the constructor builds over the backend |
| `hydrateSurface` | `TExoDomRecordFactories` | nothing, until `withExoHydration` writes the adopting surface |

They are **class field initialisers** on `ExoDomBackend`
(`packages/dom/src/dom/ExoDomBackend.ts`). The adopting half is not one of them and has no
default: a backend composed without `withExoHydration` carries no `hydrateSurface`, and the
hydrate compiler REFUSES rather than falling back
(`packages/dom/src/hydrate/requireExoHydrateSurface.ts:10-12`) — the refusal exists because
`__proto__: undefined` in an object literal is legal and silent, so without it the first write of
an adopted page is a `TypeError` on a method name that says nothing about hydration.
The ones that ship are defaults rather than providers for a stated reason: a library
whose every part is removable is a construction kit, not a framework.

Children and data-following are **not** fields. A changing list is `reconcileExoOrder`
called from a transition over `c.childList(port)`, and keeping a port in step with
outside data is a transition writing `c.text` / `c.attr` from an effect that
subscribes — functions over doors every exonode has, so a second strategy is a
second function rather than a field.

## Replacing one interface

Merge a plugin onto the backend. Everything you do not name keeps the shipped
value:

```ts no-check
import { composeExoPlugins } from '@exodra/core';
import { ExoDomBackend, createExoDelegatedEvents, withExoCompiler } from '@exodra/dom';

/** ONE pack per application, at module level. */
const DELEGATED = createExoDelegatedEvents(['click', 'input']);

// `writers` and the record factories are still the shipped ones.
// Nothing was restated, and nothing was rebuilt.
const backend = withExoCompiler(
    composeExoPlugins(new ExoDomBackend(), { events: () => DELEGATED })
);

// APP is your top-level component.
backend.render(APP, document.getElementById('root') as Element);
```

The composition **is** the backend, so it travels down into every nested component
and every list row through the schema's `backend` field: a row is built by `c.build`, which
compiles the child's declaration under the backend the parent is rendering through
(`packages/dom/src/dom/exoDomSchemaForChild.ts`) — a swapped
implementation is not something you get at the top level and lose at the first child
component. The backend is also the exonode's **prototype**, so `withSomething(backend)`
and `c.something` are the same act.

**Compose once, at module level.** The backend is the schema cache key, so one built
per render hands the cache a fresh index and recompiles every schema on every render.

## The evidence that the renderer reads the field

A replaceable field is easy to fake. Every assertion of the shape "the backend's
`writers` field holds my pack" would pass **at the same time as** the compiler
reaching the shipped writers through a static module import — the composition
would change what a field held and change nothing about what the renderer did.

The case that cannot pass by accident is in
`packages/dom/src/backend/tests/exo-composed-writers.test.ts`. It composes a backend
whose writers write **nothing**:

```ts no-check
composeExoPlugins(withExoCompiler(new ExoDomBackend()), withWriters(inert())).render(
    cardComponent(),
    parent
);

// The element is there — the compiler, the walk and the wiring all ran.
expect(parent.querySelectorAll('p')).toHaveLength(1);
expect(shown(parent)).toBe('-/-');
```

If any path in the renderer still reached the shipped writers directly, the
attribute and the text would appear anyway. They are absent exactly when the
`writers` field is the only route onto the page.

## What is not behind a plugin interface

Stated here rather than left to be discovered:

- **Still static imports:** the element builder, the schema compiler, the
  child-list anchoring, hydration's adoption **walk**, where an element comes from
  (`cloneExoNode` on the schema's prototype), and — deliberately — the *children* arm
  of the setter table the `writers` interface opened, because
  `compileExoHydrateSchema.ts` decides what an adopting fill on a raw-markup port means
  by pointer compare against `setExoHtml`. The four port kinds are a closed union in
  `@exodra/core`; and there is no plugin interface for a foreign *backend* — see
  [what others forbid](./what-others-forbid.md).
- **Where each field is read, and by whom.** Every one is a **field load** — there
  is no `get`, no map and no symbol. `backend.events` is read at the top of
  `compileExoDomSchema` (`packages/dom/src/dom/compileExoDomSchema.ts:686`), and
  `backend.writers` further down where the setters are built
  (`compileExoDomSchema.ts:777`) — once each per (schema, backend), inside the
  compile that already parses the schema's markup. The `writers` interface leaves
  **no field on the schema**: it is spent into `schema.setters`, the table every
  fill already loads from, so nothing per instance, per row, per update or per event
  changed shape at all.
- **There is no element→child direction.** An element carries no pointer back to
  its child, and `exoNodeDom` takes a child and refuses anything else
  (`packages/dom/src/dom/exoNodeDom.ts`), so there is nothing for a composition to
  take over there.
- **A hydrated page DOES inherit a reconciler, and this bullet used to say the
  opposite.** `openChildList` on a hydrating exonode answers `[]` and opens an
  adoption cursor over the rows the server printed, so a reconciler's opening
  pass adopts them instead of building beside them
  (`packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts:214-232`). One shape
  is refused: a child list standing directly behind another with no static
  element between them, where the end of the first cannot be read off the markup
  (`packages/dom/src/hydrate/asserts/assertExoPluginChildList.ts:4-14`).

A framework that says "customisable" and means "configurable" is the failure this
page is written against. The items above are the parts where the claim is
narrower than it sounds, and they belong on the same page as the claim.
