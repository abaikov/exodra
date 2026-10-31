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
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

/** ONE backend for the application, at module level — it is the schema cache key.
 *  `render` arrives with the compiler: a bare backend has no way to turn a
 *  declaration into a schema, and says so at the type level. */
const backend = withExoCompiler(new ExoDomBackend());

// ── the schema: runs once, at module load ────────────────────────────
const GREETING_SCHEMA = createExoSchema((b) => {
    let name!: TExoTextPort;
    b.el('p', { class: 'greeting' }, (p) => {
        p.text('Hello, ');
        p.el('strong', null, (strong) => {
            name = strong.textPort();
        });
    });
    // Whatever this returns IS the component's API.
    return { name };
});

// ── the machine: its wire writes the ports of each instance ─────────
const mGreeting = createExoMachineBuilder<TExoMachineNode>(GREETING_SCHEMA);
mGreeting.wire((c) => {
    c.text(GREETING_SCHEMA.ports.name, 'world');
});
const GREETING = mGreeting.done();

backend.render(GREETING, document.body);
```

`backend.render` mounts **one** instance and hands it `0` as its **index**.
There is no instance count, because a lone root has nothing else to be about and
no library asks an application how many copies of its root to make. Rows that
vary are a **list** — a children port filled by `c.list` (fixed) or by a
transition calling `reconcileExoOrder` over `c.childList` (live). That is also what a rival framework's
participant is doing when a benchmark says "render 1000 rows": the count belongs
to the list, never to the mount.

**There are no props, anywhere.** The initial state's second argument is the
instance's **index**, and that is the whole of what a view is told about itself. A row
reads its own datum by that index, from wherever the caller put it — the build
callback that constructs the row is the place that knows both, so it writes the
datum down and then builds. Props would have to be *serviced*: stored per
instance, compared on every update, and turned into a decision about which
transitions to re-run. An index costs a number.

Read `createExoMachineBuilder<TWiring>` by its type argument. **`TWiring`** is what
every transition may assume about the exonode it is handed: `TExoMachineNode` from
`@exodra/core` is the surface all backends share — `attr`, `text`, `on`,
`provide`, `inject` — so a component naming it is served, client-rendered and
hydrated as one value. A machine that also nests components takes
`TExoChildrenWiring & TExoMachineNode`, which adds `one`, `list` and `build`. Naming
one backend's exonode instead — `createExoMachineBuilder<TExoDomNode>` — types the
component against the browser alone, because a machine's exonode parameter is
contravariant. What the initial state **returns** is what the instance keeps: the
value lands in `enode.state` and is read back with `readState()`. A machine that
only fills ports returns nothing.

Two details are worth reading twice:

- **The schema is a value before the machine is.** `createExoSchema` runs the
  builder once, at module load, and `createExoMachineBuilder` is handed the result,
  so the ports are named once as `GREETING_SCHEMA.ports` rather than passed to
  every instance. It also makes the order structural: a transition cannot be
  written before the ports it fills exist.
- **`p.text('Hello, ')` is folded into the prepared markup.** It costs nothing
  per instance. `strong.textPort()` is a *place*, and costs one call. A text
  port stands for an element's **whole** content, so it gets an element of its
  own rather than sitting beside static text.

## Static is not a bucket, it is an argument

Anything passed to `el()` is known now and is baked into the markup:

```ts
import { createExoStatic } from '@exodra/core';

