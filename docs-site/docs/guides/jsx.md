---
sidebar_position: 1
title: JSX Guide
---

# JSX in Exodra

Exodra JSX is **not** React JSX, and it is not a template language either. It is
a way of writing a **schema declaration** — the markup of a component and its
named ports — and nothing else. What the ports show, when they change and what
happens on a click is the [machine](./components.md), written in TypeScript
around the declaration.

```tsx
import { exoJsx } from '@exodra/jsx';
import { composeExoMachine, createExoMachine, withExoHandlers } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

interface TCounterPorts {
    step: TExoAttrPort;
    count: TExoTextPort;
    increment: TExoEventPort;
}

const counterSchema = exoJsx<TCounterPorts>(($) => (
    <div class="counter" data-step={$.step}>
        <span class="counter__value">{$.count}</span>
        <button type="button" onClick={$.increment}>
            +
        </button>
    </div>
));
const CounterPorts = counterSchema.ports;

type TCounterState = { n: number };

export const counterMachine = composeExoMachine(
    createExoMachine(counterSchema, {
        createInitialState: (c: TExoMachineNode, _params: unknown): TCounterState => {
            c.attr(CounterPorts.step, 1);
            c.text(CounterPorts.count, 0);
            return { n: 0 };
        },
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

`@exodra/babel-plugin-schema` compiles the `exoJsx(…)` call away. What it
emits is the hand-written form of the same declaration, hoisted to module scope:

```js no-check
import { createExoNamedSchema } from '@exodra/core';

const _s0 = createExoNamedSchema((_b0) => {
    _b0.el('div', { class: 'counter' }, (_b1) => {
        _b1.port('data-step', 'step');
        _b1.el('span', { class: 'counter__value' }, (_b2) => {
            _b2.textPort('count');
        });
        _b1.el('button', { type: 'button' }, (_b2) => {
            _b2.eventPort('click', 'increment');
            _b2.text('+');
        });
    });
}, undefined, {
    dom: { html: '<div class="counter"><span class="counter__value"></span><button type="button">+</button></div>', walk: [/* … */] /* … */ },
    string: { pieces: ['<div class="counter"', '><span class="counter__value">', /* … */], /* … */ },
});

const counterSchema = _s0;
```

The third argument is the declaration **already compiled**. The plugin runs the real
`compileExoDomSchema` and the string compiler over the markup at build time and writes
their results down as data (`TExoDomJsonDeclaration`, `TExoStrJsonDeclaration`). A page
composed with `withExoBuiltSchemas(new ExoDomBackend())` instead of `withExoCompiler(...)`
builds every schema from that data, never runs the markup and ships no compiler at all;
`withExoCompiler` ignores the data and compiles as before. `@exodra/string` uses the data
whenever it is there. The SWC plugin does not do this yet:
it emits the first argument alone, and the backends compile it on first render.

The result of `exoJsx` is a schema, so it is named like one — `counterSchema`.
Every port is created under the name written after `$.`, so
`counterSchema.ports.count` is the text port and `counterSchema.ports.increment`
the event port. The type argument `TCounterPorts` types those names: a port used
in the wrong place, or one the interface does not declare, is a type error.
Without a type argument every `$.name` is accepted and `.ports` is a record of
untyped ports.

The schema is built **once**, when the module loads, however many instances are
rendered from it. Hoisting is not a switch: every backend indexes its prepared
plans by the schema's ports, so a schema rebuilt per render would be a different
program, not a slower one. The output imports `@exodra/core` and nothing else.

The machine is an ordinary machine, so it goes straight into a backend:

```ts
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomMachine } from '@exodra/dom';

declare const counterMachine: TExoDomMachine;

const backend = withExoCompiler(new ExoDomBackend());

