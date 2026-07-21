---
sidebar_position: 3
title: Reactivity API
---

# Reactivity API Reference

The `@exodra/reactivity` package provides Exodra's reactive primitives. There is
**no `.value` property and no `signal`/`computed`/`effect`/`batch`** — every
reactive value is accessed with explicit methods (`getValue()` / `setValue()` /
`subscribe()`), which is what makes the renderer's wiring cheap and predictable.

```bash
npm install @exodra/reactivity
```

Exports: `bindable`, `derive`, `list`, `createExoBindable`, `createExoBindableList`,
`createExoDerived`, `persist`, `getPersistor`, `createPersistor`,
`hydrateFromWindow`, `hydrateFromScript`, `autoHydrate`, and the
`TExoPersistor` type.

## bindable()

Creates a writable reactive value.

```typescript
function bindable<TValue, TEvent = TValue>(
  initialValue: TValue,
  createEvent?: (value: TValue, previousValue: TValue) => TEvent
): TExoWritableBindable<TValue, TEvent>;

type TExoWritableBindable<TValue, TEvent = TValue> = {
  getValue(): TValue;
  setValue(value: TValue, event?: TEvent): void;
  subscribe(update: (event: TEvent) => void): () => void;
};
```

- `getValue()` returns the current value.
- `setValue(next)` updates the value and notifies subscribers. A write that does
  not change the value (and has no explicit `event`) is skipped — no subscriber
  runs.
- `subscribe(fn)` registers a listener and returns an unsubscribe function.

```javascript
import { bindable } from '@exodra/reactivity';

const count = bindable(0);

const unsubscribe = count.subscribe(value => {
  console.log('count is now', value);
});

count.setValue(count.getValue() + 1); // logs "count is now 1"
unsubscribe();
```

`bindable` (alias of `createExoBindable`) is used directly inside the JSX
`bindable={{ ... }}` bucket — pass the bindable object itself, never a thunk:

```jsx
const title = bindable('Hello');

<span bindable={{ textContent: title }} />;
```

### Event channels

The optional `createEvent` mapper lets a bindable emit a derived event object
instead of the raw value. Subscribers receive that event:

```javascript
const temperature = bindable(20, (value, previous) => ({
  value,
  previous,
  delta: value - previous,
}));

temperature.subscribe(event => {
  console.log(`changed by ${event.delta}`);
});

temperature.setValue(25); // logs "changed by 5"
```

## derive()

Creates a **read-only** bindable projected from a source bindable. It takes a
source bindable and a map function (not a zero-argument thunk).

```typescript
function derive<TSource, TValue>(
  source: TExoBindable<TSource, unknown>,
  map: (value: TSource) => TValue
): TExoBindable<TValue, TValue>;
```

`getValue()` returns the mapped current value, and subscribers are notified
(with the freshly mapped value) whenever the source emits.

```javascript
import { bindable, derive } from '@exodra/reactivity';

const count = bindable(0);
const label = derive(count, c => `Count: ${c}`);

label.getValue();              // "Count: 0"
count.setValue(5);
label.getValue();              // "Count: 5"
```

A derived value is read-only — there is no `setValue`. Use it for reactive text,
classes, or any projection of another bindable:

```jsx
const cls = derive(active, isActive =>
  isActive ? 'tab tab--active' : 'tab'
);

<a bindable={{ class: cls }} />;
```

## list()

Creates a reactive list optimized for keyed, op-based DOM reconciliation. It
emits **operations** (insert / remove / move / set / reset), not whole-array
snapshots, so the renderer only touches the nodes that changed.

```typescript
function list<TItem>(initialItems?: readonly TItem[]): TExoWritableBindableList<TItem>;

type TExoWritableBindableList<TItem> = {
  snapshot(): TItem[];
  subscribeOps(update: (op: TExoListOp<TItem>) => void): () => void;
  insert(index: number, item: TItem): void;
  push(item: TItem): void;
  remove(index: number, count?: number): void;
  move(from: number, to: number, count?: number): void;
  set(index: number, item: TItem): void;
  reset(items: readonly TItem[]): void;
};
```

