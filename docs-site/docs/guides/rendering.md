---
title: Rendering patterns
---

# Rendering patterns

A component is one value carrying two halves: a **schema** built once when the
module loads, and a **wiring function** run once per instance against a
**connector**. If that sentence is new, read the
[Components guide](./components.md) first — this page assumes it and is the
toolkit for everyday layout on top of it: static structure, reactive text and
attributes, conditional rendering, and mixing static with dynamic.

Lists have their [own guide](./lists.md).

## Static structure is an argument, not a bucket

Anything passed to `el()` is known when the module loads, and is folded into the
markup the prototype is parsed from. It costs nothing per instance — there is no
subscription, no setter and no slot in the instance's node array. Whole subtrees
with no ports in them are never even walked into at render time.

```ts
import { createExoStatic } from '@exodra/core';

export const CardHeader = createExoStatic((b) => {
    b.el('header', { class: 'card__header' }, (header) => {
        header.el('h2', { class: 'card__title' }, (h2) => {
            h2.text('Recent activity');
        });
        header.el('p', { class: 'card__hint' }, (p) => {
            p.text('Updated hourly');
        });
    });
});
```

`createExoStatic` is for a component with nothing to fill. It **refuses** a builder
that declares ports, because a component with ports and no wiring is an
attribute stuck empty — a silently wrong page rather than an error.

It has no initial state at all, deliberately: a component with nothing to fill has
nothing to be about, so it does not even read the index it is handed. It is nested
by a machine above it like any other component (`c.one(CardPorts.slot, CardHeader)`).

## Text and attributes that change

A value that varies is not an attribute. It is a **port**, and the machine
writes it. Data that lives outside the instance is followed by an **effect**
that writes the ports first, then subscribes, and returns the unsubscribe.

```ts
import { EXO_PORT_ATTR, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

/** ONE backend for the application, at module level — it is the plan cache key. */
const backend = withExoCompiler(new ExoDomBackend());

function createStore<TValue>(value: TValue) {
    const listeners = new Set<() => void>();
    return {
        getValue: () => value,
        setValue(next: TValue) {
            value = next;
            for (const listener of Array.from(listeners)) listener();
        },
        onChange(listener: () => void): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

const status = createStore<'on' | 'off'>('off');

const BadgePorts = exoPorts({ cls: EXO_PORT_ATTR, label: EXO_PORT_TEXT });

const badgeSchema = createExoSchema(BadgePorts, (b) => {
    b.el('span', { role: 'status' }, (span) => {
        span.attrPort(BadgePorts.cls, 'class');
        span.textPort(BadgePorts.label);
    });
});
const badgeBuilder = createExoMachineBuilder<TExoDomNode>(badgeSchema);
badgeBuilder.effect((c) => {
    const showStatus = () => {
        const s = status.getValue();
        c.attr(BadgePorts.cls, s === 'on' ? 'badge badge--on' : 'badge');
        c.text(BadgePorts.label, s.toUpperCase());
    };
    showStatus();
    return status.onChange(showStatus);
});
const Badge = badgeBuilder.done();

backend.render(Badge, document.body);

status.setValue('on'); // one attribute write and one text write, nothing else
```

There is no diff and no virtual DOM: a change runs the setter the schema compiled
for that port, against the node that port resolved to. Call `c.attr` or `c.text`
**directly** when the value is decided once per instance and will never change —
a bare write retains nothing and subscribes to nothing, and an effect is nothing
but that write plus `onChange`.

