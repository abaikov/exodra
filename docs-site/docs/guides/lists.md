---
title: Lists & Reconciliation
---

# Lists & Reconciliation

Exodra has no virtual DOM. When a list changes, the renderer reconciles the
**actual** DOM against the new contents **by object identity**. Understanding
that one rule is the key to fast, focus-safe lists.

## A list is a children port reconciled in a transition

The samples on this page read their items from a store object of a dozen lines —
anything that can answer "what is there now" and "tell me when it changes". In an
application it is the data layer.

```ts setup
function createStore<TValue>(value: TValue) {
    const listeners = new Set<() => void>();
    return {
        getValue: (): TValue => value,
        setValue(next: TValue): void {
            value = next;
            listeners.forEach((listener) => listener());
        },
        onChange(listener: () => void): () => void {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
```

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoTextPort, TExoChildrenPort } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

type TItem = { readonly id: string; readonly label: string };

const ROW_SCHEMA = createExoSchema((b) => {
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        label = li.textPort();
    });
    return { label };
});
const mRow = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
const showItem = mRow.transition((row: TExoDomNode, item: TItem) => {
    row.text(ROW_SCHEMA.ports.label, item.label);
});
const ROW = mRow.done();

const items = createStore<readonly TItem[]>([{ id: 'a', label: 'First' }]);

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});

type TListState = { rows: TExoChildList; shown: TItem[] };

const mList = createExoMachineBuilder<TExoDomNode, unknown, TListState>(LIST_SCHEMA);
mList.createInitialState((c) => ({ rows: c.childList(LIST_SCHEMA.ports.rows), shown: [] }));
const showItems = mList.transition((c) => {
    const want = items.getValue();
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (item, i) => {
        const row = c.build(ROW, i);
        showItem(row, item);
        return row;
    });
});
mList.effect((c) => {
    showItems(c);
    return items.onChange(() => showItems(c));
});
const LIST = mList.done();

