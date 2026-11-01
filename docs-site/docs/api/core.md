---
sidebar_position: 1
title: Core API
---

# Core API Reference

`@exodra/core` is the **backend-agnostic half** of the renderer: the shape of a
component, the numbering of its ports, the context tokens, the event-handler
signature, the escapers and the list-placement primitives. It renders nothing
by itself — [`@exodra/dom`](./dom.md) compiles a schema into nodes and
[`@exodra/string`](./string.md) compiles it into markup.

It does **not** contain reactivity: a schema's values are typed `unknown`, and a
machine follows outside data through an **effect** that draws first, subscribes
second and returns the unsubscribe — so core pairs with whatever data layer the
application already has.

## A component is one value

A component carries **two halves**:

-   a **schema** — the constant shape, built **once** when the module loads. It
    holds the static markup and declares the **ports**: the places a value may
    later be put.
-   a **wiring function** — run **once per instance**, against whichever backend's
    **connector** is filling. It puts values in the ports it names.

There is no per-render tree, no diff of props, and no walk: the walk happens
once, at definition time, so filling a port at render time is one array load and
one indirect call.

```ts
import { EXO_PORT_ATTR, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';

type TRow = { readonly id: string; readonly title: string };

const RowPorts = exoPorts({ id: EXO_PORT_ATTR, label: EXO_PORT_TEXT });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', { class: 'row' }, (li) => {
        li.attrPort(RowPorts.id, 'data-id');
        li.el('span', { class: 'row__label' }, (span) => {
            span.textPort(RowPorts.label);
        });
    });
});

const rowBuilder = createExoMachineBuilder<TExoMachineNode, TRow, TRow>(rowSchema);
rowBuilder.createInitialState((_c, _index, row) => row);
rowBuilder.wire((c) => {
    c.attr(RowPorts.id, c.state.id);
    c.text(RowPorts.label, c.state.title);
});
export const Row = rowBuilder.done();
```

The ports object is the component's API: the machine names `RowPorts.id`, never
"port 0", and `rowSchema.ports` is that same object. `TExoMachineNode` is the
surface all three backends share, so this one value is served, rendered and
hydrated with no cast.

Which produces, per item, `<li class="row" data-id="…"><span class="row__label">…</span></li>`
— identically on the server, on a client render and through hydration, because
all three index the same port numbers.

## createExoSchema()

```ts no-check
function createExoSchema<TPorts extends Readonly<Record<string, TExoAnyPort>>>(
    ports: TPorts,
    build: (emitter: TExoEmitter<TPorts>) => void
): TExoCursorDeclaration<TPorts>;
function createExoSchema<TPorts>(
    build: (cursor: TExoSchemaCursor) => TPorts,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoCursorDeclaration<TPorts>;
function createExoNamedSchema<TPorts>(
    build: (cursor: TExoSchemaCursor<TPorts>) => void,
    decorate?: TExoSchemaDecorator<TPorts>
): TExoCursorDeclaration<TPorts>;
```

**The port interface** is the first form: `exoPorts({ name: kind, … })` declares
every port up front, and the build callback places each one where it stands. The
schema's `.ports` is that same object, so a machine can name the ports before the
schema exists. A port's number is its place in `exoPorts`.

Two alternative forms mint the ports inside the build callback instead. The
**return-object** form returns the record the machine will read:

```ts
import { createExoSchema } from '@exodra/core';
import type { TExoTextPort } from '@exodra/core';

export const titleSchema = createExoSchema((b) => {
    let title!: TExoTextPort;
    b.el('h1', null, (h1) => {
        title = h1.textPort();
    });
    return { title };
});
```

The **self-naming** form, `createExoNamedSchema<TPorts>`, names each port where it
stands and returns nothing; `TPorts` comes from the type argument:

```ts
import { createExoNamedSchema } from '@exodra/core';
import type { TExoAttrPort, TExoTextPort } from '@exodra/core';

export const linkSchema = createExoNamedSchema<{ href: TExoAttrPort; label: TExoTextPort }>((b) => {
    b.el('a', null, (a) => {
        a.port('href', 'href');
        a.textPort('label');
    });
});
```

One callback may not both name a port and return a record; that is refused
rather than merged.