export const EMPTY_STATE = createExoStatic((b) => {
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

## The builder

| Call | Declares |
| --- | --- |
| `el(tag, attrs?, fn?)` | a child element with its static attributes, and optionally a body |
| `text(value)` | static text |
| `port(name)` | a port for one **attribute** |
| `eventPort(name)` | a port for one **listener** |
| `textPort()` | a port for the **whole text content** of the current element |
| `childrenPort()` | a port for a **variable-length sequence of children** |

A children port **is a child**: it is appended where the call appears, so a
conditional block between a heading and a footer is the ordinary case, not an
awkward one.

## The wiring function

```ts no-check
(connector, index) => state
```

- `index` is the **only** thing this instance is told. A row of `c.list` gets its
  position in the run, `c.build(component, index)` passes whatever the caller
  hands it, and an instance placed by `one()` or mounted by `backend.render`
  gets `0`.
- It is the position **at build time and nothing more**. When rows move,
  the reconciler moves nodes — it does not re-run wiring — so a component that
  needs a live position must be handed it by a transition, not capture this.

What the connector offers:

| Call | Meaning |
| --- | --- |
| `c.attr(port, value)` | write an attribute, once |
| `c.text(port, value)` | write an element's whole text, once |
| `c.unsafeHtml(port, markup)` | write raw markup into a children port |
| `c.on(port, handler, subject?)` | a listener |
| `c.one(port, component)` | one nested instance |
| `c.list(port, component, count)` | a fixed run of `count` instances |
| `c.build(component, index?)` | a child as a value, placed nowhere |
| `c.childList(port)` | the port's live children, for a reconciler to drive |
| `c.onTeardown(off)` | hand the instance a disposer to run when it goes |
| `c.provide(token, value)` / `c.inject(token)` | contexts |

**Nothing in that table watches a source, and that is the design.** A machine
writes "state → ports" in **transitions** — `m.transition((c) => …)`, one place the
wire, the handlers and the effects all call. Following data that lives outside
the instance is an **effect** that runs the transition once, then subscribes, and
returns the unsubscribe. Keeping a child list in step is a transition that calls
`reconcileExoOrder` from `@exodra/list-reconcile` over `c.childList(port)`. A door
would have made every page link subscription machinery it may never use, and
would have let the backend decide what counts as a source. As plain calls inside
transitions and effects, the application composes them — or does not, and pays
nothing.

The **same wiring function** runs on the server, on a client render and through
hydration. Write it against the methods it actually uses and all three backends
accept it with no cast.

## State and transitions

State that belongs to one instance is **machine state**: `createInitialState`
returns it once per instance, a handler changes it, and a transition writes it to
the ports.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoTextPort, TExoEventPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const TOGGLE_SCHEMA = createExoSchema((b) => {
    let rootClass!: TExoAttrPort;
    let click!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', null, (div) => {
        rootClass = div.port('class');
        div.el('button', { type: 'button' }, (btn) => {
            click = btn.eventPort('click');
            text = btn.textPort();
        });
    });
    return { rootClass, click, text };
});
const P = TOGGLE_SCHEMA.ports;

const mToggle = createExoMachineBuilder<TExoDomNode, unknown, { on: boolean }>(TOGGLE_SCHEMA);
mToggle.createInitialState(() => ({ on: false }));
const show = mToggle.transition((c) => {
    c.attr(P.rootClass, c.state.on ? 'toggle toggle--active' : 'toggle');
    c.text(P.text, c.state.on ? 'ON' : 'OFF');
});
mToggle.wire((c) => {
    show(c);
});
mToggle.on(P.click, (c) => {
    c.state.on = !c.state.on;
    show(c);
});
const TOGGLE = mToggle.done();

