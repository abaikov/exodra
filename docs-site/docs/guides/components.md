---
sidebar_position: 2
title: Components Guide
---

# Components in Exodra

A component is **one value carrying two halves**:

| Half | When it runs | What it is |
| --- | --- | --- |
| the **schema** | once, when the module loads | the constant shape — static markup, plus the **ports** where values may later be put |
| the **wiring function** | once per instance | the code that puts values in those ports, through a **connector** |

That split is the whole design. Everything expensive — deciding what the markup
is, which attribute lives where, how deep a node sits — happens once per
component for the life of the process. What a render repeats is: clone the
prepared element, then one indirect call per port.

There is no per-render tree, no props object to diff, and no walk at render
time. A port is named by **identity**, so a wiring function cannot count wrong
and does not look anything up.

## The smallest component

```ts
import {
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

/** ONE backend for the application, at module level — it is the schema cache key.
 *  `render` arrives with the compiler: a bare backend has no way to turn a
 *  declaration into a schema, and says so at the type level. */
const backend = withExoCompiler(new ExoDomBackend());

const GreetingPorts = exoPorts({ name: EXO_PORT_TEXT });

// ── the schema: runs once, at module load ────────────────────────────
const greetingSchema = createExoSchema(GreetingPorts, (b) => {
    b.el('p', { class: 'greeting' }, (p) => {
        p.text('Hello, ');
        p.el('strong', null, (strong) => {
            strong.textPort(GreetingPorts.name);
        });
    });
});

// ── the machine: its wire writes the ports of each instance ─────────
const greetingMachine = composeExoMachine(
    createExoMachine<TExoMachineNode>(greetingSchema),
    (m) =>
        withExoWire(m, (c) => {
            c.text(GreetingPorts.name, 'world');
        })
);

backend.render(greetingMachine, document.body);
```

`backend.render` mounts **one** instance, handed the params it is given.
There is no instance count, because a lone root has nothing else to be about and
no library asks an application how many copies of its root to make. Rows that
vary are a **list** — a children port filled by `c.list` (fixed) or by
`reconcileExoOrder` over `c.childList` (live). That is also what a rival framework's
participant is doing when a benchmark says "render 1000 rows": the count belongs
to the list, never to the mount.

**There are no props, anywhere.** The initial state's second argument is the
instance's **params**, and that is the whole of what a view is told about itself. A row
is handed its own datum as its params by whoever builds it — the build callback that
constructs the row is the place that knows the item, so it passes it to `c.build`.
Params are read once, when the instance is armed, and again only when `wireExoNode`
re-runs the wire. Props would have to be *serviced*: stored per instance, compared on
every update, and turned into a decision about which transitions to re-run. Params
cost one argument.

A machine is put together in two moves. `createExoMachine(schema, options?)` makes
the **base machine**: the schema, plus the `createInitialState` option when the
instance keeps state. Each **decorator** then adds one part and returns a new
machine, leaving its input untouched — `withExoWire` the wire, `withExoHandlers`
the event handlers, `withExoEffects` the effects, `withExoTransitions` the named
transitions callable from outside, read back as `machine.transitions`.
`composeExoMachine(base, …steps)` passes the base
through the steps in order, so a machine reads top to bottom: what it keeps, what
it can be told, what it writes, what it listens to, what it follows. A machine has
one wire; `withExoWire` on a machine that already has one throws (`EXO0101`).