The schema half. A component is made from it by handing it to
`createExoMachineBuilder` — see [Machines](#machines) — and the plan compilers,
which know nothing about filling, read it alone.

Call it **once, at module level**. It is not a render; it produces the thing
renders are made from.

It throws if the builder produced no element.

## TExoSchemaCursor

The definition-time cursor. It walks the shape once, when the module loads, and
records what it saw. Every port-placing call takes the declared port first and
hands it back — one object per template, shared by every row.

| Method                          | What it places                                                                                                                                             | Hands back         |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `el(tag, attrs?, fn?)`          | A child element with its **static** attributes, and optionally a body. Everything in `attrs` is folded into the prepared markup and costs nothing per row. | the builder        |
| `text(value)`                   | Static text inside the current element.                                                                                                                    | the builder        |
| `attrPort(port, name)`          | A port for **one attribute** of the current element.                                                                                                       | `TExoAttrPort`     |
| `stringPort(port, name)`        | An attribute port whose value is always a string.                                                                                                          | `TExoAttrPort`     |
| `togglePort(port, name)`        | A boolean attribute: present or absent.                                                                                                                    | `TExoAttrPort`     |
| `eventPort(port, name)`         | A port for **one event listener**. It emits no markup and still takes a slot.                                                                              | `TExoEventPort`    |
| `textPort(port)`                | A port standing for the **whole text content** of the current element.                                                                                     | `TExoTextPort`     |
| `childrenPort(port)`            | A port holding a **variable-length sequence of children** — a list, or one nested instance.                                                                | `TExoChildrenPort` |
| `refPort(port)`                 | A **reference to the current element** and no way to write to it.                                                                                          | `TExoRefPort`      |

The alternative forms call the same methods without the port (`attrPort(name)`,
`port(name)`, `textPort()`, …) and the call mints one; the self-naming form adds the
port's name as the last argument.

Each port type pins its port's kind, so a text port refuses an attribute
position; all but `TExoRefPort` are `TExoPort`s, which is what every writing
signature takes, and `TExoRefPort` deliberately is not.

An attribute whose value varies is not an attribute here — it is a port.

A children port **is a child**: it is appended where it was declared, so it may
stand between static siblings.

```ts
import { EXO_PORT_CHILDREN, EXO_PORT_TEXT, createExoSchema, exoPorts } from '@exodra/core';

export const PanelPorts = exoPorts({ heading: EXO_PORT_TEXT, body: EXO_PORT_CHILDREN });

export const panelSchema = createExoSchema(PanelPorts, (b) => {
    b.el('section', { class: 'panel' }, (section) => {
        section.el('h2', null, (h2) => {
            h2.textPort(PanelPorts.heading);
        });
        section.childrenPort(PanelPorts.body);
        section.el('footer', { class: 'panel__foot' }, (foot) => {
            foot.text('—');
        });
    });
});
```

`body` is placed between two static siblings, and that is where it renders.

### Port order

A port's number is its place in `exoPorts`. In the alternative forms, where the
markup mints the ports, it is the order the minting calls were made in.

This ordering is the contract between the backends. They never speak to each
other; they agree because both index their prepared plans by these numbers. It
is not an implementation detail — a change to it shows up not as a crash but as
a page that hydrates into nonsense.

## createExoStatic()

A component with **nothing to fill**: a conditional block's body, an icon, a
separator, an empty state.

```ts
import { createExoStatic } from '@exodra/core';

export const Spinner = createExoStatic((b) => {
    b.el('span', { class: 'spinner', role: 'status' }, (s) => {
        s.text('Loading…');
    });
});
```

It **throws at construction** if the builder declared any ports — a
component with ports and nothing to fill them is an attribute stuck empty, which
is a silent wrong page rather than an error.

The machine it returns has `createInitialState: null`, no `wire`, and the shared
`EXO_NO_EFFECTS` / `EXO_NO_HANDLERS`, so a backend arms nothing for an instance
of it.

## The initial state and the wire

```ts no-check
type TExoMachineInitialState<TWiring, TValue = unknown, TParams = unknown> = (
    enode: TWiring,
    index: number,
    params: TParams
) => TValue;
```

`m.createInitialState(make)` declares it: it runs once per instance, and what it returns is
what the instance keeps, read back with `c.readState()`. It receives the same `params` the
instance is built with, so a row bound to one record for its whole life keeps that record in
its state from the start instead of waiting for the wire. `m.wire((c, params) => …)` declares
the other half — a transition that writes ports only and may run again with new `params`.

**One declaration, three backends.** It is generic over the connector and
nothing else, which is what makes "the same hand-written wire runs on the
server, on a client render and through hydration" a fact about the type system
rather than a promise in two files.

**Fill `TWiring` with `TExoWiring` or `TExoChildrenWiring`, not with a
backend's own exonode type**, wherever the wire can be written against the
shared surface. Naming `TExoDomNode` or `TExoStrNode` names **one backend's
exonode**. (Neither names a class: an exonode is a plain object whose prototype
is the composed backend, and both are types.) A wire is a function, so its
exonode parameter is contravariant: a wire typed `TExoMachineInitialState<TExoDomNode>` can
only ever be run by something assignable to `TExoDomNode`, which carries
`nodes: Node[]` and the instance record's own fields — the server backend is
not, and never will be. Reach for it only when the wire genuinely touches those
members, as a plugin reading `c.nodes[c.schema.elem[port.index]]` does.

-   `index` is **the position at build time and nothing more**. A row keeps the
    number it was built with even after the rows around it move — the reconciler
    moves nodes, it does not re-run wiring. A component that needs a live position
    must bind one, not capture this.

## The shared surface

Two types say what a wire may assume about the exonode it is handed — the
calls `TExoStrNode`, `TExoDomNode` and `TExoHydrateNode` all carry with the same
signatures, and nothing else. Both are this package's.

```ts no-check
// `TEvent` / `TNode` are pass-through: this package hands both to a handler and
// reads neither, so naming the DOM's `Event` / `Element` here would bind every
// backend to a document. A DOM-facing surface narrows them.
interface TExoWiring<TEvent = unknown, TNode = unknown>
    extends TExoFillDoors,      // attr, text, unsafeHtml
        TExoBaseNodeMethods {   // onTeardown, provide, inject
    portTable(): TExoPortTable;
    portNodeWriter(): TExoPortNodeWriter;
    on(port: TExoEventPort, handler: TExoEventHandler<TEvent, TNode>, subject?: unknown): void;
}

interface TExoChildrenWiring<TEvent = unknown, TNode = unknown>
    extends TExoWiring<TEvent, TNode> {
    build(component: TExoMachine<this>, index?: number): TExoNode;
    one(port: TExoChildrenPort, component: TExoMachine<this>): void;
    list(port: TExoChildrenPort, component: TExoMachine<this>, count: number): void;
}
```

`childList(port)` is **not** in either: handing back a port's live children is a
backend's own door, so a wire that drives one names that backend's exonode —
`TExoMachineInitialState<TExoDomNode>` — and is browser-only by saying so.

**Two of them, and the line is drawn by what the call names.** Every call in
`TExoWiring` names a port and a plain value, so it can be spelled flatly and
a backend satisfies it by writing the methods out. Every call `TExoChildrenWiring`
adds takes another **component**, and a component is generic over the exonode
it is wired against — so those signatures name the exonode recursively. Said in
behaviour: the first is what a wire does to the instance it was handed, the
second is what it mounts below it.

**There is no third surface for watching data**, and the absence is the
design. A machine keeps ports in step with outside data through a **transition**
that writes them and an **effect** that runs the transition once and then
subscribes to the data layer; a reactive list is `reconcileExoOrder` from
`@exodra/list-reconcile`, called inside such a transition over
`childList(port)`. None of it is a door, so no backend declares it, no wire has
to name a wider surface to use it, and a page that watches nothing links none
of it.

Grading matters because a surface that forces a wire to declare capabilities it
does not use narrows what can **run** that wire: a leaf typed `TExoWiring` is
accepted by a backend, a test double or a plugin connector that fills values and
mounts nothing. A component typed against the minimal surface is nested happily
by a wire typed against the wider one — that direction is free, because
`TExoChildrenWiring` extends `TExoWiring` and the wire's parameter is
contravariant.

**During hydration every fill repairs.** The signature of `attr`, `text` and
`unsafeHtml` is the same on all three backends, and on an adopting pass each one
reads what the server printed, compares, and writes only on disagreement. A
value that differs between the server and the browser — a media query, a
locale, a clock — is therefore corrected by the same call that printed it:

```ts no-check
c.attr(BadgePorts.cls, matchMedia('(hover: none)').matches ? 'touch' : 'mouse');
```

An **event** port is the exception in the other direction: its `set`-time
attachment is the whole content of hydration. See
[SSR & hydration](../guides/ssr.md#what-hydration-actually-does).

A hand-written surface narrower still is always allowed and sometimes better:
`@exodra/forms` asks `writeExoChoice` for `Pick<TExoFillDoors, 'attr'>` and
`readExoControlValues` for `portTable` plus `portNodeReader`, and `@exodra/router`
declares `TExoOutletWiring` as `TExoMachineNode` plus `build` and `childList`,
precisely so a helper can be run by anything that has those calls.

These types are erased: they emit no JavaScript and change nothing about the
connector object a wire receives at runtime.

## Ports

```ts no-check
type TExoPort = {
    index: number;             // where this port's value lands; -1 until the schema is closed
    readonly kind: TExoPortKind;
    readonly name: string | null;  // attribute/event name; null for text and children ports
};
```

The seven kinds are exported as plain constants — a plugin that compiles its own
plan switches on exactly these, and there is no enum object to load them from:

| Constant               | Value | Placed by                         |
| ---------------------- | ----- | --------------------------------- |
| `EXO_PORT_ATTR`        | `0`   | `attrPort(port, name)`            |
| `EXO_PORT_TEXT`        | `1`   | `textPort(port)`                  |
| `EXO_PORT_CHILDREN`    | `2`   | `childrenPort(port)`              |
| `EXO_PORT_EVENT`       | `3`   | `eventPort(port, name)`           |
| `EXO_PORT_REF`         | `4`   | `refPort(port)`                   |
| `EXO_PORT_ATTR_STRING` | `5`   | `stringPort(port, name)`          |
| `EXO_PORT_ATTR_TOGGLE` | `6`   | `togglePort(port, name)`          |

`EXO_PORT_REF` is deliberately not in `TExoPortKind`: a ref port is read, never
written, so `c.set(refPort, …)` does not compile.

An event port and a ref port can carry the type of what they hand back. Declare them with
`exoEventPortKind<TEvent>()` and `exoRefPortKind<TNode>()` in place of the plain constants;
the value is the same number, only the type changes:

```ts no-check
const FieldPorts = exoPorts({
    keydown: exoEventPortKind<KeyboardEvent>(),
    field: exoRefPortKind<HTMLInputElement>(),
});

fieldBuilder.on(FieldPorts.keydown, (c, event) => {
    if (event.key === 'Enter') c.portNode(FieldPorts.field).focus();
});
```

A handler on a typed event port receives that event type; on a plain `EXO_PORT_EVENT` it
receives the backend's own event type, as before. A function written outside the builder
names the instance it is handed as `TExoMachineBuilderNode<typeof fieldBuilder>`: the
builder's node type with its `state`.

## Contexts

Every name in this section is exported by **`@exodra/context`**, not by this
package. It is a separate install because a backend needs the chain and does not
need the schema vocabulary — `@exodra/core` itself is one of its consumers.

A context token is an **identity**, not a string, so two packages cannot collide
on a name.

```ts no-check
function exoContextToken<TValue>(name?: string): TExoContextToken<TValue>;
```

`provide` and `inject` are **methods on the connector**, in the backends —
there is nothing to import to use them, and that is the point: a context exists
only while a wiring is running, and a method cannot be called without a
connector.

```ts
import { EXO_PORT_ATTR, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { exoContextToken } from '@exodra/context';

export const THEME = exoContextToken<string>('theme');

const BadgePorts = exoPorts({ cls: EXO_PORT_ATTR });

const badgeSchema = createExoSchema(BadgePorts, (b) => {
    b.el('span', null, (span) => {
        span.attrPort(BadgePorts.cls, 'class');
    });
});
const badgeBuilder = createExoMachineBuilder<TExoMachineNode>(badgeSchema);
badgeBuilder.wire((c) => {
    c.attr(BadgePorts.cls, 'badge badge--' + (c.inject(THEME) ?? 'light'));
});
export const Badge = badgeBuilder.done();
```

`c.inject(THEME)` is `undefined` when nobody above provided it — not a throw.

:::caution Contexts are not reactive by themselves
What is provided is what a consumer holds forever: nothing watches the chain and
nothing re-runs a wire. Reactivity composes from **above** — provide a store
object, and have the consumer's effect draw from it and subscribe to it.
:::

`exoContextFrame(frame, key, value)` and `readExoContext(frame, key)` are the shared
half: a backend supplied from outside this repo builds its chain with the first
and reads it with the second, so "the nearest value wins" is one loop rather
than three. The types are `TExoContextToken<TValue>` and `TExoContextFrame`.

### Ids that survive hydration

`label for`, `aria-describedby` and `aria-controls` need an id that the server
prints and hydration finds again. `@exodra/context` counts them per render:

```ts
import { EXO_PORT_ATTR, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { nextExoId, provideExoIds } from '@exodra/context';

const FieldPorts = exoPorts({ labelFor: EXO_PORT_ATTR, inputId: EXO_PORT_ATTR });

const fieldSchema = createExoSchema(FieldPorts, (b) => {
    b.el('p', null, (p) => {
        p.el('label', null, (label) => {
            label.attrPort(FieldPorts.labelFor, 'for');
        });
        p.el('input', null, (input) => {
            input.attrPort(FieldPorts.inputId, 'id');
        });
    });
});
const fieldBuilder = createExoMachineBuilder<TExoMachineNode, unknown, string>(fieldSchema);
fieldBuilder.createInitialState((c) => nextExoId(c));
fieldBuilder.wire((c) => {
    c.attr(FieldPorts.labelFor, c.state);
    c.attr(FieldPorts.inputId, c.state);
});
export const Field = fieldBuilder.done();
```

`nextExoId(c)` hands out `'app-0'`, `'app-1'`, … once the root's
`createInitialState` has called `provideExoIds(c, 'app')`, on the server and in
the browser.

```ts no-check
function provideExoIds(c: { provide(...) }, prefix: string): TExoIdCounter;
function nextExoId(c: { inject(...) }): string; // `${prefix}-${n}`, n in base 36
```

**The counter lives in the render.** `provideExoIds` creates it, so every
render — every request on the server — starts at `0`. Call it in the root's
`createInitialState`, never at module level. With nothing provided above,
`nextExoId` throws [`EXO0104`](../errors.md#exo0104).

**Ids follow call order.** Exodra hydrates in one synchronous pass in document
order, so the server and the browser call `nextExoId` in the same order. The one
place they do not is an asynchronous boundary — a lazy page the browser builds
after the rest of the tree — and the router's outlet forks the count there: it
takes one id from the count above as its own prefix and starts its page at `0`,
so a page that arrives late takes the ids it would have taken at once, and what
follows the outlet does not move. Build your own asynchronous boundary the same
way: `provideExoIds(c, nextExoId(c))` before building what arrives later.

**Two roots on one page need two prefixes** — an island beside the page, a modal
rendered after hydration. The prefix is the only thing that keeps them apart.

A shifted id is not a broken page: hydration compares every attribute port with
what the server printed and writes the client's value where they differ, so both
ends of a `for`/`id` pair agree. What it costs is one write per port after the
point where the counts parted.

`EXO_ID_COUNTER` is the context token the counter is provided under, and
`TExoIdCounter` (`{ prefix, next }`) its type.

## Event handlers

An event port takes a **function**, and the third argument of
`on(port, handler, subject)` reaches it as the handler's **second parameter**:

```ts no-check
type TExoEventHandler<TEvent = unknown, TNode = unknown> = (
    this: TNode,
    event: TEvent,
    subject?: unknown
) => void;
```

Every backend calls it as `handler.call(node, event, subject)`, so `this` is the
node the port sits on. Two shapes fit that signature, and the difference between
them is what each one costs:

-   a **closure** — the general answer, one function per row, built knowing its
    row;
-   a **function that is told its row** — `(event, subject) => …`, a module-level
    constant holding nothing about any row, so **one function serves the whole
    template**. Which row a dispatch is about arrives as the subject. A handler
    declaring one parameter simply ignores it.

```ts
type TTodo = { readonly done: { setValue(next: boolean): void } };

/** ONE function for every row — the subject says which row fired. */
const REMOVE = (event: Event, subject?: unknown): void => {
    (subject as TTodo).done.setValue(true);
};
// in wire:  c.on(TodoPorts.click, REMOVE, todo);
```

A fill with no subject is allowed under the direct strategy and the handler
receives `undefined`. The **delegated** strategy refuses it: the subject is the
whole of what a shared handler is told about the position it fired on, so a fill
without one would be either a dead handler or a closure that carried its own row
— and a closure per row is the cost delegation exists to remove.

The handler type lives here rather than in `@exodra/dom` because a wiring
function that fills an event port is the same module on the server.

```ts
import { EXO_PORT_EVENT, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoEventHandler, TExoMachineNode } from '@exodra/core';

type TCell<T> = { getValue(): T; setValue(next: T): void };
type TTodo = { readonly title: string; readonly done: TCell<boolean> };

const toggleDone: TExoEventHandler = (_event, subject): void => {
    const cell = (subject as TTodo).done;
    cell.setValue(cell.getValue() === true ? false : true);
};

const TodoPorts = exoPorts({ click: EXO_PORT_EVENT, label: EXO_PORT_TEXT });

const todoSchema = createExoSchema(TodoPorts, (b) => {
    b.el('li', null, (li) => {
        li.el('button', { type: 'button' }, (btn) => {
            btn.eventPort(TodoPorts.click, 'click');
            btn.textPort(TodoPorts.label);
        });
    });
});
const todoBuilder = createExoMachineBuilder<TExoMachineNode, TTodo, TTodo>(todoSchema);
todoBuilder.createInitialState((_c, _index, todo) => todo);
todoBuilder.wire((c) => {
    c.text(TodoPorts.label, c.state.title);
    c.on(TodoPorts.click, toggleDone, c.state);
});
export const Todo = todoBuilder.done();
```

`toggleDone` is one function for every row of this template. The subject is what
makes that possible: the row hands its own datum to the fill, and the handler is
told which.

## Nodes

`TExoNode` is the value `c.build(machine, index, params)` hands back and the
only thing a `childList(port)` will insert — whatever the backend produced for
that position. It is nominal and opaque on purpose: what it
is made of is the backend's business (a DOM node on the client, a string on the
server), what it is to everyone else is an identity.

It lives in core for the same reason `TExoMachineInitialState` does — a wire that assembles
children is one function on all three backends. See
[the DOM renderer](./dom.md#children-as-values) for how a holder reaches the
element behind one.

## Machines

A component is a machine. `createExoMachineBuilder(schema)` hands you a
builder you declare against **once, at module load**, so a handler is one
function object for the whole component instead of one per row, and per-instance
state is a numbered slot rather than a captured variable.

```typescript
import { EXO_PORT_EVENT, EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

const CounterButtonPorts = exoPorts({ label: EXO_PORT_TEXT, click: EXO_PORT_EVENT });

const counterButtonSchema = createExoSchema(CounterButtonPorts, (b) => {
    b.el('button', { class: 'counter' }, (button) => {
        button.textPort(CounterButtonPorts.label);
        button.eventPort(CounterButtonPorts.click, 'click');
    });
});

const counterButtonBuilder = createExoMachineBuilder<TExoDomNode>(counterButtonSchema);

const COUNT = counterButtonBuilder.createInitialState(() => ({ n: 0 }));

counterButtonBuilder.on(CounterButtonPorts.click, (c) => {
    const state = c.readState(COUNT);
    state.n += 1;
    c.text(CounterButtonPorts.label, `${state.n}`);
});

export const CounterButton = counterButtonBuilder.done();
```

`COUNT` is a slot, numbered where it is declared and seeded once per instance —
never shared between two. The handler is one function object for the whole
component; the instance arrives as its argument.

| Method              | What it declares                                                                                                                                                                                                                                                   | Hands back                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| `createInitialState(make)` | A numbered slot, seeded by `make(instance, index, params)` once per instance, taking its row in declaration order. `make` must be a **function**: a value handed here would be one object shared by every instance, each seeing every other's writes, so the builder refuses one. | `TExoMachineStateHandle<TValue>` |
| `effect(start)`     | An effect. `start(instance)` returns its own stop function or `null`, and the instance re-runs one through `restartEffect(handle)`.                                                                                                                                | `TExoMachineEffect<TWiring>`     |
| `on(port, handler)` | A listener on an event port. You write `handler(instance, event)`; the builder transposes it once per component into the `(event, subject)` shape a dispatcher calls, so nothing is allocated per row.                                                             | nothing                          |
| `done()`            | Compiles and seals the machine.                                                                                                                                                                                                                                    | `TExoMachine<TWiring>`  |

`done()` may be called once and nothing may be declared after it. Both are
refusals carrying a named message rather than a silent no-op.

The object a seeder, a handler and an effect all receive is the **exonode** —
one per instance. `kept`, `onTeardown`, `inject`, `restartEffect` and `stopEffects` are
`EXO_BASE_NODE_VOCABULARY`'s bodies, merged onto every node; `set` and `on` are the
backend's.

A component that declares no slot gets `EXO_NO_STATE`, the shared empty table,
and no branch — so the machine form costs a component that keeps nothing
nothing.

A machine takes **no props and no seed**. Its declared start is
`builder.createInitialState(make)`, which runs once per instance while the instance is
being armed and is the only thing that writes `state`; `c.readState(handle)`
reads it back.

Anything that belongs to ONE instance arrives instead as a **transition
argument**. `c.build(component)` arms the machine and hands back the exonode
with no element in the document, which is the moment a caller fires an init
transition at it before placing it — and an init transition is, in substance,
what `builder.wire((c, params) => …)` declares once for the whole machine: a transition that writes
ports only and may run again with new `params`.

## Placement primitives — not here

`reconcileExoOrder`, `createExoKeyedList` and `TExoPlacedChildren` are
**`@exodra/list-reconcile`**, and this package exports none of them.

They move nodes: `parent.insertBefore(node, after)`, `parent.removeChild(out)`.
A base that the server renderer and `@exodra/term` both build on cannot be made
of calls that only a browser can answer — `Node` and `Element` do not exist
there — so the passes are a package of their own, which `@exodra/dom` declares
as a peer and nothing else links. Their interfaces, what the three uncalled ones
are for, and the withdrawn move counts are in
[`packages/list-reconcile/README.md`](https://github.com/abaikov/exodra/blob/master/packages/list-reconcile/README.md).

## The declarative machine — not here

`withExoComputedMachine`, `exoTransition`, `exoWiring`, `ExoWiringBlock`,
`EXO_HOLD_VOCABULARY`, `EXO_MOUNTED`, `exoMachineField`, `exoComputed`, `exoBody`,
`exoFieldBit`, `compileExoMachine`, `commitExoMachine`, `runExoMachineSlots`,
`fillExoMachineDerivations`, `chainExoMachineWakes`, `exoMachineSettle`,
`exoBoundTransition`, `bindExoMachineReads`, `EXO_MACHINE_LIMIT` and the
seventeen types that spell them are **`@exodra/computed`**, and this package
exports none of them.

What stays here is the **imperative** builder of
[the section above](#machines): `createExoMachineBuilder`,
`armExoNode`, `stopExoEffects`, `disconnectExoNode`,
`connectExoNode` (effects off and on again on a kept instance — see
`packages/core/README.md`), and `TExoMachineBuilder`,
`TExoMachine`, `TExoMachineEffect`, `TExoFillDoors`,
`TExoMachineStateHandle`, `TExoMachineNode`, `TExoMachineHandler`,
`TExoMachineInitialState`, `TExoTransitionOverrides` and `TExoWire`. A handler on one of those reads a slot
and writes a port; nothing is derived, so there is no field, no pending word
and no commit walk.

The split is the price, made choosable. Saying `builder.derive(port, [field], by)`
instead of writing the port yourself buys the inversion table, the chain of
wakes and the commit — and a page that derives nothing must not pay for them.
`npm run check:computed-shake` is the gate that keeps that true, module by
module rather than by byte count.

The direction is one way and enforced: `@exodra/computed` names four types
from the list above, nothing here names anything of its, and the
`computed-names-only-core` rule in `.dependency-cruiser.cjs` fails the build if
that reverses. `TExoMachineStateHandle` and `TExoMachineEffect` in particular could
not follow — `kept()` and `restartEffect()` are methods on **every** node, merged
by `EXO_BASE_NODE_VOCABULARY`.

## Escaping and the shared tables

The escapers are an agreement **between** the backends: the markup the server
prints and the markup the DOM compiler parses its prototype from must be the
same bytes, so a copy made "for the DOM side" is not a duplicate helper — it is
the end of hydration.

| Export                           | Purpose                                                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `escapeExoText(value)`           | Escape a string for a text position.                                                                                                                                                                               |
| `escapeExoAttributeValue(value)` | Escape a string for inside a quoted attribute value — including `<` and `>`, which nothing but the quote could actually end a value with, but which a browser writes escaped and hydration therefore has to match. |
| `EXO_VOID_ELEMENTS`              | The `Set` of tags with no end tag.                                                                                                                                                                                 |
| `EXO_DOM_PROPERTIES`             | Which names are DOM properties rather than attributes.                                                                                                                                                             |
| `EXO_DOM_STRING_PROPERTIES`      | The DOM properties whose value is a string the browser keeps as live state (`value`).                                                                                                                             |
| `EXO_RAW_TEXT_ELEMENTS`          | The tags the HTML serialiser emits as raw text (`<script>`, `<style>`, `<noscript>` and five more), verbatim on both sides.                                                                                      |

## The shape rules the two compilers share

Both backends compile the same schema, so a shape one of them cannot build is
refused **where the schema is written** rather than on whichever side happened to
notice. These live here so the wording and the rule are one thing:

| Export                                     | Refuses                                                                                                                                                                                                                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `assertExoChildrenPort(port, method, who)` | a nested instance placed anywhere but a children port.                                                                                                                                                                                                                                  |
| `assertExoNoTextAfterChildrenPort(…)`      | static text **after** a children port. The region anchors on the next static element, so its rows would land after that text in the browser and before it on the server.                                                                                                                |
| `assertExoIntactRawTextBoundary(…)`        | a static inside `<script>` / `<style>` (see `EXO_RAW_TEXT_ELEMENTS`) that carries the element's own closing sequence. Text in there is emitted verbatim by both compilers, so escaping it produced the same broken bytes on both sides — which is exactly why no parity test caught it. |

`exoDomPropertyKind(tag, name)` answers, of an _element_, the question
`EXO_DOM_PROPERTIES` answers of a name alone: `value` is live state on an `<input>`,
a plain reflected attribute on an `<option>`, and nothing at all on a `<div>`.
The browser could always ask the element and the server could not, so the server
used to apply the `<input>` rule everywhere and the two printed different
controls. Both compilers read this now.

## Plugins

A **plugin** is a bag of **method factories**, and that is the whole of it. Each
entry receives whatever stands under that name right now — `next` — and returns
what will stand there instead.

```ts no-check
export type TExoPlugin = {
    readonly [name: string]: (next: never) => unknown;
};
```

| Export                              | Purpose                                                                                                                                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `composeExoPlugins(base, ...plugins)` | Write every plugin's names onto `base`, left to right, once. Returns `base` typed as itself intersected with everything the plugins added. A backend calls it in its own constructor, so an application never calls it directly. |
| `TExoPlugin`                        | The shape above — what an author annotates a pack with.                                                                                                                                                                          |
| `TExoPluginMethods<TPack>`          | What one pack contributes, read off its factories' return types.                                                                                                                                                                 |
| `TExoMergedPluginMethods<TPacks>`                | Everything a list of packs adds, intersected in order — the whole of the capability check.                                                                                                                                       |

There is **no** namespace, no slot registry, no `needs` / `provides` and no
resolution pass. Four properties are worth stating because they are structural
rather than requested:

-   **Replacing and wrapping are one act.** A plugin that never calls `next` has
    replaced; one that calls it has wrapped. That is what `super` gave a prototype
    chain, and it is the only reason this is not `Object.assign`.
-   **Order is the caller's**, left to right, so the last plugin to claim a name is
    the outermost wrapper. Two plugins that both replace one name without calling
    `next` leave only the second, with nothing thrown.
-   **The capability check is the type of the composed object.** Nobody declares a
    capability set: `TExoMergedPluginMethods` computes it from the constructor arguments, so a
    wire that touches `c.keyedList` infers a connector that has it, and handing that
    component to a backend composed without that plugin fails to compile — at the line
    that composed it, rather than as a call landing on `undefined` inside a render.
-   **A plugin cannot resolve on a hot path**, because it is never on one. A factory
    runs **once**, at merge, before the first render; it is handed no connector, no
    plan and no child, so there is nothing per-row it could reach for. At call time
    a merged name is an own property on one flat object — no chain is walked and no
    map is consulted.

Two rules a pack must obey, both silent if broken: the returned function must not
be an **arrow** (an arrow has no `this`, so it can reach neither the connector it
was called on nor `next.call(this, …)`), and a method must reach its siblings
through `this` rather than through a captured connector (a connector is pooled —
one object serves every instance of its plan in turn).

The replaceable pieces themselves are a backend's, not core's. See
[`@exodra/dom`](./dom.md#composing-plugins) for its replaceable fields —
`events`, `writers`, `createInstance` and `createChild` — and for the packs that ship —
`withExoCompiler`, `withExoHydration`, `withExoPropertyWriters`,
`withExoReclaimingText` and the `withExoDefaults` bundle; the keyed list is
`EXO_KEYED_LIST_VOCABULARY`, in `@exodra/list-reconcile`.
`new ExoDomBackend()` — which takes **no** arguments at all — is a complete working
composition; customisation is wrapping it in a decorator, or merging one plugin
that claims one name.
