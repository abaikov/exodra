---
sidebar_position: 1
title: Core Concepts
---

# Core Concepts

## Three Props Architecture

The foundation of Exodra's performance is the Three Props Architecture:

### 1. Static Props

Properties that never change after initialization:

```jsx
<div static={{ 
  id: 'container',
  class: 'my-class',
  'data-test': 'value' 
}} />
```

### 2. Bindable Props

Reactive properties that update when their bindables change. You pass the
bindable object directly — never a thunk:

```jsx
const visible = bindable(true);
const count = bindable(0);

const hidden = derive(visible, v => !v);
const label = derive(count, c => `Count: ${c}`);

<div bindable={{ hidden, textContent: label }} />
```

### 3. BindableList Props

Reactive lists for efficient array rendering. `list()` returns a reactive list
you mutate over time; pass it straight into the bucket:

```jsx
const items = list([
  h('li', { static: { textContent: 'item1' } }),
  h('li', { static: { textContent: 'item2' } }),
]);

<ul bindableList={{ children: items }} />
```

## Reactivity System

Exodra's reactivity is built from three primitives: `bindable`, `derive`, and
`list`.

### Bindables

A bindable is a writable reactive cell. Read with `getValue()`, write with
`setValue()`. There is no `.value` property.

```javascript
import { bindable } from '@exodra/reactivity';

const count = bindable(0);
count.setValue(count.getValue() + 1); // Triggers updates

const unsubscribe = count.subscribe(next => {
  console.log('Count changed:', next);
});
// call unsubscribe() to stop listening
```

### Derived Bindables

`derive(source, mapFn)` creates a read-only bindable computed from a source
bindable. It takes a source plus a map function — not a zero-argument thunk.

```javascript
import { derive } from '@exodra/reactivity';

const double = derive(count, c => c * 2);
```

### Reacting to Changes

There is no `effect()`. To run a side effect when a value changes, subscribe to
the bindable directly:

```javascript
const stop = count.subscribe(value => {
  console.log('Count changed:', value);
});
```

## Component Model

### Functional Components

```jsx
function MyComponent({ name }) {
  return h('div', {
    static: { children: `Hello, ${name}!` }
  });
}
```

### Component Composition

```jsx
function App() {
  return h('div', {
    static: { 
      class: 'app',
      children: [
        h(Header),
        h(MainContent),
        h(Footer)
      ]
    }
  });
}
```

## JSX Transform

The Babel plugin (`@exodra/babel-plugin-jsx`) transforms bucketed JSX into `h()`
calls. Notice the input uses typed buckets — flat React-style props like
`<div id="app" onClick={handler}>` are a compile error:

```jsx
// Written as:
<div static={{ id: 'app' }} handlers={{ onClick: handler }}>
  {content}
</div>

// Transformed to:
h('div', {
  static: { id: 'app', children: content },
  handlers: { onClick: handler }
});
```

## Component Lifecycle

### Lifecycle Hooks

Components can use lifecycle hooks for setup and cleanup:

```javascript
function Timer() {
  let interval;
  
  return (
    <div 
      static={{ 
        onExoMount: (node) => {
          interval = setInterval(() => {
            console.log('tick');
          }, 1000);
        },
        onExoUnmount: (node) => {
          clearInterval(interval);
        }
      }}
    >
      Timer Component
    </div>
  );
}
```

Lifecycle hooks fire per node across the whole subtree — and, importantly, for
nodes added by a **later reactive update**, not just the initial mount. A row
entering a reactive list runs its `onExoMount` when it is inserted; a row leaving
runs its `onExoUnmount`. That is what lets each row own its own subscription
(subscribe in `onExoMount`, dispose in `onExoUnmount`), so only currently-mounted
rows are subscribed — see [Lists & Reconciliation](../guides/lists.md).

### Manual Cleanup with onDispose

For component-level cleanup, use `ctx.onDispose()`:

```javascript
function DataFetcher(ctx) {
  const data = bindable(null);
  
  const controller = new AbortController();
  ctx.onDispose(() => controller.abort());
  
  fetch('/api/data', { signal: controller.signal })
    .then(res => res.json())
    .then(result => data.setValue(result));

  const text = derive(data, d => (d ? JSON.stringify(d) : 'Loading...'));
  return <div bindable={{ textContent: text }} />;
}
```

## Performance Optimizations

### Static Hoisting

Static content is created once and reused:

```javascript
// Static nodes cached at compile time
const _static1 = h('div', { 
  static: { class: 'header' } 
});
```

### Minimal Diffing

Only reactive properties are checked for updates, static props are skipped entirely.