backend.render(TOGGLE, document.body);
```

A derived value is computed **in the transition** — the label and the class above
are both read off one boolean at the moment they are written.

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
It takes the port and the component, and nothing else — the child is not handed
data, it goes and reads it.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
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

const AVATAR_SCHEMA = createExoSchema((b) => {
    let initials!: TExoTextPort;
    b.el('span', { class: 'avatar' }, (span) => {
        initials = span.textPort();
    });
    return { initials };
});
const mAvatar = createExoMachineBuilder<TExoDomNode>(AVATAR_SCHEMA);
const showInitial = mAvatar.transition((c) => {
    c.text(AVATAR_SCHEMA.ports.initials, user.getValue().name.slice(0, 1).toUpperCase());
});
mAvatar.effect((c) => {
    showInitial(c);
    return user.onChange(() => showInitial(c));
});
const AVATAR = mAvatar.done();

const USER_CARD_SCHEMA = createExoSchema((b) => {
    let slot!: TExoChildrenPort;
    let name!: TExoTextPort;
    let role!: TExoTextPort;
    b.el('div', { class: 'user' }, (div) => {
        // The children port sits between two static siblings — and renders there.
        div.el('div', { class: 'user__avatar' }, (holder) => {
            slot = holder.childrenPort();
        });
        div.el('strong', null, (strong) => {
            name = strong.textPort();
        });
        div.el('em', null, (em) => {
            role = em.textPort();
        });
    });
    return { slot, name, role };
});
const P = USER_CARD_SCHEMA.ports;
const mUserCard = createExoMachineBuilder<TExoDomNode>(USER_CARD_SCHEMA);
mUserCard.createInitialState((c) => {
    c.one(P.slot, AVATAR);
});
const showUser = mUserCard.transition((c) => {
    const { name, role } = user.getValue();
    c.text(P.name, name);
    c.text(P.role, role);
});
mUserCard.effect((c) => {
    showUser(c);
    return user.onChange(() => showUser(c));
});
const USER_CARD = mUserCard.done();
```

The effect draws **first** and subscribes second, synchronously: hydration adopts
the server's markup only while the instance is being armed, which is when effects
start. What it returns is its stop, run when the instance leaves.

`AVATAR` names the source it reads. That is the trade the no-props design makes
and it is worth stating plainly: a component is **not** a function of arguments
you can call with anything — it is wired to where its data lives. Reuse comes
from the data layer, not from the parameter list: the same component over a
different user is a different source, and the same component over a thousand
rows reads a **slot by its index**, which is what the build callback of a
reconciled list writes before it builds. See
[Rendering](./rendering.md#where-children-come-from).

`backend.render` is for the top of a page, where the index is `0` — so the root
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
against an array, **by object identity**, from inside a transition: it is handed
the port's child list, the order shown, and the order wanted, and returns the new
order shown, which the machine keeps in its state. A row that survives is the same
element it was; a row that leaves is disposed. No keys are involved on this path —
and where identity is not available, `c.keyedList` (the `EXO_KEYED_LIST_VOCABULARY`
pack) supplies one. See
[Keys, when identity is not available](./lists.md#keys-when-identity-is-not-available).

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoTextPort, TExoChildrenPort } from '@exodra/core';
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

/** Where a row's item waits for it. The build callback writes it, then builds. */
const BUILDING: TItem[] = [];

const ROW_SCHEMA = createExoSchema((b) => {
    let id!: TExoAttrPort;
    let label!: TExoTextPort;
    b.el('li', null, (li) => {
        id = li.port('data-id');
        label = li.textPort();
    });
    return { id, label };
});
const mRow = createExoMachineBuilder<TExoDomNode, unknown, TItem>(ROW_SCHEMA);
mRow.createInitialState((_c, index) => BUILDING[index]);
mRow.wire((c) => {
    const item = c.state;
    c.attr(ROW_SCHEMA.ports.id, item.id);
    c.text(ROW_SCHEMA.ports.label, item.label);
});
const ROW = mRow.done();

const items = createStore<readonly TItem[]>([
    { id: 'a', label: 'First' },
    { id: 'b', label: 'Second' },
]);

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', { class: 'list' }, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
type TListState = { rows: TExoChildList; shown: TItem[] };
const mList = createExoMachineBuilder<TExoDomNode, unknown, TListState>(LIST_SCHEMA);
mList.createInitialState((c) => ({ rows: c.childList(LIST_SCHEMA.ports.rows), shown: [] }));
const showRows = mList.transition((c) => {
    const want = items.getValue();
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (item, i) => {
        BUILDING[i] = item;
        return c.build(ROW, i);
    });
});
mList.effect((c) => {
    showRows(c);
    return items.onChange(() => showRows(c));
});
const LIST = mList.done();

