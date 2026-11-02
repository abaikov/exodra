---
title: DOM Renderer
---

# DOM Renderer

`@exodra/dom` is the **browser backend** of the schema core. It takes the
component values [`@exodra/core`](./core.md) describes and turns them into live
DOM — and it can adopt markup [`@exodra/string`](./string.md) already printed,
with the same component.

Nothing here parses a template per render. A schema is compiled **once** into a
prototype element, a walk plan and a setter per port; an instance is a clone
plus one indirect call per port.

```bash
npm install @exodra/dom @exodra/core @exodra/context
```

## ExoDomBackend

The client entry point is an **object you construct and render from**, not a free
function. A backend is the composition — the event strategy, the value writers,
and the two record factories — and `render` arrives with `withExoCompiler`.

```ts no-check
class ExoDomBackend {
    constructor();

    events: TExoEventsApi;
    writers: TExoWritersApi;
    createInstance: TExoDomApi['createInstance'];
    createChild: TExoDomApi['createChild'];

    // NO `render`. It is composed in — see `withExoCompiler` below.
}
```

The constructor takes **nothing**, and packs are applied by **wrapping** the
object. There is no runtime object, no slot registry and no `needs` / `provides`
declaration: a plugin is a bag of factories that write names onto the backend, so
composing nothing costs nothing and a capability nobody composed does not exist —
in the type as well as at runtime.

