# Plugin interfaces

Four pages. Each renders the **same machine twice** (or three times), and only what is composed
around it differs, so the difference on screen is the composition and nothing else.

A backend is an object you construct — `new ExoDomBackend()`, which takes no arguments — and a
plugin is a plain bag of factories, one per name it takes over, each receiving what already stands
there as `next`. A shipped pack is a **unary decorator** over that object, so composition is
nesting: `withExoPropertyWriters(withExoCompiler(new ExoDomBackend()))`, and `render` exists only
once `withExoCompiler` is in the chain. Each decorator mutates and returns the object it is handed,
so the chain is one identity — which the schema cache requires, because it keys the backend by
pointer. A pack written by hand is composed with `composeExoPlugins(base, pack)`.

The backend declares two swappable fields (`packages/dom/src/dom/ExoDomBackend.ts`):

-   `events` — how a listener reaches the DOM. Shipped: `EXO_DIRECT_EVENTS`, one
    `addEventListener` per event port.
-   `writers` — how a port's value reaches the element. Shipped: `EXO_SHIPPED_WRITERS`, attributes
    as attributes.

Everything else a pack adds is a method on the exonode a machine is handed. Lists need no pack:
the children-port calls are on every DOM backend, and a reconciler from
`createExoChildrenReconciler` (`@exodra/list-reconcile`) is a plain function over them.

| Page                 | What is composed                                                                                      | What it removes                                                                                                                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `events.html`        | `events`: `createExoDelegatedEvents(['click'])`                                                       | one `addEventListener` per row: the delegating pack puts one on the render root                                                                                                                                                                                                                  |
| `value-writers.html` | `writers`: `withExoPropertyWriters`                                                                   | a value having to be a string: the port lands on a custom element as an Array                                                                                                                                                                                                                    |
| `keyed-list.html`    | nothing on the backend: two reconcilers from `createExoChildrenReconciler` (`@exodra/list-reconcile`) | keys being the framework's rule: the left panel's reconciler is made with the row machine alone and reconciles by object **identity**, the right one is made with `{ key: (item) => item.id }`; both are called from an effect, and a kept key under a new object re-runs the row's wire with it |
| `nested-mounts.html` | nothing for the row list; the subject is not a plugin interface                                       | a context reaching past the render that provided it                                                                                                                                                                                                                                              |

## How data reaches the ports on these pages

There is no binding layer. A machine's `createInitialState` runs once and returns its state (and
opens its children ports); a plain function over the exonode is the one place that writes state to
ports, and a **transition** (`withExoTransitions`) only where something outside the machine calls it; and
following outside data is an **effect** that draws first, then subscribes, and returns the
unsubscribe:

```js
const listMachine = withExoEffects(listBase, effect => {
    effect(c => {
        showRows(c);
        return rows.onChange(() => showRows(c));
    });
});
```

The outside data on these pages is a five-line local store each page writes itself
(`getValue` / `setValue` / `onChange`). An application would use its own data layer in the same
place.

## `events.html`

Two hundred rows, the same row machine, rendered under both strategies. The rows are a fixed list
inside one shell machine (`c.list(port, ROW, rows)` over a 200-entry array), so each panel is **one** `render`: a delegating
pack installs its root listener per render. The click handler is declared on the machine
(`withExoHandlers(m, on => on(port, handler))`), which registers one shared function per machine with the row's exonode
as its **subject** — the shape a delegated pack can read back off an element, so the same machine
runs under both strategies. The readout counts `addEventListener` calls during one render by
replacing it and putting it back; that is an instrument, not something an application should do.

## `value-writers.html`

A `<price-chart>` custom element with a `series` property. The plain backend writes the port as the
stringified attribute; the backend composed with `withExoPropertyWriters` writes it as the property,
an Array. The pack's rule: a hyphenated tag's non-global attribute becomes a property, everything
else goes to the shipped writers unchanged. The server backend (`@exodra/string`) is not composed,
so a page using this pack gives up byte parity between the backends. The empty ` series=""`
placeholder standing beside the live property is expected.

## `keyed-list.html`

Both panels follow the same refetch. A refetch returns **freshly parsed objects**, so the identity
panel rebuilds every row while the keyed panel matches each by `item.id` and keeps it — the build
stamps stand still. _Refetch with changed labels_ shows `update` running on a kept row; _refetch
with a duplicate id_ shows a repeated key getting one row per occurrence. The page measures row
**reuse**, not time.

## `nested-mounts.html`

The same widget machine, in the same place in the document, three times; every host's
`createInitialState` calls `c.provide(THEME, store)`. The only difference is who mounted the widget:

1. **One render** — the host nests it with `c.one(P.slot, WIDGET)`. The chain `provide` extended
   is passed down as an argument and the widget resolves the token.
2. **Two renders, nothing passed** — a second `backend.render` puts the widget in the div the
   first one drew. It reads `undefined`. Nothing walks up from a mount and no element carries a
   mark, so no ordering fixes this.
3. **Two renders, the value passed** — the same second mount, of a one-element root whose
   `createInitialState` provides the store and then `c.one`s the same widget.

A context is not reactive: what is provided is what a consumer holds. Holding a **store** is what
lets control 1 work — panels 1 and 3 follow the host's theme through their effects, panel 2 never
received it. Control 2 adds a row built inside a subscriber with no render on the stack, and it
resolves the token off the widget's chain, which `c.createExoNode` hands every row. The page is a client
render and says nothing about hydration.

## Status

All four pages are written against the source of `@exodra/core`, `@exodra/dom` and
`@exodra/list-reconcile`, and none has been opened in a browser in its current form. Treat them as
unrun.

## How to open them

The import maps point at **this repository's own `dist/`** with absolute paths, so the server has
to be started at the **repository root**:

```sh
cd /path/to/exodra
npm run build --workspace=@exodra/context
npm run build --workspace=@exodra/core
npm run build --workspace=@exodra/list-reconcile
npm run build --workspace=@exodra/dom
python3 -m http.server 8000
```

Then open, for example, <http://localhost:8000/packages/examples/plugin-slots/events.html>.

ES modules are subject to CORS, so a `file://` page cannot import them. Every bare specifier any
loaded `dist/` imports must be in the page's import map (`@exodra/core` imports `@exodra/context`,
`@exodra/dom` imports both), or the page dies with a blank screen and an empty console.
