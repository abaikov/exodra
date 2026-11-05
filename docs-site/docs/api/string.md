---
title: String Renderer
---

# String Renderer

`@exodra/string` is the **server backend** of the schema core. It runs the same
component values [`@exodra/core`](./core.md) describes and the **same wiring
function** [`@exodra/dom`](./dom.md) runs, and hands back markup instead of
nodes.

A schema is cut **once** into the fewest strings a render can be, so an instance
is a handful of concatenations. No tree is ever built to be serialised.

```bash
npm install @exodra/string @exodra/core
```

## ExoStrBackend

```ts no-check
class ExoStrBackend {
    constructor(...plugins: readonly TExoPlugin[]);
    schema(component: TExoMachine<never>): TExoStrSchema;
    render(component: TExoStrMachine, context?: TExoContextFrame | null, params?: unknown): string;
}
```

The server entry point is an **object you construct and render from**, exactly as
[`ExoDomBackend`](./dom.md#exodombackend) is, and `render` is the same method name
taking the component as one value — a page switches sides by switching which
backend it holds, not by learning a second calling convention, and the return value
_is_ the difference.

The **constructors differ**, and it is worth stating rather than discovering:
`ExoDomBackend` takes nothing and is composed by wrapping it in `with*` decorators;
this one still accepts a variadic list of plugins, merged after the connector
surface.

```ts
import { EXO_PORT_TEXT, composeExoMachine, createExoMachine, createExoSchema, exoPorts, withExoWire } from '@exodra/core';
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrNode } from '@exodra/string';

const CardPorts = exoPorts({ title: EXO_PORT_TEXT, body: EXO_PORT_TEXT });

const cardSchema = createExoSchema(CardPorts, (b) => {
    b.el('article', { class: 'card' }, (card) => {
        card.el('h2', null, (h2) => {
            h2.textPort(CardPorts.title);
        });
        card.el('p', null, (p) => {
            p.textPort(CardPorts.body);
        });
    });
});
const cardMachine = composeExoMachine(createExoMachine<TExoStrNode>(cardSchema), (m) =>
    withExoWire(m, (c) => {
        c.text(CardPorts.title, 'Card');
        c.text(CardPorts.body, 'Welcome to Exodra');
    })
);

const backend = new ExoStrBackend();

const html = backend.render(cardMachine);
// <article class="card"><h2>Card</h2><p>Welcome to Exodra</p></article>
```

`render` prints **one** instance and takes **no count**, exactly as the browser
backend mounts one. `createInitialState` receives the optional `params` of
`render` and nothing else, because a lone root has nothing else to be about.
Rows that vary are a **list** — `list` / `one` on the exonode, which hand each
row its own params through the same signature.

### What it does not have, stated rather than discovered

`ExoDomBackend` carries two replaceable implementation fields — `events` and
`writers` — beside its record factories, and **neither has a field here**. A string
has no listeners to attach; escaping and attribute form are decided by
`compileExoStrSchema` through `EXO_STR_WRITERS`, which the two backends must agree
on byte for byte or hydration is wrong; and there is nothing on this side to adopt.
So this backend's composable surface is its **methods**: `new ExoStrBackend(...plugins)`
merges its exonode surface onto itself first, so a pack naming `attr`, `text` or
`list` receives the shipped body as `next` and may wrap it, and a pack naming
something new adds it to `c.` for every component this backend runs.

That asymmetry is a bound on what a pack can promise. A pack that replaces
`writers` composes into a DOM backend and is silently inert here, because
nothing on this side reads that name. Composing it is not refused — the merge
writes any name — so a pack that means to serve both sides has to say what it
does on each.

## The exonode

`TExoStrNode` is shaped **exactly** like `TExoDomNode`, method for
method — both are **types** rather than classes, and both name an object whose
prototype is its backend — because a component's wiring function is the one piece written by hand
and it must not be able to tell which backend it is filling.

| Method                                    | On the server                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `attr(port, value)`                       | Escape for an attribute position, and store.                                  |
| `text(port, value)`                       | Escape for a text position, and store.                                        |
| `unsafeHtml(port, markup)`                | Store the markup as given, escaping nothing.                                  |
| `on(port, handler, subject?)`             | Accepted in **both** forms and printed as nothing. The slot is still written. |
| `onTeardown(off)`                         | Filed, and run at the end of the render — after the markup has been taken.    |
| `provide(token, value)` / `inject(token)` | The same chain and the same lookup rule the browser uses.                     |
| `one(port, component, params?)`           | Render one nested instance into the port.                                     |
| `list(port, component, rows)`             | One instance per entry of `rows`, armed with it as its params, concatenated.  |
| `createExoNode(component)`                | Create one child, unwired, and hand it back as a value.                       |
| `appendChild` and the other port methods  | The children-port calls, with the browser's signatures.                       |
| `portChildList(port)`                     | The port's children, the door a reconciler drives.                            |

Two of those are worth spelling out, because they look like omissions:

-   **`on` must accept both forms or the design breaks in half.** A component's
    wiring function is written once and run by three backends; the moment
    `c.on(TodoPorts.click, toggleDone, subject)` is a call the server does not have, every
    component with a declarative handler needs a second wiring function.
-   **There is no `bind` here, and none is missing.** Following data is a
    machine's effect: it draws through a transition, then subscribes. On this
    backend the effect runs once while the instance is armed, the draw is the only
    write that reaches the markup, and the render stops the effect as soon as the
    markup is taken — so a server render reads the data once and leaves no
    subscription behind the response.

A **node** on this backend is a string of markup — the type it comes back
as (`TExoNode`) is opaque, which is what lets one wiring function assemble
children on all three backends without learning that the server's are strings
and the browser's are DOM nodes.

## Contexts on the server

`provide` and `inject` are methods on the connector, as in the browser. What
this backend threads is a **frame on the connector** rather than a mark on
anything: there are no nodes, and the server builds strictly depth-first, once, so
the chain in force is exactly the one the current call stack passed down.

There is no module-level slot. The chain lives on the exonode
(`TExoStrNode.context`) and is threaded downwards, so `provide` and `inject` touch
no module state and no `finally` puts anything back. A caller with an OUTER frame
of its own passes it as `render`'s second argument, or as `renderExoStrInstance`'s
`context` when driving instances by hand (`packages/string/src/node/ExoStrBackend.ts`).
`@exodra/ssr`'s `renderExoPage` is what uses it: it hands `render` an
`exoContextFrame` carrying the request's response object, so a page can
`c.inject(EXO_SSR_RESPONSE)` and two requests rendering at once cannot see each
other's.

## Escaping

Text and attribute values are escaped through `escapeExoText` and
`escapeExoAttributeValue`, which live in [`@exodra/core`](./core.md#escaping-and-the-shared-tables)
so that the markup this package prints and the markup `@exodra/dom` parses its
prototype from are **the same bytes**. That identity is what hydration rests on.

## Compiled plans

Exported for the same reason `@exodra/dom`'s are: a caller that renders
instances itself — a compiler's output, a custom entry point, a streaming shell —
needs **the plan the entry point would have built**. Without them it either
re-exports blind or writes a second compiler, and the first thing a second
compiler disagrees about is port numbering, which is shared with `@exodra/dom`
and is the reason one wiring function can fill both backends. Every name here has
a counterpart in the DOM package.

| Export                                                     | Counterpart in `@exodra/dom`       |
| ---------------------------------------------------------- | ---------------------------------- |
| `exoStrSchemaOf(machine, backend)`                         | `exoDomSchemaOf`                   |
| `compileExoStrSchema(declaration, backend)`                | `compileExoDomSchema`              |
| `renderExoStrInstance(schema, machine, context?, params?)` | `mountExoInstance`                 |
| `EXO_STR_WRITERS`                                          | _(none in the barrel — see below)_ |

The `backend` parameter is **not optional and not defaulted**: it is the plan cache
key as well as the argument the compiler needs, and defaulting it would mean naming
a composed backend from a module the connector imports, which closes a module
cycle. `ExoStrBackend.render` passes `this`, and every nested call passes
`connector.backend`. `renderExoStrInstance`'s `context` defaults to `null` — a caller
driving this function by hand inherits no context, because nothing is read off an
ambient any more.

`EXO_STR_WRITERS` has no DOM counterpart and is exported anyway: its writers are
what decide an attribute's **absence** — `disabled` for `false` is no attribute at
all, not `disabled=""` — and a caller building writers by hand without them is the
shape that produces a hydration mismatch on every conditional attribute.

| Type                  | Purpose                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `TExoStrSchema`       | A schema compiled for this backend: cut into prepared strings, with a writer per port.                  |
| `TExoStrWriter`       | The per-port function that escapes a value for its position.                                            |
| `TExoStrMarkupFiller` | The prepared markup with a hole per port — hand it an instance's values, get the instance's markup.     |
| `TExoStrMachine`      | `TExoMachine` with this backend's exonode in it — what `createExoMachine<TExoStrNode>(schema)` returns. |

There is **no** `renderToStream`.

## API Reference

| Export                                                                                      | Description                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExoStrBackend` / `TExoStrBackend` / `TExoStrBackendConstructor`                            | The server backend: `new ExoStrBackend(...plugins)`, then `backend.render(component)`, which prints one instance as markup. The connector's methods are merged onto it first, so a pack naming one receives the shipped body as its `next`.  |
| `TExoStrNode` / `TExoStrNodeApi` / `TExoStrNodeFields` / `TExoStrSurface`                   | What a wiring function is handed on the server — **types**, not a class. An exonode is a plain object whose prototype is the composed backend.                                                                                               |
| `createExoStrInstanceFactory` / `EXO_STR_NODE_VOCABULARY`                                   | The factory that builds one of those objects — call it once per composed backend — and the exonode surface as the pack the backend merges onto itself. Exported for a custom entry point and for a tool that needs the list of method names. |
| `exoStrSchemaOf` / `compileExoStrSchema` / `renderExoStrInstance` / `EXO_STR_WRITERS`       | Plans, for custom entry points. Both plan functions take the **backend**.                                                                                                                                                                    |
| `exoForeignMarkup` / `TExoStrMark` / `EXO_STR_FOREIGN_VOCABULARY` / `TExoStrForeignApi`     | Markup this backend did not print, placed like markup it did.                                                                                                                                                                                |
| `TExoStrApi` / `TExoStrMachine` / `TExoStrSchema` / `TExoStrWriter` / `TExoStrMarkupFiller` | Types.                                                                                                                                                                                                                                       |

## Links

-   npm: [`@exodra/string`](https://www.npmjs.com/package/@exodra/string)
-   GitHub: [exodra/packages/string](https://github.com/abaikov/exodra/tree/master/packages/string)
