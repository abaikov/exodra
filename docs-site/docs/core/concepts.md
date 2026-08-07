---
sidebar_position: 1
title: Core Concepts
---

# Core Concepts

Four ideas carry the whole framework: props live in **typed buckets**, a view is a
**schema** whose object identity *is* how nodes are reused, reactivity is **explicit
wiring** rather than automatic tracking, and lifecycle fires **per node** as the
tree is built and torn down. The rest of the framework follows from these four.

## Three Props Architecture

The foundation of Exodra's performance is the Three Props Architecture:

![Every prop lands in exactly one typed bucket: static, bindable, bindableList, handlers, bindableHandlers](/img/buckets.svg)

At author time every prop is sorted into one of five typed buckets — the three
below, plus `handlers` and `bindableHandlers` for events. The compiler knows the
static/reactive/event split up front, so the renderer never dispatches on it.

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

## Identity & Reconciliation

The three buckets describe *what a node is*. This describes *how a node stays
itself across updates* — and it's the model that most sets Exodra apart.

A schema is a plain **value**: a tree of `h(...)` objects. There is no virtual
DOM. The renderer keeps a map from **schema object → DOM node**, and on every
update it reconciles by **reference identity**:

- **Same schema reference** as before → the **same DOM node is reused** (moved if
  its position changed, never rebuilt).
- **New schema reference** → a node is built (its `onExoMount` fires).
- **A schema that disappeared** → its node is removed, its bindings disposed
  (its `onExoUnmount` fires).

So **whether a node survives an update depends entirely on whether you hand back
the same object.** That single rule is what preserves input focus, scroll
position, and per-node state — no `key` prop, no heuristics: the reference *is*
the key.

This is not "work with the DOM imperatively." It's the functional idiom of
**structural sharing** (as in persistent/immutable data): keep the reference for
what's unchanged, mint a new one for what changed, and the renderer diffs the two
by identity. You don't mutate a node's DOM — you decide which value to keep.

The trade is deliberate. React hides identity and hands you `key` / `memo` as
escape hatches when "describe and forget" breaks; Exodra makes identity
**first-class**. You get precise control (exact reuse, no rebuild churn) in
exchange for thinking about which schema objects are stable.

In practice that means: **cache a node's schema by a stable key and only rebuild
the array when the key set changes** — a field edit flows through the node's own
`bindable` and keeps its DOM (and focus). The full focus-safe list pattern lives
in [Lists & Reconciliation](../guides/lists.md).

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

const unsubscribe = count.onChange(next => {
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
const stop = count.onChange(value => {
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

Correctness never depends on any optimization. The always‑on model is already fast
— compile‑time three‑props dispatch (no per‑prop runtime type check) and
fine‑grained updates with no virtual DOM — and on top of that:

- **Clone + patch templates.** The compiler marks a mostly‑static repeated subtree
  with a `cacheKey`; the renderer builds its skeleton once and **clones + patches**
  it per occurrence instead of building every node.
- **Imperative list updates.** A `bindableList`'s `move` / `insert` / `remove` /
  `push` do **targeted DOM operations**, not a diff.
- **`cache:key`** lets you clone‑cache a repeated static subtree by hand.

See **[Optimizations](../guides/optimizations.md)** for what works out of the box,
what you tune by hand, and what the compiler adds automatically.