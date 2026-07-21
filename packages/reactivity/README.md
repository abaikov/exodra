# @exodra/reactivity

Fine-grained reactivity primitives for Exodra applications.

## Installation

```bash
npm install @exodra/reactivity
```

## Overview

`@exodra/reactivity` provides small, explicit reactive containers:

- **Bindables** (`bindable`) — writable reactive values.
- **Derived bindables** (`derive`) — read-only values projected from a source bindable.
- **Reactive lists** (`list`) — ordered collections that emit fine-grained operations
  (insert / remove / move / set / reset) instead of full re-renders.
- **Persistence** (`persist`, `createPersistor`) and **hydration** helpers for SSR.

There are no hidden globals: nothing is auto-tracked, there is no dependency graph,
no effect scheduler, and no batching layer. You read with `getValue()` / `snapshot()`
and write with `setValue()` / list operations. Reactivity flows only through explicit
`subscribe` / `subscribeOps` and through `derive`.

> **Important:** values are read and written through methods, not a `.value` property.
> Use `b.getValue()` / `b.setValue(next)`. There is no `.value`, `.get()`, or `.set()`.

## Bindables

`bindable(initialValue, createEvent?)` returns a writable bindable.

```typescript
import { bindable } from '@exodra/reactivity';

const name = bindable('John');

// Read the current value
name.getValue(); // 'John'

// Write a new value (skipped if the value is unchanged)
name.setValue('Jane');

// Subscribe to changes — returns an unsubscribe function
const unsubscribe = name.subscribe(event => {
  console.log('name changed:', event);
});

unsubscribe();
```

A bindable exposes exactly three methods:

| Method | Description |
| --- | --- |
| `getValue()` | Returns the current value. |
| `setValue(value, event?)` | Stores a new value and notifies subscribers. Identical writes (with no explicit `event`) are deduped and skip notification. |
| `subscribe(fn)` | Registers a listener and returns an unsubscribe function. |

### Custom event payloads

By default subscribers receive the new value. The optional second argument lets you
map `(value, previousValue)` to a custom event payload that subscribers receive instead:

```typescript
const count = bindable(0, (value, previous) => ({ value, delta: value - previous }));

count.subscribe(event => console.log(event)); // { value: 1, delta: 1 }
count.setValue(1);
```

## Derived bindables

`derive(source, mapFn)` creates a **read-only** bindable from a source bindable plus a
mapping function. It is not a zero-argument thunk — you pass the source explicitly.

```typescript
import { bindable, derive } from '@exodra/reactivity';

const count = bindable(2);
const doubled = derive(count, c => c * 2);

doubled.getValue(); // 4

count.setValue(5);
doubled.getValue(); // 10
```

A derived bindable has `getValue()` and `subscribe()`, but no `setValue()` — it always
reflects the mapped source value. To combine several sources, derive from the one that
changes (or model the combination as a single source bindable).

## Reactive lists

`list(items?)` creates a reactive list. Instead of replacing the whole array on every
change, it emits granular operations so renderers can update only what moved.

```typescript
import { list } from '@exodra/reactivity';

const todos = list([
  { id: 1, text: 'Learn Exodra' },
  { id: 2, text: 'Build app' },
]);

// Read an immutable snapshot of the current items
todos.snapshot(); // [{ id: 1, ... }, { id: 2, ... }]

// Subscribe to the operation stream — returns an unsubscribe function
const stop = todos.subscribeOps(op => {
  console.log(op.type); // 'insert' | 'remove' | 'move' | 'set' | 'reset'
});

todos.push({ id: 3, text: 'Deploy' });   // append
todos.insert(0, { id: 0, text: 'Plan' }); // insert at index
todos.remove(1);                           // remove 1 item at index
todos.move(0, 2);                          // move item from index 0 to 2
todos.set(0, { id: 9, text: 'Replace' });  // replace item at index
todos.reset([{ id: 1, text: 'Fresh' }]);   // replace all items

stop();
```

List API:

| Method | Description |
| --- | --- |
| `snapshot()` | Returns a copy of the current items. |
| `subscribeOps(fn)` | Subscribes to the operation stream; returns an unsubscribe function. |
| `push(item)` | Appends an item. |
| `insert(index, item)` | Inserts an item at `index` (clamped to bounds). |
| `remove(index, count?)` | Removes `count` items (default 1) starting at `index`. |
| `move(from, to, count?)` | Moves `count` items (default 1) from one index to another. |
| `set(index, item)` | Replaces the item at `index`. |
| `reset(items)` | Replaces the entire list. |

> There are no array-style helpers such as `map`, `filter`, `forEach`, `get`,
> `clear`, `removeAt`, `insertAt`, `pop`, `shift`, `splice`, or `length`. Read items
> with `snapshot()`; react to changes with `subscribeOps()`.

Operation payloads (`TExoListOp`):

