---
sidebar_position: 1
title: Getting Started
---

# Getting Started with Exodra

Exodra is a fine-grained, no-virtual-DOM UI runtime. A component is **one value
carrying two halves**: a _schema_ — the shape, built once when the module loads —
and a _wiring function_ — run once per instance, which puts values into the
**ports** the schema declared.

Nothing is diffed and nothing is walked at render time. The walk happens once,
at definition time; a render is a clone of a prepared element plus one indirect
call per port. The same wiring function runs on the server, on a client render
and through hydration.

## Installation

```bash
npm install @exodra/core @exodra/context @exodra/dom @exodra/list-reconcile
```

That is the whole setup. Components are plain function calls, so **no compiler,
no Babel plugin and no JSX transform is required**.

(For server rendering, add `@exodra/string`.)

## Your first component

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

const HelloPorts = exoPorts({ who: EXO_PORT_TEXT });

// The SCHEMA: runs once, at module load. Static attributes and static text
// are folded into the prepared markup and cost nothing per instance.
const helloSchema = createExoSchema(HelloPorts, (b) => {
    b.el('p', { class: 'hello' }, (p) => {
        p.text('Hello, ');
        p.el('strong', null, (strong) => {
            strong.textPort(HelloPorts.who);
        });
    });
});

// The MACHINE: createExoMachine makes the base, and each decorator composeExoMachine
// applies adds one part — here withExoWire, whose wire writes the ports by identity. A
// machine that keeps state declares it with the createInitialState option of
// createExoMachine, which is handed the exonode and the params it was built with — there
// are no props.
const helloMachine = composeExoMachine(createExoMachine<TExoMachineNode>(helloSchema), (m) =>
    withExoWire(m, (c) => {
        c.text(HelloPorts.who, 'world');
    })
);

// ONE backend for the whole application, built at module level. A backend is what
// you render FROM, and it is also the plan cache key — see below. `render` exists
// because `withExoCompiler` is composed in: a bare backend has no compiler and
// cannot turn a declaration into a prototype.
const backend = withExoCompiler(new ExoDomBackend());

const root = document.getElementById('app') as HTMLElement;
const dispose = backend.render(helloMachine, root);

// Tearing the render down stops everything it started:
dispose();
```

`backend.render` mounts **one** instance and appends it to whatever the parent
already holds. It takes **no count**: a lone root has nothing else to be about.
Rows that vary are a **list** — a children port filled by `c.list` (fixed, one row
per element of the array it is handed) or by a reconciler from
`createExoChildrenReconciler` (live), and each row is handed its item as its params.

**Build the backend once, at module level.** It is the key a compiled schema plan
is cached under, and it is compared by pointer — a backend constructed inside a
component or a render loop is a fresh key every time and recompiles every schema,
markup parse included.

Three ideas do most of the work:

-   `el()` / `text()` declare what **never changes**. It is baked into the markup.
-   `exoPorts({ … })` declares the **places** a value may be put later, and
    `attrPort()` / `textPort()` / `eventPort()` / `childrenPort()` set each one in
    the markup.
-   `c.attr` / `c.text` / `c.on` **fill** those places, naming them by identity —
    so the machine cannot count wrong and never looks anything up. Keeping a place
    in step with outside data is an **effect** that draws it once, then
    subscribes, and returns the unsubscribe.

## A counter

State that belongs to the instance is **machine state**: the `createInitialState`
option of `createExoMachine` returns it once per instance, a handler changes it, and `showCount` — a plain
function over the instance — writes it to the ports. The wire calls it once for
the first paint. `withExoWire` and `withExoHandlers` each add one part to the base
machine, and `composeExoMachine` applies them in the order written.

```ts
import {
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const CounterPorts = exoPorts({ dec: EXO_PORT_EVENT, inc: EXO_PORT_EVENT, text: EXO_PORT_TEXT });

const counterSchema = createExoSchema(CounterPorts, (b) => {
    b.el('div', { class: 'counter' }, (div) => {
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            btn.eventPort(CounterPorts.dec, 'click');
            btn.text('−');
        });
        div.el('span', null, (span) => {
            span.textPort(CounterPorts.text);
        });
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            btn.eventPort(CounterPorts.inc, 'click');
            btn.text('+');
        });
    });
});
const counterBase = createExoMachine(counterSchema, {
    createInitialState: (_c: TExoDomNode, _params: unknown) => ({ count: 0 }),
});
function showCount(c: TExoMachineNodeOf<typeof counterBase>): void {
    c.text(CounterPorts.text, c.state.count);
}
const counterMachine = composeExoMachine(
    counterBase,
    (m) =>
        withExoWire(m, (c) => {
            showCount(c);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(CounterPorts.dec, (c) => {
                c.state.count--;
                showCount(c);
            });
            on(CounterPorts.inc, (c) => {
                c.state.count++;
                showCount(c);
            });
        })
);