Read `createExoMachine<TWiring>` by its type argument — written out, or
inferred from the exonode annotation of the `createInitialState` option when the
base machine is handed one. **`TWiring`** is what
every wire, handler, effect and transition may assume about the exonode it is handed: `TExoMachineNode` from
`@exodra/core` is the surface all backends share — `attr`, `text`, `on`,
`provide`, `inject` — so a component naming it is served, client-rendered and
hydrated as one value. A machine that also nests components takes
`TExoChildrenWiring & TExoMachineNode`, which adds `one`, `list` and `build`. Naming
one backend's exonode instead — `createExoMachine<TExoDomNode>` — types the
component against the browser alone, because a machine's exonode parameter is
contravariant. What the initial state **returns** is what the instance keeps: the
value lands in `enode.state`, typed as the return type in every wire, handler, effect and
transition. A machine that only fills ports returns nothing. A plain function that
works on the exonode takes `TExoMachineNodeOf<typeof base>`: the base machine's
exonode type with its `state`, which is why such a machine keeps its base in a
constant of its own (`timerBase` below).

Two details are worth reading twice:

- **The ports are a value before the schema is, and the schema before the machine.**
  `exoPorts` declares the component's port interface, `createExoSchema` places each
  port in the markup once, at module load, and `createExoMachine` is handed
  the result, so the ports are named once as `GreetingPorts` (the same object as
  `greetingSchema.ports`) rather than passed to every instance. It also makes the
  order structural: a wire cannot be written before the ports it fills exist.
- **`p.text('Hello, ')` is folded into the prepared markup.** It costs nothing
  per instance. `strong.textPort(GreetingPorts.name)` is a *place*, and costs one call. A text
  port stands for an element's **whole** content, so it gets an element of its
  own rather than sitting beside static text.

## Static is not a bucket, it is an argument

Anything passed to `el()` is known now and is baked into the markup:

```ts
import { createExoStatic } from '@exodra/core';

export const EmptyState = createExoStatic((b) => {
    b.el('div', { class: 'empty', role: 'status' }, (div) => {
        div.el('span', { class: 'empty__icon', 'aria-hidden': 'true' }, (icon) => {
            icon.text('∅');
        });
        div.text('Nothing here yet');
    });
});
```

`createExoStatic` is for a component with **nothing to fill** — an icon, a separator,
a conditional block's body, an empty state. It refuses a builder that declares
ports, because a component with ports and no wiring is an attribute stuck empty:
a silent wrong page rather than an error.

An attribute whose value **varies** is not an attribute here. It is a port.

## The schema builder

| Call | Declares |
| --- | --- |
| `el(tag, attrs?, fn?)` | a child element with its static attributes, and optionally a body |
| `text(value)` | static text |
| `attrPort(Ports.x, name)` | places an `EXO_PORT_ATTR` port on one **attribute** |
| `eventPort(Ports.x, name)` | places an `EXO_PORT_EVENT` port on one **listener** |
| `textPort(Ports.x)` | places an `EXO_PORT_TEXT` port on the **whole text content** of the current element |
| `childrenPort(Ports.x)` | places an `EXO_PORT_CHILDREN` port: a **variable-length sequence of children** |

Each port is first declared in the component's port interface,
`exoPorts({ x: EXO_PORT_ATTR, … })`, and `createExoSchema(Ports, build)` places it.

A children port **is a child**: it is appended where the call appears, so a
conditional block between a heading and a footer is the ordinary case, not an
awkward one.

## The wiring function

```ts no-check
(connector, params) => state
```

- `params` is the **only** thing this instance is told. A row of `c.list` gets its
  element of the array the list was handed, `c.build(component, params)` and
  `c.one(port, component, params)` pass whatever the caller hands them, and
  `backend.render(component, parent, params)` passes its third argument.
- It is what the instance was handed **at build time and nothing more**. When rows
  move, the reconciler moves nodes — it does not re-run wiring — so a component that
  needs a live position must be handed it by a transition, not capture it here.

What the connector offers:

| Call | Meaning |
| --- | --- |
| `c.attr(port, value)` | write an attribute, once |
| `c.text(port, value)` | write an element's whole text, once |
| `c.unsafeHtml(port, markup)` | write raw markup into a children port |
| `c.on(port, handler, subject?)` | a listener |
| `c.one(port, component, params?)` | one nested instance |
| `c.list(port, component, rows)` | a fixed run, one instance per element of `rows`, each handed its element as params |
| `c.build(component, params?)` | a child as a value, placed nowhere |
| `c.childList(port)` | the port's live children, for a reconciler to drive |
| `c.onTeardown(off)` | hand the instance a disposer to run when it goes |
| `c.provide(token, value)` / `c.inject(token)` | contexts |

