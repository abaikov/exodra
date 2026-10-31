---
sidebar_position: 1
title: Getting Started
---

# Getting Started with Exodra

Exodra is a fine-grained, no-virtual-DOM UI runtime. A component is **one value
carrying two halves**: a *schema* — the shape, built once when the module loads —
and a *wiring function* — run once per instance, which puts values into the
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
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

// The SCHEMA: runs once, at module load. Static attributes and static text
// are folded into the prepared markup and cost nothing per instance.
const HELLO_SCHEMA = createExoSchema((b) => {
    let who!: TExoTextPort;
    b.el('p', { class: 'hello' }, (p) => {
        p.text('Hello, ');
        p.el('strong', null, (strong) => {
            who = strong.textPort();
        });
    });
    // What the builder returns is the schema's ports.
    return { who };
});

// The MACHINE: its wire writes the ports, naming them by identity. A machine that keeps
// state declares it with createInitialState, which is handed the exonode and its INDEX
// among its siblings — there are no props.
const mHello = createExoMachineBuilder<TExoMachineNode>(HELLO_SCHEMA);
mHello.wire((c) => {
    c.text(HELLO_SCHEMA.ports.who, 'world');
});
const HELLO = mHello.done();

// ONE backend for the whole application, built at module level. A backend is what
// you render FROM, and it is also the plan cache key — see below. `render` exists
// because `withExoCompiler` is composed in: a bare backend has no compiler and
// cannot turn a declaration into a prototype.
const backend = withExoCompiler(new ExoDomBackend());

const root = document.getElementById('app') as HTMLElement;
const dispose = backend.render(HELLO, root);

// Tearing the render down stops everything it started:
dispose();
```

`backend.render` mounts **one** instance and appends it to whatever the parent
already holds. It takes **no count**: the initial state receives `0` as its index,
because a lone root has nothing else to be about. Rows that vary are a **list** — a
children port filled by `c.list` (fixed) or by a transition calling
`reconcileExoOrder` over `c.childList(port)` (live), and each row reads its data
by its index.

**Build the backend once, at module level.** It is the key a compiled schema plan
is cached under, and it is compared by pointer — a backend constructed inside a
component or a render loop is a fresh key every time and recompiles every schema,
markup parse included.

Three ideas do most of the work:

- `el()` / `text()` declare what **never changes**. It is baked into the markup.
- `port()` / `textPort()` / `eventPort()` / `childrenPort()` declare a **place**
  a value may be put later.
- `c.attr` / `c.text` / `c.on` **fill** those places, naming them by identity —
  so a transition cannot count wrong and never looks anything up. Keeping a place
  in step with outside data is an **effect** that runs the transition, then
  subscribes, and returns the unsubscribe.

## A counter

State that belongs to the instance is **machine state**: `createInitialState`
returns it once per instance, a handler changes it, and a **transition** writes it
to the ports. The wire runs the transition once for the first paint.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';

const backend = withExoCompiler(new ExoDomBackend());

const COUNTER_SCHEMA = createExoSchema((b) => {
    let dec!: TExoEventPort;
    let inc!: TExoEventPort;
    let text!: TExoTextPort;
    b.el('div', { class: 'counter' }, (div) => {
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            dec = btn.eventPort('click');
            btn.text('−');
        });
        div.el('span', null, (span) => {
            text = span.textPort();
        });
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            inc = btn.eventPort('click');
            btn.text('+');
        });
    });
    return { dec, inc, text };
});
const P = COUNTER_SCHEMA.ports;
const mCounter = createExoMachineBuilder<TExoDomNode, unknown, { count: number }>(COUNTER_SCHEMA);
mCounter.createInitialState(() => ({ count: 0 }));
const showCount = mCounter.transition((c) => {
    c.text(P.text, c.state.count);
});
mCounter.wire((c) => {
    showCount(c);
});
mCounter.on(P.dec, (c) => {
    c.state.count--;
    showCount(c);
});
mCounter.on(P.inc, (c) => {
    c.state.count++;
    showCount(c);
});
const COUNTER = mCounter.done();

backend.render(COUNTER, document.getElementById('app') as HTMLElement);
```

Data that lives **outside** the instance — a store, a socket, a database — is
followed by an **effect**: it runs the transition once, then subscribes, and
returns the unsubscribe, which runs when the instance leaves. The list below
does exactly that.

## A list

A list is a **children port** kept equal to an array of your own data by a
transition. The row component turns each item into an element, and the
reconciler works by **object identity** — a row that survives an update is the
same element it was. No keys.

The reconciler places rows through `c.childList`, which on the DOM backend is a pack:
[`withExoChildList`](./api/dom.md#withexochildlist), composed once where the backend is
built. Without it the first `c.childList` throws [EXO0109](./errors.md#exo0109); a page with
no such list never links it.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoAttrPort, TExoChildrenPort, TExoEventPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));

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

// A MACHINE IS HANDED A NUMBER, NOT PROPS — its position among its siblings. A row reads the
// item at that position out of the same array the list is reconciling.
const TODO_SCHEMA = createExoSchema((b) => {
    let toggle!: TExoEventPort;
    let checked!: TExoAttrPort;
    let text!: TExoTextPort;
    b.el('li', null, (li) => {
        li.el('input', { type: 'checkbox' }, (input) => {
            checked = input.port('checked');
            toggle = input.eventPort('change');
        });
        li.el('span', { class: 'todo__text' }, (span) => {
            text = span.textPort();
        });
    });
    return { toggle, checked, text };
});
const mTodo = createExoMachineBuilder<TExoDomNode, unknown, TTodo>(TODO_SCHEMA);
mTodo.createInitialState((_c, at) => todos.getValue()[at]);
const showDone = mTodo.transition((c) => {
    c.attr(TODO_SCHEMA.ports.checked, c.state.done);
});
mTodo.wire((c) => {
    c.text(TODO_SCHEMA.ports.text, c.state.text);
    showDone(c);
});
mTodo.on(TODO_SCHEMA.ports.toggle, (c) => {
    c.state.done = !c.state.done;
    showDone(c);
});
const TODO = mTodo.done();