```typescript
type TExoListOp<TItem> =
  | { type: 'insert'; index: number; item: TItem }
  | { type: 'remove'; index: number; count?: number }
  | { type: 'move'; from: number; to: number; count?: number }
  | { type: 'set'; index: number; item: TItem }
  | { type: 'reset'; items: readonly TItem[] };
```

## Using reactivity in components

Bindables are passed directly into JSX buckets (the `@exodra/core` `h()` attribute
groups). Reactive text goes into `bindable={{ textContent }}`; reactive class names
into `bindable={{ class }}`; a reactive list of children into `bindableList={{ children }}`.
Event handlers go into the `handlers` bucket. There are no flat React-style props.

```tsx
import { bindable, derive } from '@exodra/reactivity';

function Counter() {
  const count = bindable(0);
  const label = derive(count, c => `Count: ${c}`);

  return (
    <div static={{ class: 'counter' }}>
      <span bindable={{ textContent: label }} />
      <button
        static={{ class: 'btn' }}
        handlers={{ onClick: () => count.setValue(count.getValue() + 1) }}
      >
        Increment
      </button>
    </div>
  );
}
```

> JSX requires `@exodra/babel-plugin-jsx`. Flat props like `<button onClick={fn}>` or
> `<span class="x">` are a compile error in Exodra — props must live in the typed
> `static` / `bindable` / `bindableList` / `handlers` buckets.

### Reactive lists in the DOM

Drive a list of child schemas with `bindableList={{ children }}` and mutate the list
with fine-grained operations. The renderer applies only the emitted op:

```tsx
import { list } from '@exodra/reactivity';
import type { TExoSchema } from '@exodra/core';

const children = list<TExoSchema>([]);

const column = <div static={{ class: 'col' }} bindableList={{ children }} />;

// Later — only this child is inserted, nothing else re-renders:
children.insert(0, <div static={{ class: 'card' }}>New card</div>);
```

## Persistence

`persist(observable, key?)` registers a bindable or list with the global persistor and
returns the same observable, so you can wrap a declaration inline. The persistor
serializes registered observables to JSON (for SSR) and hydrates them back on the client.

```typescript
import { bindable, persist, getPersistor } from '@exodra/reactivity';

// Register with an explicit key (auto-generated key if omitted)
const theme = persist(bindable('light'), 'theme');

// Server: serialize all registered observables
const json = getPersistor().serialize();

// Client: restore them
getPersistor().hydrate(json);
```

You can also create an isolated persistor instead of the global one:

```typescript
import { createPersistor } from '@exodra/reactivity';

const persistor = createPersistor();
persistor.register(theme, 'theme'); // note: register(), not persist()
const json = persistor.serialize();
persistor.hydrate(json);
persistor.clear();
```

`TExoPersistor` methods: `register(observable, key?)`, `serialize()`, `hydrate(json)`,
`clear()`.

### Hydration helpers

On the client these read serialized state and hydrate the (global by default) persistor:

```typescript
import { hydrateFromWindow, hydrateFromScript, autoHydrate } from '@exodra/reactivity';

hydrateFromWindow();  // reads window.__EXODRA_STATE__ by default
hydrateFromScript();  // reads <script id="__EXODRA_PERSISTOR__"> by default
autoHydrate();        // tries window state first, then the script tag (no-op on server)
```

Each helper accepts an optional custom key/id as its first argument and an optional
`persistor` as the last argument.

## TypeScript support

```typescript
import { bindable } from '@exodra/reactivity';
import type { TExoBindable, TExoWritableBindable } from '@exodra/reactivity';

interface User {
  name: string;
  email: string;
}

const user: TExoWritableBindable<User | null> = bindable<User | null>(null);

user.setValue({ name: 'John', email: 'john@example.com' });
```

Exported types include `TExoBindable`, `TExoWritableBindable`, `TExoBindableList`,
`TExoWritableBindableList`, `TExoListOp`, and `TExoPersistor`.

## API reference

### Factory functions

- `bindable(initialValue, createEvent?)` — writable bindable (alias of `createExoBindable`).
- `derive(source, mapFn)` — read-only derived bindable (alias of `createExoDerived`).
- `list(items?)` — reactive list (alias of `createExoBindableList`).
- `createExoBindable`, `createExoDerived`, `createExoBindableList` — the underlying factories.

### Bindable methods

- `getValue()` — current value.
- `setValue(value, event?)` — write a value (writable bindables only).
- `subscribe(fn)` — listen for changes; returns an unsubscribe function.

### List methods

- `snapshot()`, `subscribeOps(fn)`, `push(item)`, `insert(index, item)`,
  `remove(index, count?)`, `move(from, to, count?)`, `set(index, item)`, `reset(items)`.

### Persistence

- `persist(observable, key?)`, `getPersistor()`, `createPersistor()`.
- `hydrateFromWindow(windowKey?, persistor?)`, `hydrateFromScript(scriptId?, persistor?)`,
  `autoHydrate(persistor?)`.

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