backend.render(counterMachine, document.body);
```

## The dialect

A declaration holds **markup and named ports, and nothing else**. Every JSX form
maps to exactly one schema call:

| written in JSX                            | what it is                          | schema call                     | filled by the machine with                                                                |
| ----------------------------------------- | ----------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------- |
| `class="row"`, `tabindex={0}`, `disabled` | markup                              | folded into `el(tag, attrs)`    | —                                                                                         |
| plain text between tags                   | markup                              | `text('…')`                     | —                                                                                         |
| `data-id={$.id}`                          | attribute port `id`                 | `port('data-id', 'id')`         | `c.attr(RowPorts.id, value)`                                                              |
| `<span>{$.label}</span>`                  | text port `label`                   | `textPort('label')`             | `c.text(RowPorts.label, value)`                                                           |
| `onClick={$.toggle}`                      | event port `toggle`, event `click`  | `eventPort('click', 'toggle')`  | `withExoHandlers(m, (on) => on(RowPorts.toggle, handler))`                                |
| `on:dblclick={$.edit}`                    | event port `edit`, event `dblclick` | `eventPort('dblclick', 'edit')` | `withExoHandlers(m, (on) => on(RowPorts.edit, handler))`                                  |
| `ref={$.box}`                             | ref port `box`                      | `refPort('box')`                | read, never written                                                                       |
| `<div unsafeHtml={$.body} />`             | children port `body`                | `childrenPort('body')`          | `c.unsafeHtml(RowPorts.body, markup)`                                                     |
| `<$.rows />`                              | children port `rows`                | `childrenPort('rows')`          | `c.one`, `c.list`, the port methods (`c.appendChild` …), or `createExoChildrenReconciler` |

### Literal attributes are markup

```tsx
import { exoJsx } from '@exodra/jsx';

export const checkboxSchema = exoJsx(() => (
    <input type="checkbox" tabindex={0} checked disabled={false} />
));
```

A string, a number, a boolean, or a bare attribute meaning `true`. It is folded
into the schema and never touched again. A declaration with no ports takes no
parameter.

A `const` string of the same module counts as a literal too, and so does a
template literal made only of literals and such strings:

```tsx
import { exoJsx } from '@exodra/jsx';

const ZONE = 'border:1px solid var(--border);border-radius:8px';

export const panelSchema = exoJsx(($) => (
    <div style={`flex:none;padding:12px;${ZONE}`}>
        <$.rows />
    </div>
));
```

The compiler reads the value at build time, so the schema holds the same string a
hand-written `style="flex:none;padding:12px;border:…"` would: nothing is read when
the page runs. Only a `const` declared by an **earlier statement of this module**
folds.

### Imports and module constants are read once

A value the compiler cannot see at build, such as a CSS Modules class or a token
from another file, still goes straight into the markup when its root is an import
or a module-level `const`:

```tsx no-check
import { exoJsx } from '@exodra/jsx';
import styles from './Row.module.css';
import { PANEL } from './theme';

export const rowSchema = exoJsx(($) => (
    <li class={styles['row-active']} style={PANEL}>
        {$.title}
    </li>
));
```

The expression lands in the element's markup as written and is read when the
schema compiles, once per machine and backend, never per instance. Allowed forms
are a name, `a.b.c`, and `a['x-y']`, rooted at an import or at a `const` declared
by an earlier statement of the module. A `let`, a value local to a function, a
parameter, and a call are refused: after the schema is hoisted to module scope
they would mean something else, or nothing.

What follows from reading the value once:

-   **It does not change.** The markup holds what the value was when the schema
    compiled. Anything that changes is a port.
-   **It is written as a string.** `undefined` from a mistyped CSS Modules key
    becomes `class="undefined"`, and `false` becomes `disabled="false"`. A port
    leaves the attribute out for `null`, `undefined` and `false`; a value read this
    way does not.
-   **There is no build-time form.** The Babel plugin cannot run the markup at build
    when it reads an import, so that declaration ships without the JSON forms, and a
    page rendered with `withExoBuiltSchemas` needs `withExoCompiler` for it.
-   **Hydration does not repair it.** If the server and the client resolve the import
    to different strings, the server's attribute stays.

Children are never read this way: `{ZONE}` as a child is refused.

### `attr={$.name}` is an attribute port

The attribute name is passed through verbatim. The machine writes it with
`c.attr(port, value)`; `null` and `undefined` leave the attribute out.

### `{$.name}` is a text port

A text port is the element's **whole content**, so `{$.name}` must be the only
child of its element. Text that varies beside static text or other elements
goes in an element of its own:

```tsx
import { exoJsx } from '@exodra/jsx';
import type { TExoTextPort } from '@exodra/core';

