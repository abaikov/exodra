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
import { createExoMachineBuilder } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

interface TCounterPorts {
    step: TExoAttrPort;
    count: TExoTextPort;
    increment: TExoEventPort;
}

const COUNTER_SCHEMA = exoJsx<TCounterPorts>(($) => (
    <div class="counter" data-step={$.step}>
        <span class="counter__value">{$.count}</span>
        <button type="button" onClick={$.increment}>
            +
        </button>
    </div>
));
const P = COUNTER_SCHEMA.ports;

type TCounterState = { n: number };

const m = createExoMachineBuilder<TExoMachineNode, unknown, TCounterState>(COUNTER_SCHEMA);
m.createInitialState((c): TCounterState => {
    c.attr(P.step, 1);
    c.text(P.count, 0);
    return { n: 0 };
});
const show = m.transition((c) => {
    c.text(P.count, c.state.n);
});
m.on(P.increment, (c) => {
    c.state.n += 1;
    show(c);
});
export const COUNTER = m.done();
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
});

const COUNTER_SCHEMA = _s0;
```

Every port is created under the name written after `$.`, so
`COUNTER_SCHEMA.ports.count` is the text port and `COUNTER_SCHEMA.ports.increment`
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

declare const COUNTER: TExoDomMachine;

const backend = withExoCompiler(new ExoDomBackend());

backend.render(COUNTER, document.body);
```

## The dialect

A declaration holds **markup and named ports, and nothing else**. Every JSX form
maps to exactly one schema call:

| written in JSX | what it is | schema call | filled by the machine with |
| --- | --- | --- | --- |
| `class="row"`, `tabindex={0}`, `disabled` | markup | folded into `el(tag, attrs)` | — |
| plain text between tags | markup | `text('…')` | — |
| `data-id={$.id}` | attribute port `id` | `port('data-id', 'id')` | `c.attr(P.id, value)` |
| `<span>{$.label}</span>` | text port `label` | `textPort('label')` | `c.text(P.label, value)` |
| `onClick={$.toggle}` | event port `toggle`, event `click` | `eventPort('click', 'toggle')` | `m.on(P.toggle, handler)` |
| `on:dblclick={$.edit}` | event port `edit`, event `dblclick` | `eventPort('dblclick', 'edit')` | `m.on(P.edit, handler)` |
| `ref={$.box}` | ref port `box` | `refPort('box')` | read, never written |
| `<div unsafeHtml={$.body} />` | children port `body` | `childrenPort('body')` | `c.unsafeHtml(P.body, markup)` |
| `<$.rows />` | children port `rows` | `childrenPort('rows')` | `c.one`, `c.list`, or `c.childList` + `reconcileExoOrder` |

### Literal attributes are markup

```tsx
import { exoJsx } from '@exodra/jsx';

export const CHECKBOX_SCHEMA = exoJsx(() => (
    <input type="checkbox" tabindex={0} checked disabled={false} />
));
```

A string, a number, a boolean, or a bare attribute meaning `true`. It is folded
into the schema and never touched again. A declaration with no ports takes no
parameter.

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