:::note A bare write is repaired during hydration too
On a page that is **hydrated**, every fill reads what the server printed and writes
only on disagreement — a direct `c.attr` in the wire as much as one an effect makes
(`packages/dom/src/hydrate/factories/createExoRepairingFill.ts:13-15`). A value that is
constant but **environment-dependent** — a media query, the client's locale, a flag that
flipped while the bundle downloaded — therefore comes out right either way; what an
effect adds is the subscription for later changes. See
[SSR & hydration](./ssr.md#what-hydration-actually-does).
:::

:::note A text port owns its element's whole content
`textPort(Ports.x)` stands for **everything** inside its element, so an element cannot
have both a text port and static children — the schema compiler refuses that
combination by name at module load. Static text beside a reactive value means
two elements: `<span>Hello, </span><strong>«port»</strong>`, which is exactly
what the [Components guide's first example](./components.md#the-smallest-component)
builds.
:::

## Where children come from

A **children port** is declared as `EXO_PORT_CHILDREN` in `exoPorts` and placed
with `childrenPort(Ports.x)`, and it *is* a child: it
renders exactly where the call appears in the builder. There are four ways to
fill one, and choosing between them is most of what this page is about.

| Call | What stands there | Reactive? |
| --- | --- | --- |
| `c.one(port, component)` | one instance, fixed | no |
| `c.list(port, component, count)` | a fixed run of `count` instances | no |
| `c.build(component, index)` | an instance placed **nowhere** — the caller decides where it goes | no |
| `reconcileExoOrder(c.state.rows, c.state.shown, want, want, build)` over `c.childList(port)` | rows that follow the array the machine hands it | yes |

The three fixed forms subscribe to nothing and keep no row records — a list whose
contents cannot change should not pay for the possibility that they might.

The live form is **one function and not four doors**, because its `build(item,
index)` callback is handed the item and returns the node: a callback that always
names the same component is a list of one kind, and one that picks a component per
item is a list of many kinds. The difference is in the callback the application
writes, so the engine carries no case for it. `reconcileExoOrder` comes from
`@exodra/list-reconcile`, which no backend depends on — a page that never
reconciles anything never links it.

:::note A reconciled list ADOPTS what the server printed
It used to refuse by name. It does not any more — opening a child list on a hydrating page
collects the rows the server printed, and `c.build` wires the instance straight onto the
next one, through `hydrateExoInstance`
(`packages/dom/src/hydrate/buildAdoptedExoChild.ts:27-29`).

The child list is opened in `createInitialState`, which runs **once**, and there is nothing to pay for it: no placeholder element and no
record. A row is taken once because the cursor advances — `takeExoAdoptedRow` returns the
element at its position and moves on (`packages/dom/src/dom/EXO_ADOPT_CURSOR.ts:28-36`)
— so the same row cannot be claimed twice, by the shape of the reader rather than by a
check. Once the printed rows run out, `build` goes on constructing client-side, which is
why a list that **grew** between the server's render and the client's is not a special
case.

How much the adoption saves over simply rebuilding has never been measured. See
[Lists & Reconciliation](./lists.md)
for the full cost list.
:::

## Conditional rendering

Pick the idiom by whether the hidden branch should be **removed** or merely
**hidden**, and by whether the *component* changes or only the data.

### One component, present or absent — a reconciled list of one item or none

The narrow conditional is a list of length one or zero. Nothing else is needed:
the same reconcile that runs a thousand rows runs this.

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

/** Where a row's own datum waits for it: a view is handed its INDEX and nothing else. */
const BUILDING: string[] = [];

const DetailsPorts = exoPorts({ text: EXO_PORT_TEXT });

const detailsSchema = createExoSchema(DetailsPorts, (b) => {
    b.el('div', { class: 'details' }, (div) => {
        div.textPort(DetailsPorts.text);
    });
});
const detailsBuilder = createExoMachineBuilder<TExoDomNode, unknown, string>(detailsSchema);
detailsBuilder.createInitialState((_c, index) => BUILDING[index]);
detailsBuilder.wire((c) => {
    c.text(DetailsPorts.text, c.state);
});
const Details = detailsBuilder.done();

const RowPorts = exoPorts({ toggle: EXO_PORT_EVENT, body: EXO_PORT_CHILDREN });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('div', { class: 'row' }, (div) => {
        div.el('button', { type: 'button' }, (btn) => {
            btn.eventPort(RowPorts.toggle, 'click');
            btn.text('Toggle');
        });
        div.childrenPort(RowPorts.body);
    });
});
type TRowState = { open: boolean; body: TExoChildList; shown: string[] };
const rowBuilder = createExoMachineBuilder<TExoDomNode, unknown, TRowState>(rowSchema);
rowBuilder.createInitialState((c) => ({
    open: false,
    body: c.childList(RowPorts.body),
    shown: [],
}));
// One item when open, none when closed.
function showBody(c: TExoMachineBuilderNode<typeof rowBuilder>): void {
    const want = c.state.open ? ['Everything about this row'] : [];
    c.state.shown = reconcileExoOrder(c.state.body, c.state.shown, want, want, (item, i) => {
        BUILDING[i] = item;
        return c.build(Details, i);
    });
}
rowBuilder.wire((c) => {
    showBody(c);
});
rowBuilder.on(RowPorts.toggle, (c) => {
    c.state.open = !c.state.open;
    showBody(c);
});
const Row = rowBuilder.done();