backend.render(counterMachine, document.getElementById('app') as HTMLElement);
```

Data that lives **outside** the instance — a store, a socket, a database — is
followed by an **effect**: it draws once, then subscribes, and
returns the unsubscribe, which runs when the instance leaves. The list below
does exactly that.

## A list

A list is a **children port** kept equal to an array of your own data by the
machine. The row component turns each item into an element, and the
reconciler works by **object identity** — a row that survives an update is the
same element it was. No keys.

```ts
import {
    EXO_PORT_ATTR,
    EXO_PORT_CHILDREN,
    EXO_PORT_EVENT,
    EXO_PORT_TEXT,
    composeExoMachine,
    createExoMachine,
    createExoSchema,
    exoPorts,
    withExoEffects,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type { TExoMachineNodeOf } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

const backend = withExoCompiler(new ExoDomBackend());

type TTodo = { readonly text: string; done: boolean };

const todos = {
    items: [] as readonly TTodo[],
    listeners: new Set<() => void>(),
    getValue(): readonly TTodo[] {
        return this.items;
    },
    add(text: string): void {
        this.items = [...this.items, { text, done: false }];
        for (const listener of Array.from(this.listeners)) listener();
    },
    onChange(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    },
};

// A MACHINE IS HANDED PARAMS, NOT PROPS — here the item itself, which the reconciler
// passes and the row keeps as its state.
const TodoPorts = exoPorts({ toggle: EXO_PORT_EVENT, checked: EXO_PORT_ATTR, text: EXO_PORT_TEXT });

const todoSchema = createExoSchema(TodoPorts, (b) => {
    b.el('li', null, (li) => {
        li.el('input', { type: 'checkbox' }, (input) => {
            input.attrPort(TodoPorts.checked, 'checked');
            input.eventPort(TodoPorts.toggle, 'change');
        });
        li.el('span', { class: 'todo__text' }, (span) => {
            span.textPort(TodoPorts.text);
        });
    });
});
const todoBase = createExoMachine(todoSchema, {
    createInitialState: (_c: TExoDomNode, todo: TTodo) => todo,
});
function showDone(c: TExoMachineNodeOf<typeof todoBase>): void {
    c.attr(TodoPorts.checked, c.state.done);
}
const todoMachine = composeExoMachine(
    todoBase,
    (m) =>
        withExoWire(m, (c) => {
            c.text(TodoPorts.text, c.state.text);
            showDone(c);
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(TodoPorts.toggle, (c) => {
                c.state.done = !c.state.done;
                showDone(c);
            });
        })
);

// A LIVE LIST IS A COMPOSITION, not a door. The children port is the backend's half —
// it holds whatever is put in it — and the reconciler is the strategy over it, from a
// package no backend imports. Swapping the strategy is swapping this one call.
const reconcileTodos = createExoChildrenReconciler<TTodo>(todoMachine);

const TodoAppPorts = exoPorts({ rows: EXO_PORT_CHILDREN });

const todoAppSchema = createExoSchema(TodoAppPorts, (b) => {
    b.el('div', { class: 'todo-app' }, (div) => {
        div.el('ul', null, (ul) => {
            ul.childrenPort(TodoAppPorts.rows);
        });
    });
});
const todoAppBase = createExoMachine(todoAppSchema, {
    createInitialState: (_c: TExoDomNode, _params: unknown) => ({}),
});
function showRows(c: TExoMachineNodeOf<typeof todoAppBase>): void {
    reconcileTodos(c, TodoAppPorts.rows, todos.getValue());
}
const todoAppMachine = composeExoMachine(todoAppBase, (m) =>
    withExoEffects(m, (effect) => {
        effect((c) => {
            showRows(c);
            return todos.onChange(() => showRows(c));
        });
    })
);

backend.render(todoAppMachine, document.getElementById('app') as HTMLElement);

// Changing the data reconciles the rows in place.
todos.add('Write the docs');
```

The reconciler is created once, at module level, from the row machine. For a new item it
makes a row with `c.createExoNode(todoMachine)` and wires it with the item as its params —
`createInitialState`, then the wire. A row whose item stays keeps its element and its
subscriptions, and a row whose item left is destroyed. It remembers what it showed in each
node and port itself, so the machine keeps no `shown` array and opens nothing in
`createInitialState`. For a filtered view, hand it the subset: rows are matched by the item
objects, so a row the filter keeps is the same element it was. For data without stable
objects, key it: `createExoChildrenReconciler<TTodo>(todoMachine, { key: (t) => t.text })`.
Placing children by hand, outside a reconciler, is [Children](./guides/children.md).

## Server rendering

The **same component** renders to markup on the server and is adopted in the
browser:

```ts
import { ExoStrBackend } from '@exodra/string';
import { ExoDomBackend, withExoHydration, withExoCompiler } from '@exodra/dom';
import type { TExoMachine, TExoMachineNode } from '@exodra/core';

// ONE type, not an intersection of two backends'. `TExoMachineNode` is the surface
// all three backends share, and a machine named that way IS a
// `TExoStrMachine` and a `TExoDomMachine` — both of those are
// this same generic with a backend's node TYPE in it, and a transition's node
// parameter is contravariant.
declare const appMachine: TExoMachine<TExoMachineNode>;

// server:
const html = new ExoStrBackend().render(appMachine);

// browser: `hydrate` exists only on a backend composed with the hydration plugin.
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
const root = document.getElementById('app') as HTMLElement;
const dispose = backend.hydrate(appMachine, root);
```

The two backends have the same shape, so a page switches sides by switching which
one it holds rather than by learning a second calling convention: `render` and
`hydrate` take the same component and the same parent, and both return the same
disposer.

**Hydration is a plugin, not a method.** A backend composed without
`withExoHydration` has no `hydrate` at all — not at runtime and not in its
type, so calling it is a compile error rather than a call landing on `undefined`.
That is deliberate: the adopters are weight a client-only bundle should never
carry, and composing them onto the _same_ backend that renders is what stops a
page from hydrating with a different composition than it rendered with.

See the [SSR & Hydration guide](./guides/ssr.md).

## Where to go next

-   [Components guide](./guides/components.md) — the full authoring story:
    composition, contexts, cleanup, event descriptors.
-   [Core API](./api/core.md) — every export, and what each is for.
-   [DOM renderer](./api/dom.md) / [String renderer](./api/string.md) — the two
    backends.

## Scaffolding a project

```bash
npm create exodra@latest my-app
cd my-app
npm run dev
```

You'll be prompted for a few choices — **TypeScript**, **ESLint**, **Tailwind
CSS**, a **`src/` directory**, **SSR**, the **App Router**, and a **custom import
alias** — and each has a matching flag (`--typescript`, `--tailwind`, `--eslint`,
`--src-dir`, `--ssr`, `--app`, `--import-alias <alias>`) so you can skip the
questions in CI.

What it writes is the code above: `createExoSchema` plus `createExoMachine` and
`composeExoMachine`, no JSX,
and therefore no compiler in the loop.

## The JSX path

JSX is optional, and it writes one half of a component: the **schema
declaration**, markup plus named ports. `exoJsx<TPorts>(($) => <markup/>)` is
compiled to a module-level `createExoNamedSchema()` call, and the machine around
it is the same machine you have been writing — it fills the ports by name through
the schema's `.ports` (`counterSchema.ports` below). A declaration holds no values, no closures and no components:

| Written                                      | Means                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `class="row"`, `tabindex={0}`, `disabled`    | markup, folded into the schema                                                                                                                                            |
| `data-id={$.id}`                             | attribute port `id`, filled with `c.attr`                                                                                                                                 |
| `<span>{$.title}</span>`                     | text port `title` — the element's only child — filled with `c.text`                                                                                                       |
| `onClick={$.toggle}`, `on:dblclick={$.edit}` | event port, handled with `on` inside `withExoHandlers`                                                                                                                    |
| `ref={$.box}`                                | ref port                                                                                                                                                                  |
| `unsafeHtml={$.body}`                        | children port filled with `c.unsafeHtml`                                                                                                                                  |
| `<$.rows />`                                 | children port, filled with `c.one`, `c.list`, a `createExoChildrenReconciler` reconciler, or the port methods (`c.appendChild`, …) — see [Children](./guides/children.md) |

Any other expression is a compile error, and so is a component tag such as `<Row />`.

```bash
npm install @exodra/core @exodra/dom @exodra/jsx
npm install -D babel-preset-exodra
```

```javascript
// babel.config.js
module.exports = { presets: ['exodra'] };
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@exodra/jsx/schema"
  }
}
```

A counter with its schema written in JSX:

```tsx
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers, withExoWire } from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const counterSchema = exoJsx<{ count: TExoTextPort; increment: TExoEventPort }>(($) => (
  <button class="counter" type="button" onClick={$.increment}>
    <span>{$.count}</span>
  </button>
));
const CounterPorts = counterSchema.ports;

type TCounterState = { n: number };

export const counterMachine = composeExoMachine(
  createExoMachine(counterSchema, {
    createInitialState: (_c: TExoMachineNode, _params: unknown): TCounterState => ({ n: 0 }),
  }),
  (m) =>
    withExoWire(m, (c) => {
      c.text(CounterPorts.count, c.state.n);
    }),
  (m) =>
    withExoHandlers(m, (on) => {
      on(CounterPorts.increment, (c) => {
        c.state.n += 1;
        c.text(CounterPorts.count, c.state.n);
      });
    })
);
```

See the [JSX guide](./guides/jsx.md) for the whole dialect, a list reconciled with
`createExoChildrenReconciler`, and everything it refuses.

## Development server and build

```bash
npm run dev    # http://localhost:5173
npm run build  # optimized bundle in dist/
```
