# @exodra/core

The core schema and component system for Exodra — a modern, lightweight web framework
with fine-grained reactivity.

## Installation

```bash
npm install @exodra/core
```

## Overview

`@exodra/core` provides the foundational schema system that the Exodra renderers
(`@exodra/dom`, `@exodra/string`, `@exodra/ssr`) consume. It includes:

- **Schema factory** — `h()` builds plain schema objects; `text()` builds text nodes.
- **Five-bucket attribute architecture** — props are grouped by how they behave for
  maximum rendering performance.
- **Components** — plain functions that receive a context and return schema.
- **Context API** — type-safe context keys with `provide` / `inject`.
- **Lifecycle** — `onDispose` cleanup registration.

`@exodra/core` itself is renderer-agnostic and reactivity-agnostic: it only describes the
tree. Reactive values come from `@exodra/reactivity`, and JSX is compiled to `h()` calls
by `@exodra/babel-plugin-jsx`.

## The five attribute buckets

Exodra does not use flat React-style props. Every attribute lives in one of five buckets,
chosen by how it behaves. This explicit separation is what lets the renderer skip work it
knows can never change.

```typescript
import { h, text } from '@exodra/core';

h('div', {
  static:           { id: 'box', class: 'container', children: text('Hello') }, // never change
  bindables:        { textContent: title },   // reactive single values (bindables)
  bindableLists:    { children: items },       // a reactive list of children
  handlers:         { onClick: handleClick },  // static event handlers
  bindableHandlers: { onClick: handlerSignal }, // handlers that can change reactively
});
```

| Bucket | Holds | Notes |
| --- | --- | --- |
| `static` | Values that never change | Plain values: strings, numbers, schema, `text()` nodes. |
| `bindables` | Reactive single values | Pass a bindable **object** directly (e.g. from `bindable()` / `derive()`). |
| `bindableLists` | A reactive list | Pass a `list()` — used most often for `children`. |
| `handlers` | Event handlers | Plain functions, e.g. `onClick`, `onInput`. |
| `bindableHandlers` | Reactive event handlers | A bindable whose value is the current handler. |

> Bindable bucket values are bindable objects, passed directly. They are **not** thunks
> and have **no** `.value`. Write `bindables: { textContent: title }`, never
> `bindables: { textContent: () => title.value }`.

## `h()` — the schema factory

```typescript
function h(
  type: string | Component | Fragment,
  attrs?: TExoSchemaProps,
  cacheKey?: string | symbol,
): TExoSchema;
```

- `type` is an HTML tag (`'div'`), `'#text'`, `'#fragment'`, or a component function.
- `attrs` is the five-bucket object described above.
- `cacheKey` (the **third** argument) is an optional clone-cache key for loops — it is
  **not** children. The babel plugin generates these automatically.

> Children are **not** a positional argument. They go inside the buckets:
> `static.children`, `bindables.children`, or `bindableLists.children` (the last one
> specified wins). Use `text()` for static text children.

```typescript
import { h, text } from '@exodra/core';

// Element with static children
h('div', { static: { class: 'card', children: text('Hi') } });

// Element with a reactive list of children
h('ul', { bindableLists: { children: itemList } });

// Component with props
h(MyComponent, { static: { title: 'Hello', count: 42 } });
```

### Text nodes

`text(value)` creates a text-node schema (a `'#text'` element with `static.textContent`):

```typescript
import { text } from '@exodra/core';

text('Hello, world');
```

For reactive text, bind it on an element instead: `h('span', { bindables: { textContent: label } })`.

## Components

A component is a plain function `(context) => schema`. Define one with `defineComponent`
for type inference, or just write the function. It receives a context and returns one or
more schema nodes.

```typescript
import { h, text, defineComponent } from '@exodra/core';

const Greeting = defineComponent(context => {
  const name = context.getConstant<string>('name'); // reads the `static` bucket
  return h('div', { static: { children: text(`Hello, ${name}!`) } });
});

// Usage — props go in the buckets, just like elements:
h(Greeting, { static: { name: 'World' } });
```