export const greetingSchema = exoJsx<{ name: TExoTextPort }>(($) => (
    <p class="greeting">
        Hello, <b>{$.name}</b>!
    </p>
));
```

### Event ports: `onClick` and `on:`

`onClick={$.toggle}` declares an event port for `click`: the compiler drops `on`
and lowercases the rest, so `onDblClick` listens for `dblclick` and `onKeyDown`
for `keydown`. `on:` keeps the event name exactly as written — `on:dblclick`,
`on:focusin`, `on:my-thing` — for a name whose case or spelling must survive.
Both forms are typed per DOM event, so `on:clik` is a type error.

The handler is attached by the machine, `on(RowPorts.toggle, (c, event) => …)` inside
`withExoHandlers(m, (on) => …)`: one
function for every instance, with the instance as `c`. This is also the form
[`createExoDelegatedEvents`](../api/dom.md#events-as-a-plugin) serves with one
root listener per event name.

### `ref={$.name}` is a ref port

A reference to the element and no way to write to it — see
[`refPort()`](../api/core.md).

### `unsafeHtml={$.name}`

Declares a children port standing for the element's whole content, which the
machine fills with unescaped markup through `c.unsafeHtml(RowPorts.name, markup)`.
Nothing on this path escapes and nothing sanitises — see
[Security](../security.md). An element with `unsafeHtml` takes no children.

### `<$.name />` is a children port

A schema has no notion of a component. Where other components' instances stand,
the declaration names a **children port**, and it may stand between static
siblings:

```tsx
import { exoJsx } from '@exodra/jsx';
import type { TExoChildrenPort } from '@exodra/core';

export const panelSchema = exoJsx<{ body: TExoChildrenPort }>(($) => (
    <section class="panel">
        <h3>Panel</h3>
        <$.body />
        <footer>end</footer>
    </section>
));
```

The tag takes no attributes and no children. The machine fills it with one of
these calls, and the choice is a choice of cost:

| call                                                                                             | what it is                                                                              | pays for diffs  |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | --------------- |
| `c.one(PanelPorts.body, Machine, params?)`                                                       | one instance, for the life of this one                                                  | no              |
| `c.list(ListPorts.rows, Machine, rows)`                                                          | a fixed list, one instance per element of `rows`, each built with its element as params | no              |
| `createExoChildrenReconciler(Machine)` called with `(c, ListPorts.rows, items)`                  | a list that changes, reconciled by identity                                             | yes             |
| `c.createExoNode(Machine)` + `c.appendChild` / `c.insertChild` / `c.moveChild` / `c.removeChild` | children placed by hand — see [Children](./children.md)                                 | as you write it |

## A list

The changing list is a children port the machine reconciles with a reconciler made
once, at module level, by `createExoChildrenReconciler` from
`@exodra/list-reconcile`. Rows are matched by **identity of the item**: a row
that survives an update is the same element with the same instance.

```tsx
import { exoJsx } from '@exodra/jsx';
import {
    composeExoMachine,
    createExoMachine,
    withExoEffects,
    withExoHandlers,
    withExoWire,
} from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoMachineNodeOf,
    TExoTextPort,
} from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { createExoChildrenReconciler } from '@exodra/list-reconcile';

type TTask = { id: string; title: string };

const taskSchema = exoJsx<{ id: TExoAttrPort; title: TExoTextPort }>(($) => (
    <li class="task" data-id={$.id}>
        <span class="task__title">{$.title}</span>
    </li>
));
const TaskPorts = taskSchema.ports;

const taskMachine = composeExoMachine(
    createExoMachine(taskSchema, {
        createInitialState: (_c: TExoMachineNode, _task: TTask) => null,
    }),
    (m) =>
        withExoWire(m, (c, task) => {
            c.attr(TaskPorts.id, task.id);
            c.text(TaskPorts.title, task.title);
        })
);
const reconcileTasks = createExoChildrenReconciler<TTask>(taskMachine);

const taskListSchema = exoJsx<{
    rows: TExoChildrenPort;
    add: TExoEventPort;
    reverse: TExoEventPort;
}>(($) => (
    <section class="tasks">
        <h2>Tasks</h2>
        <ul class="tasks__list">
            <$.rows />
        </ul>
        <button type="button" onClick={$.add}>
            Add
        </button>
        <button type="button" onClick={$.reverse}>
            Reverse
        </button>
    </section>
));
const TaskListPorts = taskListSchema.ports;

const taskListBase = createExoMachine(taskListSchema, {
    createInitialState: (_c: TExoDomNode, _params: unknown): { tasks: TTask[] } => ({
        tasks: [
            { id: 't1', title: 'Write the schema' },
            { id: 't2', title: 'Write the machine' },
        ],
    }),
});

function showRows(c: TExoMachineNodeOf<typeof taskListBase>): void {
    reconcileTasks(c, TaskListPorts.rows, c.state.tasks);
}

let nextTask = 3;

