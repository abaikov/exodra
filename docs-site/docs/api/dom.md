---
title: DOM Renderer
---

# DOM Renderer

The `@exodra/dom` package is Exodra's browser renderer. It turns raw Exodra
schemas — produced by `h()` (from `@exodra/core`) or compiled from JSX by
`@exodra/babel-plugin-jsx` — into live DOM, and reconciles reactive updates in
place using identity-based reconciliation. It also hydrates server-rendered HTML
so a page produced with the [SSR](../guides/ssr.md) tooling becomes interactive
without re-creating the DOM.

Exodra has a strict **bucketed** props model — attributes (`static`), reactive
values (`bindables`), reactive lists (`bindableLists`), and event handlers
(`handlers`, `bindableHandlers`) each live in their own bucket. There are no
flat React-style props.

> The raw `h()` buckets are **plural** (`static`, `bindables`, `bindableLists`,
> `handlers`, `bindableHandlers`). In JSX they are written singular (`static`,
> `bindable`, `bindableList`, `handlers`, `bindableHandlers`) and the babel
> plugin maps them to the plural core buckets.

```bash
npm install @exodra/dom @exodra/core @exodra/reactivity
```

Exports: `mount`, `hydrate`, `ExoNodeDom`, and the `TExoDomMountResult` type.

## mount()

Renders a schema and appends its element into a container. Returns a
`TExoDomMountResult`.

```typescript
function mount(schema, container): TExoDomMountResult;

type TExoDomMountResult = {
  node: ExoNodeDom;        // the live node tree
  element: Element | Text; // the mounted root (the container for a Fragment root)
  dispose(): void;         // unmount + detach from the DOM
};
```

```javascript
import { h, text } from '@exodra/core';
import { mount } from '@exodra/dom';

const app = h('div', {
  static: {
    class: 'app',
    children: [
      h('h1', { static: { children: text('Hello Exodra') } }),
      h('button', {
        static: { children: text('Click me') },
        handlers: { onClick: () => alert('Clicked!') },
      }),
    ],
  },
});

const { dispose } = mount(app, document.getElementById('root'));

// Later, unmount and detach from the DOM:
dispose();
```

There is **no** standalone `unmount(container)`, and `mount` does **not** return
a function. To unmount, keep the result and call `result.dispose()`.

> The 3rd argument to `h(type, attrs, cacheKey)` is a **clone-cache key**, not
> children. Children always live inside a bucket — `static.children` (static),
> `bindables.children` (a single reactive child), or `bindableLists.children`
> (a reactive list). If specified in more than one bucket, the last wins.

### Event handling

Event handlers go in the `handlers` bucket. A flat `onClick` would silently land
in `static` as a dead attribute, so Exodra keeps them separate. For a reactive
handler (a bindable whose value is the current listener), use the
`bindableHandlers` bucket.

```javascript
h('button', {
  static: { children: text('Interactive') },
  handlers: {
    onClick: e => console.log('Clicked!', e),
    onMouseOver: () => console.log('Hover!'),
  },
});
```

### Reactive attributes

Reactive values are bindables/derived from `@exodra/reactivity`, passed directly
into the `bindables` bucket — they are bindable **objects**, not thunks. Read
with `.getValue()`, write with `.setValue(...)`. There is no `.value` and no
`.get()`/`.set()`.

```javascript
import { bindable, derive } from '@exodra/reactivity';

const isActive = bindable(false);
const cls = derive(isActive, active => (active ? 'active' : 'inactive'));

h('div', {
  bindables: { class: cls },
  handlers: { onClick: () => isActive.setValue(!isActive.getValue()) },
});
```

### Conditional rendering

Use a derived bindable as a single reactive child via `bindables.children`:

```javascript
import { bindable, derive } from '@exodra/reactivity';
import { h, text } from '@exodra/core';

const showDetails = bindable(false);
const details = derive(showDetails, show =>
  show ? h('div', { static: { children: text('Details…') } }) : text('')
);

h('div', {
  bindables: { children: details },
});
```

### List rendering

Reactive lists come from `list()` and go into the `bindableLists` bucket. The
renderer reconciles them by identity, touching only the nodes that changed.

```javascript
import { list } from '@exodra/reactivity';
import { h, text } from '@exodra/core';

const rows = list([
  h('li', { static: { children: text('Item 1') } }),
  h('li', { static: { children: text('Item 2') } }),
]);

const ul = h('ul', {
  bindableLists: { children: rows },
});

// Mutate with list ops — push / insert / remove / move / set / reset:
rows.push(h('li', { static: { children: text('Item 3') } }));
```

See the [Lists & Reconciliation](../guides/lists.md) guide for how keyed,
op-based reconciliation works.

## hydrate()

For SSR apps, `hydrate()` adopts the existing server-rendered element instead of
recreating it. It has the same signature and return type as `mount()`.

```typescript
function hydrate(schema, element): TExoDomMountResult;
```

```javascript
import { hydrate } from '@exodra/dom';

const { dispose } = hydrate(app, document.getElementById('root'));
```

Use `mount()` for a fresh client-only render, and `hydrate()` when the markup
already exists from the server. See the [SSR guide](../guides/ssr.md) for the
full server-render + hydration flow.

## ExoNodeDom

`ExoNodeDom` is the DOM node implementation — the live node tree that backs a
mounted schema. It is exposed on the mount result as `result.node`. Most apps
never construct it directly; it is available for advanced integrations and for
typing.

## Lifecycle hooks

Static lifecycle hooks `onExoMount` / `onExoUnmount` live in the `static` bucket
and receive the node (`{ element }`):

```javascript
h('div', {
  static: {
    onExoMount: node => console.log('mounted', node.element),
    onExoUnmount: node => console.log('unmounted', node.element),
  },
});
```

## API Reference

| Export | Description |
| --- | --- |
| `mount(schema, container)` | Mount a schema; returns `{ node, element, dispose }`. |
| `hydrate(schema, element)` | Hydrate existing DOM; returns `{ node, element, dispose }`. |
| `ExoNodeDom` | The DOM node implementation. |
| `TExoDomMountResult` (type) | Return type of `mount` / `hydrate`. |

## Links

- npm: [`@exodra/dom`](https://www.npmjs.com/package/@exodra/dom)
- GitHub: [exodra/packages/dom](https://github.com/abaikov/exodra/tree/master/packages/dom)