// A LIVE LIST IS A COMPOSITION, not a door. `c.childList(port)` is the backend's half —
// it holds whatever is put in it — and `reconcileExoOrder` is the strategy over it, from a
// package no backend imports. Swapping the strategy is swapping this one call.
const TODO_APP_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('div', { class: 'todo-app' }, (div) => {
        div.el('ul', null, (ul) => {
            rows = ul.childrenPort();
        });
    });
    return { rows };
});
type TTodoAppState = { rows: TExoChildList; shown: TTodo[] };
const mTodoApp = createExoMachineBuilder<TExoDomNode, unknown, TTodoAppState>(TODO_APP_SCHEMA);
mTodoApp.createInitialState((c) => ({
    rows: c.childList(TODO_APP_SCHEMA.ports.rows),
    shown: [],
}));
const showRows = mTodoApp.transition((c) => {
    const want = todos.getValue();
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (_todo, at) =>
        c.build(TODO, at)
    );
});
mTodoApp.effect((c) => {
    showRows(c);
    return todos.onChange(() => showRows(c));
});
const TODO_APP = mTodoApp.done();

backend.render(TODO_APP, document.getElementById('app') as HTMLElement);

// Changing the data reconciles the rows in place.
todos.add('Write the docs');
```

The child list is opened in `createInitialState`, which runs once per instance.
`reconcileExoOrder(kids, shown, keys, want, build)` is handed the order on screen
and the order wanted, and returns the new order on screen for the machine to
keep. For a filtered view, hand it the subset: rows are matched by the item
objects, so a row the filter keeps is the same element it was.

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
declare const APP: TExoMachine<TExoMachineNode>;

// server:
const html = new ExoStrBackend().render(APP);

// browser: `hydrate` exists only on a backend composed with the hydration plugin.
const backend = withExoHydration(withExoCompiler(new ExoDomBackend()));
const root = document.getElementById('app') as HTMLElement;
const dispose = backend.hydrate(APP, root);
```

The two backends have the same shape, so a page switches sides by switching which
one it holds rather than by learning a second calling convention: `render` and
`hydrate` take the same component and the same parent, and both return the same
disposer.

**Hydration is a plugin, not a method.** A backend composed without
`withExoHydration` has no `hydrate` at all — not at runtime and not in its
type, so calling it is a compile error rather than a call landing on `undefined`.
That is deliberate: the adopters are weight a client-only bundle should never
carry, and composing them onto the *same* backend that renders is what stops a
page from hydrating with a different composition than it rendered with.

See the [SSR & Hydration guide](./guides/ssr.md).

## Where to go next

- [Components guide](./guides/components.md) — the full authoring story:
  composition, contexts, cleanup, event descriptors.
- [Core API](./api/core.md) — every export, and what each is for.
- [DOM renderer](./api/dom.md) / [String renderer](./api/string.md) — the two
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

What it writes is the code above: `createExoSchema` plus `createExoMachineBuilder`, no JSX,
and therefore no compiler in the loop.

## The JSX path

JSX is optional, and it writes one half of a component: the **schema
declaration**, markup plus named ports. `exoJsx<TPorts>(($) => <markup/>)` is
compiled to a module-level `createExoNamedSchema()` call, and the machine around
it is the same machine you have been writing — it fills the ports by name through
`SCHEMA.ports`. A declaration holds no values, no closures and no components:

| Written | Means |
| --- | --- |
| `class="row"`, `tabindex={0}`, `disabled` | markup, folded into the schema |
| `data-id={$.id}` | attribute port `id`, filled with `c.attr` |
| `<span>{$.title}</span>` | text port `title` — the element's only child — filled with `c.text` |
| `onClick={$.toggle}`, `on:dblclick={$.edit}` | event port, handled with `m.on` |
| `ref={$.box}` | ref port |
| `unsafeHtml={$.body}` | children port filled with `c.unsafeHtml` |
| `<$.rows />` | children port, filled with `c.one`, `c.list` or `c.childList` + `reconcileExoOrder` |

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
import { createExoMachineBuilder } from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const COUNTER_SCHEMA = exoJsx<{ count: TExoTextPort; increment: TExoEventPort }>(($) => (
  <button class="counter" type="button" onClick={$.increment}>
    <span>{$.count}</span>
  </button>
));
const P = COUNTER_SCHEMA.ports;

type TCounterState = { n: number };

const m = createExoMachineBuilder<TExoMachineNode, unknown, TCounterState>(COUNTER_SCHEMA);
m.createInitialState((): TCounterState => ({ n: 0 }));
const show = m.transition((c) => {
  c.text(P.count, c.state.n);
});
m.wire((c) => show(c));
const increment = m.transition((c) => {
  c.state.n += 1;
  show(c);
});
m.on(P.increment, (c) => increment(c));
export const COUNTER = m.done();
```

See the [JSX guide](./guides/jsx.md) for the whole dialect, a list reconciled with
`reconcileExoOrder`, and everything it refuses.

## Development server and build

```bash
npm run dev    # http://localhost:5173
npm run build  # optimized bundle in dist/
```