export const taskListMachine = composeExoMachine(
    taskListBase,
    (m) =>
        withExoEffects(m, (effect) => {
            effect((c) => {
                showRows(c);
                return null;
            });
        }),
    (m) =>
        withExoHandlers(m, (on) => {
            on(TaskListPorts.add, (c) => {
                c.state.tasks = [...c.state.tasks, { id: `t${nextTask}`, title: `Task ${nextTask}` }];
                nextTask += 1;
                showRows(c);
            });
            on(TaskListPorts.reverse, (c) => {
                c.state.tasks = [...c.state.tasks].reverse();
                showRows(c);
            });
        })
);
```

`reconcileTasks(c, port, items)` builds a row of `taskMachine`, wired with the task, for
an item it has not seen, keeps the row of every item that stays, and destroys the rest.
It remembers what it showed in that port, so the machine keeps only its tasks. Data from a store reaches the list the same way: an effect subscribes to the
store directly and calls `showRows` — see [Lists](./lists.md).

## What is refused

There is no runtime under this JSX to defer a decision to, so everything outside
the table above is a **compile error**, naming the element and the fix:

-   Any other expression in an attribute: a closure (`onClick={() => …}`), a value
    local to the function (`data-id={item.id}`), a conditional, a template literal
    with a part that is not a module `const` string, a call.
-   A component tag (`<Row />`, `<Ui.Row />`) — declare `<$.rows />` and build the
    instances from the machine. There is no `list=` or `props=` operand.
-   Attributes or children on `<$.name />`.
-   A fragment (`<></>`), anywhere.
-   `{...spread}`.
-   A lowercase inline handler, `onclick="…"` — write `onClick={$.name}`.
-   A namespace other than `on:`.
-   A text port beside other children: `<b>Hi {$.name}</b>` — write
    `<b>Hi <span>{$.name}</span></b>`.
-   `unsafeHtml` on an element that also has children.
-   The same port name twice. A port is one place in the markup; two places that
    show the same value are two ports the machine writes.
-   JSX outside `exoJsx(…)`.
-   A declaration that does anything but return one element: statements before
    the `return`, a second parameter, a destructured parameter, or a function
    declared elsewhere (`exoJsx(build)`).

## Setup

### Babel

```bash
npm install --save-dev @exodra/babel-plugin-schema
npm install @exodra/jsx
```

`@babel/core` is a peer dependency. The plugin needs JSX parsed with namespaced
attribute names (`on:click`) left alone:

```js
// babel.config.js
module.exports = {
  plugins: [
    ['@babel/plugin-syntax-jsx', { throwIfNamespace: false }],
    '@exodra/babel-plugin-schema',
  ],
};
```

Or through [`babel-preset-exodra`](../tooling/babel-preset.md), which wires the
same thing plus TypeScript in one line:

```js
// babel.config.js
module.exports = { presets: ['exodra'] };
```

The bundler plugins ([Vite](../tooling/vite-plugin.md),
[Rollup, esbuild and Bun](../tooling/bundlers.md)) call the same runner, so a
project using one of them configures nothing else. They forward `schemaSource`;
the preset forwards all three options.

Plugin options — the first three are for a build that renames things, and most
projects set none of them:

| option             | default                  | what it is                                                                                                    |
| ------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `schemaSource`     | `'@exodra/core'`         | where the schema factory is imported from                                                                     |
| `schemaImport`     | `'createExoNamedSchema'` | the exported name of the schema factory                                                                       |
| `markerName`       | `'exoJsx'`               | the marker call the plugin compiles away                                                                      |
| `jsonDeclarations` | `true`                   | compile each declaration at build time and emit its DOM and string forms; `false` emits the declaration alone |

### TypeScript

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@exodra/jsx/schema"
  }
}
```

`@exodra/jsx/schema` carries the types for this dialect: the intrinsic elements
and their attributes, the five port kinds `$` hands out, `onClick`-style and
`on:` event names typed per DOM event, `unsafeHtml` and `ref`.

## The marker at runtime

`exoJsx` is a real export of `@exodra/jsx`, so TSX authors have a symbol to
import and a type to hover. The compiler removes it; if JSX ever reaches the
runtime uncompiled it throws, naming the missing plugin — a build that forgot it
would otherwise render nothing and say nothing.

## Where to go next

-   [Components](./components.md) — schemas and machines by hand. Everything on
    this page compiles to that.
-   [Lists & Reconciliation](./lists.md) — what `createExoChildrenReconciler` reconciles by.
-   [SWC plugin](../tooling/swc-plugin.md) — the same dialect in Rust, with the
    same three options.
