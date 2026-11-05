# @exodra/list-reconcile

Puts a list of children **in order** in a children port: `createExoChildrenReconciler`. It
works over a backend's child-list door (`TExoPlacedChildren`: `size`, `at`, `insert`, `move`,
`remove`, `removeAll`); `@exodra/dom`'s child list and `@exodra/term`'s both answer that door, so
one reconciler serves every backend and names no document, no element and no
`insertBefore`.

## Installation

```bash
npm install @exodra/list-reconcile
```

A machine calls it from a wire, a transition or an effect; a backend never does.

## What it depends on

**Nothing.** No Exodra package, no third party, and no `DOM` lib.
`.dependency-cruiser.cjs` is where that is checked.

## The reconciler

The one name an application uses is `createExoChildrenReconciler`. It is called **once**, at
module level, and returns a function the machine calls wherever the data changes — from a wire,
a transition or an effect:

```ts no-check
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

const reconcileTodos = createExoChildrenReconciler<TTodo>(todoMachine);
const reconcileUsers = createExoChildrenReconciler<TUser>(userMachine, { key: (u) => u.id });
const reconcileTags = createExoChildrenReconciler<TTag>(tagMachine, { skipFirst: 1, skipLast: 1 });
const reconcileMixed = createExoChildrenReconciler<TItem>((c: TExoDomNode, item) => {
    const node = c.createExoNode(pick(item));
    wireExoNode(node, item);
    return node;
});

reconcileTodos(c, TodoPorts.rows, todos);
```

-   **A new item** gets a row: `c.createExoNode(machine)`, wired with the item as its params, so
    the row's `wire` receives the item. Given a function instead of a machine, the reconciler calls
    it with `(c, item)` and places the node it returns.
-   **An item that stays** keeps its row — the same element, the same subscriptions. By default
    items are matched by **identity**. With `{ key }` they are matched by key, and when a key stays
    under a new object the row's `wire` runs again with that object.
-   **A row whose item left** is destroyed.
-   **`skipFirst` / `skipLast`** leave the first and last `n` children of the port alone, for rows
    placed by hand around the list.
-   The reconciler **remembers what it showed**, per node and per port: the machine keeps no `shown`
    array and opens nothing in `createInitialState`. Two reconcilers called on one port are two
    independent runs.

A backend calls none of this — the reconciler drives the children port every backend already
answers, which is why `packages/dom/src` names this package nowhere and the
`backends-do-not-know-the-reconciler` rule in `.dependency-cruiser.cjs` keeps it that way.

`reconcileExoOrder` is the low-level pass underneath, exported for library authors writing an
adapter or a backend; an application does not call it.

## The subsequence underneath it

`getExoSequence` (`packages/list-reconcile/src/getExoSequence.ts`) is the
longest-increasing-subsequence pass. It is pure arithmetic over numbers — no
node, no document — and it decides which survivors may stay where they are, so
that everything else is moved around them. The reconciler calls it only on
a middle whose survivors changed order. It is internal to this package and not
exported; `bench/exo-get-sequence-bench.ts` (`npm run bench:sequence`) times it
against its variants.

## Withdrawn numbers

`getExoSequence` used to carry a move count in its header: "3 moves vs 7 on a
10-row rotation, 38 vs 48 on a 50-row shuffle", against a naive pass that
repositions everything out of place. **Those figures are withdrawn.** They were
attributed to a test file that does not exist in this repository and they
resolve to no row in `packages/benchmarks/measurements/`.

What is left standing without them is a property of the problem rather than a
measurement of this code: a node may stay put only if every node it must remain
behind also stays, so the nodes that do not move form an increasing subsequence
of the old positions, and the minimum number of single-node moves is `n` minus
the length of a maximum one. On the `reorder` transition of `update-floor` (200
rows, the axis's own shuffle) a forward pass that moved every row standing out of
place made 193.5 moves per transition against that minimum of 77.0, and
the identity reconciler with the subsequence took `REORDER/exodra` from 147.66 to
73.18 µs in one before/after pair (`packages/benchmarks/measurements/update-floor.before-lis.json`,
`update-floor.after-lis.json`). `docs-site/docs/why/order-without-recomputing.md`
is where that is argued out.

## License

MIT