**Nothing in that table watches a source, and that is the design.** A machine
writes "state → ports" in its wire, its handlers and its effects, and in a
**transition** — `withExoTransitions(m, { show: (c) => … })`, called through
`toggleMachine.transitions.show` — when that one place must also be fired or
overridden from outside the machine. Following data that lives outside
the instance is an **effect** that writes the ports once, then subscribes, and
returns the unsubscribe. Keeping a child list in step is a call to
`reconcileExoOrder` from `@exodra/list-reconcile` over `c.childList(port)`. A door
would have made every page link subscription machinery it may never use, and
would have let the backend decide what counts as a source. As plain calls inside
the wire, the handlers and the effects, the application composes them — or does not, and pays
nothing.

The **same wiring function** runs on the server, on a client render and through
hydration. Write it against the methods it actually uses and all three backends
accept it with no cast.

## State and transitions

State that belongs to one instance is **machine state**: the `createInitialState`
option of the base machine returns it once per instance, a handler changes it, and a transition writes it to
the ports.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoTransitions,
    withExoWire,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const TogglePorts = exoPorts({ rootClass: EXO_PORT_ATTR, click: EXO_PORT_EVENT, text: EXO_PORT_TEXT });

const toggleSchema = createExoSchema(TogglePorts, (b) => {
    b.el('div', null, (div) => {
        div.attrPort(TogglePorts.rootClass, 'class');
        div.el('button', { type: 'button' }, (btn) => {
            btn.eventPort(TogglePorts.click, 'click');
            btn.textPort(TogglePorts.text);
        });
    });
});

const toggleMachine = composeExoMachine(
    createExoMachine(toggleSchema, {
        createInitialState: (_c: TExoDomNode, _params: unknown) => ({ on: false }),
    }),
    (m) =>
        withExoTransitions(m, {
            show: (c) => {
                c.attr(TogglePorts.rootClass, c.state.on ? 'toggle toggle--active' : 'toggle');
                c.text(TogglePorts.text, c.state.on ? 'ON' : 'OFF');
            },
        }),
    (m) =>
        {
        const { show } = m.transitions;
        return withExoWire(m, (c) => {
            show(c);
        });
    },
    (m) =>
        {
        const { show } = m.transitions;
        return withExoHandlers(m, (on) => {
            on(TogglePorts.click, (c) => {
                c.state.on = !c.state.on;
                show(c);
            });
        });
    }
);

