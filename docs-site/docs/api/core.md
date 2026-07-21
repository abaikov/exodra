---
sidebar_position: 1
title: Core API
---

# Core API Reference

The `@exodra/core` package provides the schema factory and component primitives.
It does **not** contain reactivity (`bindable`/`derive`/`list` live in
[`@exodra/reactivity`](./reactivity.md)) or DOM mounting (`mount`/`hydrate` live
in `@exodra/dom`).

Exports: `h`, `text`, `defineComponent`, `createContextKey`, `ExoNode`,
`walkSchema`, and types.

## h()

Creates an Exodra schema node for elements or components. **The third argument is
a cache key, not children — children live inside the attribute buckets.**

```typescript
function h(
  type: string | Component,
  attrs?: {
    static?: Record<string, unknown>;
    bindables?: Record<string, unknown>;
    bindableLists?: Record<string, unknown>;
    handlers?: Record<string, (event: Event) => void>;
    bindableHandlers?: Record<string, unknown>;
  },
  cacheKey?: string | symbol
): TExoSchema;
```

- `type` — an HTML tag name (`'div'`), `'#text'` for text nodes, `'#fragment'`,
  or a component function / `Fragment`.
- `attrs` — the **plural** attribute buckets (note: in raw `h()` the buckets are
  `static`, `bindables`, `bindableLists`, `handlers`, `bindableHandlers`; the JSX
  buckets are singular and the Babel plugin maps them to these).
- `cacheKey` — optional clone-cache key for repeated static templates in loops
  (the Babel plugin adds this automatically).

### Children

Children go inside a bucket, under the `children` key (last one specified wins):

- `static.children` — static children (strings, schemas, arrays).
- `bindables.children` — a single reactive child (a bindable).
- `bindableLists.children` — a reactive list of children (a `list()`).

### Example

```javascript
import { h, text } from '@exodra/core';
import { bindable } from '@exodra/reactivity';

const title = bindable('Hello World');

const node = h('div', {
  static: { id: 'container', class: 'box', children: text('static label') },
  bindables: { textContent: title },
  handlers: { onClick: () => console.log('clicked') },
});
```

A component with props (props go in `static`):

```javascript
h(MyComponent, { static: { title: 'Hello', count: 42 } });
```

A fragment hosting a reactive list of children:

```javascript
import { list } from '@exodra/reactivity';

const items = list([text('a'), text('b')]);
h('#fragment', { bindableLists: { children: items } });
```

## text()

Creates a text node schema.

```typescript
function text(value: unknown): TExoSchema;
```

```javascript
import { text } from '@exodra/core';

const hello = text('Hello');
```

## defineComponent()

Identity helper that types a component function. A component is a function that
receives a context and returns a schema (or array of schemas).

```typescript
function defineComponent<TSchema, TResult>(
  component: (context: TExoContext) => TResult
): typeof component;
```

```javascript
import { defineComponent, h, text } from '@exodra/core';

const Greeting = defineComponent(context => {
  const name = context.getConstant('name') ?? 'World';
  return h('p', { static: { children: text(`Hello, ${name}`) } });
});
```

### The component context

The context object passed to components exposes:

| Method | Description |
| --- | --- |
| `getConstant(name)` | Read a static prop. |
| `getBindable(name)` | Read a bindable prop. |
| `getBindableList(name)` | Read a bindable-list prop. |
| `provide(key, value)` | Provide a context value to descendants. |
| `inject(key, fallback?)` | Inject a provided context value. |
| `onDispose(cleanup)` | Register a cleanup callback run when the node is disposed. |
| `createNode(schema)` | Create a child node from a schema. |

> There is **no** `onMount`, `get`, `getChildren`, `createContext`, or
> `createProvider`. Use `onDispose` for cleanup and `bindable.subscribe` for
> side effects.

## createContextKey()

Creates a typed key for context provide/inject.

```typescript
function createContextKey<TValue>(name?: string): TExoContextKey<TValue>;
```

```javascript
import { createContextKey, defineComponent, h } from '@exodra/core';

const themeKey = createContextKey('theme');

const Provider = defineComponent(context => {
  context.provide(themeKey, 'dark');
  return h('div', { static: { children: context.getConstant('children') } });
});

const Consumer = defineComponent(context => {
  const theme = context.inject(themeKey, 'light');
  return h('span', { static: { textContent: theme } });
});
```

## Fragment

`Fragment` is a `Symbol` (`Symbol.for('exodra.fragment')`) exported from
`@exodra/jsx`, used as the host for grouped children. In JSX the `<>…</>`
shorthand compiles to it.

```javascript
import { h, text } from '@exodra/core';
import { Fragment } from '@exodra/jsx';

h(Fragment, {
  static: {
    children: [
      h('li', { static: { children: text('Item 1') } }),
      h('li', { static: { children: text('Item 2') } }),
    ],
  },
});
```

> `Fragment` is a value imported from `@exodra/jsx`, not a function you call.

## mount() / hydrate()

DOM mounting lives in `@exodra/dom`, not `@exodra/core`.

```typescript
import { mount, hydrate } from '@exodra/dom';

function mount(schema: TExoSchema, container: Element | DocumentFragment): TExoDomMountResult;
function hydrate(schema: TExoSchema, element: Element | Text): TExoDomMountResult;

type TExoDomMountResult = {
  node: ExoNodeDom;
  element: Element | Text;
  dispose(): void;
};
```

`mount` appends a fresh tree to `container`; `hydrate` attaches to existing
server-rendered DOM (see the [SSR guide](../guides/ssr.md)). Both return a
result whose `dispose()` unmounts the tree — there is **no** standalone
`unmount()`.

```javascript
import { mount } from '@exodra/dom';
import { h, text } from '@exodra/core';

const { dispose } = mount(
  h('div', { static: { children: text('Hello') } }),
  document.getElementById('root')
);

// later…
dispose();
```
