---
title: Troubleshooting
---

# Troubleshooting

Symptoms that are hard to search for, each traced back to the decision that
produces it. Every entry is written in the same order — **what you see**, **why it
happens**, **what to do** — and every entry names the file the behaviour lives in,
so a claim here can be checked against the code rather than believed.

This page is for behaviour that is *working as designed and still surprising*.
Behaviour that is missing or planned is in
[Limits and plans](./limits-and-plans.md); behaviour that is simply how lists work
is in [Lists & Reconciliation](./guides/lists.md).

## The same object twice in one list

### What you see

A list holding the same item object at two positions renders **two rows**, on the
server and on the client alike, and the two rows share one identity.

### Why it happens

This is not a bug in the reconciler. It falls out of the rule the whole renderer
runs on, and the rule is documented before this page:
[children are reconciled by **object identity** rather than by keys](./core/concepts.md#identity--reconciliation).
A row's place in a region is decided by the **item object** it was built from.

So ask what a list means when it holds the same object at two positions. Two
entries in the array, and **one** identity between them — which makes "the second
one" a position with no owner. A key-based renderer never has to answer this: it
would either refuse a duplicate key or accept two distinct keys. Identity is the
engine here, so the question belongs to the engine.

**A POSITION is a row.** `reconcileExoOrder` hands out one row per position and
consults identity only to decide which row SURVIVES an update, never how many rows
there are (`packages/list-reconcile/src/reconcileExoOrder.ts`, "a repeated item is
one row per occurrence"). Three entries give three rows on the client, three on the
server, and the two agree.

### Three backends, one answer

A test asserts the agreement: it counts POSITIONS, including when every entry is the
same object, and it checks the served markup against the built tree
(`packages/dom/src/tests/duplicate-item-parity.test.ts`).

The rule underneath: **identity decides which row survives an update, not how many
rows exist.** A list holding one object twice gets two rows; when the data changes,
the row that keeps its item keeps its DOM element and its live subscriptions.

### `c.list` and `reconcileExoOrder` do not behave the same way here

This distinction is what tells you whether you are looking at this problem at all.

- **`c.list(port, Row, count)`** — the fixed form. It has no reconcile at all; it builds
  `count` instances and each reads its datum by index, so a duplicated item renders twice
  and there is nothing here to diverge.
- **`reconcileExoOrder(c.childList(port), shown, items, items, build)`** — the reactive
  form, called wherever the items change. It reconciles, and reconciling is where identity is
  consulted — but it is consulted to decide which row SURVIVES, so the count still
  follows the positions.

So a duplicate is not a latent hydration bug in either form; what identity still
decides is which of the two rows survives an update.

### What to do

Give each row its own identity. Concretely: **one object per position**, never one
object referenced from two positions. The item object *is* the row's name, and two
rows cannot share a name.

```ts
import { EXO_PORT_CHILDREN, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import { reconcileExoOrder } from '@exodra/list-reconcile';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';

type TTag = { readonly label: string };

const TagPorts = exoPorts({ label: EXO_PORT_TEXT });

const tagSchema = createExoSchema(TagPorts, (b) => {
    b.el('li', null, (li) => {
        li.textPort(TagPorts.label);
    });
});
const tagBuilder = createExoMachineBuilder<TExoDomNode>(tagSchema);
const showTag = tagBuilder.transition<TTag>((c, tag) => {
    c.text(TagPorts.label, tag.label);
});
const Tag = tagBuilder.done();

const shared: TTag = { label: 'urgent' };

// ONE object, two positions: two rows, and one identity between them.
const ambiguous: readonly TTag[] = [shared, shared];

// One object PER position: two identities, two rows, on every backend.
const distinct: readonly TTag[] = [{ label: 'urgent' }, { label: 'urgent' }];

const TagsPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const tagsSchema = createExoSchema(TagsPorts, (b) => {
    b.el('ul', null, (ul) => {
        ul.childrenPort(TagsPorts.rows);
    });
});
const tagsBuilder = createExoMachineBuilder<TExoDomNode, unknown, { rows: TExoChildList; shown: TTag[] }>(
    tagsSchema
);
tagsBuilder.createInitialState((c) => ({ rows: c.childList(TagsPorts.rows), shown: [] }));
function showTags(c: TExoMachineBuilderNode<typeof tagsBuilder>, tags: readonly TTag[]): void {
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, tags, tags, (tag, i) => {
        const row = c.build(Tag, i);
        showTag(row, tag);
        return row;
    });
}
tagsBuilder.wire((c) => {
    showTags(c, distinct);
});
const Tags = tagsBuilder.done();
```

Where duplicates usually come from, and what each one wants instead:

- **A shared constant used as a row** — a placeholder, an "empty" sentinel, a
  separator object hoisted to module scope and pushed into a list more than once.
  Build a fresh object at each position, as above.
- **A projection that returns the same cached object for two inputs** — a `map`
  over ids where two ids resolve to one entity. Two rows showing one entity are two
  rows, so the projection has to mint a wrapper per position; the entity can stay
  shared inside it.
- **A store handing back one permanent object per entity** — the shape Exodra is
  built for, and the shape that makes this impossible by construction: one entity,
  one slot, one row. If the same entity legitimately appears twice in one view,
  what varies between the two appearances (a role, a position, a context) belongs
  in the item object, which makes the two objects different objects.

If your rows genuinely have no stable identity — freshly parsed JSON on every
refetch — the keyed plugin is the documented alternative, with its own costs and
its own handling of duplicates:
[Keys, when identity is not available](./guides/lists.md#keys-when-identity-is-not-available).
It does not remove the question; it moves it from the object to the key: a
duplicate **key** is again one row per position, and identity of the key decides
which row survives.