backend.render(toggleMachine, document.body);
```

A derived value is computed **in the transition** — the label and the class above
are both read off one boolean at the moment they are written. `show` is taken off
`toggleMachine.transitions` after the machine is composed; the wire and the handler
only call it once an instance runs, by which time it exists.

:::caution The one rule that has no exception
A connector is **reused**: one of them serves every row of a list. A callback
that read the connector's fields would follow it onto the next row and update
the wrong element — a bug with no assertion failure and no wrong-looking line,
just a table where every row shows the last row's data. A transition is handed
the exonode it runs on, and an effect's subscriber closes over the `c` that effect
was started for, which is that instance's own. If you write a subscription by
hand anywhere else, capture the node, never the connector.
:::

## Composition

Components nest through a **children port**. `one` puts a single instance in it.
It takes the port, the component and optional params — here there are none: the
child is not handed data, it goes and reads it.

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';

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

type TUser = { readonly name: string; readonly role: string };

const user = createStore<TUser>({ name: 'Ada', role: 'author' });

const AvatarPorts = exoPorts({ initials: EXO_PORT_TEXT });

const avatarSchema = createExoSchema(AvatarPorts, (b) => {
    b.el('span', { class: 'avatar' }, (span) => {
        span.textPort(AvatarPorts.initials);
    });
});
const avatarMachine = composeExoMachine(createExoMachine<TExoDomNode>(avatarSchema), (m) =>
    withExoEffects(m, (effect) => {
        effect((c) => {
            const showInitial = () => {
                c.text(AvatarPorts.initials, user.getValue().name.slice(0, 1).toUpperCase());
            };
            showInitial();
            return user.onChange(showInitial);
        });
    })
);

const UserCardPorts = exoPorts({ slot: EXO_PORT_CHILDREN, name: EXO_PORT_TEXT, role: EXO_PORT_TEXT });

const userCardSchema = createExoSchema(UserCardPorts, (b) => {
    b.el('div', { class: 'user' }, (div) => {
        // The children port sits between two static siblings — and renders there.
        div.el('div', { class: 'user__avatar' }, (holder) => {
            holder.childrenPort(UserCardPorts.slot);
        });
        div.el('strong', null, (strong) => {
            strong.textPort(UserCardPorts.name);
        });
        div.el('em', null, (em) => {
            em.textPort(UserCardPorts.role);
        });
    });
});
const userCardMachine = composeExoMachine(
    createExoMachine(userCardSchema, {
        createInitialState: (c: TExoDomNode, _params: unknown) => {
            c.one(UserCardPorts.slot, avatarMachine);
        },
    }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const showUser = () => {
                    const { name, role } = user.getValue();
                    c.text(UserCardPorts.name, name);
                    c.text(UserCardPorts.role, role);
                };
                showUser();
                return user.onChange(showUser);
            });
        })
);
```

The effect draws **first** and subscribes second, synchronously: hydration adopts
the server's markup only while the instance is being armed, which is when effects
start. What it returns is its stop, run when the instance leaves.

`avatarMachine` names the source it reads. That is the trade the no-props design makes
and it is worth stating plainly: a component is **not** a function of arguments
you can call with anything — it is wired to where its data lives. Reuse comes
from the data layer, not from the parameter list: the same component over a
different user is a different source, and the same component over a thousand
rows is handed **each row's item as its params**, which is what the build callback
of a reconciled list passes to `c.build`. See
[Rendering](./rendering.md#where-children-come-from).

`backend.render` is for the top of a page, where there is no row to be about — so the root
component is the one that goes and *gets* the data, which is what every
component here does.

Note what is **not** here: no props object, no bucket, no `children` key, and
no diffing of any of them.

### "Slots"

A slot is a children port. A component with two of them takes two nested
instances; which component goes in each is decided by the wiring function that
fills them, so a layout is written once and reused by naming different
components at the call site.

## Lists

`reconcileExoOrder` from `@exodra/list-reconcile` reconciles a children port
against an array, **by object identity**, from inside the machine: it is handed
the port's child list, the order shown, and the order wanted, and returns the new
order shown, which the machine keeps in its state. A row that survives is the same
element it was; a row that leaves is disposed. No keys are involved on this path —
and where identity is not available, `c.keyedList` (the `EXO_KEYED_LIST_VOCABULARY`
pack) supplies one. See
[Keys, when identity is not available](./lists.md#keys-when-identity-is-not-available).

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
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

type TItem = { readonly id: string; readonly label: string };

const RowPorts = exoPorts({ id: EXO_PORT_ATTR, label: EXO_PORT_TEXT });

const rowSchema = createExoSchema(RowPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(RowPorts.id, 'data-id');
        li.textPort(RowPorts.label);
    });
});
const rowMachine = composeExoMachine(
    createExoMachine(rowSchema, {
        createInitialState: (_c: TExoDomNode, item: TItem) => item,
    }),
    (m) =>
        withExoWire(m, (c) => {
            const item = c.state;
            c.attr(RowPorts.id, item.id);
            c.text(RowPorts.label, item.label);
        })
);

