---
title: Lists & Reconciliation
---

# Lists & Reconciliation

Exodra has no virtual DOM. When a list changes, the renderer reconciles the
**actual** DOM against the new contents **by object identity**. Understanding
that one rule is the key to fast, focus-safe lists.

## A list is a children port reconciled where the data changes

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
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

const backend = withExoCompiler(new ExoDomBackend());

type TItem = { readonly id: string; readonly label: string };

const RowPorts = exoPorts({ label: EXO_PORT_TEXT });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(RowPorts.label);
    });
});
const rowMachine = composeExoMachine(createExoMachine<TExoDomNode, TItem>(rowSchema), (m) =>
    withExoWire(m, (row, item: TItem) => {
        row.text(RowPorts.label, item.label);
    })
);

const reconcileItems = createExoChildrenReconciler<TItem>(rowMachine);

const items = createStore<readonly TItem[]>([{ id: 'a', label: 'First' }]);

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const listSchema = createExoSchema(ListPorts, (b) => {
    b.el('ul', null, (ul) => {
        ul.childrenPort(ListPorts.rows);
    });
});

const listMachine = composeExoMachine(createExoMachine<TExoDomNode>(listSchema), (m) =>
    withExoEffects(m, (effect) => {
        effect((c) => {
            reconcileItems(c, ListPorts.rows, items.getValue());
            return items.onChange(() => reconcileItems(c, ListPorts.rows, items.getValue()));
        });
    })
);

