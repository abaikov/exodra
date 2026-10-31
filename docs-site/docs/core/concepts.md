---
sidebar_position: 1
title: Core Concepts
---

# Core Concepts

Four ideas carry the whole runtime: a component is a **schema plus a wiring
function**, the schema declares **ports** that a backend fills through an
**exonode**, change is **explicit** — transitions write ports and effects
subscribe — rather than automatic tracking,
and children are reconciled by **identity** rather than by keys. The rest
follows from these four.

## Schema and wiring

A component is one value carrying two halves:

| Half | When it runs | What it is |
| --- | --- | --- |
| the **schema** | once, at module load | the constant shape — static markup, plus the ports where values may later be put |
| the **wiring function** | once per instance | the code that fills those ports |

That split is where the performance comes from. Deciding what the markup is,
which attribute lives where, how deep a node sits — all of it happens once per
component for the life of the process. A render is a clone of the prepared
element plus one indirect call per port. Nothing is diffed and nothing is walked
at render time.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

/** The row's own datum, by index. A view is handed its index and nothing else. */
const BUILDING: string[] = [];

const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', { class: 'row' }, (li) => {
        id = li.port('data-id');
        li.el('span', null, (span) => {
            label = span.textPort();
        });
    });
    return { id, label };
});
const mRow = createExoMachineBuilder<TExoMachineNode, unknown, string>(ROW_SCHEMA);
mRow.createInitialState((_c, index) => BUILDING[index]);
mRow.wire((c) => {
    const name = c.state;
    c.attr(ROW_SCHEMA.ports.id, name);
    c.text(ROW_SCHEMA.ports.label, name.toUpperCase());
});
const ROW = mRow.done();
```

## Ports

A port is a **place**, declared once and named by **identity**. `port(name)` is
an attribute, `eventPort(name)` a listener, `textPort()` an element's whole text
content, and `childrenPort()` a variable-length sequence of children.

Everything else — the tags, the static attributes, the static text — is folded
into prepared markup and costs nothing per instance. An attribute whose value
varies is not an attribute; it is a port.

Ports are numbered after the whole shape is known, in **document order**. That
numbering is the contract between the backends: the server and the browser never
speak to each other, and they agree because both index their prepared plans by
the same numbers. Change the order and a page hydrates into nonsense rather than
crashing — which is why it is stated as a rule and not an implementation detail.

## Exonodes

An initial state is handed an **exonode** — the instance itself, with the
backend's methods on its prototype. The exonode is what differs between backends:
`TExoStrNode` writes into a value array, `TExoDomNode` into cloned nodes,
`TExoHydrateNode` into the server's own nodes. All three are **types**, not
classes — an exonode is a plain object whose prototype is the composed backend,
which is what lets a plugin add or wrap one of its methods. All three carry the
same `attr` / `text` / `unsafeHtml` / `on` / `one` / `list` / `build` /
`onTeardown` surface, so **one hand-written machine drives all three** —
the server render, the client render and hydration — with no cast.

An exonode is not a cursor: nothing walks, nothing descends, and no method
depends on the order the others were called in. It IS the instance the machine is
filling, so a subscription that closes over it closes over that one row and
nothing else.

## Identity & reconciliation

`reconcileExoOrder(kids, shown, keys, want, build)` from `@exodra/list-reconcile`,
called from a transition over `c.childList(port)`, makes a children port equal to
the array it is handed, reconciled by **object identity**, and returns the new
order shown for the machine to keep in its state:

- **Same item object** as before → the **same element is reused** (moved if its
  position changed, never rebuilt).
- **A new item object** → a child is built and inserted.
- **An item that disappeared** → its child is removed and its effects are
  stopped.

There is no `key` prop on this path and no heuristic: the reference *is* the key.
Whether a row survives an update depends entirely on whether you hand back the same
object — which is what preserves input focus, scroll position and per-row state.

A key is available as an **opt-in plugin**, never as a core default:
`EXO_KEYED_LIST_VOCABULARY` from `@exodra/list-reconcile` puts
`c.keyedList(port, keyOf, build, update)` on the exonode of a backend that
composed it — it returns a list whose `reconcile(items)` a transition calls — over
the free function `createExoKeyedList`, for the case where
identity genuinely is not available — rows arriving as freshly parsed JSON on every
refetch. See
[Keys, when identity is not available](../guides/lists.md#keys-when-identity-is-not-available).

This is the functional idiom of **structural sharing**: keep the reference for
what is unchanged, mint a new one for what changed. React hides identity and
hands you `key` / `memo` as escape hatches; Exodra makes identity first-class.

Underneath the reconciler, a child is a value you can hold: `c.build(component,
index)` returns one, and `c.childList(port)` is the placement door — `insert`,
`move`, `remove` — that holds whatever is put in it. Whoever drives that door
decides everything else — which item reuses which child, and what a key would mean
if you wanted one. See
[Lists & Reconciliation](../guides/lists.md).

## State, transitions and effects

A machine's state is what `createInitialState` returns, once per instance; it is
`c.state` from then on. A **transition** — `m.transition((c) => …)` — is the one
place that turns state into port writes, and the wire, the handlers and the
effects all call it. Data that lives **outside** the instance is followed by an
**effect** that draws first, then subscribes, and returns the unsubscribe:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';

const count = {
    value: 0,
    listeners: new Set<() => void>(),
    getValue(): number {
        return this.value;
    },
    increment(): void {
        this.value++;
        for (const listener of Array.from(this.listeners)) listener();
    },
    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },
};

const COUNTER_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('output', null, (output) => {
        text = output.textPort();
    });
    return { text };
});
const mCounter = createExoMachineBuilder<TExoMachineNode>(COUNTER_SCHEMA);
const showCount = mCounter.transition((c) => {
    c.text(COUNTER_SCHEMA.ports.text, count.getValue());
});
mCounter.effect((c) => {
    showCount(c);
    return count.onChange(() => showCount(c));
});
const COUNTER = mCounter.done();
```

