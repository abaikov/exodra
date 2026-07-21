# @exodra/dom

DOM rendering and hydration for Exodra applications.

## Installation

```bash
npm install @exodra/dom @exodra/core @exodra/reactivity
```

## Overview

`@exodra/dom` renders Exodra schemas into the browser DOM:

- **Mounting** — render a schema into a container
- **Hydration** — attach to server-rendered HTML
- **Event handling** — handlers declared in the `handlers` bucket
- **Reactive attributes** — driven by bindables in the `bindables` bucket
- **Lifecycle** — `dispose()` tears the tree down and detaches it from the DOM

This package consumes raw Exodra schemas produced by `h()` (from `@exodra/core`)
or compiled from JSX by `@exodra/babel-plugin-jsx`. Exodra has a strict
**bucketed** props model — attributes, reactive values, lists, and event
handlers each live in their own bucket. There are no flat React-style props.

The raw `h()` buckets are **plural**: `static`, `bindables`, `bindableLists`,
`handlers`, `bindableHandlers`. (In JSX they are written singular — `static`,
`bindable`, `bindableList`, `handlers`, `bindableHandlers` — and the babel
plugin maps them to the plural core buckets.)

## API

```ts
import { mount, hydrate } from '@exodra/dom';
import type { TExoDomMountResult } from '@exodra/dom';

// mount(schema, container) — append a schema's element into `container`
mount(schema, container): TExoDomMountResult

// hydrate(schema, element) — adopt existing server-rendered DOM
hydrate(schema, element): TExoDomMountResult
```

`TExoDomMountResult` is:

```ts
type TExoDomMountResult = {
  node: ExoNodeDom;        // the live node tree
  element: Element | Text; // the mounted root (the container for a Fragment root)
  dispose(): void;         // unmount + detach from the DOM
};
```

There is **no** standalone `unmount(container)`, and `mount` does **not** return
a function. To unmount, keep the result and call `result.dispose()`.

## Mounting

```ts
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

const { dispose } = mount(app, document.getElementById('root')!);

// Later, unmount and detach from the DOM:
dispose();
```

Note: the 3rd argument to `h(type, attrs, cacheKey)` is a **clone-cache key**,
not children. Children always live inside a bucket — `static.children` (static),
`bindables.children` (a single reactive child), or `bindableLists.children`
(a reactive list). If specified in more than one bucket, the last wins.

## Hydration

For SSR apps, hydrate adopts the existing server-rendered element instead of
recreating it:

```ts
import { hydrate } from '@exodra/dom';

const { dispose } = hydrate(app, document.getElementById('root')!);
```

## Event Handling

Event handlers go in the `handlers` bucket. A flat `onClick` would silently land
in `static` as a dead attribute, so Exodra keeps them separate:

```ts
h('button', {
  static: { children: text('Interactive') },
  handlers: {
    onClick: e => console.log('Clicked!', e),
    onMouseOver: () => console.log('Hover!'),
  },
});

// Prevent default in a form submit:
h('form', {
  handlers: {
    onSubmit: e => {
      e.preventDefault();
      // handle form
    },
  },
});
```

For a reactive handler (a bindable whose value is the current listener), use the
`bindableHandlers` bucket.

## Reactive Attributes

Reactive values are bindables/derived from `@exodra/reactivity`, passed directly
into the `bindables` bucket — they are bindable **objects**, not thunks. Read
with `.getValue()`, write with `.setValue(...)`. There is no `.value` and no
`.get()`/`.set()`.

```ts
import { bindable, derive } from '@exodra/reactivity';

const isActive = bindable(false);
const cls = derive(isActive, active => (active ? 'active' : 'inactive'));

h('div', {
  bindables: { class: cls },
  handlers: { onClick: () => isActive.setValue(!isActive.getValue()) },
});
```

## Working with Forms

Bind an input's `value` to a writable bindable, and update it from the event:

```ts
import { bindable } from '@exodra/reactivity';

const name = bindable('');
const email = bindable('');

h('form', {
  static: {
    children: [
      h('input', {
        static: { type: 'text' },
        bindables: { value: name },
        handlers: {
          onInput: e => name.setValue((e.target as HTMLInputElement).value),
        },
      }),
      h('input', {
        static: { type: 'email' },
        bindables: { value: email },
        handlers: {
          onInput: e => email.setValue((e.target as HTMLInputElement).value),
        },
      }),
    ],
  },
});
```

The `@exodra/forms` package provides `bindText`, `bindNumber`, `bindChecked`,
and `bindSelect` helpers that produce the `{ bindables, handlers }` pair for you.

## Conditional Rendering

Use a derived bindable as a single reactive child via `bindables.children`:

```ts
import { bindable, derive } from '@exodra/reactivity';

const showDetails = bindable(false);
const details = derive(showDetails, show =>
  show ? h('div', { static: { children: text('Details…') } }) : text('')
);

h('div', {
  static: {
    children: [
      h('button', {
        static: { children: text('Toggle') },
        handlers: {
          onClick: () => showDetails.setValue(!showDetails.getValue()),
        },
      }),
    ],
  },
  bindables: { children: details },
});
```

## List Rendering

Reactive lists come from `list()` and go into the `bindableLists` bucket:

```ts
import { list } from '@exodra/reactivity';

const items = list<string>(['Item 1', 'Item 2']);

const ul = h('ul', {
  bindableLists: {
    children: list([
      h('li', { static: { children: text('Item 1') } }),
      h('li', { static: { children: text('Item 2') } }),
    ]),
  },
});

// Mutate with list ops — push / insert / remove / move / set / reset:
items.push('Item 3');
```

`list` is op-based: it exposes `snapshot()`, `subscribeOps()`, `push`, `insert`,
`remove`, `move`, `set`, `reset`. It has no `map`/`filter`/`forEach`/`length`.

## Lifecycle Hooks

Static lifecycle hooks `onExoMount` / `onExoUnmount` live in the `static` bucket
and receive the node (`{ element }`):

```ts
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
| `mount(schema, container)` | Mount a schema; returns `{ node, element, dispose }` |
| `hydrate(schema, element)` | Hydrate existing DOM; returns `{ node, element, dispose }` |
| `ExoNodeDom` | The DOM node implementation |
| `TExoDomMountResult` (type) | Return type of `mount`/`hydrate` |

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
