# @exodra/react-mount

Mount an **Exodra tree inside a React app**. React owns the container element;
Exodra owns everything inside it. Neither ever diffs the other's nodes, which is
what makes the boundary a hand-off rather than a race.

This is the mirror of [`@exodra/react`](https://www.npmjs.com/package/@exodra/react),
which embeds React components *inside* an Exodra tree. They are separate packages
so you install only the direction you use.

```bash
npm install @exodra/react-mount
# peers — the ones your app already has:
npm install @exodra/core @exodra/dom react
```

`@exodra/core`, `@exodra/dom` and `react` are **peer dependencies**, and nothing
is bundled into this package. That is not packaging hygiene for its own sake: an
Exodra tree keeps per-node bookkeeping on the schema objects themselves and
refuses to render one schema in two live positions, so a second copy of
`@exodra/dom` in the tree would break things in ways that are very hard to read.
One copy, shared with every other `@exodra/*` package you use.

## Usage

### The component

```tsx
import { ExoMount } from '@exodra/react-mount';
import { h } from '@exodra/core';

function Panel() {
  return (
    <section className="panel">
      <h2>Rendered by React</h2>
      <ExoMount
        className="chart"
        schema={() => h('div', { static: { textContent: 'rendered by Exodra' } })}
      />
    </section>
  );
}
```

`schema` takes a **factory**. It runs once per mount, so each mount gets a fresh
tree — which matters for React StrictMode (it mounts every component twice in
development) and for client-side navigation. A schema object works too; building
one inline in `render` does not, because it would allocate a tree on every React
render for nothing.

### The hook

`ExoMount` is sugar over `useExoMount`. Reach for the hook when you want the
container to be your own element:

```tsx
import { useExoMount } from '@exodra/react-mount';

function Chart({ data }: { data: Series }) {
  const ref = useExoMount<HTMLElement>(() => buildChart(data), { deps: [data] });
  return <figure ref={ref} className="chart" />;
}
```

The returned ref goes on the element Exodra should fill.

## Reactivity crosses the boundary, re-renders do not

An Exodra bindable updates the DOM directly. React is not involved, does not
re-render, and does not need to know:

```tsx
const label = bindable('idle');

<ExoMount schema={() => h('span', { bindables: { textContent: label } })} />;

label.setValue('running'); // the span updates; React never re-rendered
```

Conversely, a parent React re-render does **not** rebuild the Exodra subtree.
Passing a fresh arrow function on every render — the natural way to write it — is
safe: re-mounting happens only when `deps` change.

```tsx
// Re-mounts when `chartId` changes, and only then.
<ExoMount schema={() => buildChart(chartId)} deps={[chartId]} />
```

`deps` behaves like a `useEffect` dependency array, including the rule that it
must keep a stable length between renders. Omit it to mount once.

## Server rendering and static sites

Pass `html` — the output of `renderToString` from `@exodra/string` — and the
markup ships inside the server-rendered page. On the client, Exodra **hydrates**
that markup instead of rebuilding it: the first paint is the finished UI, and
JavaScript only attaches behaviour.

```tsx
// build step (Node)
import { renderToString } from '@exodra/string';
const html = renderToString(buildChart(data));

// page
<ExoMount schema={() => buildChart(data)} html={html} />
```

This is the shape a static site generator wants — Next.js, Astro, Docusaurus —
where the page is pre-rendered React and the island must arrive as HTML.

Two details are handled for you:

- The container is marked `suppressHydrationWarning`. React renders the markup
  verbatim and stops comparing it, because everything below the container belongs
  to Exodra.
- When there is nothing to hydrate — a client-side navigation, or StrictMode's
  second pass — it falls back to a normal mount instead of failing.

If you are rendering the whole page with Exodra rather than embedding into React,
you do not need this package: use `hydrate` from `@exodra/dom` directly.

## Lifecycle

The Exodra tree is disposed when the React component unmounts: subscriptions are
released, `onExoUnmount` hooks run, and the DOM is detached. Nothing is left
following a bindable after React has dropped the component.

## API

### `ExoMount(props)`

| prop        | type                                | description                                                        |
| ----------- | ----------------------------------- | ------------------------------------------------------------------ |
| `schema`    | `TExoSchema \| () => TExoSchema`    | The tree to mount. A factory is the normal choice.                  |
| `html`      | `string`                            | Server-rendered markup to hydrate. Implies `hydrate`.               |
| `hydrate`   | `boolean`                           | Adopt existing markup in the container instead of building.         |
| `deps`      | `readonly unknown[]`                | Re-mount when these change. Defaults to mounting once.              |
| `className` | `string`                            | Passed to the container element.                                    |
| `id`        | `string`                            | Passed to the container element.                                    |
| `style`     | `Record<string, string \| number>`  | Passed to the container element.                                    |

### `useExoMount(source, options?)`

Returns a ref to attach to the container element. `options` accepts `hydrate` and
`deps` with the same meaning as above.

## License

MIT