export const GREETING_SCHEMA = exoJsx<{ name: TExoTextPort }>(($) => (
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

The handler is attached by the machine, `m.on(P.toggle, (c, event) => …)`: one
function for every instance, with the instance as `c`. This is also the form
[`createExoDelegatedEvents`](../api/dom.md#events-as-a-plugin) serves with one
root listener per event name.

### `ref={$.name}` is a ref port

A reference to the element and no way to write to it — see
[`refPort()`](../api/core.md).

### `unsafeHtml={$.name}`

Declares a children port standing for the element's whole content, which the
machine fills with unescaped markup through `c.unsafeHtml(P.name, markup)`.
Nothing on this path escapes and nothing sanitises — see
[Security](../security.md). An element with `unsafeHtml` takes no children.

### `<$.name />` is a children port

A schema has no notion of a component. Where other components' instances stand,
the declaration names a **children port**, and it may stand between static
siblings:

```tsx
import { exoJsx } from '@exodra/jsx';
import type { TExoChildrenPort } from '@exodra/core';

export const PANEL_SCHEMA = exoJsx<{ body: TExoChildrenPort }>(($) => (
    <section class="panel">
        <h3>Panel</h3>
        <$.body />
        <footer>end</footer>
    </section>
));
```

The tag takes no attributes and no children. The machine fills it with one of
three calls, and the choice is a choice of cost:

| call | what it is | pays for diffs |
| --- | --- | --- |
| `c.one(P.body, MACHINE, params?)` | one instance, for the life of this one | no |
| `c.list(P.rows, MACHINE, count)` | a fixed number of instances, each built with its index | no |
| `c.childList(P.rows)` + `reconcileExoOrder` | a list that changes, reconciled by identity | yes |

## A list

The changing list is a children port whose child list the machine keeps in its
state and reconciles inside a transition with `reconcileExoOrder` from
`@exodra/list-reconcile`. Rows are matched by **identity of the item**: a row
that survives an update is the same element with the same instance.

```tsx
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder } from '@exodra/core';
import type {
    TExoAttrPort,
    TExoChildrenPort,
    TExoEventPort,
    TExoMachineNode,
    TExoTextPort,
} from '@exodra/core';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

type TTask = { id: string; title: string };

const TASK_SCHEMA = exoJsx<{ id: TExoAttrPort; title: TExoTextPort }>(($) => (
    <li class="task" data-id={$.id}>
        <span class="task__title">{$.title}</span>
    </li>
));
const mTask = createExoMachineBuilder<TExoMachineNode, TTask>(TASK_SCHEMA);
mTask.createInitialState(() => null);
mTask.wire((c, task) => {
    c.attr(TASK_SCHEMA.ports.id, task.id);
    c.text(TASK_SCHEMA.ports.title, task.title);
});
const TASK = mTask.done();

const TASK_LIST_SCHEMA = exoJsx<{
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
const P = TASK_LIST_SCHEMA.ports;

type TTaskListState = { rows: TExoChildList; tasks: TTask[]; shown: TTask[] };

const mTaskList = createExoMachineBuilder<TExoDomNode, unknown, TTaskListState>(
    TASK_LIST_SCHEMA
);
mTaskList.createInitialState(
    (c): TTaskListState => ({
        rows: c.childList(P.rows),
        tasks: [
            { id: 't1', title: 'Write the schema' },
            { id: 't2', title: 'Write the machine' },
        ],
        shown: [],
    })
);

const showRows = mTaskList.transition((c) => {
    const state = c.state;
    state.shown = reconcileExoOrder(state.rows, state.shown, state.tasks, state.tasks, (task, at) =>
        c.build(TASK, at, task)
    );
});

mTaskList.effect((c) => {
    showRows(c);
    return null;
});

let nextTask = 3;
mTaskList.on(P.add, (c) => {
    c.state.tasks = [...c.state.tasks, { id: `t${nextTask}`, title: `Task ${nextTask}` }];
    nextTask += 1;
    showRows(c);
});
mTaskList.on(P.reverse, (c) => {
    c.state.tasks = [...c.state.tasks].reverse();
    showRows(c);
});

export const TASK_LIST = mTaskList.done();
```

`reconcileExoOrder(kids, shown, keys, items, build)` takes the child list, the
keys it showed last time, the keys and items to show now, and a `build` for an
item it has not seen; it returns the keys it now shows. Here the item is its own
key. Data from a store reaches the list the same way: an effect subscribes to the
store directly and calls the transition — see [Lists](./lists.md).

## What is refused

There is no runtime under this JSX to defer a decision to, so everything outside
the table above is a **compile error**, naming the element and the fix:

- Any expression other than `$.name`: a closure (`onClick={() => …}`), a value
  (`data-id={item.id}`), a conditional, a template literal, a call.
- A component tag (`<Row />`, `<Ui.Row />`) — declare `<$.rows />` and build the
  instances from the machine. There is no `list=` or `props=` operand.
- Attributes or children on `<$.name />`.
- A fragment (`<></>`), anywhere.
- `{...spread}`.
- A lowercase inline handler, `onclick="…"` — write `onClick={$.name}`.
- A namespace other than `on:`.
- A text port beside other children: `<b>Hi {$.name}</b>` — write
  `<b>Hi <span>{$.name}</span></b>`.
- `unsafeHtml` on an element that also has children.
- The same port name twice. A port is one place in the markup; two places that
  show the same value are two ports the machine writes.
- JSX outside `exoJsx(…)`.
- A declaration that does anything but return one element: statements before
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

Plugin options — all three are for a build that renames things, and most
projects set none of them:

| option | default | what it is |
| --- | --- | --- |
| `schemaSource` | `'@exodra/core'` | where the schema factory is imported from |
| `schemaImport` | `'createExoNamedSchema'` | the exported name of the schema factory |
| `markerName` | `'exoJsx'` | the marker call the plugin compiles away |

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

- [Components](./components.md) — schemas and machines by hand. Everything on
  this page compiles to that.
- [Lists & Reconciliation](./lists.md) — what `reconcileExoOrder` reconciles by.
- [SWC plugin](../tooling/swc-plugin.md) — the same dialect in Rust, with the
  same three options.