const items = createStore<readonly TItem[]>([
    { id: 'a', label: 'First' },
    { id: 'b', label: 'Second' },
]);

const ListPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const listSchema = createExoSchema(ListPorts, (b) => {
    b.el('ul', { class: 'list' }, (ul) => {
        ul.childrenPort(ListPorts.rows);
    });
});
type TListState = { rows: TExoChildList; shown: TItem[] };
const listMachine = composeExoMachine(
    createExoMachine(listSchema, {
        createInitialState: (c: TExoDomNode, _params: unknown): TListState => ({
            rows: c.childList(ListPorts.rows),
            shown: [],
        }),
    }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const showRows = () => {
                    const want = items.getValue();
                    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (item) =>
                        c.build(rowMachine, item)
                    );
                };
                showRows();
                return items.onChange(showRows);
            });
        })
);

backend.render(listMachine, document.body);

items.setValue([...items.getValue(), { id: 'c', label: 'Third' }]);
```

The child list is opened in `createInitialState`, which runs once per instance; a
wire can run again, and opening a children port there is refused.

When the contents cannot change, use `c.list(port, component, rows)` instead: a
fixed list pays for no row records, no diff and no teardown.

For a filtered view, compute the subset before the call and hand that as
`want`: rows are matched by the item objects, so a row the filter keeps is the
same element it was. See the [Lists guide](./lists.md).

## Side effects and cleanup

An effect owns what it starts: the function it returns is its stop, run when the
instance leaves, and `backend.render` hands back a disposer that ends everything
at once. Anything started outside an effect is registered with `c.onTeardown`,
against the child the exonode is currently wiring:

```ts
import {
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const TimerPorts = exoPorts({ text: EXO_PORT_TEXT });

const timerSchema = createExoSchema(TimerPorts, (b) => {
    b.el('div', { class: 'timer' }, (div) => {
        div.textPort(TimerPorts.text);
    });
});
const timerBase = createExoMachine(timerSchema, {
    createInitialState: (_c: TExoDomNode, _params: unknown) => ({ seconds: 0 }),
});
function show(c: TExoMachineNodeOf<typeof timerBase>): void {
    c.text(TimerPorts.text, `Time: ${c.state.seconds}s`);
}
const timerMachine = composeExoMachine(
    timerBase,
    (m) =>
        withExoWire(m, (c) => {
            show(c);
        }),
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                const id = setInterval(() => {
                    c.state.seconds++;
                    show(c);
                }, 1000);
                return () => clearInterval(id);
            });
        })
);

const dispose = backend.render(timerMachine, document.body);

// Stops the interval along with every other effect this render started.
dispose();
```

A subscription with nothing to end it is **refused**, rather than quietly
outliving the page that made it.

**`onTeardown` is on every backend, including the server's** — what differs is
*when* it runs. In the browser it runs when the instance leaves. On the server
it runs at the end of the render, in registration order, after the markup has
already been taken: a disposer that writes to a port cannot change the bytes
that were printed
(`packages/string/src/node/tests/render-exo-instance.test.ts:105-129`). That is
what makes a disposer safe to register on three backends — whatever it stops is
started and ended in both places, and only the browser keeps it running between
the two.

## Contexts

A context token is an identity, not a string, so two packages cannot collide on
a name. `provide` and `inject` are methods on the connector — there is nothing
to import to use them, because a context exists only while a wiring is running.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoWire,
} from '@exodra/core';
import type { TExoChildrenWiring, TExoMachineNode } from '@exodra/core';
import { exoContextToken } from '@exodra/context';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const THEME = exoContextToken<string>('theme');

const LabelPorts = exoPorts({ cls: EXO_PORT_ATTR });

const labelSchema = createExoSchema(LabelPorts, (b) => {
    b.el('span', null, (span) => {
        span.attrPort(LabelPorts.cls, 'class');
    });
});
const labelMachine = composeExoMachine(createExoMachine<TExoMachineNode>(labelSchema), (m) =>
    withExoWire(m, (c) => {
        // `undefined` when nobody provided it — not a throw.
        c.attr(LabelPorts.cls, 'label label--' + (c.inject(THEME) ?? 'light'));
    })
);

const ShellPorts = exoPorts({ slot: EXO_PORT_CHILDREN });

const shellSchema = createExoSchema(ShellPorts, (b) => {
    b.el('div', { class: 'shell' }, (div) => {
        div.childrenPort(ShellPorts.slot);
    });
});
const shellMachine = createExoMachine(shellSchema, {
    createInitialState: (c: TExoChildrenWiring & TExoMachineNode, _params: unknown) => {
        c.provide(THEME, 'dark');
        c.one(ShellPorts.slot, labelMachine);
    },
});

backend.render(shellMachine, document.body);
```