| Method | Description |
| --- | --- |
| `snapshot()` | Returns a copy of the current items. |
| `subscribeOps(fn)` | Subscribe to list operations; returns an unsubscribe function. |
| `insert(index, item)` | Insert one item at `index` (clamped to bounds). |
| `push(item)` | Append one item. |
| `remove(index, count?)` | Remove `count` items (default `1`) at `index`. |
| `move(from, to, count?)` | Move `count` items (default `1`) from one index to another. |
| `set(index, item)` | Replace the item at `index`. |
| `reset(items)` | Replace the entire contents. |

> There is **no** `map` / `filter` / `forEach` / `get` / `length` / `pop` /
> `shift` / `splice`. Derive your own arrays with `snapshot()` and standard
> array methods when you need them.

```javascript
import { list } from '@exodra/reactivity';

const items = list(['a', 'b']);

items.push('c');          // insert at end
items.insert(0, 'z');     // ['z', 'a', 'b', 'c']
items.move(0, 2);         // move 'z' to index 2
items.remove(1);          // remove one item at index 1
items.snapshot();         // current items as a plain array
```

Bind a list directly into the `bindableList={{ children }}` bucket. Each item in
the list is a schema (e.g. the result of a JSX expression):

```jsx
import { h } from '@exodra/core';
import { list } from '@exodra/reactivity';

const rows = list([
  h('li', { static: { textContent: 'First' } }),
  h('li', { static: { textContent: 'Second' } }),
]);

<ul bindableList={{ children: rows }} />;
```

## Persistence

`@exodra/reactivity` ships a small persistor used to serialize reactive state on
the server and rehydrate it on the client.

### persist()

Registers a bindable or list with the global persistor and returns it unchanged,
so you can wrap a declaration inline.

```typescript
function persist<T>(
  observable: TExoBindable<T> | TExoBindableList<T>,
  key?: string
): typeof observable;
```

```javascript
import { bindable, persist } from '@exodra/reactivity';

// Registered under an explicit key so server and client agree.
const user = persist(bindable({ name: 'Ada' }), 'user');
```

If you omit `key`, the persistor auto-generates one from registration order —
prefer an explicit key when server and client register in different orders.

### getPersistor() / createPersistor()

```typescript
function getPersistor(): TExoPersistor;   // shared global instance
function createPersistor(): TExoPersistor; // a fresh, isolated instance

interface TExoPersistor {
  register<T>(observable: TExoBindable<T> | TExoBindableList<T>, key?: string): void;
  serialize(): string;          // JSON of all registered values
  hydrate(json: string): void;  // write values back into registered observables
  clear(): void;
}
```

`persist()` registers against `getPersistor()`. On the server you call
`serialize()` to produce JSON to embed in the page; on the client the hydration
helpers call `hydrate()` for you.

### Hydration helpers

```typescript
function hydrateFromWindow(windowKey?: string, persistor?: TExoPersistor): void;
function hydrateFromScript(scriptId?: string, persistor?: TExoPersistor): void;
function autoHydrate(persistor?: TExoPersistor): void;
```

- `hydrateFromWindow` reads serialized state from `window[windowKey]`
  (default `__EXODRA_STATE__`).
- `hydrateFromScript` reads it from the text content of a script element
  (default id `__EXODRA_PERSISTOR__`).
- `autoHydrate` is the no-config entry point: it tries `window.__EXODRA_STATE__`
  first, then the `__EXODRA_PERSISTOR__` script tag, and is a no-op outside the
  browser.

```javascript
import { autoHydrate } from '@exodra/reactivity';

// Run once on client startup, before mounting, to restore persisted state.
autoHydrate();
```

See the [SSR guide](../guides/ssr.md) for the full server-render +
hydration flow.
