---
title: React Interop
---

# React Interop

[`@exodra/react`](https://www.npmjs.com/package/@exodra/react) renders **React
components inside Exodra** as islands. Exodra owns the host element; React owns
everything inside it. The React root is created when the host mounts and torn
down when it unmounts — so islands participate correctly in Exodra's list/keyed
lifecycle, including nodes added or removed later.

## Installation

```bash
npm install @exodra/react
# peers you already have in a React-interop app:
npm install react react-dom
```

`react` and `react-dom` are **peer dependencies** — Exodra core never pulls in
React; you only pay for it where you use an island.

## Usage

`reactIsland(Component, props)` returns an Exodra schema you can drop anywhere a
child goes. Props are typed off the component:

```tsx
import { reactIsland } from '@exodra/react';
import { bindable } from '@exodra/reactivity';
import { FancyChart } from 'some-react-lib';

// static island — props checked against FancyChart's props
const staticChart = reactIsland(FancyChart, { series: [], theme: 'dark' });

// reactive island — pass a bindable of the props; each change re-renders it
const data = bindable({ series: [], theme: 'dark' as const });
const liveChart = reactIsland(FancyChart, data);

// drop it into an Exodra tree:
const view = (
  <section static={{ class: 'panel' }}>
    <h2>Live chart (React island)</h2>
    {/* as a child */}
    <div static={{ children: [liveChart] }} />
  </section>
);

// later: data.setValue({ series: nextSeries, theme: 'light' }) re-renders React.
```

`reactIsland` accepts either a plain props object (static island) or anything
with `getValue()` + `subscribe()` — which a `TExoBindable` from
`@exodra/reactivity` satisfies — for a reactive island. On each emit the island
re-renders with fresh props.

### Options

```ts
reactIsland(Component, props, { tag: 'section' }); // host element tag, default 'div'
```

## How Exodra props become React props

The whole props object is handed to React as-is: a static island renders once; a
reactive island (`TExoBindable<P>`) re-renders on every emit with the latest
`getValue()`. Because React needs a single props object, reactivity collapses to
"re-render this island" at the boundary — which is exactly React's normal model,
just not fine-grained.

## Cleanup

The React root is unmounted and the props subscription is removed automatically
in the host's `onExoUnmount`. Disposing (or list-removing) the surrounding Exodra
tree tears the island down; updates after teardown are ignored.

## Exports

- `reactIsland` — create a React island schema.
- Types: `ReactIslandOptions`, `ReadableBindable`.

## Notes & limits

- **SSR:** islands are client-only today (the host renders on the server, React
  mounts on the client). Server-rendering the island's markup + hydration is a
  planned follow-up.
- **Context does not cross the boundary:** Exodra `provide`/`inject` and React
  Context are separate — pass anything an island needs through its props.
- **One React root per island:** prefer a few larger islands over many tiny ones.

## Links

- npm: [`@exodra/react`](https://www.npmjs.com/package/@exodra/react)
- GitHub: [`packages/react`](https://github.com/abaikov/exodra/tree/master/packages/react)
