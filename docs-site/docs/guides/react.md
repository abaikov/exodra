---
title: React Interop
---

# React Interop

Two packages, one for each direction. They are separate so a React app can adopt
Exodra — or an Exodra app can embed React — without installing the other
direction, and so both resolve the same `@exodra/*` instances through peer
dependencies instead of each pinning its own copy.

| Package | Direction |
| --- | --- |
| [`@exodra/react`](#react-inside-exodra) | a React component inside an Exodra component |
| [`@exodra/react-mount`](#exodra-inside-react) | an Exodra component inside a React tree |
| [`@exodra/react-compat`](./react-compat.md) | React code running on Exodra |
| [`@exodra/to-react`](./to-react.md) | Exodra code translated into plain React |

## React inside Exodra

```bash
npm install @exodra/react
# peers you already have in a React-interop app:
npm install react react-dom
```

`react` and `react-dom` are **peer dependencies** — Exodra never pulls in React;
you only pay for it where you use an island.

`reactIsland` is a **wiring helper**, in the shape `writeExoChoice` from
`@exodra/forms` has — a function of the exonode and ports your schema declared:
you declare the host element and its children port in the schema, call this
from the machine's initial state, and keep the handle it returns. `render(props)`
on that handle re-renders the island; a transition or an effect calls it.

```ts
import { EXO_PORT_CHILDREN, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { reactIsland } from '@exodra/react';
import type { TExoReactIsland } from '@exodra/react';
import type { ComponentType } from 'react';

type TChartProps = { readonly series: readonly number[]; readonly theme: string };

declare const FancyChart: ComponentType<TChartProps>;

const chartProps = {
    value: { series: [], theme: 'dark' } as TChartProps,
    listeners: new Set<() => void>(),
    getValue(): TChartProps {
        return this.value;
    },
    setValue(next: TChartProps): void {
        this.value = next;
        for (const listener of Array.from(this.listeners)) listener();
    },
    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },
};

const ChartPorts = exoPorts({ host: EXO_PORT_CHILDREN });

const chartSchema = createExoSchema(ChartPorts, (b) => {
    b.el('div', { 'data-exo-react': '' }, (div) => {
        div.childrenPort(ChartPorts.host);
    });
});
const chartBuilder = createExoMachineBuilder<
    TExoMachineNode,
    unknown,
    { island: TExoReactIsland<TChartProps> }
>(chartSchema);
chartBuilder.createInitialState((c) => ({
    island: reactIsland(c, ChartPorts.host, FancyChart, chartProps.getValue()),
}));
chartBuilder.effect((c) =>
    chartProps.onChange(() => {
        c.state.island.render(chartProps.getValue());
    })
);
const Chart = chartBuilder.done();

// Later — one change re-renders the island with the latest props:
chartProps.setValue({ series: [1, 2, 3], theme: 'light' });
```

Exodra owns the host element; React owns everything inside it.

**The port must be its element's only child.** That restriction is the DOM
backend's rather than this package's: a children port that owns all of its
element's content is the one shape raw markup can be written into without
deleting a sibling — and a host element is that by construction.

### Props

Pass a plain props object for a static island, or anything with `getValue()` and
`onChange()` — which a bindable satisfies — for a reactive one. Every emit
re-renders the island with the latest value. Reactivity collapses to "re-render
this island" at the boundary, which is React's own model rather than a limitation
of the bridge.

### All three backends, from the one call

The helper asks the **connector** which backend is filling, not the environment —
`typeof document === 'undefined'` is wrong twice over, since a server suite under
jsdom has a `document` and no element to mount into.

- **Server:** the component is rendered to HTML and written into the port, so the
  island's content is in the initial payload (SEO, no layout shift).
- **Hydration:** the served markup is found in the host and handed to
  `hydrateRoot` — React taking over the server's DOM in place. Exodra writes
  nothing into the host itself.
- **Client render:** the host is empty, so the island mounts fresh with
  `createRoot`.

Which of the last two runs is decided by what is already in the host, and nothing
else can decide it: hydration and a client render run the **same** machine, so the
markup is the only evidence of which one produced this element.

`{ ssr: false }` makes an island client-only — an empty host on the server,
`createRoot` in the browser:

```ts
import type { TExoChildrenPort } from '@exodra/core';
import { reactIsland } from '@exodra/react';
import type { TExoDomNode } from '@exodra/dom';
import type { ComponentType } from 'react';

declare const c: TExoDomNode;
declare const host: TExoChildrenPort;
declare const Chart: ComponentType<Record<string, never>>;

reactIsland(c, host, Chart, {}, { ssr: false });
```

### Cleanup

The React root and the props subscription are registered against the child being
wired, so disposing the mount — or removing the list row the island sits in —
unmounts React and drops the subscription. Emits after that are ignored.

### Exports

- `reactIsland(connector, port, Component, props, options?)`
- Types: `TExoReactIslandOptions`, `TExoReactWiring`,
  `TExoReactDomWiring`, `TExoReadableSource`

### Notes & limits

- **Context does not cross the boundary.** Exodra `provide` / `inject` and React
  Context are separate — pass anything an island needs through its props.
- **One React root per island.** Prefer a few larger islands over many tiny ones.
- Server rendering pulls in `react-dom/server`. Use `{ ssr: false }` where you do
  not need it.

## Exodra inside React

```bash
npm install @exodra/react-mount
```

`useExoMount(component, options?)` returns `{ ref, node }`: `ref` goes on a
container element, and `node` holds the island's exonode once it is mounted.
React renders that element and never looks inside it again; Exodra builds,
updates and tears down everything below. The two never diff the same nodes, which
is what makes the boundary safe rather than a race.

<!-- no-check: React JSX, whose ref/prop types this repo's doc gate has not been pointed at. -->

```tsx no-check
/** @jsxImportSource react */
import { useExoMount } from '@exodra/react-mount';
import type { TExoDomMachine } from '@exodra/dom';

declare const Chart: TExoDomMachine;
declare const seriesId: string;

export function ChartIsland() {
  const { ref } = useExoMount<HTMLElement>(Chart, { deps: [seriesId] });
  return <figure ref={ref} />;
}
```

`ExoMount` is the component form of the same thing:

<!-- no-check: React JSX, whose ref/prop types this repo's doc gate has not been pointed at. -->

```tsx no-check
/** @jsxImportSource react */
import { ExoMount } from '@exodra/react-mount';
import type { TExoDomMachine } from '@exodra/dom';

declare const Chart: TExoDomMachine;

export function Panel() {
  return <ExoMount component={Chart} className="chart" />;
}
```

### Options

| Option | Meaning |
| --- | --- |
| `hydrate` | adopt server markup already in the container instead of building; falls back to a fresh render when there is nothing to adopt |
| `params` | handed to the machine's `wire`. When they change — compared key by key, so a fresh object with the same values is no change — the wire re-runs on the same instance, without re-mounting |
| `deps` | re-mount when one of these changes, like a `useEffect` dependency array; defaults to "mount once" |
| `backend` | the backend this island renders from — the object your application composed. Left out, the island runs on this package's own, which composes `withExoHydration` because an island over server markup is what the package is for |

There is **no instance count**. `backend.render` mounts one instance, which is
exactly what an island is; rows that vary inside it are a list, filled by
`c.list` or by a transition calling `reconcileExoOrder` over `c.childList` in the component's own machine.

`ExoMount` takes those plus `html`, `className`, `id` and `style`. Passing `html`
(from `new ExoStrBackend().render(...)`) ships the markup inside the
server-rendered page and implies `hydrate`, so the first paint is the finished UI
and hydration only attaches behaviour.

:::caution A hydrating island needs the backend its markup was rendered from
Attaching listeners is the whole content of hydration, so the event strategy is
not a detail of it — and it is no longer a parameter that can disagree, because it
travels **with the backend**. Hand the island the same object the page rendered
from and the two cannot diverge; hand it a different one and every replaceable
decision inside the container changes with it.

`hydrate` is optional on that type because hydration is a **pack**: a backend
composed without `withExoHydration` genuinely has no `hydrate` method, and an
island given such a backend renders instead of adopting.

Pass the **same object** every time. A plan is cached per backend by pointer, so a
backend constructed in the component body is a new key on every render and
recompiles every schema in the island — markup parse included. Build it once, at
module level.
:::

### Params

A React parent passes values in through `params`; the machine reads them in its
`wire`, which runs once after `createInitialState` and again on every change:

<!-- no-check: React JSX, whose ref/prop types this repo's doc gate has not been pointed at. -->

```tsx no-check
/** @jsxImportSource react */
import { ExoMount } from '@exodra/react-mount';

export function Profile({ name }: { name: string }) {
  return <ExoMount component={Greeting} params={{ name }} />;
}
```

The instance is built with `backend.buildRoot` and placed with
`backend.mountRoot` (see [Build, then mount](../api/dom.md#build-then-mount));
a params change is `wireExoNode(node, Greeting, params)` on that same node, so
the elements, the machine state and the effects all stay.

Two limits come from the machine, not from this package:

- a machine with **no `wire`** has nothing to re-run, so a params change
  re-mounts it;
- a wire that **opens children** (`childList`, `one`, `list`) refuses a re-run
  with `EXO0103` — open them in `createInitialState`.

To reach the instance from React — to fire a transition from a React event
handler — read `node.current` from the hook:

<!-- no-check: React JSX, whose ref/prop types this repo's doc gate has not been pointed at. -->

```tsx no-check
/** @jsxImportSource react */
export function GreetingIsland() {
  const { ref, node } = useExoMount<HTMLDivElement>(Greeting, { params: { name: 'Ann' } });
  return (
    <>
      <div ref={ref} />
      <button onClick={() => shout(node.current as never)}>shout</button>
    </>
  );
}
```

### What the component may be

`TExoMountSource` is a component **or a function returning one**. The plain value
is the normal thing to pass: `createExoSchema` builds the schema once at module

load, so there is nothing to rebuild per mount. The function form is how a
component gets *chosen* — `() => tab === 'chart' ? Chart : Table` — and it runs
once per mount, never per React render, with `deps` deciding when that choice is
made again.

### Cleanup

The effect's cleanup calls the disposer `backend.mountRoot` returned
and then empties the container. Emptying it is this package's job specifically because
its contract is that React owns the container and Exodra owns everything inside
it; without it, a `deps` change would append a second copy beside the first.

## Links

- npm: [`@exodra/react`](https://www.npmjs.com/package/@exodra/react) ·
  [`@exodra/react-mount`](https://www.npmjs.com/package/@exodra/react-mount)
- GitHub: [`packages/react`](https://github.com/abaikov/exodra/tree/master/packages/react) ·
  [`packages/react-mount`](https://github.com/abaikov/exodra/tree/master/packages/react-mount)
