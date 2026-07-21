---
sidebar_position: 1
title: JSX Guide
---

# JSX in Exodra

Exodra JSX is **not** React JSX. Props are split into typed buckets, and reactive
values are passed as bindable objects — not thunks and not `.value` reads. This
explicitness is what lets the renderer wire up reactivity once, with no diffing.

## Setup

### Babel configuration

JSX requires the Exodra Babel plugin. TypeScript's native JSX transform and
`@babel/plugin-transform-react-jsx` are **incompatible** — do not use them.

```bash
npm install --save-dev @exodra/babel-plugin-jsx
```

Configure `.babelrc`:

```json
{
  "plugins": [
    ["@exodra/babel-plugin-jsx", { "hoistStatic": true }]
  ]
}
```

Plugin options: `importSource` (default `@exodra/core`), `pragma` (default `h`),
`pragmaFrag` (default `Fragment`), and `hoistStatic`. There is **no** `optimize`
or `staticHoisting` option.

### TypeScript configuration

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@exodra/jsx"
  }
}
```

## The typed buckets

Every JSX prop goes into one of these buckets. Flat React-style attributes
(`<div id="x" class="y" onClick={fn}>`) are a **compile error**.

| Bucket | Holds | Example |
| --- | --- | --- |
| `static={{ }}` | Values that never change | `static={{ id: 'app', class: 'box' }}` |
| `bindable={{ }}` | Reactive values (bindable objects) | `bindable={{ textContent: title }}` |
| `bindableList={{ }}` | Reactive lists (`list()` objects) | `bindableList={{ children: rows }}` |
| `handlers={{ }}` | Event handlers | `handlers={{ onClick: fn }}` |
| `bindableHandlers={{ }}` | Reactive handlers | `bindableHandlers={{ onClick: handlerBindable }}` |

Directives are also available: `bind:value`, `bind:checked`, `cache:key` (alias
`cacheKey`), and `exo:schema`.

## Basic elements

```jsx
import { bindable } from '@exodra/reactivity';

const message = bindable('Hello World');

// Static content
<div static={{ id: 'container', class: 'wrapper' }}>
  Hello World
</div>

// Reactive text — pass the bindable directly, never a thunk or .value
<div bindable={{ textContent: message }} />
```

## Reactive values are objects, not thunks

The `bindable` bucket takes bindable/derived **objects**, passed by reference.
Never write `() => x.value` — there is no `.value` and no thunk form.

```jsx
import { bindable, derive } from '@exodra/reactivity';

const isVisible = bindable(true);
const hidden = derive(isVisible, v => !v);
const cls = derive(isVisible, v => (v ? 'panel panel--open' : 'panel'));

<div
  static={{ id: 'panel' }}
  bindable={{ class: cls, hidden }}
/>
```

To update state, call `setValue`:

```jsx
<button handlers={{ onClick: () => isVisible.setValue(!isVisible.getValue()) }}>
  Toggle
</button>
```

## Components

A component is a function whose props arrive through the buckets. Read them via
the context (`getConstant` etc.) or, in JSX-authored components, off the
destructured attributes — here we show the schema-returning style used across the
examples.

```jsx
import { defineComponent, h, text } from '@exodra/core';

const Button = defineComponent(context => {
  const label = context.getConstant('label') ?? 'Click';
  const onClick = context.getConstant('onClick');
  return h('button', {
    static: { class: 'btn', children: text(label) },
    handlers: { onClick },
  });
});

// Usage — props go in static, handlers in handlers
<Button static={{ label: 'Click me' }} handlers={{ onClick: handleClick }} />
```

Children are just `static.children` (or a bindable/bindableList for reactive
children):

```jsx
const Card = defineComponent(context =>
  h('div', { static: { class: 'card', children: context.getConstant('children') } })
);

<Card static={{ children: 'Card content' }} />
```

## Event handling

Handlers always live in the `handlers` bucket. The handler receives the DOM
event.

```jsx
const inputValue = bindable('');

<input
  static={{ type: 'text', placeholder: 'Enter text' }}
  bindable={{ value: inputValue }}
  handlers={{
    onInput: e => inputValue.setValue((e.target as HTMLInputElement).value),
  }}
/>

<form
  handlers={{
    onSubmit: e => {
      e.preventDefault();
      submit();
    },
  }}
/>
```

## List rendering

For dynamic lists, use a `list()` from `@exodra/reactivity` in the
`bindableList` bucket. The list reconciles by operations, so no React-style keys
are needed.

```jsx
import { h, text } from '@exodra/core';
import { list } from '@exodra/reactivity';

const rows = list([
  h('li', { static: { children: text('First') } }),
  h('li', { static: { children: text('Second') } }),
]);

<ul bindableList={{ children: rows }} />
```

Mutate the list to update the DOM:

```jsx
rows.push(h('li', { static: { children: text('Third') } }));
rows.remove(0);
```

> A `list()` has **no** `map`/`filter`/`forEach`. To render from a plain array,
> build the children array eagerly and put it in `static.children`:

```jsx
const items = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];

<ul
  static={{
    children: items.map(item =>
      h('li', { static: { children: text(item.name) } })
    ),
  }}
/>
```

## Conditional rendering

Render different reactive children by deriving a child schema from a bindable and
binding it as the single reactive child:

```jsx
import { derive } from '@exodra/reactivity';

const view = derive(isLoggedIn, ok => (ok ? <Dashboard /> : <Login />));

<div bindable={{ children: view }} />
```

## Fragments

`<>…</>` compiles to `Fragment` (a `Symbol` from `@exodra/jsx`). Use a fragment
to group static and dynamic children together:

```jsx
<>
  <h1 static={{ class: 'title' }}>Title</h1>
  <ul bindableList={{ children: rows }} />
</>
```

## Static template caching

The Babel plugin can hoist and clone static DOM templates in loops when
`hoistStatic` is enabled. For repeated static templates you can also add a cache
key explicitly with the `cache:key` directive (alias `cacheKey`):

```jsx
items.map(item => (
  <div static={{ class: 'item-wrapper' }} cache:key="item-template">
    <span static={{ class: 'badge' }}>Static template content</span>
  </div>
))
```

Components are never auto-cached (they may hold state); each `<MyComponent />`
gets its own instance.

## Prefer static for non-reactive values

```jsx
// Good — static attributes for values that never change
<div static={{ id: 'container', class: 'wrapper', 'data-testid': 'main' }} />

// Avoid — wrapping constant values in reactivity adds needless overhead
<div bindable={{ class: derive(noop, () => 'wrapper') }} />
```