The backend also carries every **exonode method** as an own property, merged in
the constructor before anything an application composes, so a pack naming `attr`,
`text` or `list` receives the shipped body as its `next` and may wrap it rather
than only replace it — **on a client render**. A wrapper is silent on an adopted
page for every name hydration claims: `withExoHydration`'s bodies ignore `next` and
replace. See [Plugins](../guides/plugins.md#the-fields-a-composition-can-replace).

```ts
import { EXO_PORT_TEXT, composeExoMachine, createExoMachine, createExoSchema, exoPorts, withExoWire } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const GreetingPorts = exoPorts({ label: EXO_PORT_TEXT });

const greetingSchema = createExoSchema(GreetingPorts, (b) => {
    b.el('h1', { class: 'title' }, (h1) => {
        h1.textPort(GreetingPorts.label);
    });
});
const greetingMachine = composeExoMachine(createExoMachine<TExoDomNode>(greetingSchema), (m) =>
    withExoWire(m, (c) => {
        c.text(GreetingPorts.label, 'Hello');
    })
);

/** ONE backend for the application, at module level — it is the schema cache key. */
const backend = withExoCompiler(new ExoDomBackend());

const root = document.getElementById('root') as HTMLElement;
const dispose = backend.render(greetingMachine, root);

// later…
dispose();
```

Four things about it are deliberate:

- **It takes a machine, not a schema and a wiring side by side.** The schema is
  inside the machine, so a schema can never be paired with somebody else's wiring,
  compiled against one numbering and filled against another.
- **It mounts one instance, and takes no count.** The instance is handed the
  optional `params` and nothing else; there are no props — a lone root has
  nothing else to be about.
- **It is not a list.** There is no reconciler and no diff: this renders and
  stops. Rows that vary over time are a **list** — a children port filled by
  `reconcileExoOrder` over `c.childList`, below — and keeping the two
  apart is what stops a static mount from paying for a diff it will never run.
- **It returns the disposer**, because the instance may subscribe. Disposing tears
  the instance down and ends every subscription it made.

:::caution Build the backend once
The backend is the key a compiled schema is cached under: each backend object takes
its own `backendType`, the index its schemas are stored at on `machine.forms`. One
constructed inside a component, a route handler or a render loop is a fresh index
every time and recompiles every schema it touches — markup parse included. Build it
at module level. `warnExoFormGrowth` says so out loud in development once a machine
holds eight schemas.
:::

### Composing plugins

A plugin is an object whose entries are factories receiving what already stands
under that name. The constructor takes **no arguments** — composition is a chain
of unary `with*` decorators, each of which merges its own entries onto the object
it is handed and returns that same object, so the whole chain is one identity:

```ts
import { composeExoPlugins } from '@exodra/core';
import {
    ExoDomBackend,
    createExoDelegatedEvents,
    withExoCompiler,
    withExoDefaults,
} from '@exodra/dom';

/** ONE pack for the application, at module level. */
const DELEGATED = createExoDelegatedEvents(['click']);

const backend = withExoCompiler(
    withExoDefaults(
        // …a bare implementation, written as the one-entry plugin it is:
        composeExoPlugins(new ExoDomBackend(), { events: () => DELEGATED })
    )
);
```

`composeExoPlugins` comes from `@exodra/core`, and every shipped decorator is built
on it. The order reads **inside-out** where a variadic
constructor read left to right — that is the price of the decorator form, and it
is not papered over with a second spelling.

**A bare backend carries four replaceable fields and that is the whole of it** —
`events`, `writers`, `createInstance`, `createChild`
(`packages/dom/src/dom/ExoDomBackend.ts:16-22`):

| Field | Interface | Default | What replacing it buys |
| --- | --- | --- | --- |
| `events` | `TExoEventsApi` | `EXO_DIRECT_EVENTS` | how a listener reaches the DOM — one per element, or one per root |
| `writers` | `TExoWritersApi` | `EXO_SHIPPED_WRITERS` | how a value reaches an element — `setAttribute`, or a property |
| `createInstance` | — | `createExoDomInstanceFactory(this)` | where the record of an instance placed by `c.one` or a fixed `c.list` comes from |
| `createChild` | — | `createExoDomChildFactory(this)` | the same for a child — a root, a built child and a reconciled row — and it is why every child's leading fields share offsets |

A plugin may also **introduce a name that was never there**:

| Decorator | What it adds or replaces |
| --- | --- |
| `withExoCompiler` | adds `schema`, `buildRoot`, `mountRoot` and `render` — a bare backend has none, so it cannot turn a declaration into a schema and has no entry point |
| `withExoHydration` | adds `adoptRoot`, `hydrate`, `hydrateSurface`, `parserStability` |
| [`withExoChildList`](#withexochildlist) | adds `c.childList(port)` to every exonode — the commanded child list every reconciled list, the keyed list and the router outlet open. Without it the call throws [EXO0109](../errors.md#exo0109) |
| [`withExoForeignNamespaces`](#withexoforeignnamespaces) | adds `foreignNamespaces`, the SVG and MathML tables. Without it a schema with `<svg>`, `<math>` or an SVG-only element is refused with [EXO0108](../errors.md#exo0108) ([EXO0110](../errors.md#exo0110) from a JSON declaration) |
| `withExoDefaults` | the safety bundle; today it is `withExoReclaimingText` and nothing else |
| `withExoReclaimingText` | replaces `writers.text` with `exoReclaimingText`, and **delegates** the rest to what was composed under it |
| `withExoPropertyWriters` | replaces `writers` for custom-element properties, and **delegates** text to what was composed under it through `next` |

Each decorator declares its own contribution in its return type, and they
compose by intersection. What each costs and refuses is on
[Plugins](../guides/plugins.md#the-packs-that-ship).

## Following data is an effect

A machine keeps its ports in step with outside data the same way everywhere: a
function writes the ports from the data, and an **effect** runs that
function once and then subscribes, returning the unsubscribe. A reactive list
is the same shape with `reconcileExoOrder` from `@exodra/list-reconcile` inside
that function, over the child-list door:

```ts no-check
const show = (c: TExoMachineNodeOf<typeof labelBaseMachine>): void => {
    c.text(LabelPorts.label, store.getValue().label);
};
const labelMachine = withExoEffects(labelBaseMachine, (effect) => {
    effect((c) => {
        show(c);
        return store.onChange(() => show(c));
    });
});
```

**Why this shape rather than a door.** A backend carrying a `bind` would make
every page link subscription machinery it may never use, and would decide for
the application what a data source is. A backend carrying a list reconciler would
be a backend with one list strategy welded in, and a second strategy could no
longer be a second FUNCTION. The effect subscribes to whatever the application
already has — a store object, an `oimdb` collection — and names no Exodra package
for it.

`TExoDomNode` is the type a machine names — the instance's record plus the shipped
surface. A machine that must stay portable across backends names only the methods
it calls, as a local type; that is structural, so one component drives the
DOM, the server and the terminal with no cast.

:::caution Where the refusal lands
`render` and `hydrate` declare their component against `this`, so a machine naming
a capability the composition does not have is refused **at the entry point**, in
the file that built the backend — most commonly `render` itself on a backend
built without `withExoCompiler`. The same demand is checked again at every
`one`, `list` and `build` that places a child, because those name `this` too.
:::

## The exonode

A machine's initial state and transitions are handed a `TExoDomNode` — the
instance's own record. It is **not a cursor**: nothing walks, nothing descends, and
no method depends on the order the others were called in. A port names itself, so
the last port may be filled first.

| Method | What it does |
| --- | --- |
| `attr(port, value)` / `text(port, value)` / `unsafeHtml(port, markup)` | Fill a port. One method per port KIND, so the write is one indirect call with its data already resolved — no runtime test of what sort of port this is. |
| `on(port, handler, subject?)` | Put a [handler](./core.md#event-handlers) in an event port — a closure, or a module-level function plus the subject it is told its position by. |
| `provide(token, value)` | Put a value where everything below this instance can reach it. |
| `inject(token)` | The nearest value for a token, or `undefined`. |
| `one(port, component, params?)` | One nested instance of another component, in a children port. Hands back the child's exonode. |
| `list(port, component, rows)` | A **fixed** list of instances — one row per entry of `rows`, armed with that entry as its params, rendered once, never reconciled, nothing subscribed. |
| `build(component, params?)` | Build one child and put it nowhere — hands back the child's exonode. |
| `childList(port)` | The child-list door for a children port: it holds whatever is put in it. This is the half a reconciler stands on — see below. |
| `onTeardown(off)` | Hand the instance a disposer to run when it goes. |
| `foreign(t)` | A child this renderer did not make. A pack: compose `EXO_DOM_FOREIGN_VOCABULARY` first. |
| `portNode(port)` | The element standing at a ref port, typed by the port when it was declared with `exoRefPortKind<TNode>()`. |
| `portTable()` / `portNodeReader()` / `portNodeWriter()` | The instance's node table, and readers and writers over it. |

There is no `bind` method on this list. Keeping a port in step with data is a
transition plus an effect; a reactive list is `reconcileExoOrder` from
`@exodra/list-reconcile` inside a transition, over `childList(port)`. Both stand
on doors every backend answers, so one body serves the DOM, the server and the
terminal — and a page that uses neither links neither.

An exonode is **one instance's own record**, so capturing it in a callback is safe,
and is exactly what an effect's subscription does. `build` may legally be called
after the initial state returned, because it reads per-schema state only — which
is what lets a reconciler keep calling it on every later update.

### Reactive attributes and text

The data can live anywhere that offers a read and a change notification. Here it
is a store object of a dozen lines; in an application it is the data layer.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoHandlers,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

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

const active = createStore(false);

const PanelPorts = exoPorts({
    panelClass: EXO_PORT_ATTR,
    buttonText: EXO_PORT_TEXT,
    click: EXO_PORT_EVENT,
});

const panelSchema = createExoSchema(PanelPorts, (b) => {
    b.el('div', null, (div) => {
        div.attrPort(PanelPorts.panelClass, 'class');
        div.el('button', { type: 'button' }, (btn) => {
            btn.eventPort(PanelPorts.click, 'click');
            btn.textPort(PanelPorts.buttonText);
        });
    });
});

const panelBaseMachine = createExoMachine<TExoDomNode>(panelSchema);
const showActive = (c: TExoMachineNodeOf<typeof panelBaseMachine>): void => {
    const on = active.getValue();
    c.attr(PanelPorts.panelClass, on ? 'panel panel--open' : 'panel');
    c.text(PanelPorts.buttonText, on ? 'Close' : 'Open');
};
const panelMachine = composeExoMachine(
    panelBaseMachine,
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showActive(c);
                return active.onChange(() => showActive(c));
            });
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(PanelPorts.click, () => active.setValue(!active.getValue()));
        })
);

backend.render(panelMachine, document.body);
```

The first `showActive(c)` runs synchronously inside the effect, so the instance
is drawn before anything subscribes. On the server the same effect runs too: it
draws, subscribes, and the render stops it as soon as the markup is taken.
Through **hydration** every value port is filled through a repairing fill: the
served bytes are read and overwritten only where they disagree. See
[SSR & hydration](../guides/ssr.md#what-hydration-actually-does).

### withExoChildList

```ts no-check
function withExoChildList<TBase extends TExoDomApi>(base: TBase): TBase;
```

Adds `c.childList(port)` — the commanded child list, with its `insert`, `move`,
`remove`, `removeAll`, `detach` and `attach` — to every exonode the backend
builds. Everything that places children one at a time opens one: `reconcileExoOrder`
over `c.childList`, the keyed list (`c.keyedList` calls `childList`), the router's
`ExoOutlet` / `exoOutlet`, and any machine that places `c.build` children by hand.
On a backend composed without it the call throws [EXO0109](../errors.md#exo0109).

A page that fills its children ports only with `c.one` and a fixed `c.list` links
none of it. Compose it once, at module level, on the backend that renders a machine
which opens a child list:

```ts no-check
const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
```

### withExoForeignNamespaces

```ts no-check
function withExoForeignNamespaces<TBase extends TExoDomApi>(
    base: TBase
): TBase & { readonly foreignNamespaces: TExoForeignNamespaces };
```

Adds `foreignNamespaces`: the SVG and MathML tables — the namespace an element is
created in, tag and attribute case adjustment (`viewBox`, `foreignObject`),
namespaced attributes (`xlink:href`) and the HTML integration points. A schema
containing `<svg>`, `<math>` or an SVG-only element (`circle`, `path`, `g`, …)
compiled on a backend without it is refused with [EXO0108](../errors.md#exo0108),
naming the tag, rather than built in the HTML namespace where it would not draw. A
JSON declaration with an attribute on such an element is refused with
[EXO0110](../errors.md#exo0110).

A page with no SVG or MathML links none of those tables. Compose it once, at module
level, on the backend that renders a schema with SVG or MathML in it:

```ts no-check
const backend = withExoForeignNamespaces(withExoCompiler(new ExoDomBackend()));
```

The packs are independent, so the order among them does not matter:
`withExoChildList(withExoForeignNamespaces(withExoCompiler(new ExoDomBackend())))`.

### Nesting and lists

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoTransitions,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

type TTask = { readonly id: string; readonly title: string };

const TaskPorts = exoPorts({ id: EXO_PORT_ATTR, title: EXO_PORT_TEXT });

const taskSchema = createExoSchema(TaskPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(TaskPorts.id, 'data-id');
        li.textPort(TaskPorts.title);
    });
});
const taskMachine = withExoTransitions(createExoMachine<TExoDomNode>(taskSchema), {
    showTask: (row, task: TTask) => {
        row.attr(TaskPorts.id, task.id);
        row.text(TaskPorts.title, task.title);
    },
});
const { showTask } = taskMachine.transitions;

let tasks: readonly TTask[] = [
    { id: 'a', title: 'First' },
    { id: 'b', title: 'Second' },
];
const taskListeners = new Set<() => void>();
function setTasks(next: readonly TTask[]): void {
    tasks = next;
    taskListeners.forEach((listener) => listener());
}

const BoardPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const boardSchema = createExoSchema(BoardPorts, (b) => {
    b.el('ul', { class: 'board' }, (ul) => {
        ul.childrenPort(BoardPorts.rows);
    });
});

type TBoardState = { rows: TExoChildList; shown: TTask[] };

const boardBaseMachine = createExoMachine<TExoDomNode, unknown, TBoardState>(boardSchema, {
    createInitialState: (c) => ({ rows: c.childList(BoardPorts.rows), shown: [] }),
});
const showTasks = (c: TExoMachineNodeOf<typeof boardBaseMachine>): void => {
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, tasks, tasks, (task) => {
        const row = c.build(taskMachine);
        showTask(row, task);
        return row;
    });
};
const boardMachine = withExoEffects(boardBaseMachine, (effect) => {
    effect((c) => {
        showTasks(c);
        const listener = (): void => showTasks(c);
        taskListeners.add(listener);
        return () => {
            taskListeners.delete(listener);
        };
    });
});

backend.render(boardMachine, document.body);

setTasks([...tasks, { id: 'c', title: 'Third' }]);
```

`reconcileExoOrder(kids, shown, keys, want, build)` reconciles **by object
identity** when `keys` is the item array itself — a row that survives an update
is the same element it was, and a row that leaves is disposed. It returns the new
shown order, which the machine keeps in its state for the next pass. No keys are
involved; keys are the opt-in `EXO_KEYED_LIST_VOCABULARY` pack. See the
[Lists guide](../guides/lists.md).

Use `c.list(port, component, rows)` instead when the contents cannot change: row
`i` is armed with `rows[i]` as its params, and a fixed list pays for no row
records, no diff and no teardown.

### Children as values

A reconciler is a function over two doors, and both are public:

- `c.build(component, params?)` returns a child — a complete, wired, detached
  instance, placed nowhere.
- `c.childList(port)` returns the port's `TExoChildList`: `insert` (places and
  mounts), `move`, `remove` (unmounts and disposes), `removeAll`, and the placement
  pair `detach` / `attach`, which take a child out and put it back **without** any
  hook — nothing unmounted, nothing disposed, subscriptions left live
  (`packages/dom/src/dom/types/TExoChildList.ts`). `detachAll` is `detach` at every
  index.