backend.render(LIST, document.body);
items.setValue([...items.getValue(), { id: 'b', label: 'Second' }]);
```

On the DOM backend `c.childList` is a pack:
[`withExoChildList`](../api/dom.md#withexochildlist), composed once where the backend is
built. A backend without it throws [EXO0109](../errors.md#exo0109) at the first
`c.childList`, and a page whose children are only `c.one` and fixed `c.list` never links it.

Three pieces, each in one place:

- **`createInitialState`** opens the child list once and keeps it, with the order
  currently shown, in the machine's state. It is the only place a child list may be
  opened.
- **The transition** is "state → rows": it reads what should be shown and hands
  `reconcileExoOrder(kids, shown, keys, want, build)` the order shown and the order
  wanted. For an identity list `keys` and `want` are the same array. It returns the
  new shown order.
- **The effect** draws first, synchronously, then subscribes and returns the
  unsubscribe. On a hydrated page the first draw is what adopts the server's rows,
  and it must happen while the instance is being armed — which is where effects
  start.

In [JSX](./jsx.md) the list is a children port, `<$.rows />`, and the machine
fills it with exactly this composition.

Three levels are available, and the cheapest one that fits is the one to use:

| Call | When |
| --- | --- |
| `c.list(port, component, count)` | the contents **cannot** change — rendered once, no row records, no diff, no teardown |
| `reconcileExoOrder(c.state.rows, c.state.shown, items, items, build)` in a transition | the ordinary reactive list, reconciled by item identity |
| `c.keyedList(port, keyOf, build, update)` → `{ reconcile(items) }` | rows with no stable identity, reconciled by key |

The second one **is** the open one. The two halves it is written over —
`c.childList(port)`, which hands back the port's live children, and
`c.build(component, index)`, which makes a child and places it nowhere — are both
doors on the exonode. A caller who wants a different reuse policy writes a
different function over the same two doors, with no reconciler to subclass and
nothing to opt out of; the keyed policy is exactly that, already written:
[`createExoKeyedList`](#keys-when-identity-is-not-available) runs the same pass
over an extracted key instead of the item object.

:::caution A reconciled list adopts on a hydrated page — at a price worth reading
The mechanism is a CURSOR over the rows the server printed: opening a child list on a
hydrating page collects them, `c.build` takes the next one per item, and whatever is
left when the instance has been armed is surplus the data did not want (`packages/dom/src/dom/EXO_ADOPT_CURSOR.ts:16-21`). What that costs, read at
the bodies:

- **No placeholder element, and no build record.** `c.build` on a hydrating page asks
  the cursor for the next served row and wires the instance onto THAT element
  (`packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts:165-171`), so nothing is
  created to be repointed later and nothing has to be remembered between the build and
  the adoption. `buildAdoptedExoChild`
  (`packages/dom/src/hydrate/buildAdoptedExoChild.ts:27-29`) runs the initial state once, on the
  server's element.
- **A row is taken once because the cursor advances.** `takeExoAdoptedRow` returns the
  element at `at` and moves on (`EXO_ADOPT_CURSOR.ts:28-36`), so the same row cannot be
  claimed twice — it is the shape of the reader, not a check.
- **The rows are collected eagerly, in ONE walk, and the reason is a measurement.**
  `ExoChildList.insert` places an adopted row with `appendChild`, which MOVES it behind
  its own siblings, so reading `nextElementSibling` after the first insert answers with a
  row already taken — three served rows came out as the whole list swept away
  (`EXO_ADOPT_CURSOR.ts:6-9`). The same `openChildList` walk also finds the list's end,
  which a child list standing behind this one resolves its own start from
  (`EXO_HYDRATE_NODE_VOCABULARY.ts:218-231`).
- **When the data wants more rows than the server printed, the client builds the rest.**
  `takeExoAdoptedRow` answers `null` past the last served row and `build` takes the
  ordinary path — that is how a list whose data grew past its markup gets its extra rows
  (`EXO_HYDRATE_NODE_VOCABULARY.ts:162-166`).
- **Surplus is removed with no shape check at all**, because the span was bounded by the
  list's own end when it was collected, so everything in it is a row of this list
  (`EXO_ADOPT_CURSOR.ts:38-45`). An instance that opens a SECOND child list drops the
  first one's surplus before the cursor is overwritten, or rows the data refused would
  stay on the page for good.
- **`EXO_ADOPT_CURSOR` (`EXO_ADOPT_CURSOR.ts:21`) is a module cell, not a field on the
  record**, because that record is the render record too and a field there is a field on
  every instance a page builds; adoption is depth-first and synchronous, so the cell is
  saved and restored around each instance's wiring.

A build callback that names a *component* (`(item, i) => c.build(ROW, i)`) takes the
same cursor by the same `build`, and nothing above is special to it. **How much a list of
caller-built nodes costs on a hydrated page has never been measured** — a build callback
that hands back a node it did not get from `c.build`. It is a real option on a hydrated
page rather than a refusal.
:::

## The golden rule: identity = the same node

The identity that matters is the **item object**. On every update the renderer
diffs the new items against the previous ones:

- **the same item object** as before → the **same DOM node is reused**, moved if
  its position changed, never rebuilt;
- a **new item object** → a child is built and wired;
- an item that **disappeared** → its child is removed and its subscriptions end.

There is no `key` prop on the core path: whether a row keeps its DOM node depends
entirely on whether you hand back the same object — which is what preserves input
focus, scroll position and per-row DOM state across an update.

There **is** something to opt into, and it is a plugin rather than a core default.
See [Keys, when identity is not available](#keys-when-identity-is-not-available)
below.

The rule says nothing about **the same object at two positions**, because that is
one identity for two entries. The reconciler answers it by position — one row per
occurrence, on every backend — and identity only decides which of them survives an
update. Why, and how to avoid the ambiguity:
[The same object twice in one list](../troubleshooting.md#the-same-object-twice-in-one-list).

## Identity comes from your data layer

The trap is upstream of the renderer. If a recompute rebuilds every item object,
every row is a new identity → every node is rebuilt → **the input you were
typing in loses focus**, even though only one field changed.

The fix is not a renderer feature, it is keeping the item objects stable:

- A store that hands back the **same entity object** until that entity actually
  changes gives you focus-safe lists for free. Reactive stores like
  [`@oimdb/*`](https://abaikov.github.io/oimdb/llms.txt) are built this way — a
  row's identity is the entity's permanent slot, not a projection made per read.
- A field edit should reach the row through the row's **own** effect, not
  through a new list. Subscribe to the field inside `ROW` and a change to it writes
  one attribute; it never reaches the reconciler at all.
- If a projection is unavoidable (a filter, a sort), either cache the projected
  objects by their stable id so that re-running the projection yields the same
  objects for the rows that survived — or stop hand-rolling that cache and use the
  keyed plugin below, which is the same idea written once inside the renderer.

## Keys, when identity is not available

**Why it exists.** The identity rule is an argument about a *data layer*. A caller
whose rows arrive as freshly parsed JSON on every poll has no stable object to
reconcile by — every item is new on every refetch, so an identity list rebuilds
every row and throws away its DOM, its listeners, its scroll position and anything
focused inside it. That caller is not being told to go and write a cache first.

**It is a pack, from `@exodra/list-reconcile`, and it works on any backend that has
a child list.** `EXO_KEYED_LIST_VOCABULARY` puts `c.keyedList` on the exonode; a
backend that did not compose it has no such method. `keyedList` opens a child list, so on the
DOM backend it stands on `withExoChildList` too:

```ts
import { composeExoPlugins, createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { EXO_KEYED_LIST_VOCABULARY } from '@exodra/list-reconcile';
import type { TExoKeyedList, TExoKeyedListApi } from '@exodra/list-reconcile';

const backend = composeExoPlugins(
    withExoChildList(withExoCompiler(new ExoDomBackend())),
    EXO_KEYED_LIST_VOCABULARY
);

type TUser = { readonly id: number; readonly name: string };

const ROW_SCHEMA = createExoSchema((b) => {
    let name!: TExoTextPort;
    b.el('li', null, (li) => {
        name = li.textPort();
    });
    return { name };
});
const mRow = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
const setUser = mRow.transition((row: TExoDomNode, user: TUser) => {
    row.text(ROW_SCHEMA.ports.name, user.name);
});
const ROW = mRow.done();

const users = createStore<readonly TUser[]>([
    { id: 1, name: 'ada' },
    { id: 2, name: 'bob' },
]);

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
const mList = createExoMachineBuilder<
    TExoDomNode & TExoKeyedListApi,
    unknown,
    { users: TExoKeyedList<TUser> }
>(LIST_SCHEMA);
mList.createInitialState((c) => ({
    users: c.keyedList(
        LIST_SCHEMA.ports.rows,
        (user: TUser) => user.id,
        (user, i) => {
            const row = c.build(ROW, i);
            setUser(row, user);
            return row;
        },
        setUser
    ),
}));
const showUsers = mList.transition((c) => {
    c.state.users.reconcile(users.getValue());
});
mList.effect((c) => {
    showUsers(c);
    return users.onChange(() => showUsers(c));
});
const LIST = mList.done();

backend.render(LIST, document.body);
users.setValue([
    { id: 2, name: 'bob' },
    { id: 1, name: 'ada lovelace' },
]);
```

`c.keyedList(port, keyOf, build, update)` opens the child list and hands back a
handle with one method, `reconcile(items)`. It holds no data of its own: the machine
keeps the handle in its state, opened in `createInitialState`, and calls
`reconcile` from a transition with whatever items it has now. `setUser` is the
row's own transition. There are no props, so the data reaches a row twice and both
times through it: inside `build`, before the row is placed, and on every later
`reconcile` whose object under that key is a **different** one — the same object
again calls nothing.

Underneath is `createExoKeyedList(kids, keyOf, build, update)`, exported for a
caller that drives a child list itself, and underneath that the same
`reconcileExoOrder` pass an identity list runs, over `keyOf(item)` instead of the
item (`packages/list-reconcile/src/createExoKeyedList.ts`).

**What a keyed pass costs that an identity pass does not:** one `keyOf` call and one
key per item per update, and a `Map` from key to item, rebuilt per update, which is
how it tells a fresh object from the same one. A repeated key is not refused: like a
repeated item in an identity list, it is one row per occurrence.

**On the server** a list is printed once and never updated. `build` there returns the
printed markup, so a transition called after `c.build` cannot reach it: a row printed
by the string backend takes its data inside its own initial state. **Under hydration** the
child list opens an adoption cursor and each `build` adopts the next served row, as
for an identity list; a keyed list under hydration has no test of its own.

Encode into your own identity whatever must force a rebuild, and leave out whatever
should flow through a transition instead. Where the data layer can answer that, it is
the cheaper answer; where it cannot, the pack above is the one that exists.

## Rows that own a subscription

If a row subscribes to something of its own — a per-entity store key — register
the teardown against the child being wired. It ends when that row leaves,
**including a row added by a later update**, so in a windowed list the
subscription cost is `O(visible)` rather than `O(total)`:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

type TItem = { readonly id: string };

declare const store: {
    subscribeOnKey(id: string, cb: () => void): () => void;
};

const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
    });
    return { id };
});
const mRow = createExoMachineBuilder<TExoDomNode>(ROW_SCHEMA);
export const showItem = mRow.transition((row: TExoDomNode, item: TItem) => {
    row.attr(ROW_SCHEMA.ports.id, item.id);
    row.onTeardown(store.subscribeOnKey(item.id, () => {}));
});
export const ROW = mRow.done();
```

An effect's returned unsubscribe is already owned by the instance —
`c.onTeardown` is for what you start yourself outside an effect. The disposer
joins the instance record's child when there is one, and the ambient render scope
otherwise, so a top-level instance and a list row behave the same. A subscription
with nothing to end it is refused rather than left to outlive the page that made
it.

**Both examples above build on a DOM-only exonode type
(`createExoMachineBuilder<TExoDomNode>`), and that is the honest type for them.** `c.nodes`, `c.schema`, `c.openChildList` and
`c.childListEndNode` are fields and methods of the DOM and hydration exonodes;
`TExoStrNode` has none of them, and has nothing for them to be about — it
writes strings into an array. A machine built over `TExoWiring` from
`@exodra/core` is what makes one component serve, render and hydrate. A machine
that reaches past the shared surface is browser-only, and
`createExoMachineBuilder<TExoDomNode>` is how it says so.

## Choosing

| You have… | Use |
|---|---|
| contents that cannot change | `c.list(port, ROW, count)` |
| "the current set of items" from a store | `reconcileExoOrder(c.state.rows, c.state.shown, items, items, build)` in a transition — identity-stable items |
| rows with no stable identity (freshly parsed JSON per refetch) | `c.keyedList(port, keyOf, build, update)` from `EXO_KEYED_LIST_VOCABULARY`, kept in state, `reconcile(items)` from a transition |
| a producer that knows the exact mutation, or a reuse policy of your own | `c.childList(port)` and its `insert`/`move`/`remove`, driven by hand |
