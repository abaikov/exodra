---
sidebar_position: 2
title: Components Guide
---

# Components in Exodra

A component is a function that receives a **context** and returns a schema (or an
array of schemas). Props arrive through the typed buckets and are read off the
context. There is no `.value`, no `effect`/`computed`/`batch`, and event handlers
always live in the `handlers` bucket.

## Component basics

```jsx
import { defineComponent, h, text } from '@exodra/core';

const MyComponent = defineComponent(context =>
  h('div', {
    static: { class: 'my-component', children: context.getConstant('children') },
  })
);
```

`defineComponent` is an identity helper that types the function — you can also
write a plain function. Either way the argument is the **context**, with
`getConstant` / `getBindable` / `getBindableList` / `provide` / `inject` /
`onDispose` (see the [Core API](../api/core.md)).

## Reading props

Props are read from the context by the bucket they were passed in:

```jsx
const Button = defineComponent(context => {
  const cls = context.getConstant('class') ?? 'btn';
  const onClick = context.getConstant('onClick');
  const disabled = context.getBindable('disabled'); // a bindable, or undefined

  return h('button', {
    static: { class: cls, type: 'button', children: context.getConstant('children') },
    bindables: disabled ? { disabled } : {},
    handlers: onClick ? { onClick } : {},
  });
});

// Usage — note handlers go in the handlers bucket, never as a flat prop
<Button
  static={{ class: 'primary', children: 'Click me' }}
  handlers={{ onClick: handleClick }}
/>
```

## Composition

Components nest like any other schema. Children flow through `static.children`.

```jsx
const CardHeader = defineComponent(context =>
  h('div', { static: { class: 'card-header', children: context.getConstant('children') } })
);

const Card = defineComponent(context =>
  h('div', {
    static: {
      class: 'card',
      children: [
        h(CardHeader, { static: { children: context.getConstant('header') } }),
        h('div', { static: { class: 'card-body', children: context.getConstant('children') } }),
      ],
    },
  })
);
```

## Reactive components

Create local state with `bindable` and bind it. Update state with `setValue`.

```jsx
import { defineComponent, h, text } from '@exodra/core';
import { bindable, derive } from '@exodra/reactivity';

const Toggle = defineComponent(() => {
  const isOn = bindable(false);
  const label = derive(isOn, on => (on ? 'ON' : 'OFF'));
  const cls = derive(isOn, on => (on ? 'active' : 'inactive'));

  return h('div', {
    static: {
      class: 'toggle',
      children: [
        h('button', {
          bindables: { textContent: label },
          handlers: { onClick: () => isOn.setValue(!isOn.getValue()) },
        }),
        h('span', { bindables: { class: cls }, static: { children: text('Status') } }),
      ],
    },
  });
});
```

> Note: `derive(source, mapFn)` projects one bindable into another. There is **no
> `computed`** — `derive` is the read-only/derived primitive.

## Derived state from a list

A `list()` emits operations, not a filtered array. To render a filtered subset,
keep the source as a plain array (or rebuild the `list` contents) and reconcile
yourself — `list` has no `filter`/`map`.

```jsx
import { defineComponent, h, text } from '@exodra/core';
import { bindable, list } from '@exodra/reactivity';

const SearchableList = defineComponent(context => {
  const allItems: string[] = context.getConstant('items') ?? [];
  const search = bindable('');
  const visible = list(allItems.map(name => h('li', { static: { children: text(name) } })));

  const apply = (term: string) => {
    visible.reset(
      allItems
        .filter(name => name.toLowerCase().includes(term.toLowerCase()))
        .map(name => h('li', { static: { children: text(name) } }))
    );
  };

  return h('div', {
    static: {
      class: 'searchable-list',
      children: [
        h('input', {
          static: { type: 'text', placeholder: 'Search...' },
          bindables: { value: search },
          handlers: {
            onInput: (e: Event) => {
              const term = (e.target as HTMLInputElement).value;
              search.setValue(term);
              apply(term);
            },
          },
        }),
        h('ul', { bindableLists: { children: visible } }),
      ],
    },
  });
});
```

## Side effects and cleanup

There is no `effect`. To run a side effect in response to a bindable, use
`bindable.subscribe` and register the teardown with `context.onDispose`. The same
pattern covers timers, listeners, and subscriptions.

```jsx
import { defineComponent, h } from '@exodra/core';
import { bindable, derive } from '@exodra/reactivity';

const Timer = defineComponent(context => {
  const seconds = bindable(0);
  const label = derive(seconds, s => `Time: ${s}s`);

  const interval = setInterval(() => {
    seconds.setValue(seconds.getValue() + 1);
  }, 1000);

  // Cleanup runs when the node is disposed.
  context.onDispose(() => clearInterval(interval));

  return h('div', { bindables: { textContent: label } });
});
```

Reacting to a bindable change:

```jsx
const Logger = defineComponent(context => {
  const count = context.getBindable('count'); // a bindable prop
  if (count) {
    const unsubscribe = count.subscribe(value => console.log('count:', value));
    context.onDispose(unsubscribe);
  }
  return [];
});
```

## Context provide / inject

Share values down the tree with a context key.

```jsx
import { createContextKey, defineComponent, h } from '@exodra/core';

const themeKey = createContextKey('theme');

const ThemeProvider = defineComponent(context => {
  context.provide(themeKey, 'dark');
  return h('div', { static: { children: context.getConstant('children') } });
});

const ThemedText = defineComponent(context => {
  const theme = context.inject(themeKey, 'light');
  return h('span', { static: { class: `theme-${theme}`, textContent: 'Hello' } });
});
```

## Slots

"Slots" are just named props carrying child schemas.

```jsx
const Layout = defineComponent(context =>
  h('div', {
    static: {
      class: 'layout',
      children: [
        h('header', { static: { class: 'header', children: context.getConstant('header') } }),
        h('main', { static: { class: 'main', children: context.getConstant('children') } }),
        h('footer', { static: { class: 'footer', children: context.getConstant('footer') } }),
      ],
    },
  })
);

<Layout
  static={{
    header: <Navigation />,
    footer: <Copyright />,
    children: <Content />,
  }}
/>
```

## Performance tips

- **Prefer `static` for values that never change** — only put values in
  `bindable` when they actually change over time.
- **Use `list()` for dynamic collections** — it reconciles by operation, so the
  renderer only touches the nodes that changed; no keys required.
- **Derive, don't recompute** — project reactive values with `derive(source, fn)`
  instead of recomputing them on every read.
- **Clean up in `onDispose`** — anything you start (timers, listeners,
  subscriptions) should be torn down through `context.onDispose`.