backend.render(listMachine, document.body);
items.setValue([...items.getValue(), { id: 'b', label: 'Second' }]);
```

Three pieces, each in one place:

-   **The row's wire** is "item → row". The reconciler creates a row with
    `c.createExoNode(rowMachine)` and wires it with the item as params, so the wire is where
    the item reaches the row. There are no props: the wire is the only door.
-   **The reconciler** (`reconcileItems`) is created once, at module level, by
    `createExoChildrenReconciler(rowMachine)`. Each call `reconcileItems(c, port, items)` diffs
    the items against what it showed in that port of that node last time: a new item gets a
    new row, an item that stays keeps its row, a row whose item left is destroyed. It
    remembers what it showed per node and per port, so the list machine keeps no shown order
    and opens nothing in `createInitialState`. Two reconcilers in one port are two independent
    runs.
-   **The effect** draws first, synchronously, then subscribes and returns the
    unsubscribe. On a hydrated page the first draw is what adopts the server's rows,
    and it must happen while the instance is being armed — which is where effects
    start.

In [JSX](./jsx.md) the list is a children port, `<$.rows />`, and the machine
fills it with exactly this composition.

Three levels are available, and the cheapest one that fits is the one to use:

| Call                                                                                     | When                                                                                 |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `c.list(port, component, rows)`                                                          | the contents **cannot** change — rendered once, no row records, no diff, no teardown |
| `createExoChildrenReconciler(rowMachine)`, called where the data changes                 | the ordinary reactive list, reconciled by item identity                              |
| `createExoChildrenReconciler(rowMachine, { key: keyOf })`, called where the data changes | rows with no stable identity, reconciled by key                                      |

The reconciler takes either a machine or a build function `(c, item) => node`. A build
function decides what a new item becomes — a row of another machine, a row wired with
something other than the item:

```ts no-check
const reconcileMixed = createExoChildrenReconciler<TItem>((c: TExoDomNode, item) => {
    const node = c.createExoNode(pick(item));
    wireExoNode(node, item);
    return node;
});
```

`{ skipFirst, skipLast }` leaves that many children at the start and the end of the port
alone — a header row and a footer row placed by hand, with the reconciled run between them.
A caller who wants a different reuse policy altogether writes it over the port methods of
[Children](./children.md) (`c.createExoNode`, `c.insertChild`, `c.moveChild`,
`c.removeChild`), with no reconciler to subclass and nothing to opt out of.

:::caution A reconciled list adopts on a hydrated page — at a price worth reading
Each child list keeps ITS OWN array of the rows the server printed: opening a child list on a
hydrating page collects them, the list takes the served row **at the position** a node is
placed at, and whatever is left when the instance has been armed is surplus the data did not
want (`served`, `takeServed` and `dropUnclaimedServed` in
`packages/dom/src/dom/factories/createExoChildList.ts:22-59`). What that costs, read at the bodies:

-   **No placeholder element.** `c.createExoNode` on a hydrating page makes a node with no
    element at all; a `wireExoNode` before the placement is held until then
    (`armExoSelf` in `packages/dom/src/hydrate/EXO_HYDRATE_NODE_VOCABULARY.ts`). When the list
    places the node, `materializeExoChild` asks it for the served row at that position and
    wires the instance onto THAT element, so nothing is created to be repointed later.
-   **A row is taken once because the slot is emptied.** `takeServed` returns the element at
    `at` and clears its slot (`packages/dom/src/dom/factories/createExoChildList.ts`), so the
    same row cannot be claimed twice — it is the shape of the reader, not a check.
-   **The rows are collected eagerly, in ONE walk, and the reason is a measurement.**
    `ExoChildList.insert` places an adopted row with `appendChild`, which MOVES it behind
    its own siblings, so reading `nextElementSibling` after the first insert answers with a
    row already taken — three served rows came out as the whole list swept away
    (`openChildList` in `EXO_HYDRATE_NODE_VOCABULARY.ts:241`). The same `openChildList` walk also finds the list's end,
    which a child list standing behind this one resolves its own start from
    (`EXO_HYDRATE_NODE_VOCABULARY.ts:218-231`).
-   **When the data wants more rows than the server printed, the client builds the rest.**
    `takeServed` answers `null` past the last served row and `materializeExoChild` takes the
    ordinary path — that is how a list whose data grew past its markup gets its extra rows.
-   **Surplus is removed with no shape check at all**, because the span was bounded by the
    list's own end when it was collected, so everything in it is a row of this list
    (`dropUnclaimedServed` in `createExoChildList.ts:51-59`). It runs for every list of the
    instance when the instance's own hydration ends (`hydrateExoInstance.ts:55-57`), so two
    lists of one instance, filled in any order, never take or drop each other's rows.
-   **The served rows live on the list, not on the instance record**: the record is the
    render record too, and a field there is a field on every instance a page builds, while
    a list exists only where a children port was opened.

Nothing above is special to a reconciler: a node placed by hand with `c.appendChild` or
`c.insertChild` takes the served row at its position the same way — see
[Children](./children.md#hydration). **How much a list of caller-built nodes costs on a
hydrated page has never been measured** — a build callback that hands back a node it did not
get from `c.createExoNode`. It is a real option on a hydrated page rather than a refusal.
:::

## The golden rule: identity = the same node

The identity that matters is the **item object**. On every update the renderer
diffs the new items against the previous ones:

-   **the same item object** as before → the **same DOM node is reused**, moved if
    its position changed, never rebuilt;
-   a **new item object** → a child is built and wired;
-   an item that **disappeared** → its child is removed and its subscriptions end.

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

-   A store that hands back the **same entity object** until that entity actually
    changes gives you focus-safe lists for free. Reactive stores like
    [`@oimdb/*`](https://oimdb.org/llms.txt) are built this way — a
    row's identity is the entity's permanent slot, not a projection made per read.
-   A field edit should reach the row through the row's **own** effect, not
    through a new list. Subscribe to the field inside `rowMachine` and a change to it writes
    one attribute; it never reaches the reconciler at all.
-   If a projection is unavoidable (a filter, a sort), either cache the projected
    objects by their stable id so that re-running the projection yields the same
    objects for the rows that survived — or stop hand-rolling that cache and use the
    keyed plugin below, which is the same idea written once inside the renderer.

## Keys, when identity is not available

**Why it exists.** The identity rule is an argument about a _data layer_. A caller
whose rows arrive as freshly parsed JSON on every poll has no stable object to
reconcile by — every item is new on every refetch, so an identity list rebuilds
every row and throws away its DOM, its listeners, its scroll position and anything
focused inside it. That caller is not being told to go and write a cache first.

**It is an option of the same reconciler, `{ key }`**, from `@exodra/list-reconcile`, and it
works on any backend:

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

const backend = withExoCompiler(new ExoDomBackend());

type TUser = { readonly id: number; readonly name: string };

const RowPorts = exoPorts({ name: EXO_PORT_TEXT });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(RowPorts.name);
    });
});
const rowMachine = composeExoMachine(createExoMachine<TExoDomNode, TUser>(rowSchema), (m) =>
    withExoWire(m, (row, user: TUser) => {
        row.text(RowPorts.name, user.name);
    })
);

const reconcileUsers = createExoChildrenReconciler<TUser>(rowMachine, { key: (user) => user.id });

const users = createStore<readonly TUser[]>([
    { id: 1, name: 'ada' },
    { id: 2, name: 'bob' },
]);

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const listSchema = createExoSchema(ListPorts, (b) => {
    b.el('ul', null, (ul) => {
        ul.childrenPort(ListPorts.rows);
    });
});
const listMachine = composeExoMachine(createExoMachine<TExoDomNode>(listSchema), (m) =>
    withExoEffects(m, (effect) => {
        effect((c) => {
            reconcileUsers(c, ListPorts.rows, users.getValue());
            return users.onChange(() => reconcileUsers(c, ListPorts.rows, users.getValue()));
        });
    })
);

backend.render(listMachine, document.body);
users.setValue([
    { id: 2, name: 'bob' },
    { id: 1, name: 'ada lovelace' },
]);
```

The data reaches a row through its wire, and only there: once when the row is created,
and again on every later call whose object under that key is a **different** one — the
row is re-wired with the new object, keeping its DOM and its subscriptions. The same
object again calls nothing. Underneath is the same `reconcileExoOrder` pass an identity
list runs, over `keyOf(item)` instead of the item
(`packages/list-reconcile/src/createExoChildrenReconciler.ts`).

**What a keyed pass costs that an identity pass does not:** one `keyOf` call and one
key per item per update, and a `Map` from key to item, rebuilt per update, which is
how it tells a fresh object from the same one. A repeated key is not refused: like a
repeated item in an identity list, it is one row per occurrence.

**On the server** a list is printed once and never updated. The string backend's child list
takes a row's markup when the reconciler places it, which is after the row is created and
wired, so what the row's wire writes is printed, and nothing later is
(`packages/string/src/node/factories/createExoStrChildList.ts`). **Under hydration** the
child list opens an adoption cursor and each row it places takes the served row at its
position, as for an identity list; a keyed list under hydration has no test of its own.

Encode into your own identity whatever must force a rebuild, and leave out whatever
should flow through the row's wire instead. Where the data layer can answer that, it is
the cheaper answer; where it cannot, the `key` option is the one that exists.

## Rows that own a subscription

If a row subscribes to something of its own — a per-entity store key — register
the teardown against the child being wired. It ends when that row leaves,
**including a row added by a later update**, so in a windowed list the
subscription cost is `O(visible)` rather than `O(total)`:

```ts
import {
    EXO_PORT_ATTR,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoTransitions,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

type TItem = { readonly id: string };

declare const store: {
    subscribeOnKey(id: string, cb: () => void): () => void;
};

const RowPorts = exoPorts({ id: EXO_PORT_ATTR });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(RowPorts.id, 'data-id');
    });
});
export const rowMachine = composeExoMachine(createExoMachine<TExoDomNode>(rowSchema), (m) =>
    withExoTransitions(m, {
        showItem: (row, item: TItem) => {
            row.attr(RowPorts.id, item.id);
            row.onTeardown(store.subscribeOnKey(item.id, () => {}));
        },
    })
);
export const { showItem } = rowMachine.transitions;
```

An effect's returned unsubscribe is already owned by the instance —
`c.onTeardown` is for what you start yourself outside an effect. The disposer
joins the instance record's child when there is one, and the ambient render scope
otherwise, so a top-level instance and a list row behave the same. A subscription
with nothing to end it is refused rather than left to outlive the page that made
it.

**The examples above build on a DOM-only exonode type
(`createExoMachine<TExoDomNode>`), and that is the honest type for them.** `c.nodes`, `c.schema`, `c.openChildList` and
`c.childListEndNode` are fields and methods of the DOM and hydration exonodes;
`TExoStrNode` has none of them, and has nothing for them to be about — it
writes strings into an array. A machine built over `TExoWiring` from
`@exodra/core` is what makes one component serve, render and hydrate. A machine
that reaches past the shared surface is browser-only, and
`createExoMachine<TExoDomNode>` is how it says so.

## Choosing

| You have…                                                               | Use                                                                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| contents that cannot change                                             | `c.list(port, rowMachine, rows)`                                                                                                     |
| "the current set of items" from a store                                 | `createExoChildrenReconciler(rowMachine)` at module level, called where the data changes — identity-stable items                     |
| rows with no stable identity (freshly parsed JSON per refetch)          | `createExoChildrenReconciler(rowMachine, { key: keyOf })` at module level, called where the data changes                             |
| a producer that knows the exact mutation, or a reuse policy of your own | the port methods `c.appendChild` / `c.insertChild` / `c.moveChild` / `c.removeChild`, driven by hand — see [Children](./children.md) |
