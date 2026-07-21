---
title: Lists & Reconciliation
---

# Lists & Reconciliation

Exodra has no virtual DOM. When a list of children changes, the renderer
reconciles the **actual** DOM against the new set of child schemas **by
reference identity**. Understanding that one rule is the key to fast, focus-safe
lists.

There are two channels for a reactive list of children, plus one pattern you'll
reach for constantly.

## The golden rule: identity = the same node

The renderer keeps a map from **child schema object → DOM node**. On every update
it diffs the new children against the previous ones:

- **Same schema reference** as before → the **same DOM node is reused** (moved if
  its position changed, never rebuilt).
- **New schema reference** → a node is built.
- **A schema that disappeared** → its node is removed and its bindings disposed
  (and its `onExoUnmount` fires).

So **whether a row keeps its DOM node depends entirely on whether you hand back
the same schema object.** This is what preserves input focus, scroll position,
and per-node state across updates.

## 1. `bindable<schema[]>` — the default

Put a reactive **array of child schemas** in the `bindable` bucket. Every time you
`setValue` a new array, the renderer identity-reconciles it (reuse / move /
insert / remove):

```tsx
const rows = bindable<readonly TExoSchema[]>([]);

// on any structural change:
rows.setValue(items.map(renderRow));

<ul bindable={{ children: rows }} />;
```

This is the right default for lists derived from a store. Its cost is one O(n)
reference-diff per update — cheap for normal lists, and it does the minimal DOM
work (only entering/leaving/moved nodes change).

## 2. `bindableList` + ops — when a producer emits exact mutations

`list()` (see the [Reactivity API](../api/reactivity.md#list)) exposes
`snapshot()` + `subscribeOps()`, emitting fine-grained
`insert` / `move` / `remove` / `set` / `reset` operations. The renderer applies
each op directly — no diffing.

```tsx
const rows = list<TExoSchema>(initial);
rows.move(0, 3);            // one DOM move, O(1)
<ul bindableList={{ children: rows }} />;
```

Reach for this only when a **producer already knows the exact mutation** (a
command stream, a drag-reorder) and you want **O(delta)** updates instead of an
O(n) diff. If you just have "the current set of items", prefer option 1 — the
renderer will compute the delta for you.

## 3. Identity-stable schemas → keep focus (the pattern you actually want)

Both channels reuse a node only when the schema reference is stable. The trap:
if you rebuild every row's schema on every change, a **field edit anywhere** hands
back all-new schemas → every node is rebuilt → **the input you're typing in loses
focus.**

Fix: **cache each row's schema by a stable key**, and only recompute the array
when the *set/order of keys* actually changes (not on a field edit — those flow
through the row's own bindings):

```tsx
const cache = new Map<string, TExoSchema>();
const children = bindable<readonly TExoSchema[]>([]);
let lastKey = '';

function refresh() {
  const items = source();                 // ordered items
  const keys = items.map(i => i.id);
  const sig = keys.join('|');
  if (sig === lastKey) return;            // structural no-op → no churn, focus kept
  lastKey = sig;

  // evict rows whose key left the set (dispose their subscriptions)
  const live = new Set(keys);
  for (const [k, entry] of cache) if (!live.has(k)) { dispose(entry); cache.delete(k); }

  children.setValue(items.map(i => cache.get(i.id) ?? build(i)));
}
```

Because a field edit doesn't change the key set, `refresh()` is a no-op and the
row's *own* `bindable` updates the value in place — focus never moves. A real
add/move/remove changes the key set and only the diff churns.

> Encode structural content into the key when a row must rebuild on it — e.g.
> `` `${task.id}:${task.pending ? 1 : 0}:${commentCount}` ``. A change to that
> content changes the key, so that one row rebuilds; unrelated rows keep their
> nodes.

This "keyed list" pattern is small enough to keep as a local helper, and it's how
the [`05-cnstra-oimdb` flagship](https://github.com/abaikov/exodra/tree/master/packages/examples/05-cnstra-oimdb)
renders every list (see `src/app/keyed-list.ts`).

## Rows that own a subscription

If a row subscribes to something (a per-entity store key), subscribe in
`onExoMount` and tear down in `onExoUnmount`. Because those hooks fire when a node
enters/leaves the DOM — **including nodes added by a later update** — only the
currently-mounted rows hold subscriptions. In a virtualized list that means the
subscription cost is O(visible), not O(total).

```tsx
<li static={{
  'data-id': id,
  onExoMount:   () => { unsub = store.subscribeOnKey(id, update); },
  onExoUnmount: () => unsub?.(),
}}>…</li>
```

## Choosing

| You have… | Use |
|---|---|
| "the current set of items" from a store | **`bindable<schema[]>`** + keyed cache |
| a producer emitting exact insert/move/remove ops | **`bindableList`** (`list()`) |
| a huge/windowed list | `bindable<schema[]>` over the visible slice; subscribe per-row in `onExoMount` |

Both compile to the same reconciler underneath — the only question is whether
**you** hand it the delta (ops) or let it compute the delta from the new array.