backend.render(Row, document.body);
```

Appearing mounts the instance; disappearing removes its element and ends its
subscriptions.

### A different component in the same place

A tab, a modal, a route: the *component* standing in the position changes, not
just its data. That is a list of **one item, and the item is the component** —
the reconciler compares items by identity, so a new component value drops the
old instance and builds the new one in its place. An empty array empties the
position.

```ts
import { EXO_PORT_CHILDREN, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomMachine, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

function createStore<TValue>(value: TValue) {
    const listeners = new Set<() => void>();
    return {
        getValue: () => value,
        setValue(next: TValue) {
            value = next;
            for (const listener of Array.from(listeners)) listener();
        },
        onChange(listener: () => void): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

const OverviewPorts = exoPorts({ title: EXO_PORT_TEXT });

const overviewSchema = createExoSchema(OverviewPorts, (b) => {
    b.el('section', { class: 'overview' }, (s) => {
        s.el('h1', null, (h1) => {
            h1.textPort(OverviewPorts.title);
        });
    });
});
const overviewBuilder = createExoMachineBuilder<TExoDomNode>(overviewSchema);
overviewBuilder.wire((c) => {
    c.text(OverviewPorts.title, 'Overview');
});
const Overview = overviewBuilder.done();

const SettingsPorts = exoPorts({ body: EXO_PORT_TEXT });

const settingsSchema = createExoSchema(SettingsPorts, (b) => {
    b.el('article', { class: 'settings' }, (a) => {
        a.el('p', null, (p) => {
            p.textPort(SettingsPorts.body);
        });
    });
});
const settingsBuilder = createExoMachineBuilder<TExoDomNode>(settingsSchema);
settingsBuilder.wire((c) => {
    c.text(SettingsPorts.body, 'Nothing configured yet');
});
const Settings = settingsBuilder.done();

// The ITEM is the component. One of them, or none.
const page = createStore<readonly TExoDomMachine[]>([Overview]);

const ShellPorts = exoPorts({ outlet: EXO_PORT_CHILDREN });

const shellSchema = createExoSchema(ShellPorts, (b) => {
    b.el('main', { class: 'shell' }, (main) => {
        main.childrenPort(ShellPorts.outlet);
    });
});
type TShellState = { outlet: TExoChildList; shown: TExoDomMachine[] };
const shellBuilder = createExoMachineBuilder<TExoDomNode, unknown, TShellState>(shellSchema);
shellBuilder.createInitialState((c) => ({ outlet: c.childList(ShellPorts.outlet), shown: [] }));
shellBuilder.effect((c) => {
    const showPage = () => {
        const want = page.getValue();
        c.state.shown = reconcileExoOrder(c.state.outlet, c.state.shown, want, want, (component, i) =>
            c.build(component, i)
        );
    };
    showPage();
    return page.onChange(showPage);
});
const Shell = shellBuilder.done();

backend.render(Shell, document.body);

// Later — a different component, in the same position:
page.setValue([Settings]);
```

The outgoing instance is dropped the way a list row that leaves is: its element
comes out and its subscriptions end.

**Many** mixed positions at once — a page of blocks, a feed of mixed card types,
a form generated from a schema — is the same call with a longer array. Nothing
in the engine distinguishes the two cases, because nothing in it knows how the
callback picks: `build` is handed the item and returns a node, so a source of
components gives mixed kinds and a source of data gives one kind, from one
reconciler with no case for either.

### Keep it mounted — toggle a class

When the branch is cheap and its state must survive (an input mid-typing, a
scroll position), do not remove it. Write a class from the machine and hide
with CSS:

```ts
import { EXO_PORT_ATTR, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const PanelPorts = exoPorts({ cls: EXO_PORT_ATTR });

const panelSchema = createExoSchema(PanelPorts, (b) => {
    b.el('section', null, (section) => {
        section.attrPort(PanelPorts.cls, 'class');
        section.el('input', { type: 'text', placeholder: 'Keeps its focus' });
    });
});
const panelBuilder = createExoMachineBuilder<TExoDomNode, unknown, { expanded: boolean }>(panelSchema);
panelBuilder.createInitialState(() => ({ expanded: false }));
function showPanel(c: TExoMachineBuilderNode<typeof panelBuilder>): void {
    c.attr(PanelPorts.cls, c.state.expanded ? 'panel' : 'panel panel--hidden');
}
panelBuilder.wire((c) => {
    showPanel(c);
});
const Panel = panelBuilder.done();

backend.render(Panel, document.body);
```

A handler that sets `c.state.expanded` and runs `showPanel(c)` opens and closes it.

**Rule of thumb:** *remove* when the branch is heavy or must reset; *hide* when
it is light and should keep its state.

## Mixing static and dynamic — no fragments needed

A children port is a child, appended where it was declared, so it may stand
**between static siblings**. There is no wrapper element and no fragment host:

```ts
import { EXO_PORT_CHILDREN, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

function createStore<TValue>(value: TValue) {
    const listeners = new Set<() => void>();
    return {
        getValue: () => value,
        setValue(next: TValue) {
            value = next;
            for (const listener of Array.from(listeners)) listener();
        },
        onChange(listener: () => void): () => void {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
    };
}

type TTag = { readonly id: string; readonly label: string };

/** The row's own item, by index — the slot the build callback writes before building. */
const BUILDING: TTag[] = [];

const TagPorts = exoPorts({ label: EXO_PORT_TEXT });

const tagSchema = createExoSchema(TagPorts, (b) => {
    b.el('li', { class: 'tag' }, (li) => {
        li.textPort(TagPorts.label);
    });
});
const tagBuilder = createExoMachineBuilder<TExoDomNode, unknown, TTag>(tagSchema);
tagBuilder.createInitialState((_c, index) => BUILDING[index]);
tagBuilder.wire((c) => {
    c.text(TagPorts.label, c.state.label);
});
const Tag = tagBuilder.done();

const tags = createStore<readonly TTag[]>([{ id: 'a', label: 'urgent' }]);

const TagBarPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const tagBarSchema = createExoSchema(TagBarPorts, (b) => {
    b.el('ul', { class: 'tags' }, (ul) => {
        // A pinned item, always first…
        ul.el('li', { class: 'tag tag--pinned' }, (li) => {
            li.text('Pinned');
        });
        // …the live rows, right here…
        ul.childrenPort(TagBarPorts.rows);
        // …and a static footer after them.
        ul.el('li', { class: 'tag tag--more' }, (li) => {
            li.text('More…');
        });
    });
});
type TTagBarState = { rows: TExoChildList; shown: TTag[] };
const tagBarBuilder = createExoMachineBuilder<TExoDomNode, unknown, TTagBarState>(tagBarSchema);
tagBarBuilder.createInitialState((c) => ({ rows: c.childList(TagBarPorts.rows), shown: [] }));
tagBarBuilder.effect((c) => {
    const showTags = () => {
        const want = tags.getValue();
        c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (tag, i) => {
            BUILDING[i] = tag;
            return c.build(Tag, i);
        });
    };
    showTags();
    return tags.onChange(showTags);
});
const TagBar = tagBarBuilder.done();

backend.render(TagBar, document.body);
tags.setValue([...tags.getValue(), { id: 'b', label: 'blocked' }]);
```

The port's rows are inserted **before** the next static element, which the plan
records when the schema is compiled. Two children ports may also sit directly
next to each other — two conditionals in a row is an ordinary shape, and the
runtime resolves which region ends where, including when one of them is
currently empty.

:::caution Static *text* directly after a children port is refused
A region is anchored on the next static **element**, so text is not something it
can end at: the rows would land after that text on the client and before it on
the server. The schema compiler refuses this at module load, naming the text.
Wrap the text in an element, or make it part of what the wiring puts in the
region.
:::

## Raw markup

`c.unsafeHtml(port, html)` on a **children port** writes raw markup with `innerHTML` —
the `unsafeHtml` escape hatch. It is only allowed where the port is its
element's **only** child, because `innerHTML` takes the whole element and would
destroy any static siblings. Anywhere else the call is refused with a message
saying so. As everywhere, raw markup is your promise that the string is safe.

## The identity rule

Conditional children and lists are governed by one rule: children are
reconciled by **object identity**. No key is involved, and none is required.

- the **same item object** as last time → the same element, moved if its
  position changed, never rebuilt;
- a **new item object** → a child is built;
- an item that **disappeared** → its child is removed and its subscriptions end.

So whether a node survives an update is entirely about whether you hand back the
same object. See [Lists & Reconciliation](./lists.md) for what that means for a
list fed from a store, and [Core Concepts](../core/concepts.md#identity--reconciliation)
for why identity is first-class here rather than an escape hatch.

## The same patterns in JSX

In [Exodra JSX](./jsx.md) a children port is written where it stands, as
`<$.name />`, and the declaration says nothing about what fills it:

```tsx no-check
<ul><$.rows /></ul>
<div><h3>t</h3><$.details /><footer /></div>
<main><$.page /></main>
```

The machine makes the choice this page describes — `c.one`, `c.list`, or
`c.childList` reconciled with `reconcileExoOrder` — with the same consequences.
A component tag such as `<Row />` is a compile error: a schema has no notion of a
component.