backend.render(LIST, document.body);

items.setValue([...items.getValue(), { id: 'c', label: 'Third' }]);
```

The child list is opened in `createInitialState`, which runs once per instance; a
wire can run again, and opening a children port there is refused.

When the contents cannot change, use `c.list(port, component, count)` instead: a
fixed list pays for no row records, no diff and no teardown.

For a filtered view, compute the subset in the transition and hand that as
`want`: rows are matched by the item objects, so a row the filter keeps is the
same element it was. See the [Lists guide](./lists.md).

## Side effects and cleanup

An effect owns what it starts: the function it returns is its stop, run when the
instance leaves, and `backend.render` hands back a disposer that ends everything
at once. Anything started outside an effect is registered with `c.onTeardown`,
against the child the exonode is currently wiring:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const TIMER_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('div', { class: 'timer' }, (div) => {
        text = div.textPort();
    });
    return { text };
});
const mTimer = createExoMachineBuilder<TExoDomNode, unknown, { seconds: number }>(TIMER_SCHEMA);
mTimer.createInitialState(() => ({ seconds: 0 }));
const show = mTimer.transition((c) => {
    c.text(TIMER_SCHEMA.ports.text, `Time: ${c.state.seconds}s`);
});
mTimer.wire((c) => {
    show(c);
});
mTimer.effect((c) => {
    const id = setInterval(() => {
        c.state.seconds++;
        show(c);
    }, 1000);
    return () => clearInterval(id);
});
const TIMER = mTimer.done();

const dispose = backend.render(TIMER, document.body);

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
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoChildrenWiring,
    TExoMachineNode,
} from '@exodra/core';
import { exoContextToken } from '@exodra/context';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const THEME = exoContextToken<string>('theme');

const LABEL_SCHEMA = createExoSchema((b) => {
    let cls!: TExoAttrPort;
    b.el('span', null, (span) => {
        cls = span.port('class');
    });
    return { cls };
});
const mLabel = createExoMachineBuilder<TExoMachineNode>(LABEL_SCHEMA);
mLabel.wire((c) => {
    // `undefined` when nobody provided it — not a throw.
    c.attr(LABEL_SCHEMA.ports.cls, 'label label--' + (c.inject(THEME) ?? 'light'));
});
const LABEL = mLabel.done();

const SHELL_SCHEMA = createExoSchema((b) => {
    let slot!: TExoChildrenPort;
    b.el('div', { class: 'shell' }, (div) => {
        slot = div.childrenPort();
    });
    return { slot };
});
const mShell = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(SHELL_SCHEMA);
mShell.createInitialState((c) => {
    c.provide(THEME, 'dark');
    c.one(SHELL_SCHEMA.ports.slot, LABEL);
});
const SHELL = mShell.done();

backend.render(SHELL, document.body);
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
and follow it with an effect: read `c.inject(THEME)`, run the transition, and
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
filling the ports through `SCHEMA.ports`. Nothing on this page depends on JSX — a
hand-written schema needs no build step at all.

## Performance notes

- **Declare in `el()`, not in a port.** A port costs a slot and a call per
  instance; a static attribute costs nothing.
- **A bare `c.attr` in the wire when it cannot change, an effect when it can.**
  The bare write is two array loads and a call, with nothing retained.
- **`c.list` for a fixed list, `reconcileExoOrder` in a transition for a live one.** A list whose
  contents cannot change should not pay for the possibility that they might.
- **Use a shared handler for a repeated handler.** A module-level function taking
  `(event, subject)` is one function object for the whole template; a closure is
  one per row — and the subject is what the
  [delegated event pack](../api/dom.md#events-as-a-plugin) needs a fill to carry.
- **Let effects own their subscriptions.** An effect returns its stop; registering
  teardown by hand is only for what you start outside one.