The source is anything with a read and a subscription — a store, an
[OIMDB](https://oimdb.org/) collection, a socket. Exodra ships no
cell of its own, and a derived value is computed in the transition that writes it.

## Composition

A component nests another by filling a **children port** with it. There are three
calls, and the difference between them is how much may change later:

| Call | What it puts in the port |
| --- | --- |
| `c.one(port, COMPONENT)` | one instance, built now |
| `c.list(port, COMPONENT, count)` | a fixed list of `count` instances — rendered once, never reconciled |
| `reconcileExoOrder(c.state.rows, c.state.shown, want, want, build)` in a transition | a live list, reconciled by object identity |

A children port **is a child**: it renders exactly where `childrenPort()` was
called, so it may stand between static siblings.

```ts
import { createExoMachineBuilder, createExoSchema, createExoStatic } from '@exodra/core';
import type { TExoChildrenPort, TExoChildrenWiring, TExoMachineNode } from '@exodra/core';

// A component with nothing to fill — an icon, a separator, a masthead.
const MASTHEAD = createExoStatic((b) => {
    b.el('h1', { class: 'masthead' }, (h1) => h1.text('Exodra'));
});

const PAGE_SCHEMA = createExoSchema((b) => {
    let head!: TExoChildrenPort;
    b.el('div', { class: 'app' }, (div) => {
        div.el('header', null, (h) => { head = h.childrenPort(); });
        div.el('main', null, (m) => { m.text('…'); });
    });
    return { head };
});
const mPage = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(PAGE_SCHEMA);
mPage.createInitialState((c) => {
    c.one(PAGE_SCHEMA.ports.head, MASTHEAD);
});
const PAGE = mPage.done();
```

## Cleanup

An effect's stop — the function it returns — runs when the instance leaves.
Something started outside an effect is registered against the child being wired
with `c.onTeardown`:


```ts
import type { TExoDomNode } from '@exodra/dom';

export function startTicker(c: TExoDomNode, tick: () => void): void {
    const id = setInterval(tick, 1000);
    c.onTeardown(() => clearInterval(id));
}
```

`exoTeardownScope(fn)` opens a scope and hands back a disposer for everything
`exoOnTeardown` registered inside it — which is exactly what `ExoDomBackend.render` is
around its mount, and why the disposer it returns ends everything the render
started.
A subscription with nothing to end it is refused rather than left to outlive the
page that made it.

## Performance

Correctness never depends on an optimization: the fast path is the only path.
The shape is compiled once per process into a prototype element, a walk plan and
a setter per port, and a render is a clone plus one indirect call per port. There
is no hoisting switch to forget and no cache key to name — the schema *is* the
hoisted template.

Two things are worth knowing anyway:

- **A list pass costs what changed.** `reconcileExoOrder` trims the common head
  and tail first and runs the identity match only over the middle, so an append
  or a single edit is a short pass, not a walk of the whole array.

- **Event delegation is a choice.** `createExoDelegatedEvents(names)` puts one listener
  on the root for every row instead of one per element. It requires a **subject**
  in every fill — `c.on(port, handler, subject)` — because the subject is how one
  module-level function learns which row it fired on, rather than one closure
  per row carrying its own.

See **[Optimizations](../guides/optimizations.md)** for what you get for free and
what you reach for by hand.