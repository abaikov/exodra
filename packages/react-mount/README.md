# @exodra/react-mount

Mount an **Exodra tree inside a React app**. React owns the container element;
Exodra owns everything inside it. Neither ever diffs the other's nodes, which is
what makes the boundary a hand-off rather than a race.

This is the mirror of [`@exodra/react`](https://www.npmjs.com/package/@exodra/react),
which embeds React components _inside_ an Exodra tree. They are separate packages
so you install only the direction you use.

```bash
npm install @exodra/react-mount
# peers — the ones your app already has:
npm install @exodra/core @exodra/dom react
```

`@exodra/core`, `@exodra/dom` and `react` are **peer dependencies**, and nothing
is bundled into this package. One copy of the runtime, shared with every other
`@exodra/*` package you use.

## Usage

### The component

Everything here is a **React** file: React JSX, React props, React's `jsx`
setting. Exodra's schema starts below `ExoMount`, inside the component you hand
it. (The `@jsxImportSource` pragma below is shown once and is only needed in a
project whose `tsconfig` points `jsxImportSource` at `@exodra/jsx/schema`; it tells
TypeScript that this particular file is the React side of the boundary. A plain
React app needs nothing.)

```tsx setup
/** @jsxImportSource react */
import { ExoMount } from '@exodra/react-mount';
import { EXO_PORT_TEXT, createExoMachine, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';

// Built ONCE, at module load — this is what a component is in this core. There are no props
// anywhere: an initial state is `(exonode, params) => …`, and a mounted root is handed the params
// `ExoMount` was given. The EXONODE is typed `TExoMachineNode` — the surface all three backends share — rather
// than `@exodra/dom`'s `TExoDomNode`, which would tie the component to the browser for no
// reason.
const ChartPorts = exoPorts({ label: EXO_PORT_TEXT });
const chartSchema = createExoSchema(ChartPorts, b => {
  b.el('div', { class: 'chart' }, div => { div.textPort(ChartPorts.label); });
});
const Chart = createExoMachine(chartSchema, {
  createInitialState: (c: TExoMachineNode) => { c.text(ChartPorts.label, 'rendered by Exodra'); },
});

function Panel() {
  return (
    <section className="panel">
      <h2>Rendered by React</h2>
      <ExoMount className="chart" component={Chart} />
    </section>
  );
}
```

`component` takes the component value itself. A **function** returning one works
too, and is how you _choose_ a component at mount time:

```tsx
declare const mode: 'chart' | 'table';
declare const Table: typeof Chart;

<ExoMount component={() => (mode === 'chart' ? Chart : Table)} deps={[mode]} />
```

The function runs once per mount, never per React render.

### The hook

`ExoMount` is sugar over `useExoMount`. Reach for the hook when you want the
container to be your own element:

```tsx
import { useExoMount } from '@exodra/react-mount';

function ChartFigure({ seriesId }: { seriesId: string }) {
  const { ref } = useExoMount<HTMLElement>(Chart, { deps: [seriesId] });
  return <figure ref={ref} className="chart" />;
}
```

`ref` goes on the element Exodra should fill. `node` holds the island's exonode
once it is mounted, so a React handler can fire a transition at it.

### Params

`params` reach the machine's `wire`. When they change — compared key by key — the
wire re-runs on the same instance instead of re-mounting:

```tsx
import type { TExoMachine } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

declare const Greeting: TExoMachine<TExoDomNode, unknown, { name: string }>;
declare const name: string;

<ExoMount component={Greeting} params={{ name }} />
```

A machine with no `wire` is re-mounted instead; a wire that places children
with `c.one` or `c.list` refuses a re-run with `EXO0103`.

### More than one instance

There is no `count`, and there never can be one: the mount creates a single
instance, as `backend.createExoNode(machine)` does, and wires it with the mount's params. Rows that vary are a
**list**, which is a property of the component rather than of the mount — a
children port filled with `c.list(port, Row, rows)` for a fixed run of them, or
a reconciler made once at module level with `createExoChildrenReconciler(Row)` from
`@exodra/list-reconcile` and called as `reconcileRows(c, port, items)` from a transition or an
effect, for a list that follows a source. Each row gets, as its params, what its initial state
and its `wire` read: `rows[i]` from `c.list`, its item from the reconciler.

So mount one component that owns the list:

```tsx
declare const Board: typeof Chart;
// const reconcileRows = createExoChildrenReconciler(Row); at module level, and Board's effect does
//   reconcileRows(c, BoardPorts.rows, items)
<ExoMount component={Board} />
```

That is also what a benchmark is comparing when another framework "renders 1000
rows": the participant on both sides is a list, and the mount is the one root
above it.

## Updates cross the boundary, re-renders do not

A machine that follows a source updates the DOM directly. React is not involved,
does not re-render, and does not need to know:

```tsx
declare const status: { get(): string; subscribe(listener: () => void): () => void };
// in the machine:
//   withExoEffects(statusBase, (effect) => {
//       effect((c) => {
//           c.text(StatusPorts.text, status.get());
//           return status.subscribe(() => c.text(StatusPorts.text, status.get()));
//       });
//   });
// — an effect that draws and subscribes; there is no `c.bind`.
// When `status` changes, the text updates; React never re-rendered.
```

Conversely, a parent React re-render does **not** rebuild the Exodra subtree.
Passing a fresh arrow function on every render — the natural way to write it — is
safe: re-mounting happens only when `deps` change.

`deps` behaves like a `useEffect` dependency array, including the rule that it
must keep a stable length between renders. Omit it to mount once.

## Server rendering and static sites

Pass `html` — the output of `@exodra/string`'s backend, for the **same
component** — and the markup ships inside the server-rendered page. On the
client, Exodra **hydrates** that markup instead of rebuilding it: the first paint
is the finished UI, and JavaScript only attaches behaviour.

```tsx
// build step (Node)
import { ExoStrBackend } from '@exodra/string';
const html = new ExoStrBackend().render(Chart);

// page
<ExoMount component={Chart} html={html} />
```

This is the shape a static site generator wants — Next.js, Astro, Docusaurus —
where the page is pre-rendered React and the island must arrive as HTML.

Three details are handled for you:

-   The container is marked `suppressHydrationWarning`. React renders the markup
    verbatim and stops comparing it, because everything below the container belongs
    to Exodra.
-   `hydrate` is handed **the container**, not the server's root element: it adopts
    the container's first _element_ child itself — by element and not by node, so a
    formatting newline does not shift what is adopted.
-   When there is nothing to adopt — a client-side navigation, or StrictMode's
    second pass, whose cleanup emptied the container — it falls back to a normal
    render instead of failing.
-   **A reconciled children port adopts the rows it was served**, as long as its
    effect draws synchronously when it starts: hydration hands the served rows to
    `build` in document order, sweeps the surplus and builds the rest.
-   **Hydration is a plugin.** A backend composed without `withExoHydration` has no
    `hydrate` at all, so an island handed such a backend renders rather than
    adopting — which is what keeps the adopters out of a client-only bundle. That is
    why `hydrate` is optional in the `backend` type. Left out entirely, the island
    runs on this package's own module-level backend, which composes hydration
    because an island over server markup is what this package is for.

**Following a source is not a plugin.** An island's component is a
`TExoDomMachine`, and a machine that follows a source does it in an effect that
writes through the `attr` / `text` / `html` doors a bare `new ExoDomBackend()`
already answers. So the `backend` type demands nothing for it; `hydrate` is the one member it treats as
optional, because hydration genuinely is a pack.

Everything replaceable about the renderer inside the container is decided by that
one object: how events attach, how a value is written, what record an instance is.

If you use a non-default event strategy (delegation), pass the **same backend**
here that the page was rendered from, via `backend`. The event pack is no longer a
separate argument that could disagree — it is a field on the backend, so handing
over the same object is the whole of getting it right. Attaching listeners is the
content of hydration, not a detail of it.

If you are rendering the whole page with Exodra rather than embedding into React,
you do not need this package: build an `ExoDomBackend` from `@exodra/dom` and call
`render` / `hydrate` on it directly.

## Lifecycle

The disposer that `backend.render` / `backend.hydrate` hands back **is** the
effect's cleanup — that is the whole lifecycle story here, and why this package is
as small as it is. On unmount, and on a `deps` change, subscriptions are released
and the container is emptied, so a re-mount replaces the subtree instead of
appending a second copy beside it.

Emptying the container is this package's doing, not `render`'s: that entry
point renders into somebody else's parent and has no claim on its contents. Here
the contract is that React owns the container and Exodra owns everything inside
it, so **do not put React children inside the mount element** — they will be
removed on the first re-mount.

## API

### `ExoMount(props)`

| prop        | type                                           | description                                                                                                                                                                                                       |
| ----------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `component` | `TExoMountSource<TParams>`                     | The component to render, or a function returning one.                                                                                                                                                             |
| `params`    | `TParams`                                      | Handed to the machine's `wire`; a change re-runs it on the same instance.                                                                                                                                         |
| `html`      | `string`                                       | Server-rendered markup to hydrate. Implies `hydrate`.                                                                                                                                                             |
| `hydrate`   | `boolean`                                      | Adopt existing markup in the container instead of building.                                                                                                                                                       |
| `backend`   | `TExoDomBackend` (optionally with `adoptRoot`) | The composed backend this island renders from. Build it once, at module level — it is the schema cache key and is compared by pointer. Defaults to this package's own backend, which composes `withExoHydration`. |
| `deps`      | `readonly unknown[]`                           | Re-mount when these change. Defaults to mounting once.                                                                                                                                                            |
| `className` | `string`                                       | Passed to the container element.                                                                                                                                                                                  |
| `id`        | `string`                                       | Passed to the container element.                                                                                                                                                                                  |
| `style`     | `Record<string, string \| number>`             | Passed to the container element.                                                                                                                                                                                  |

There is no `count` and no `events`. `render` mounts one instance, and the event
strategy is a field on the `backend` rather than a parameter beside it — which is
what makes a hydrating island unable to disagree with the render about how
listeners attach.

### `useExoMount(source, options?)`

Returns `{ ref, node }`: `ref` for the container element, `node` for the mounted
exonode. `options` accepts `hydrate`, `deps`, `params` and `backend` with the same
meaning as above.

## License

MIT
