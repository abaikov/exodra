# @exodra/list-reconcile

Puts a list of children **in order** over a backend's child-list door
(`TExoPlacedChildren`: `size`, `at`, `insert`, `move`, `remove`, `removeAll`).
`@exodra/dom`'s child list and `@exodra/term`'s both answer that door, so one
reconciler serves every backend and names no document, no element and no
`insertBefore`.

## Installation

```bash
npm install @exodra/list-reconcile
```

A machine imports it in a transition; a backend never does.

## What it depends on

**Nothing.** No Exodra package, no third party, and no `DOM` lib.
`.dependency-cruiser.cjs` is where that is checked.

## The list primitives

The one name an application uses is `reconcileExoOrder(kids, shown, keys, items,
build)`, called from a transition with the child list the machine opened in
`createInitialState`; it returns the keys it now shows. For data without a stable
identity, `createExoKeyedList(kids, keyOf, build, update)` — or `c.keyedList(port, keyOf,
build, update)` on a backend composed with `EXO_KEYED_LIST_VOCABULARY` — returns a
`{ reconcile(items) }` handle the machine keeps in its state. A backend calls none of
them — a machine composes them over the `childList` door the backend already
answers (on `@exodra/dom` that door is the `withExoChildList` pack, composed where the backend is
built; without it the first `c.childList` throws `EXO0109`), which is why `packages/dom/src` names this package nowhere and the
`backends-do-not-know-the-reconciler` rule in `.dependency-cruiser.cjs` keeps it
that way.

## The subsequence underneath it

`getExoSequence` (`packages/list-reconcile/src/getExoSequence.ts`) is the
longest-increasing-subsequence pass. It is pure arithmetic over numbers — no
node, no document — and it decides which survivors may stay where they are, so
that everything else is moved around them. `reconcileExoOrder` calls it only on
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