Whoever drives those doors decides everything else — which item reuses which
child, whether a child that leaves is disposed or kept, what a key would mean.
Keeping a whole exonode across a hide and a show is `detach` then `attach` on a
child you hold; there is no element pool, and an element only ever comes from
`cloneExoNode` on the schema's prototype.

`exoNodeDom(child).node` is the documented way a holder reaches the element
behind a child. `exoNodeDom` takes a **child** — an element carries no pointer back
to its child, so there is no element→child direction — and a hand-made element is
refused by name (`assertBuiltExoChild`), because it carries no lifecycle and could
never be unmounted.

Related exports: `createExoChildList`, `TExoChildList`, `TExoDomChild`,
`dropExoChild`, `clearOwnedExoChildList`, `assertBuiltExoChild`.

### Contexts

`provide` and `inject` are methods on the exonode — there is nothing to import,
because a context exists only while an instance is being built.

`provide` extends the chain **on the exonode**. A list captures that chain when it
is wired and holds it for its whole life, so a row added an hour later, from inside
a subscriber with no render on the stack, resolves off the captured chain and walks
nothing.

**A context does not travel through the document.** A separate `render()` into an
element that some other render provided into starts from nothing — it does not
inherit that render's context. A host that wants a separately-mounted widget to
see a value hands it over through state the widget's machine can reach, or by
rendering the widget inside the same render that provided. There are no props to
hand it as.

