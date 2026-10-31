# @exodra/react

Render **React components inside Exodra** as islands. Exodra owns the host
element; React owns everything inside it. The React root is created while the
instance is wired and torn down with whatever owns that instance — so an island
inside a list row goes away with the row.

```bash
npm install @exodra/react
# its peers, which a React-interop app already has:
npm install react react-dom @exodra/core @exodra/dom
```

`react` and `react-dom` are **peer dependencies** — Exodra core never pulls in
React; you only pay for it where you use an island.

## Usage

`reactIsland` is a **wiring helper**, in the shape `writeExoChoice` from
`@exodra/forms` has — a function of the exonode and ports your schema declared:
the schema declares the host element and the children port that owns everything
inside it, and the machine's initial state hands that port to React and keeps the
handle it gets back.

```tsx setup
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import { reactIsland } from '@exodra/react';
import type { TExoReactIsland, TExoReactWiring } from '@exodra/react';
import type { ComponentType } from 'react';

type TChartProps = { series: number[]; theme: 'dark' | 'light' };
declare const FancyChart: ComponentType<TChartProps>;

// Any store the application already has; the island only needs a read and a subscription.
declare const chartStore: {
    get(): TChartProps;
    subscribe(listener: () => void): () => void;
};

const PANEL_SCHEMA = createExoSchema((b) => {
    let host!: TExoChildrenPort;
    b.el('section', { class: 'panel' }, (section) => {
        section.el('h2', null, (h2) => h2.text('Live chart (React island)'));
        section.el('div', { 'data-exo-react': '' }, (div) => {
            host = div.childrenPort();
        });
    });
    return { host };
});
type TPanelState = { readonly chart: TExoReactIsland<TChartProps> };
const mPanel = createExoMachineBuilder<TExoReactWiring & TExoMachineNode, unknown, TPanelState>(
    PANEL_SCHEMA
);
mPanel.createInitialState((c) => ({
    chart: reactIsland(c, PANEL_SCHEMA.ports.host, FancyChart, chartStore.get()),
}));
const showChart = mPanel.transition((c) => c.state.chart.render(chartStore.get()));
mPanel.effect((c) => chartStore.subscribe(() => showChart(c)));
const PANEL = mPanel.done();

withExoCompiler(new ExoDomBackend()).render(PANEL, document.getElementById('root')!);
```

The **port must be its element's only child**, which is what a host element is by
construction. That is the DOM backend's rule, not this package's: a children port
that owns all of its element's content is the one shape raw markup can be written
into without deleting a sibling.

`reactIsland` mounts with a plain props object and returns a `TExoReactIsland`
handle, `{ render(props) }`. The island never subscribes to anything itself: the
machine keeps the handle in its state and calls `render` from a transition — which
an effect runs when the data the island shows changes. A render after the island
was torn down is ignored.

## One machine, three backends

The helper asks the **connector** which backend is filling, so the same machine
serves all three:

| Backend | What the island does |
| --- | --- |
| `ExoStrBackend.render` | renders the component to HTML and writes it into the port, so the island is in the initial payload |
| `backend.hydrate` | finds that markup in the host and hands it to `hydrateRoot` — React takes the server's DOM over in place |
| `backend.render` | finds the host empty and mounts fresh with `createRoot` |

```ts
declare const c: TExoReactWiring;
declare const props: TChartProps;
reactIsland(c, PANEL_SCHEMA.ports.host, FancyChart, props);                 // SSR + hydrate (default)
reactIsland(c, PANEL_SCHEMA.ports.host, FancyChart, props, { ssr: false }); // client-only: empty host on the server
```

On the server the handle's `render` does nothing: a request has no second pass.

## How Exodra props become React props

The whole props object is handed to React as-is: once when the island mounts, and
again on every `render(props)` the machine makes through the handle. Because React
needs a single props object, an update collapses to "re-render this island" at the
boundary — which is exactly React's normal model, just not fine-grained.

## Cleanup

The React root is unmounted by whoever owns the instance — the child being wired
if there is one, the render's scope otherwise — and the machine's effects stop with
it, so a subscription the effect took is dropped too. Disposing the mount, or
removing the list row the island sits in, tears the island down; a `render` through
a handle kept past that is ignored.

## Notes & limits

- **Context does not cross the boundary:** Exodra `provide`/`inject` and React
  Context are separate — pass anything an island needs through its props.
- **One React root per island:** prefer a few larger islands over many tiny ones.
- **Bundle note:** the helper imports `react-dom/server` as well as
  `react-dom/client`, so a client bundle carries the server renderer. A future
  `@exodra/react/server` entry will split them.

## What the helper needs from a connector

`TExoReactWiring` is a `Pick<TExoWiring, 'unsafeHtml' | 'onTeardown'>` and nothing more. It
does **not** name a backend's exonode: an island is called from one machine,
and that machine is run by all three backends, so naming a
backend here would make the helper server-only or browser-only and force the
author to write the component twice.

`unsafeHtml` is the **server half**. It is the one write door that takes *markup* — the
server prints the string where the children port stands, rather than escaping it
as text. That is exactly what "React rendered this subtree" is.

`onTeardown` is **who ends the island**. A React root with nothing to end it is a leak
that looks like it worked, so the unmount is registered through the connector,
which on `@exodra/dom` files it against the child being wired — and that is what
makes an island inside a list row go away with that row.

Both are a **slice** of `TExoWiring` rather than a second spelling of their
signatures, so there stays one place where what they mean is decided. The cost of
using `Pick` is that the members become *properties* with function types instead
of methods, and a property's parameters are contravariant under
`strictFunctionTypes` where a method's are bivariant. That cannot bite here: both
are declared identically on every backend, and identical signatures relate under
either rule.

`TExoReactDomWiring` adds the two fields the browser half reads off the
exonode, and no field the island does not read — the object a machine is handed is
the backend's instance record, so a stand-in naming a field the island never
reaches for cannot report when that field moves:

- `nodes` holds the resolved nodes of the instance being wired.
- `schema` carries the port → slot table. `schema.elem[port.index]` is the slot of the
  element a port stands on, **except** on an adopting pass: a hydrate schema carries
  a second, silenced `elem` whose children-port entries are all slot 0, and its
  `liveElem` is the table that addresses the page. The island therefore prefers
  `liveElem` wherever it exists. Handing `hydrateRoot` the wrong element is silent
  — React finds a mismatch, client-renders, and deletes the host.

## API Reference

| Export | Description |
| --- | --- |
| `reactIsland(c, port, Component, props, options?)` | mounts the island and returns its handle |
| `TExoReactIsland<TProps>` | the handle: `{ render(props): void }` |
| `TExoReactIslandOptions` | `{ ssr?: boolean }` |
| `TExoReactWiring` / `TExoReactDomWiring` | what the helper needs from a connector |

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