### Reading props from context

The context exposes one reader per bucket:

```typescript
const Button = defineComponent(context => {
  const label = context.getConstant<string>('label');        // from `static`
  const disabled = context.getBindable('disabled');          // from `bindables`
  const children = context.getBindableList('children');       // from `bindableLists`

  return h('button', {
    static: { children: text(label ?? '') },
    bindables: disabled ? { disabled } : {},
  });
});
```

`getConstant` reads the `static` bucket, `getBindable` reads `bindables`, and
`getBindableList` reads `bindableLists`. Handlers are forwarded by the renderer when you
re-emit them on an element — pass the handler in at the call site:

```typescript
h(Button, {
  static: { label: 'Save' },
  handlers: { onClick: () => save() },
});
```

### Children

Children passed to a component arrive in the bucket they were placed in. Read them with
`getConstant('children')` (static children) or `getBindableList('children')` (a reactive
list), then place them on an element:

```typescript
const Container = defineComponent(context => {
  const children = context.getConstant('children');
  return h('div', { static: { class: 'container', children } });
});
```

## Context API

Create a context key with `createContextKey(name?)`, then `provide` a value higher in the
tree and `inject` it lower down. The key is type-safe.

```typescript
import { h, text, defineComponent, createContextKey } from '@exodra/core';

const ThemeContext = createContextKey<'light' | 'dark'>('theme');

const App = defineComponent(context => {
  context.provide(ThemeContext, 'dark');
  return h(ThemedBox);
});

const ThemedBox = defineComponent(context => {
  const theme = context.inject(ThemeContext, 'light'); // fallback when not provided
  return h('div', { static: { class: theme, children: text('Themed content') } });
});
```

## Lifecycle

A component can register cleanup with `context.onDispose`. It runs when the node is
disposed (e.g. when a `mount` result is disposed, or a list child is removed).

```typescript
const Ticker = defineComponent(context => {
  const id = setInterval(() => console.log('tick'), 1000);
  context.onDispose(() => clearInterval(id));
  return h('div', { static: { children: text('running') } });
});
```

> There is no `onMount`. Register teardown with `onDispose`. (DOM-level mount/unmount
> hooks like `onExoMount` / `onExoUnmount` are handled by `@exodra/dom` via the `static`
> bucket, not by core.)

## TypeScript support

```typescript
import { h, text, defineComponent } from '@exodra/core';
import type { TExoContext, TExoSchema } from '@exodra/core';

const Card = defineComponent((context: TExoContext): TExoSchema => {
  const title = context.getConstant<string>('title');
  const count = context.getConstant<number>('count');
  return h('div', { static: { children: text(`${title}: ${count}`) } });
});
```

Exported types include `TExoContext`, `TExoContextKey`, `TExoComponent`, `TExoSchema`,
`TExoSchemaProps`, `TExoNodeSchema`, `TExoChild`, and `TExoChildren`.

## API reference

### Functions

- `h(type, attrs?, cacheKey?)` — create a schema node. The third arg is a cache key, not children.
- `text(value)` — create a text-node schema.
- `defineComponent(fn)` — identity helper that types a component function.
- `createContextKey(name?)` — create a type-safe context key.
- `walkSchema(schema)` — traverse a schema tree (returns `TExoWalkResult`).

### Context methods

- `getConstant(name)` — read a value from the `static` bucket.
- `getBindable(name)` — read a value from the `bindables` bucket.
- `getBindableList(name)` — read a value from the `bindableLists` bucket.
- `provide(key, value)` — provide a context value to descendants.
- `inject(key, fallback?)` — read a provided context value (with optional fallback).
- `onDispose(cleanup)` — register a teardown callback.
- `createNode(schema)` — create a child node within the current context.

### Class

- `ExoNode` — the base node implementation used by renderers.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