The chain `provide` returns travels downwards as an ordinary **value**: it goes on
the exonode, and every `one`, `list` and `build` wired after it
inherits it. A reconciled list captures the chain when it is wired and holds it for its whole
life, so a row added an hour later — from inside a subscriber, with no render on
the stack — resolves what the page provided without touching the DOM at all.

**A context does not travel through the document.** A second, independent
`render()` into an element that some other render provided into starts from
nothing: it reads `undefined`, not the surrounding page's value. There used to be
a second channel — `provide` marked the instance's root element and each entry
point climbed `parentNode` from the parent it was handed — and it was removed. A
host that wants a separately-mounted widget to see a value **hands it over**: by
putting it where the widget's root component reads it, or by rendering the widget
inside the same render that provided.

The reasoning: it was a whole per-provider storage scheme on
the element, paid by every page, for a case where the host already owns the mount
call and can pass the value at it. What the DOM bought over passing it was the
absence of an **interface**; what it cost was a channel that depended on mount
order and document position.

`inject` walks a **frame chain, never the DOM**: 1.67 ns at one link, 7.67 ns at
eight (`context-cost` axis, `b4` label).

Providing a token something above already provided **shadows** it for that
subtree and nothing else.

:::caution Contexts are not reactive by themselves
What you provide is what a consumer holds forever. Put a *source* in the context
and follow it with an effect: read `c.inject(THEME)`, write the ports, and
return `theme.onChange(() => show(c))`. A context that tried to be
reactive itself would be a second, weaker subscription mechanism on top of the
one that already works.
:::

## Writing the schema in JSX

[Exodra JSX](./jsx.md) is another way to write the schema half:
`exoJsx<TPorts>(($) => <markup/>)` declares markup and named ports —
`data-id={$.id}`, `{$.title}`, `onClick={$.toggle}`, `<$.rows />` — and
`@exodra/babel-plugin-schema` compiles it into the module-level schema this page
builds by hand. The machine is the same machine, written as on this page and
filling the ports through `XPorts = xSchema.ports`. Nothing on this page depends on JSX — a
hand-written schema needs no build step at all.

## Performance notes

- **Declare in `el()`, not in a port.** A port costs a slot and a call per
  instance; a static attribute costs nothing.
- **A bare `c.attr` in the wire when it cannot change, an effect when it can.**
  The bare write is two array loads and a call, with nothing retained.
- **`c.list` for a fixed list, `reconcileExoOrder` over `c.childList` for a live one.** A list whose
  contents cannot change should not pay for the possibility that they might.
- **Use a shared handler for a repeated handler.** A module-level function taking
  `(event, subject)` is one function object for the whole template; a closure is
  one per row — and the subject is what the
  [delegated event pack](../api/dom.md#events-as-a-plugin) needs a fill to carry.
- **Let effects own their subscriptions.** An effect returns its stop; registering
  teardown by hand is only for what you start outside one.