One export exists for callers *outside* an instance:

- `provideExoContext(below, token, value)` — extends a chain and returns the new
  head.

The token itself (`exoContextToken`) is in [`@exodra/context`](./core.md#contexts),
because a machine that names a context is the same module on the server.

## Build, then mount

`render(component, parent, params?)` is two calls, and both are public:

```ts no-check
const node = backend.buildRoot(greetingMachine, params); // the exonode, built and wired, placed nowhere
// fire transitions at it, re-run its wire: wireExoNode(node, greetingMachine, nextParams)
const dispose = backend.mountRoot(node, root);    // places it, installs the event strategy
```

`buildRoot` runs `createInitialState` and the wire and starts the effects; the
node is in no document yet. `mountRoot` appends it to `parent` and returns the
disposer `render` would have returned. `render` is exactly
`mountRoot(buildRoot(component, params), parent)`.

Keep the node to change the instance from outside later: `wireExoNode(node,
component, params)` from `@exodra/core` re-runs its wire with new params on the
same elements. A wire that opens children (`childList`, `one`, `list`) refuses
to be re-run with `EXO0103`; open them in `createInitialState`.

The hydrating twin is `adoptRoot(component, parent, params?)`: it adopts the
markup already in `parent` instead of building, and `mountRoot` over an adopted
node places nothing, because the node is already there. `hydrate` is
`mountRoot(adoptRoot(component, parent, params), parent)`.

## backend.hydrate() — the hydration plugin

Same arguments as `render`, same order, same disposer — a page switches between
building markup and adopting it by changing which method it calls and nothing
else.

```ts no-check
function withExoHydration<TBase extends TExoDomApi>(base: TBase): TBase & TExoHydrationApi;

interface TExoHydrationApi {
    adoptRoot(component: TExoMachine<this & TExoDomInstanceRecord>, parent: Element, params?: unknown): TExoDomNodeApi & TExoNode<TExoDomMark>;
    hydrate(component: TExoMachine<this & TExoDomInstanceRecord>, parent: Element, params?: unknown): () => void;
    hydrateSurface: TExoDomRecordFactories;
    parserStability: TExoParserStability;
}
```

**`hydrate` exists only on a backend composed with `withExoHydration`**, and
that is deliberate rather than incidental. Hydration is 3.2 kB gzipped — the walk,
the adopters, the shape checks — that a client-rendered page never runs, and a
value import from a module every client render already reaches would weld all of
it into every client-only bundle. As a pack it is shaken out of a page that never
names it, and on a backend composed *without* it `backend.hydrate` is a compile
error rather than a call landing on `undefined`. It needs `withExoCompiler`
beneath it, because an adopting schema is derived from the DOM schema.

Composing it onto the **same** backend that renders is the other half: the page
hydrates with exactly the composition it renders with.

```ts
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoMachine, TExoWiring } from '@exodra/core';

// ONE type, not an intersection of two backends'. `TExoWiring` is the surface all
// three exonodes share, and a machine is contravariant in its exonode, so this value
// satisfies both backends.
declare const App: TExoMachine<TExoWiring, number>;

// On the server:
const html = new ExoStrBackend().render(App);

// On the client, against the markup the server sent:
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
const root = document.getElementById('root') as HTMLElement;
const dispose = backend.hydrate(App, root);
```

It adopts **one instance**, out of `parent`'s first *element* child — by element
and not by node, because one formatting newline between two instances would
otherwise shift everything after the first, silently. If the markup holds no
element it says so instead of adopting whatever comes next.

Hydration **writes nothing where the markup already agrees** — that is the whole of
what makes it cheaper than rendering, and it is narrower than "byte-identical".
Where the markup and the client's data disagree, hydration repairs it, on four
paths:

| Path | What it writes |
| --- | --- |
| `hydrate/factories/createExoRepairingFill.ts:29-38` | a **text** port: the Text node is read and compared, and written only if it differs |
| `hydrate/repairExoAttribute.ts:36-65` | an **attribute** port: `getAttribute` is compared against the markup the value asks for, and the live setter runs only on a mismatch |
| `hydrate/dropUnadoptedExoRows.ts:24-29` | surplus **rows** the server rendered that the client's data no longer has — removed, so a later insert does not land behind dead ones |
| `dom/EXO_ADOPT_CURSOR.ts:38-45` | rows of a child list that adoption did not claim — removed with no shape check, because the span the cursor collected was bounded by that list's own end |

An `unsafeHtml` port **is** repaired, but never by a byte compare: the cheap
first test is `el.innerHTML` on the largest thing on the page, and the parser
normalises what it parsed, so a mismatch there is run a second time through the
**same** parser — into a shallow clone of the element, so the parse context is the
live one — before anything is written (`hydrate/repairExoHtml.ts:13-23`). A port
whose value the markup cannot carry — a property a `writers` pack answers
`markupCarries: false` for — keeps its live writer on the adopting pass, because
there is nothing printed to compare against
(`packages/dom/src/hydrate/compileExoHydrateSchema.ts`).

The event strategy is not a parameter of `hydrate`: it reads `this.events` off the
backend it was composed onto, so the pack a page hydrates with is the pack it
renders with, by construction. `TExoHydrateBackend` is the type a caller annotates
when it needs a backend that can hydrate; it is written structurally, so somebody
else's hydration pack satisfies it too.

`findExoRowDisagreement(machine, root, backend)` answers "does this element look
like an instance of this machine's schema", and returns a description of the first
disagreement or `null`. The backend is there to select the same compiled schema the
page renders through — asking for a different one compiles a second schema,
`<template>` parse and all, during hydration. Hydration calls it in
`dropUnadoptedExoRows`. It is exported so a caller outside the package can ask the
same question: a test asserting two backends agree, or a bug report.
`describeExoNode(node)` names a node the way a person reads markup.

## Events as a plugin

How a listener reaches the DOM is the application's choice, composed into the
backend as an inert value in the `events` field.

| Pack | Behaviour |
| --- | --- |
| `EXO_DIRECT_EVENTS` | One listener per element. The default, with no privilege — a pack built outside this package is composed in exactly the same way. |
| `createExoDelegatedEvents(names, options?)` | One root listener per event name, serving every row. `options.allowHighFrequency` accepts the continuous pointer stream (see below). |

```ts
import { composeExoPlugins } from '@exodra/core';
import { ExoDomBackend, createExoDelegatedEvents, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';

declare const App: TExoDomMachine;

/** ONE pack for the application, at module level. */
const DELEGATED = createExoDelegatedEvents(['click']);

/** A bare implementation of the interface is merged as the one-entry plugin it is. */
const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    events: () => DELEGATED,
});

backend.render(App, document.body);
```

`createExoDelegatedEvents` returns a `TExoEventsApi` — a value for the `events` field,
not a plugin — so composing it is the factory `() => DELEGATED`. The factory
receives what already stands in that field as its argument, which is what lets a
pack **wrap** the shipped strategy rather than only replace it.

The strategy travels with the nesting: a component reached through `one`,
`list` or `build` is part of the page that mounted it, so it cannot
quietly fall back to per-element listeners.

The delegated pack **refuses a fill with no subject**, naming the event: the subject is how
one [shared handler](./core.md#event-handlers) learns which row it fired on, and a closure
that carried its own row is the per-row cost delegation exists to remove — which `typeof`
cannot detect, so the pack checks what it can. It also refuses an event that
does not bubble, when the schema's event port compiles. `TExoEventsApi` is the type a
third-party pack implements.

There is a **second refusal**, and it means the opposite thing. `mousemove`,
`pointermove`, `pointerrawupdate`, `touchmove`, `wheel`, `mousewheel`, `drag`
and `dragover` all bubble, so delegating them works exactly as intended — what
they cost is a walk from `e.target` to the root at the pointer's sampling rate
instead of when a person acts. They are refused **by default** and accepted when
the call says that is what you meant:

```ts
import { createExoDelegatedEvents } from '@exodra/dom';

const DRAG = createExoDelegatedEvents(['pointermove'], { allowHighFrequency: true });
```

The option lives in the call, beside the names it applies to, so it cannot be
switched on somewhere else and forgotten — and it does not unlock the
non-bubbling names, because stating an intent cannot make the browser deliver an
event that never reaches the root.

## Compiled schemas

Exported for a caller that mounts instances itself, or a plugin that replaces a
setter — a second compiler would be the first thing to disagree about port
numbering.

| Export | Purpose |
| --- | --- |
| `compileExoDomSchema(declaration, backend)` | Compile a declaration into markup, a walk plan and a setter per port. |
| `exoDomSchemaOf(machine, backend)` | The schema for a machine, compiled on first use and cached at `machine.forms[backend.backendType]`, so build the backend once at module level — one constructed per render is a fresh index and recompiles every schema, markup parse included. |
| `createExoDomSchema` / `exoDomJsonDeclaration` | The two halves of shipping schemas off a build: the build makes the JSON declaration, the page turns it into a schema without the compiler. |
| `mountExoSchema(…)` / `mountExoInstance(…)` | Put one instance of an already compiled schema in a parent. |
| `EXO_WALK_FIRST_CHILD`, `EXO_WALK_NEXT_SIBLING` | The two walk operations a schema's render walk is made of. |
| `EXO_WALK_FROM_END` | The hydration walk's third operation: `op - EXO_WALK_FROM_END` steps back from `lastChild`, for a node standing behind a child list. |
| `TExoDomSchema`, `TExoDomSetter`, `TExoHydrateSchema` (types) | The schema shapes. |

## Subscription ownership

`exoTeardownScope(fn)` opens a scope, runs `fn`, and returns a disposer for
everything `exoOnTeardown(child, off)` registered inside it. `render` is
exactly that around its mount; a caller driving `mountExoInstance` by hand needs
the same bracket.

Inside a machine, register your own teardown through **`c.onTeardown(off)`** —
joining the
disposer to the child being built when there is one and to the ambient render
scope otherwise.

```ts
import type { TExoDomNode } from '@exodra/dom';

export function startTicker(c: TExoDomNode, tick: () => void): void {
    const id = setInterval(tick, 1000);
    c.onTeardown(() => clearInterval(id));
}
```

A subscription with nothing to end it is refused rather than left to outlive the
page that made it.

## API Reference

| Export | Description |
| --- | --- |
| `ExoDomBackend` / `TExoDomBackend` / `TExoDomBackendConstructor` | The browser backend: `new ExoDomBackend()` — **no constructor arguments**. Packs are composed around it by nesting `with*` decorators. |
| `TExoDomApi` | The replaceable fields on their own — what every compiler-side function takes. It carries **no** `render`, deliberately. |
| `withExoCompiler` / `TExoCompilerApi` | Composing it is what puts `backend.schema(machine)` and `backend.render(machine, parent)` on a backend; a page whose schemas came off a build leaves it out. |
| `withExoHydration` / `TExoHydrateBackend` / `TExoHydrationApi` | Composing it is what puts `backend.hydrate(machine, parent)` on a backend; a page that never composes it never pulls the adopters into its bundle. |
| `withExoChildList` | Composing it is what puts `c.childList(port)` on every exonode; without it the call throws EXO0109. A page with no reconciled list, keyed list or outlet leaves it out. |
| `withExoForeignNamespaces` | Composing it is what lets a schema contain SVG or MathML; without it such a schema is refused with EXO0108. A page with no SVG leaves it out. |
| `TExoDomNode` / `TExoHydrateNode` / `TExoDomMachine` | What a machine is handed, and the component shape — **types**, not classes. An exonode is a plain object whose prototype is the composed backend. |
| `EXO_DOM_NODE_VOCABULARY` / `EXO_HYDRATE_NODE_VOCABULARY` | The exonode surfaces as the packs a backend merges onto itself. Exported because a tool that needs the **list** of exonode method names has no other honest source for it. |
| `EXO_DIRECT_EVENTS` / `createExoDelegatedEvents(names, options?)` | The two shipped event strategies. |
| `EXO_SHIPPED_WRITERS` / `TExoWritersApi` | The default `writers` value and the interface a replacement is written against. |
| `withExoPropertyWriters(base, takesOver?)` / `createExoPropertyWriters` / `takesOverExoProperty` / `EXO_GLOBAL_ATTRIBUTES` | The property-writers pack: a custom element's ports written as JavaScript properties instead of attributes. |
| `withExoDefaults` / `withExoReclaimingText` / `createExoReclaimingTextWriters` / `exoReclaimingText` | The bundle most applications should compose, and the one pack currently in it: the text writer that re-reads `firstChild` per write and falls back to `textContent`, so a page a translator rewrote keeps updating. One `firstChild` load and one `nodeType` test per text write is what it costs. |
| `createExoChildList` / `TExoChildList` / `TExoDomChild` / `exoNodeDom` / `dropExoChild` / `clearOwnedExoChildList` / `assertBuiltExoChild` | The children stack a reconciler is written over. `exoNodeDom` takes a **child**, never an element. |
| `exoForeignNode` / `TExoForeignHooks` / `EXO_DOM_FOREIGN_VOCABULARY` | An element this renderer did not make, placed like one it did. |
| `cloneExoNode` | Where every instance's element comes from: a clone of the schema's prototype. |
| `provideExoContext` | Contexts — extends a chain, for a caller assembling one outside an instance. |
| `compileExoDomSchema` / `exoDomSchemaOf` / `createExoDomSchema` / `exoDomJsonDeclaration` / `mountExoSchema` / `mountExoInstance` | Schemas, for custom entry points. |
| `findExoRowDisagreement` / `describeExoNode` | Hydration diagnostics. |
| `exoTeardownScope` / `exoOnTeardown` | Subscription ownership. |
| `exoEventSlotsFor` / `EXO_DIRECT_PACK_ID` / `createExoEventPortData` / `attachExoDirectEvent` / `attachExoDelegatedEvent` / `installExoDelegatedRoot` / `createExoDelegatedListener` / `EXO_NON_BUBBLING_EVENTS` / `EXO_HIGH_FREQUENCY_EVENTS` / `assertExoSubject` | The pieces a third event pack is built from. The two event sets mean opposite things: `EXO_NON_BUBBLING_EVENTS` is what delegation cannot serve at all, `EXO_HIGH_FREQUENCY_EVENTS` is what it serves correctly and expensively. |

## Links

- npm: [`@exodra/dom`](https://www.npmjs.com/package/@exodra/dom)
- GitHub: [exodra/packages/dom](https://github.com/abaikov/exodra/tree/master/packages/dom)
