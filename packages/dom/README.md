# @exodra/dom

The browser backend for Exodra. It renders machines from `@exodra/core` into live
DOM, and adopts markup that `@exodra/string` printed on the server, with the same
machine.

A schema is compiled once per backend into a prototype element, a walk plan and a
writer per port. An instance is a clone of that prototype plus one call per port.

Full documentation: [exodra.org/docs/api/dom](https://exodra.org/docs/api/dom)

## Installation

```bash
npm install @exodra/dom @exodra/core @exodra/context
# for reactive lists:
npm install @exodra/list-reconcile
```

## A first render

A component is a **machine**: a schema (markup with numbered ports) plus the
initial state, wire, transitions, handlers and effects that fill those ports.

```ts
import { EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const GreetingPorts = exoPorts({ label: EXO_PORT_TEXT });

const greetingSchema = createExoSchema(GreetingPorts, (b) => {
    b.el('h1', { class: 'title' }, (h1) => {
        h1.textPort(GreetingPorts.label);
    });
});
const greetingBuilder = createExoMachineBuilder<TExoDomNode>(greetingSchema);
greetingBuilder.wire((c) => {
    c.text(GreetingPorts.label, 'Hello');
});
const Greeting = greetingBuilder.done();

const backend = withExoCompiler(new ExoDomBackend());

const root = document.getElementById('root') as HTMLElement;
const dispose = backend.render(Greeting, root);

dispose();
```

`backend.render(machine, parent, params?)` mounts one instance after whatever
`parent` already holds and returns a disposer that tears the instance down and
stops every effect it started. `params` reaches the machine's wire.

**Build the backend once, at module level.** Compiled schemas are cached per
backend, so a backend constructed inside a component or a render loop recompiles
every schema it touches.

### The same component in JSX

With `babel-preset-exodra` (or `@exodra/vite-plugin`) and
`"jsxImportSource": "@exodra/jsx/schema"`, a schema can be written as JSX.
`exoJsx` declares markup and named ports only; the machine is unchanged.

```tsx
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder } from '@exodra/core';
import type {
    TExoEventPort,
    TExoMachineBuilderNode,
    TExoMachineNode,
    TExoTextPort,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const counterSchema = exoJsx<{ count: TExoTextPort; increment: TExoEventPort }>(($) => (
    <button class="counter" type="button" onClick={$.increment}>
        <span>{$.count}</span>
    </button>
));
const CounterPorts = counterSchema.ports;

type TCounterState = { n: number };

const counterBuilder = createExoMachineBuilder<TExoMachineNode, unknown, TCounterState>(counterSchema);
counterBuilder.createInitialState((): TCounterState => ({ n: 0 }));
function show(c: TExoMachineBuilderNode<typeof counterBuilder>): void {
    c.text(CounterPorts.count, c.state.n);
}
counterBuilder.wire((c) => show(c));
counterBuilder.on(CounterPorts.increment, (c) => {
    c.state.n += 1;
    show(c);
});
const Counter = counterBuilder.done();

const backend = withExoCompiler(new ExoDomBackend());
backend.render(Counter, document.getElementById('root') as HTMLElement);
```

See the [JSX guide](https://exodra.org/docs/guides/jsx) for the full dialect.

## Composing a backend

`new ExoDomBackend()` takes no arguments. Capabilities are added by wrapping it in
`with*` decorators; each one merges its entries onto the same object and adds
them to its type, so a capability you did not compose does not exist at runtime
or in the type. Order among the packs does not matter.

```ts
import {
    ExoDomBackend,
    withExoChildList,
    withExoCompiler,
    withExoDefaults,
    withExoForeignNamespaces,
    withExoHydration,
} from '@exodra/dom';

export const backend = withExoHydration(
    withExoChildList(withExoForeignNamespaces(withExoCompiler(withExoDefaults(new ExoDomBackend()))))
);
```

| Pack | What it adds | Without it |
| --- | --- | --- |
| `withExoCompiler` | `schema`, `buildRoot`, `mountRoot`, `render` | no entry point; a page that ships prebuilt schemas leaves it out |
| `withExoChildList` | `c.childList(port)`, needed by reconciled lists, keyed lists and router outlets | `c.childList` throws [EXO0109](https://exodra.org/docs/errors#exo0109) |
| `withExoForeignNamespaces` | SVG and MathML namespaces, case fix-ups (`viewBox`), `xlink:href` | a schema with `<svg>`, `<math>` or an SVG-only tag throws [EXO0108](https://exodra.org/docs/errors#exo0108) |
| `withExoHydration` | `adoptRoot`, `hydrate` (needs `withExoCompiler`) | no hydration code in the bundle |
| `withExoDefaults` | the recommended safety bundle; today `withExoReclaimingText` | |
| `withExoReclaimingText` | a text writer that recovers when a translator or extension replaces the Text node | updates land on a node that is no longer shown |
| `withExoPropertyWriters(base, takesOver?)` | custom-element ports written as JS properties instead of attributes | values are stringified by `setAttribute` |

The event strategy is the `events` field, replaced with `composeExoPlugins` from
`@exodra/core` (see [Events](#events)). The four replaceable fields of a bare
backend are `events`, `writers`, `createInstance` and `createChild`; the
[plugins guide](https://exodra.org/docs/guides/plugins) describes each.

## The exonode

A machine's initial state, wire, transitions, handlers and effects are handed `c`,
the instance's own record (`TExoDomNode`). Methods address ports by name, in any
order.

| Method | What it does |
| --- | --- |
| `attr(port, value)` | fill an attribute port; `null`, `undefined` or `false` removes the attribute, `true` writes it empty |
| `text(port, value)` | fill a text port |
| `unsafeHtml(port, markup)` | fill a children port with raw markup (not escaped) |
| `on(port, handler, subject?)` | put a handler in an event port |
| `one(port, machine, params?)` | place one child instance in a children port; returns the child's exonode |
| `list(port, machine, count)` | place a fixed list of `count` rows, never reconciled |
| `build(machine, index?, params?)` | build one child, placed nowhere; returns its exonode |
| `childList(port)` | the child list of a children port (`withExoChildList`) |
| `provide(token, value)` / `inject(token)` | contexts, see [`@exodra/context`](https://exodra.org/docs/api/core#contexts) |
| `onTeardown(off)` | run `off` when the instance is disposed |
| `portTable()` / `portNodeWriter()` / `portNodeReader()` | address ports by number |

A machine's own state lives in `c.state` (what `createInitialState` returned). A
handler changes it and writes it to ports:

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_EVENT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const PanelPorts = exoPorts({ panelClass: EXO_PORT_ATTR, click: EXO_PORT_EVENT });

const panelSchema = createExoSchema(PanelPorts, (b) => {
    b.el('div', null, (div) => {
        div.attrPort(PanelPorts.panelClass, 'class');
        div.el('button', { type: 'button' }, (button) => {
            button.eventPort(PanelPorts.click, 'click');
            button.text('Toggle');
        });
    });
});
const panelBuilder = createExoMachineBuilder<TExoDomNode, unknown, { open: boolean }>(panelSchema);
panelBuilder.createInitialState(() => ({ open: false }));
function showPanel(c: TExoMachineBuilderNode<typeof panelBuilder>): void {
    c.attr(PanelPorts.panelClass, c.state.open ? 'panel panel--open' : 'panel');
}
panelBuilder.wire((c) => showPanel(c));
panelBuilder.on(PanelPorts.click, (c) => {
    c.state.open = !c.state.open;
    showPanel(c);
});
const Panel = panelBuilder.done();

withExoCompiler(new ExoDomBackend()).render(Panel, document.body);
```

Data that lives outside the machine is followed by an **effect**: it draws once,
subscribes to your data layer, and returns the unsubscribe. The instance stops it
on dispose.

```ts no-check
labelBuilder.effect((c) => {
    showLabel(c);
    return store.onChange(() => showLabel(c));
});
```

There is no binding layer: the effect subscribes to whatever store the
application already has.

## Lists

A list that follows data is `reconcileExoOrder` from `@exodra/list-reconcile`, run
where the data changes, over `c.childList(port)` (opened in `createInitialState`) and
`c.build(...)`. Each row receives its item as the params of its wire.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoMachineBuilderNode } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

type TTask = { readonly id: string; readonly title: string };

let tasks: readonly TTask[] = [{ id: 'a', title: 'First' }];
const taskListeners = new Set<() => void>();
function setTasks(next: readonly TTask[]): void {
    tasks = next;
    taskListeners.forEach((listener) => listener());
}

const TaskPorts = exoPorts({ id: EXO_PORT_ATTR, title: EXO_PORT_TEXT });

const taskSchema = createExoSchema(TaskPorts, (b) => {
    b.el('li', null, (li) => {
        li.attrPort(TaskPorts.id, 'data-id');
        li.textPort(TaskPorts.title);
    });
});
const taskBuilder = createExoMachineBuilder<TExoDomNode, TTask>(taskSchema);
taskBuilder.wire((c, task) => {
    c.attr(TaskPorts.id, task.id);
    c.text(TaskPorts.title, task.title);
});
const Task = taskBuilder.done();

const BoardPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const boardSchema = createExoSchema(BoardPorts, (b) => {
    b.el('ul', { class: 'board' }, (ul) => {
        ul.childrenPort(BoardPorts.rows);
    });
});
type TBoardState = { rows: TExoChildList; shown: TTask[] };
const boardBuilder = createExoMachineBuilder<TExoDomNode, unknown, TBoardState>(boardSchema);
boardBuilder.createInitialState((c) => ({ rows: c.childList(BoardPorts.rows), shown: [] }));
function showTasks(c: TExoMachineBuilderNode<typeof boardBuilder>): void {
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, tasks, tasks, (task, at) =>
        c.build(Task, at, task)
    );
}
boardBuilder.effect((c) => {
    showTasks(c);
    const listener = (): void => showTasks(c);
    taskListeners.add(listener);
    return () => {
        taskListeners.delete(listener);
    };
});
const Board = boardBuilder.done();

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
backend.render(Board, document.body);

setTasks([...tasks, { id: 'b', title: 'Second' }]);
```

Rows are reconciled by **object identity**: a row that survives an update keeps
its element and subscriptions, and a row that leaves is disposed. For data without
stable identity, the keyed list (`EXO_KEYED_LIST_VOCABULARY`, `c.keyedList`) in
`@exodra/list-reconcile` reconciles by key. A list whose contents never change is
`c.list(port, machine, count)`, which pays for no diff and no row records. See the
[Lists guide](https://exodra.org/docs/guides/lists).

`TExoChildList` is `insert`, `move`, `remove`, `removeAll`, `at`, `size`, and the
pair `detach` / `attach` (plus `detachAll`), which take a child out and put it back
without unmounting or disposing it. `exoNodeDom(child).node` is the element behind
a child.

## Build, then mount

`render` is `mountRoot(buildRoot(machine, params), parent)`, and both halves are
public:

```ts
import {
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
    wireExoNode,
} from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const TitlePorts = exoPorts({ text: EXO_PORT_TEXT });

const titleSchema = createExoSchema(TitlePorts, (b) => {
    b.el('h1', null, (h1) => {
        h1.textPort(TitlePorts.text);
    });
});
const titleBuilder = createExoMachineBuilder<TExoDomNode, string>(titleSchema);
titleBuilder.wire((c, title) => {
    c.text(TitlePorts.text, title);
});
const Title = titleBuilder.done();

const backend = withExoCompiler(new ExoDomBackend());
const node = backend.buildRoot(Title, 'Draft');
const dispose = backend.mountRoot(node, document.body);

wireExoNode(node, Title, 'Published');
```

`buildRoot` runs the initial state and the wire and starts the effects, placed in
no document. `mountRoot` inserts it and returns the disposer. `wireExoNode` re-runs
the wire with new params on the same elements; a wire that places children
(`childList`, `one`, `list`) throws [EXO0103](https://exodra.org/docs/errors#exo0103)
when re-run, so place children in `createInitialState`.

## Hydration

`withExoHydration` adds `hydrate(machine, parent, params?)`, with the same
arguments and disposer as `render`, and `adoptRoot(machine, parent, params?)`,
the adopting twin of `buildRoot`.

```ts
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoCompiler, withExoHydration } from '@exodra/dom';
import type { TExoMachine, TExoWiring } from '@exodra/core';

declare const App: TExoMachine<TExoWiring>;

const html = new ExoStrBackend().render(App);

const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
const dispose = backend.hydrate(App, document.getElementById('root') as HTMLElement);
```

Hydration adopts one instance out of `parent`'s first element child and walks the
served nodes instead of cloning. Every fill compares what the server printed with
the client's value and writes only where they differ. A reconciled child list
adopts the served rows on its first pass and removes the rows the client's data
no longer has. Events are attached with the backend's own `events` strategy.

`findExoRowDisagreement(machine, root, backend)` reports, in words, the first place
an element does not match a machine's schema, or `null`. See
[SSR & hydration](https://exodra.org/docs/guides/ssr).

## Events

| Strategy | Behaviour |
| --- | --- |
| `EXO_DIRECT_EVENTS` | one listener per element (the default) |
| `createExoDelegatedEvents(names, options?)` | one listener per event name on the root, serving every row |

```ts
import { composeExoPlugins } from '@exodra/core';
import { ExoDomBackend, createExoDelegatedEvents, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';

declare const App: TExoDomMachine;

const DELEGATED = createExoDelegatedEvents(['click']);

const backend = composeExoPlugins(withExoCompiler(new ExoDomBackend()), {
    events: () => DELEGATED,
});

backend.render(App, document.body);
```

The delegated strategy refuses:

- a handler with no `subject` (`c.on(port, handler)` without the third argument):
  the subject is how one shared handler learns which row fired;
- events that do not bubble (`EXO_NON_BUBBLING_EVENTS`);
- high-frequency events (`mousemove`, `pointermove`, `pointerrawupdate`,
  `touchmove`, `wheel`, `mousewheel`, `drag`, `dragover`), unless the call says
  `createExoDelegatedEvents(['pointermove'], { allowHighFrequency: true })`.

A third-party strategy implements `TExoEventsApi` from the exported pieces listed
in the [API reference](#api-reference).

## Writers

`withExoPropertyWriters(base, takesOver?)` writes a custom element's ports as
JavaScript properties, so arrays, dates and callbacks reach the element. The
default predicate `takesOverExoProperty(name, proto)` takes a port only when the
tag contains a hyphen, the name is not in `EXO_GLOBAL_ATTRIBUTES` (`class`,
`style`, `id`, ...), and the name contains no `-` or `:`. A taken-over port keeps
its live writer during hydration, because the markup cannot carry a property.

`withExoReclaimingText` re-reads the element's first child on every text write and
falls back to `textContent` when a translator or extension has replaced the Text
node. The fallback replaces everything inside that element.

## Foreign elements

`exoForeignNode(c, element, hooks?)` wraps an element this renderer did not make
(a widget, another framework's root) as a child a child list can hold.
`hooks.onMount` runs after the element is placed and `hooks.onUnmount` while it is
still attached. From `onMount` until `onUnmount` returns, the element must stay a
direct child of the parent the list put it in. On an initial build `onMount` may
run before the instance is in the page, so code that needs layout should wait for
`connectedCallback`, a frame or a `ResizeObserver`.

A machine that must also run on the server asks the exonode instead:
`c.foreign({ createDom, createStr })`, after composing `EXO_DOM_FOREIGN_VOCABULARY`
onto the DOM backend and `EXO_STR_FOREIGN_VOCABULARY` (from `@exodra/string`) onto
the server one with `composeExoPlugins`. Each backend reads its own field.

## Teardown

Inside a machine, `c.onTeardown(off)` registers cleanup with the instance:

```ts
import type { TExoDomNode } from '@exodra/dom';

export function startTicker(c: TExoDomNode, tick: () => void): void {
    const id = setInterval(tick, 1000);
    c.onTeardown(() => clearInterval(id));
}
```

`exoTeardownScope(fn)` and `exoOnTeardown(child, off)` are the same mechanism for
code that mounts instances by hand with `mountExoInstance`.

## Limits

- **Hydration replaces, it does not wrap.** A pack that wraps `attr`, `text`,
  `unsafeHtml`, `on`, `one`, `list`, `build`, `childList` or the port readers and
  writers governs client renders only; on an adopted page the hydration bodies run
  instead.
- **Two child lists directly next to each other, with no element between them,
  cannot hydrate** ([EXO0035](https://exodra.org/docs/errors#exo0035)). Put a static
  element between them, or render that component on the client.
- **When hydrating, a port on a static element between two children ports is
  refused at compile time**, and children ports separated by a static must be
  filled in document order. A client render accepts both.
- **`c.list` on an adopted page takes exactly `count` rows.** If the markup holds
  fewer it throws; extra served rows are left in place.
- **Two components with the same element skeleton are indistinguishable** to
  hydration: if the server printed the other one, its static text stays and every
  port is repaired.
- **The server has no property-writers pack**: a port value written as a property
  in the browser is printed through its string form by `@exodra/string`.
- **There is no element recycling.** Every instance's element is a clone of its
  schema's prototype (`cloneExoNode`). Keeping a subtree alive is `detach` /
  `attach` on a child you hold.
- **Contexts do not cross separate renders.** A second `render()` into an element
  another render provided into starts with an empty context.

## API reference

Backend and packs:

- `class ExoDomBackend` — `new ExoDomBackend()`; types `TExoDomBackend`, `TExoDomBackendConstructor`, `TExoDomApi`
- `withExoCompiler(base): base & TExoCompilerApi` — adds `schema(machine)`, `render(machine, parent, params?)`, `buildRoot(machine, params?)`, `mountRoot(node, parent)`
- `withExoHydration(base): base & TExoHydrationApi` — adds `hydrate(machine, parent, params?)`, `adoptRoot(machine, parent, params?)`, `hydrateSurface`, `parserStability`; `TExoHydrateBackend` is the structural type of a backend that can hydrate
- `withExoChildList(base): base` — adds `c.childList(port)`
- `withExoForeignNamespaces(base): base & { foreignNamespaces: TExoForeignNamespaces }`
- `withExoDefaults(base): base` — the safety bundle
- `withExoReclaimingText(base): base`, `createExoReclaimingTextWriters(next): TExoWritersApi`, `exoReclaimingText: TExoDomSetter`
- `withExoPropertyWriters(base, takesOver?): base`, `createExoPropertyWriters(next?, takesOver?): TExoWritersApi`, `takesOverExoProperty(name, proto): boolean`, `EXO_GLOBAL_ATTRIBUTES`
- `EXO_SHIPPED_WRITERS: TExoWritersApi` — the default `writers`

Exonode and machines:

- types `TExoDomNode`, `TExoDomRenderNode`, `TExoDomSurface`, `TExoDomNodeApi`, `TExoDomMachine`, `TExoDomMark`, `TExoDomInstanceRecord`
- `EXO_DOM_NODE_VOCABULARY` — the exonode methods as the pack a backend merges onto itself
- `provideExoContext(below, token, value): TExoContextFrame` — extend a context chain outside an instance

Children:

- `createExoChildList(parent, order, end, ownsParent): TExoChildList`; types `TExoChildList`, `TExoDomChild`
- `exoNodeDom(child): TExoDomChild` — the record (and `.node` element) behind a child
- `dropExoChild(child, parent): void`, `clearOwnedExoChildList(order, parent): void`, `assertBuiltExoChild(): never`

Foreign elements:

- `exoForeignNode(c, element, hooks?): TExoNode<TExoDomMark>`; type `TExoForeignHooks` `{ onMount?, onUnmount? }`
- `EXO_DOM_FOREIGN_VOCABULARY` — the pack that adds `c.foreign(t)`; type `TExoDomForeignApi`

Hydration:

- types `TExoHydrateNode`, `TExoHydrateSurface`, `TExoHydrateSchema`; `EXO_HYDRATE_NODE_VOCABULARY`
- `findExoRowDisagreement(machine, root, backend): string | null`
- `describeExoNode(node): string` — names a node the way markup reads

Schemas, for custom entry points:

- `compileExoDomSchema(declaration, backend): TExoDomSchema`
- `exoDomSchemaOf(machine, backend): TExoDomSchema` — compiled on first use, cached per backend
- `exoDomJsonDeclaration(schema): TExoDomJsonDeclaration` and `createExoDomSchema(declaration, backend): TExoDomSchema` — ship schemas from a build and load them without the compiler
- `mountExoSchema(schema, machine, parent, backend, params?): () => void`
- `mountExoInstance(schema, machine, index, parent, before, ownerChild, context?, params?): Element`
- `createExoNode(schema, root, machine, index, ownerChild, holder, context?, params?): void`
- `cloneExoNode(schema): Element`
- `EXO_WALK_FIRST_CHILD`, `EXO_WALK_NEXT_SIBLING`, `EXO_WALK_FROM_END` — walk operations
- types `TExoDomSchema`, `TExoDomSetter`, `TExoDomJsonDeclaration`

Teardown:

- `exoTeardownScope(fn): () => void`, `exoOnTeardown(child, off): void`

Events:

- `EXO_DIRECT_EVENTS: TExoEventsApi`, `createExoDelegatedEvents(names, options?): TExoEventsApi`; type `TExoDelegatedEventsOptions` `{ allowHighFrequency? }`
- building blocks for a custom strategy: `exoEventSlotsFor(packId, event)`, `createExoEventPortData(slots, listener)`, `attachExoDirectEvent`, `attachExoDelegatedEvent`, `installExoDelegatedRoot(root, rootKey, slots)`, `createExoDelegatedListener(root, slots)`, `assertExoSubject(event)`, `EXO_DIRECT_PACK_ID`, `EXO_NON_BUBBLING_EVENTS`, `EXO_HIGH_FREQUENCY_EVENTS`
- types `TExoEventsApi`, `TExoEventAttacher`, `TExoEventPortData`, `TExoEventSlots`, `TExoDelegatedRoot`, `TExoWritersApi`

## Further reading

- [DOM API](https://exodra.org/docs/api/dom) and [Core API](https://exodra.org/docs/api/core)
- [Plugins](https://exodra.org/docs/guides/plugins), [Lists](https://exodra.org/docs/guides/lists), [SSR & hydration](https://exodra.org/docs/guides/ssr)
- [Error codes](https://exodra.org/docs/errors)

## License

MIT
