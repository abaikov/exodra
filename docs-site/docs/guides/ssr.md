---
sidebar_position: 3
title: SSR & Hydration
---

# Server-Side Rendering & Hydration

Exodra renders to an HTML string on the server and **adopts** the existing DOM on
the client (no teardown, no flash).

What makes that safe here is that both sides run **the same component**: one
schema, compiled once for markup and once for nodes, and one wiring function
that neither backend can tell apart. The two agree because both index their
prepared plans by the port numbers the schema assigned — not because two code
paths were kept in step by hand.

That includes a reconciled list holding the **same item object at two positions**:
both backends print a row per position, and a test asserts the agreement
(`packages/dom/src/tests/duplicate-item-parity.test.ts`).
See [The same object twice in one list](../troubleshooting.md#the-same-object-twice-in-one-list).


Packages involved:

- [`@exodra/string`](../api/string.md) — `new ExoStrBackend().render(...)` turns a
  component into markup.
- [`@exodra/dom`](../api/dom.md) — `backend.hydrate(...)`, on a backend wrapped in
  `withExoHydration`, adopts that markup.
- [`@exodra/ssr`](#the-exodrassr-toolkit) — the rest of the response: head tags,
  status, headers, the embedded state script and its client-side reader, and the
  whole document.

## The two entry points are the same call, on two backends

```ts
import {
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';

const PagePorts = exoPorts({ title: EXO_PORT_TEXT });

const pageSchema = createExoSchema(PagePorts, (b) => {
    b.el('main', { class: 'page' }, (main) => {
        main.el('h1', null, (h1) => {
            h1.textPort(PagePorts.title);
        });
    });
});
export const pageMachine = composeExoMachine(createExoMachine<TExoMachineNode>(pageSchema), (m) =>
    withExoWire(m, (c) => {
        c.text(PagePorts.title, 'Hello SSR');
    })
);
```

On the server:

```ts
import { ExoStrBackend } from '@exodra/string';
import type { TExoStrMachine } from '@exodra/string';

declare const pageMachine: TExoStrMachine;

/** ONE backend for the process, at module level — it is the plan cache key. */
const server = new ExoStrBackend();

const html = server.render(pageMachine);
// → '<main class="page"><h1>Hello SSR</h1></main>'
```

On the client:

```ts
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';

declare const pageMachine: TExoDomMachine;

/** `hydrate` exists only on a backend composed with the hydration pack. */
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));

const root = document.getElementById('app') as HTMLElement;
const dispose = backend.hydrate(pageMachine, root);
```

Same component, same argument order, same disposer. A page switches sides by
switching **which backend it holds** — not by learning a second calling
convention — and the return value is the difference: one hands back markup, the
other hands back a way to tear it down.

**Neither call takes an instance count.** `render` and `hydrate` each deal in
**one** instance, handed the params it is given, because no library
asks an application how many copies of its root to make. Anything that repeats
inside the page is a **list** — a children port filled by `c.list` or by
`reconcileExoOrder` over `c.childList` — and that is true on both sides, which is exactly why the two agree
about how many rows there are without either being told.

**Type the machine against the shared exonode surface, or none of that is true.**
`TExoStrMachine` and `TExoDomMachine` are both `TExoMachine<C>`
with a backend's exonode type in `C`, and a machine's exonode parameter is
contravariant — so a component built with `createExoMachine<TExoDomNode>` is not a value
`@exodra/string` will accept, and no cast makes it one honestly. Say what the machine
actually needs instead:

```ts no-check
import { composeExoMachine, createExoMachine, withExoEffects, withExoHandlers } from '@exodra/core';
import type { TExoMachineNode, TExoMachineNodeOf } from '@exodra/core';

// A machine that only fills values takes `TExoMachineNode`; one that also nests
// components takes `TExoChildrenWiring & TExoMachineNode`, which adds `one` / `list` / `build`.
// Following data adds nothing to this list: a fill writes through the fill doors and
// an effect subscribes to the data layer, so a machine that follows data still names the
// narrowest surface it actually uses.
const pageBase = createExoMachine<TExoMachineNode>(pageSchema);
function showTitle(c: TExoMachineNodeOf<typeof pageBase>): void {
    c.text(PagePorts.title, title.getValue());
}
export const pageMachine = composeExoMachine(
    pageBase,
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showTitle(c);
                return title.onChange(() => showTitle(c));
            });
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(PagePorts.click, onClick);
        })
);
```

One value then satisfies `TExoStrMachine`, `TExoDomMachine`
and hydration's use of the same alias, with no cast anywhere — which is what
`packages/dom/src/tests/one-wire.test.ts` asserts by handing one component to all three
entry points.

For a page with **no** server render (a pure client app), call `backend.render`
instead of `backend.hydrate`, and drop `withExoHydration` from the
composition; nothing else changes. Dropping it is worth doing rather than
harmless: hydration is a pack precisely so a client-only bundle does not carry the
adopters, measured at 3.2 kB gzipped that such a page never runs. A backend
composed without it has no `hydrate` at all — in the type as well as at runtime —
so there is no way to call it by accident.

## What hydration actually does

It attaches listeners and takes subscriptions, and it **writes nothing where the
markup already agrees** — which is the whole reason it is cheaper than rendering.
It is *not* true that the served HTML is left byte-identical. Where the client's
data disagrees with what the server printed, hydration repairs it rather than
leaving the page wrong until something happens to fire:

- a **text** port fill is read and compared, and written only on a mismatch
  (`packages/dom/src/hydrate/factories/createExoRepairingFill.ts:29-38`);
- an **attribute** port fill is compared against `getAttribute` and repaired
  through the live setter (`packages/dom/src/hydrate/repairExoAttribute.ts:36-65`) —
  which is what makes a price rendered in the server's locale, or a flag that
  flipped while the bundle downloaded, come out right;
- **surplus rows** the server rendered that the client's data no longer has are removed
  (`packages/dom/src/hydrate/dropUnadoptedExoRows.ts:24-29`), because a list that
  inserts at the end would otherwise put every later row behind the dead ones;
- **unclaimed rows** of a child list are removed with no shape check at all, because the
  span the cursor collected was bounded by that list's own end, so everything left in it
  is a row of this list (`packages/dom/src/dom/EXO_ADOPT_CURSOR.ts:38-45`).

That holds for **every** fill — `c.attr` / `c.text` / `c.unsafeHtml`, whether a
wire, a transition or an effect's first draw makes it. The compare belongs to the
fill (`packages/dom/src/hydrate/factories/createExoRepairingFill.ts:13-15`,
`packages/dom/src/hydrate/compileExoHydrateSchema.ts:65-69`). What an effect adds on a
hydrated page is the subscription for later changes, not the first write's
correctness. An event port is a different branch: its entry is the real attachment,
which is the content of hydration.

Raw markup is repaired through its own compare, which normalises both sides through the
same parser so that markup the browser merely respelled (`<br/>` coming back `<br>`) does
not rebuild a correct subtree (`packages/dom/src/hydrate/repairExoHtml.ts:19-21`).

Two consequences:

- **Hydrate from the backend you rendered from.** Attaching listeners is not a
  detail of hydration, it is the content of it — so the event strategy is **not a
  parameter**: `hydrate` reads `this.events` off the backend it was composed onto,
  so composing the pack onto the same object makes a divergence unspellable rather
  than merely discouraged.

  ```ts
  import { composeExoPlugins } from '@exodra/core';
  import { ExoDomBackend, createExoDelegatedEvents, withExoHydration } from '@exodra/dom';
  import type { TExoDomMachine } from '@exodra/dom';

  declare const pageMachine: TExoDomMachine;

  /** ONE pack and ONE backend for the application, both at module level. */
  const DELEGATED = createExoDelegatedEvents(['click', 'input']);
  const backend = withExoHydration(
      composeExoPlugins(new ExoDomBackend(), { events: () => DELEGATED })
  );

  const root = document.getElementById('app') as HTMLElement;

  // The same object serves both, so the two can never be composed differently:
  backend.hydrate(pageMachine, root);
  ```

  `createExoDelegatedEvents` returns a `TExoEventsApi` — a value for the `events` field,
  not a plugin — which is why it is composed as the one-entry factory
  `() => DELEGATED`.

- **Hydration does not check every row.** It asks `findExoRowDisagreement` where the
  caller's component and the server's markup are two different moments, and not on
  a homogeneous reconciled list, where a mismatch is present on the first row or not at
  all. Call it yourself — in a test asserting the two backends agree, or in a bug
  report — as `findExoRowDisagreement(schema, root, backend)`; it returns a description of
  the first disagreement or `null`. The backend argument selects the same compiled
  plan the page renders through.

## Contexts across the two sides

`provide` / `inject` resolve identically on both backends, through the same
lookup function, because a component that resolved one value on the server and
another in the browser is a page that hydrates into different content than it
was served — and the divergence would be in the markup rather than in an error.

On the server the chain is a module-level frame, saved and restored around every
instance in a `finally`. In the browser the chain is a **value** and nothing is
written on any element: `provideExoContext` returns a new frame, the connector
stores it in `connector.context`, and every `one`, `list` and `build`
wired after it is handed that frame. A list captures the chain when it is wired, so
a row added an hour after hydration resolves what the page provided without reading
the document at all. Nothing is marked on an element, so a widget mounted by a
**separate** `render` call inherits nothing from the surrounding document and must
be handed the value.

## Moving state from the server to the client

The server and the client must draw the same instance from the same data, or
hydration repairs every port it disagrees with. The data travels in the response's
**state script**: the page puts it there with `setState` on `EXO_SSR_RESPONSE`, and
the client reads it back with `readExoStateScript()` before it adopts.

A page that takes its data as **params** has nothing else to do: the server renders
it with `renderExoPage(machine, { params })`, the wire records the params as state,
and the client hands the same object to `hydrate`.

```ts
import {
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { EXO_SSR_RESPONSE, renderExoPage } from '@exodra/ssr';

type TGreeting = { readonly name: string };

const GreetingPorts = exoPorts({ name: EXO_PORT_TEXT });

const greetingSchema = createExoSchema(GreetingPorts, (b) => {
    b.el('h1', null, (h1) => {
        h1.textPort(GreetingPorts.name);
    });
});
export const greetingMachine = composeExoMachine(
    createExoMachine<TExoMachineNode, TGreeting>(greetingSchema),
    (m) =>
        withExoWire(m, (c, greeting) => {
            c.inject(EXO_SSR_RESPONSE)?.setState('greeting', greeting);
            c.text(GreetingPorts.name, greeting.name);
        })
);

const page = renderExoPage(greetingMachine, { params: { name: 'Ada' } });
const documentHtml = page.renderDocument({ rootId: 'app' });
```

```ts
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import type { TExoMachine } from '@exodra/core';
import { readExoStateScript } from '@exodra/ssr';

type TGreeting = { readonly name: string };

declare const greetingMachine: TExoMachine<TExoDomNode, unknown, TGreeting>;

const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));

const greeting = readExoStateScript()?.greeting as TGreeting;
backend.hydrate(greetingMachine, document.getElementById('app') as HTMLElement, greeting);
```

`c.inject(EXO_SSR_RESPONSE)` is `undefined` in the browser, so the same wire runs on
both sides and only the server records anything. State that is not a param — a
store the page reads from — is written the same way, from wherever the server
loaded it, and seeded into that store on the client from `readExoStateScript()`
**before** `hydrate`, so the effects' first draw sees the server's data.

## The `@exodra/ssr` toolkit

`ExoStrBackend.render` hands back the instance's markup and nothing else: no
doctype, no `<html>`, no `<head>`, no status, no headers, no state script.
`@exodra/ssr` is the rest of the response.

### `renderExoPage`

`renderExoPage(component, options?)` runs the same synchronous render with the
request installed as a context, and hands back the markup plus everything the
wiring said about the response:

```ts
import { renderExoPage } from '@exodra/ssr';
import type { TExoStrMachine } from '@exodra/string';

declare const pageMachine: TExoStrMachine;

const page = renderExoPage(pageMachine, { head: '<meta charset="utf-8">' });

page.html;                               // just the instances — what goes in the container
page.status;                             // what the page asked for, or 200
page.headers;                            // [{ name, value }, …]
page.head;                               // the seeded <head> markup, then what the page added
page.stateScript;                        // <script id="__EXODRA_STATE__">…</script>
page.state;                              // the same map, for a server that serialises it itself
page.renderDocument({ rootId: 'app' });  // the whole document
```

The ready-made strings sit beside the raw values on purpose: a server that owns
its own HTML shell splices `head`, `html` and `stateScript` into it, and a server
that does not calls `renderDocument()`.

`options` is what the server already knows before the page runs — `status`,
`headers`, `head` (markup, and the natural home for the charset, the viewport and
the stylesheet link), `state`, `backend`, and `params`, which is handed to the page
machine's `wire` exactly as `backend.render(machine, parent, params)` does. Entries the page adds are
concatenated after the seeded ones, so the fixed ones stay first.

`backend` is the `ExoStrBackend` this page renders from. Left out, the page runs
on a backend composed with nothing. Name it when the application composed plugins — and name the
**same object** every request, because a plan is cached per backend by pointer and
one built per request recompiles every schema, markup parse included, on every
request.

### How a page talks to the request

The request is an ordinary context, so there is nothing new to learn: any initial
state under `renderExoPage` injects `EXO_SSR_RESPONSE` and gets a `TExoSsrResponse`.

```ts
import {
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { EXO_SSR_RESPONSE } from '@exodra/ssr';

declare const user: { readonly name: string };

const NotFoundPorts = exoPorts({ heading: EXO_PORT_TEXT });

const notFoundSchema = createExoSchema(NotFoundPorts, (b) => {
    b.el('main', { class: 'page' }, (main) => {
        main.el('h1', null, (h1) => {
            h1.textPort(NotFoundPorts.heading);
        });
    });
});
export const notFoundMachine = composeExoMachine(
    createExoMachine(notFoundSchema, {
        createInitialState: (c: TExoMachineNode, _params: unknown) => {
            const ssr = c.inject(EXO_SSR_RESPONSE);
            ssr?.setStatus(404);
            ssr?.setHeader('cache-control', 'no-store');
            ssr?.addHead('<title>Not found</title>');
            ssr?.setState('user', user);
        },
    }),
    (m) =>
        withExoWire(m, (c) => {
            c.text(NotFoundPorts.heading, 'Not found');
        })
);
```

| Method | What it does |
| --- | --- |
| `setStatus(code)` / `getStatus()` | the HTTP status; 200 unless something asks otherwise |
| `setHeader(name, value)` | replace every header with this name, then append it |
| `appendHeader(name, value)` | add another value under this name (`Set-Cookie`) |
| `getHeader` / `getHeaderValues` / `getHeaders` | read them back; `getHeaders()` is a copy |
| `addHead(entry)` | one `<head>` entry, **as markup** |
| `renderHead()` | everything `addHead` collected, in arrival order |
| `setState(key, value)` / `getState(key)` / `getStateSnapshot()` | the map that becomes the state script |
| `renderStateScript(options?)` | that map as a `<script type="application/json">`, or `''` |

Two things this type deliberately does **not** have are `renderBody()` and
`renderDocument()`: an initial state runs *during* the render, so the body does not exist
yet, and one that assembled the document would get one with an empty container
and no error. Saying things about the response is the machine's job; assembling it is
`renderExoPage`'s.

`addHead` takes **markup**, not a component — so a head entry is either a literal
(`'<title>Home</title>'`) or a component rendered on the spot with
`server.render(Title)`, on the same `ExoStrBackend` the page uses.

`c.inject(EXO_SSR_RESPONSE)` outside `renderExoPage` is `undefined`, which is the honest
answer: a component rendered in the browser has no request to talk to.

For a server driving the render by hand — installing `EXO_SSR_RESPONSE` around something
other than `renderExoPage` — `ExoSsrResponse` is exported so the collectors are not
reimplemented.

### Matching the two sides

**There is no count to keep in step.** `renderExoPage` renders one instance and
`hydrate` adopts one instance; how many rows appear inside it is decided by the
page's own `c.list` / `reconcileExoOrder`, from the same data on both sides.

What still has to match is the **element**. The one `hydrate` takes is the
**container** `renderDocument` emitted — `document.getElementById('app')`, not its
first child: it adopts out of that parent's first *element* child, so handing it
one level too deep puts every port on the wrong node and throws nothing.

Read the state back on the client with `readExoStateScript()` from the same package:

```ts
import { readExoStateScript } from '@exodra/ssr';

const state = readExoStateScript(); // undefined when the page transferred none
```

`readExoStateScript` lives in the server package because the protocol — the script's
id, its type, and how the JSON inside it is escaped — is decided there, and a
reader anywhere else is a second place that has to agree.

## Summary

1. Build a component, render it with `new ExoStrBackend().render(...)`, adopt it
   with `backend.hydrate(...)` on an `ExoDomBackend` wrapped in
   `withExoHydration` — same component, same arguments, and the event strategy
   travels with the backend rather than being passed again.
2. For head, status, headers and state, call `renderExoPage` from `@exodra/ssr` and
   let the page read the request through `c.inject(EXO_SSR_RESPONSE)`.
3. Put the data the client needs in the state script with `setState`, read it back
   with `readExoStateScript()`, and hand it to the page **before** you adopt.
