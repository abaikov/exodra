# Exodra

**An imperative template engine for plain TypeScript, at near hand-written speed, with the abstractions on top.**

[![npm](https://img.shields.io/npm/v/@exodra/core)](https://www.npmjs.com/package/@exodra/core)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

🌐 **Website & docs: [exodra.org](https://exodra.org)**

You declare a component's markup and its **ports** with a function call that runs
once, when the module loads, and you fill those ports directly from your own code.
Nothing is diffed and nothing is walked when a value changes. Everything people
usually expect a framework to impose — reactivity, keyed lists, hydration, JSX,
React's API — sits on top of that core as a plugin you can take or leave.

## Why Exodra

-   **No build step required.** A schema is an ordinary function call, so the
    engine runs from a `<script type="module">` and plain TypeScript. JSX is an
    optional dialect, compiled by a Babel or SWC plugin into that same call.
-   **Imperative where it counts.** A transition writes a text, attribute, event
    or children port by number. Reactivity is something you add, not a tax every
    update pays.
-   **Fast, and measured against code with no framework in it.** On mounting,
    no framework can be more than about 30% faster than `@exodra/dom`, because
    that is all that is left above a hand-written program producing the same DOM
    ([What the floor says](https://exodra.org/docs/why/what-the-floor-says)).
    Against other frameworks it leads mount, reconcile and application-update in
    [the suite](https://exodra.org/docs/benchmarks), which publishes its losses too.
-   **A strategy for the hot path.** Keep a subtree alive instead of rebuilding
    it, or build a child with `c.build` and place it yourself when you already
    know where it goes. Each is a choice you make where it matters.
-   **Every behaviour is a decorator.** The DOM backend is assembled from packs:
    replace a named interface and everything you did not name stays what ships
    ([Plugins](https://exodra.org/docs/guides/plugins), including what is not
    replaceable).
-   **Any reactivity on top**, including React's: `@exodra/react-compat`
    implements React's API on Exodra machines, so an existing React app runs
    with Exodra as the renderer.
-   **One component, several backends:** the browser DOM, HTML on the server,
    hydration that adopts that HTML, and a plain-text terminal tree.

## 🚀 Quick Start

```bash
npm install @exodra/core @exodra/dom
```

The counter below is the whole program. See [Getting started](https://exodra.org/docs/getting-started)
for a project template and JSX.

## 📚 Examples

### A component is one value

A component is a **machine**: a **schema**, built once when the module loads, and
the machine's initial state and transitions, run per instance. The schema declares
**ports** — places a value may be put — and the machine fills them, naming each by
identity. Nothing is diffed and nothing is walked at render time, and the same
machine runs on the server, on a client render and through hydration.

No compiler is involved: this is a function call.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

const COUNTER_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    let click!: TExoEventPort;
    b.el('div', { class: 'counter' }, (div) => {
        div.el('span', null, (span) => {
            text = span.textPort();
        });
        div.el('button', { class: 'btn', type: 'button' }, (btn) => {
            click = btn.eventPort('click');
            btn.text('Increment');
        });
    });
    return { text, click };
});
const P = COUNTER_SCHEMA.ports;

const mCounter = createExoMachineBuilder<TExoMachineNode, unknown, { count: number }>(
    COUNTER_SCHEMA
);
mCounter.createInitialState(() => ({ count: 0 }));
const show = mCounter.transition((c) => {
    c.text(P.text, `Count: ${c.state.count}`);
});
mCounter.wire((c) => show(c));
const increment = mCounter.transition((c) => {
    c.state.count += 1;
    show(c);
});
mCounter.on(P.click, (c) => increment(c));
const COUNTER = mCounter.done();

const dispose = withExoCompiler(new ExoDomBackend()).render(COUNTER, document.body);
```

`c.attr` fills an attribute port, `c.text` fills a text port, `m.on` attaches a
listener, and a transition is the only place state moves. Following an outside
source is an effect — `m.effect((c) => source.onChange(() => update(c)))` — so a
disconnected instance stops listening and a torn-down one lets go. Reconciling a
children port is `reconcileExoOrder` from `@exodra/list-reconcile`, called from a
transition the same way. See the
[Components guide](https://exodra.org/docs/guides/components).

### Schemas in JSX

JSX is a way of writing a **schema declaration**: markup plus named ports, and
nothing else. `exoJsx<TPorts>(($) => <markup/>)` from `@exodra/jsx` is compiled
by `@exodra/babel-plugin-schema` into a module-level `createExoNamedSchema()`
call, and the machine fills the ports by name. A literal attribute is markup;
`attr={$.x}` is an attribute port, `{$.x}` as an element's only child is a text
port, `onClick={$.x}` or `on:click={$.x}` is an event port, and `<$.rows />` is a
children port. Any other expression is a compile error. The compiled output
imports nothing but `@exodra/core`.

```tsx
import { exoJsx } from '@exodra/jsx';
import { createExoMachineBuilder } from '@exodra/core';
import type { TExoAttrPort, TExoEventPort, TExoMachineNode, TExoTextPort } from '@exodra/core';

const PERSON_SCHEMA = exoJsx<{
  id: TExoAttrPort;
  name: TExoTextPort;
  role: TExoTextPort;
  select: TExoEventPort;
}>(($) => (
  <li class="person" data-id={$.id}>
    <strong>{$.name}</strong>
    <span class="role">{$.role}</span>
    <button type="button" onClick={$.select}>
      Select
    </button>
  </li>
));
const P = PERSON_SCHEMA.ports;

type TPerson = { id: string; name: string; role: string };

const mPerson = createExoMachineBuilder<TExoMachineNode, TPerson>(PERSON_SCHEMA);
mPerson.createInitialState(() => null);
mPerson.wire((c, person) => {
  c.attr(P.id, person.id);
  c.text(P.name, person.name);
  c.text(P.role, person.role);
});
mPerson.on(P.select, () => console.log('selected'));
export const PERSON = mPerson.done();
```

`swc-plugin-exodra` compiles the same dialect in Rust for SWC-based toolchains.
See the [JSX guide](https://exodra.org/docs/guides/jsx).

### List Rendering

A children port is filled from a machine. `c.list(port, machine, count)` builds a
fixed run of rows, each told its index, and is done with them: no diff, no registry,
nothing to pay for the possibility of changing.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoChildrenWiring, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoCompiler } from '@exodra/dom';

type TTodo = { readonly id: number; readonly text: string };

const todos: TTodo[] = [{ id: 1, text: 'Learn Exodra' }];

const TODO_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'todo' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mTodo = createExoMachineBuilder<TExoMachineNode, unknown, TTodo>(TODO_SCHEMA);
mTodo.createInitialState((_c, index) => todos[index]);
mTodo.wire((c) => {
    c.text(TODO_SCHEMA.ports.text, c.state.text);
});
const TODO = mTodo.done();

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
const mList = createExoMachineBuilder<TExoChildrenWiring & TExoMachineNode>(LIST_SCHEMA);
mList.createInitialState((c) => {
    c.list(LIST_SCHEMA.ports.rows, TODO, todos.length);
});
const TODO_LIST = mList.done();

withExoCompiler(new ExoDomBackend()).render(TODO_LIST, document.body);
```

A list that DOES change opens the port with `c.childList(port)` in
`createInitialState` and reconciles it from a transition with `reconcileExoOrder`
from `@exodra/list-reconcile`. It compares the order shown with the order wanted by
the identity of the item objects, so a row that survives an update is the same
element it was; an effect draws the list first and then follows the data.

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoChildList, TExoDomNode } from '@exodra/dom';
import { reconcileExoOrder } from '@exodra/list-reconcile';

type TTodo = { readonly id: number; readonly text: string };

const listeners = new Set<() => void>();
let current: readonly TTodo[] = [{ id: 1, text: 'Learn Exodra' }];
const todos = {
    getValue: () => current,
    setValue(next: readonly TTodo[]) {
        current = next;
        listeners.forEach((listener) => listener());
    },
    onChange(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
};

const TODO_SCHEMA = createExoSchema((b) => {
    let text!: TExoTextPort;
    b.el('li', { class: 'todo' }, (li) => {
        text = li.textPort();
    });
    return { text };
});
const mTodo = createExoMachineBuilder<TExoDomNode, TTodo>(TODO_SCHEMA);
mTodo.wire((c, todo) => {
    c.text(TODO_SCHEMA.ports.text, todo.text);
});
const TODO = mTodo.done();

const LIST_SCHEMA = createExoSchema((b) => {
    let rows!: TExoChildrenPort;
    b.el('ul', null, (ul) => {
        rows = ul.childrenPort();
    });
    return { rows };
});
type TListState = { rows: TExoChildList; shown: TTodo[] };
const mList = createExoMachineBuilder<TExoDomNode, unknown, TListState>(LIST_SCHEMA);
mList.createInitialState((c) => ({ rows: c.childList(LIST_SCHEMA.ports.rows), shown: [] }));
const showRows = mList.transition((c) => {
    const want = todos.getValue();
    c.state.shown = reconcileExoOrder(c.state.rows, c.state.shown, want, want, (todo, i) =>
        c.build(TODO, i, todo)
    );
});
mList.effect((c) => {
    showRows(c);
    return todos.onChange(() => showRows(c));
});
const TODO_LIST = mList.done();

withExoChildList(withExoCompiler(new ExoDomBackend())).render(TODO_LIST, document.body);
todos.setValue([...todos.getValue(), { id: 2, text: 'Ship it' }]);
```

For data with no stable identity — rows parsed fresh from JSON on every refetch —
compose `EXO_KEYED_LIST_VOCABULARY` onto the backend and call
`c.keyedList(port, keyOf, build, update)` in `createInitialState`: it returns
`{ reconcile(items) }`, and a surviving key keeps its row. The two fixed and
reconciled forms are different calls because they are different jobs, and the cheap
one does not subsidise the other.

## 📦 Packages

All `@exodra/*` packages are published under the `0.x` line.

| Package                                                                  | Description                                                                                                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[@exodra/core](./packages/core)**                                      | `createExoSchema`, `createExoMachineBuilder` (the machine: initial state, wire, transitions, effects), ports, contexts, event descriptors, the escapers |
| **[@exodra/computed](./packages/computed)**                              | The declarative half of a machine: `withExoComputedMachine`, `exoWiring`, fields, derivations, transitions. A page that derives nothing links none of it |
| **[@exodra/list-reconcile](./packages/list-reconcile)**                  | `reconcileExoOrder` (identity reconcile from a transition), `createExoKeyedList` and the `keyedList` pack |
| **[@exodra/dom](./packages/dom)**                                        | Browser backend: `mountExoSchema`, `withExoCompiler`'s `render`/`withExoHydration`'s `hydrate`, identity reconcile, event plugins                                                                    |
| **[@exodra/jsx](./packages/jsx)**                                        | `exoJsx` and the types for the JSX dialect (`jsxImportSource: "@exodra/jsx/schema"`)                                                                     |
| **[@exodra/babel-plugin-schema](./packages/babel-plugin-exodra-schema)** | The JSX compiler: `exoJsx(…)` → a module-level `createExoNamedSchema()`                                                                                                     |
| **[@exodra/string](./packages/string)**                                  | Server backend: `ExoStrBackend.render` to markup                                                                                                         |
| **[@exodra/ssr](./packages/ssr)**                                        | The rest of the response: `renderExoPage`, `EXO_SSR_RESPONSE`, state transfer                                                                                     |
| **[@exodra/router](./packages/router)**                                  | Client-side router: `createExoRouter`, `provideExoRouter`, `ExoOutlet`/`exoOutlet`, `ExoLink`, history adapters                                         |
| **[@exodra/forms](./packages/forms)**                                    | Form controls without a bound model: `readExoControlValue`, `readExoControlValues`, `writeExoChoice`                                                    |
| **[@exodra/dom-profiler](./packages/dom-profiler)**                      | Profile the DOM backend per connector method (`profileDom`) or per port (`profilePorts`)                                                                 |
| **[@exodra/react-mount](./packages/react-mount)**                        | Mount an Exodra component into a React-owned element                                                                                                     |
| **[@exodra/introspect](./packages/introspect)**                          | ESLint rules for schema hoisting, and a counter of schemas, machines and reactive sources |
| **[@exodra/vite-plugin](./packages/vite-plugin-exodra)**                 | Vite integration for Exodra projects                                                                                                                     |
| **[create-exodra](./packages/create-exodra)**                            | `npm create exodra` project scaffolding CLI                                                                                                              |

## 🎯 Getting Started

### Installation

```bash
npm create exodra@latest my-app
cd my-app
npm install
npm run dev
```

### Manual Setup

```bash
npm install @exodra/core @exodra/dom @exodra/router @exodra/jsx
npm install -D babel-preset-exodra @exodra/vite-plugin vite typescript
```

### Babel Configuration

Exodra JSX is compiled by `@exodra/babel-plugin-schema`. The native TypeScript
JSX transform and `@babel/plugin-transform-react-jsx` are incompatible — they
emit `jsx()` runtime calls, and Exodra has no runtime to receive them. The preset
wires the compiler, JSX parsing with namespaces left alone, and TypeScript in one
line:

```javascript
// babel.config.js
module.exports = { presets: ['exodra'] };
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@exodra/jsx/schema",
    "moduleResolution": "node",
    "strict": true
  }
}
```

## 📊 Performance

Exodra is fast by design:

-   **Schema and wiring split** — the shape is walked once, at module load, so a render is a clone plus one indirect call per port
-   **No Virtual DOM** — reactive bindings write to the DOM directly, no diffing
-   **The template is the schema** — there is no hoisting switch to forget: a schema is compiled once per process into a prototype element, a walk plan and a setter per port
-   **No side table** — a node's record lives on the element itself, so teardown is driven by GC and most code needs no manual disposal

### Benchmarks

**The numbers that used to sit here have been removed, and that is the honest
thing to say about them.** They were measured with React and Solid resolving to
their _development_ bundles, so the comparison was against debug builds; the
suite's own page retracts that run by name. The table also claimed Solid leads
first mount by ~6%, and every one of the nine recordings now on disk
(`packages/benchmarks/.gate/initial-render.*.json`) has Exodra ahead instead.

Current results, each printed from the recording that produced it, live in
[the benchmarks page](https://exodra.org/docs/benchmarks). Read it rather than a
summary here — it publishes the axes Exodra loses as well as the ones it wins,
and it states which figures are stale.

To run a comparison yourself, one axis at a time (the whole suite in one browser
session exhausts memory):

```bash
cd packages/benchmarks
node scripts/run-one-axis.js initial-render 60 20 --record=mine
```

> This is Exodra's **own** harness, not an independent third party. What makes it
> worth anything is the gate in front of it: every participant's markup is diffed
> against the reference before a single timing is taken, so a framework that
> renders a different tree is refused rather than compared.

## 🛠️ Development

```bash
# Clone the repo
git clone https://github.com/abaikov/exodra.git
cd exodra

# Install dependencies
npm install

# Run tests
npm test

# Build packages
npm run build

# Run ONE benchmark axis (there is no `npm run bench`, and there should not be:
# the whole suite in a single browser session exhausts memory)
cd packages/benchmarks && node scripts/run-one-axis.js initial-render 60 20
```

## 📖 Documentation

Full documentation, guides, and API reference live at **[exodra.org](https://exodra.org)**:

-   [Getting Started](https://exodra.org/docs/getting-started)
-   [Core Concepts](https://exodra.org/docs/core/concepts)
-   [Components Guide](https://exodra.org/docs/guides/components)
-   [JSX Guide](https://exodra.org/docs/guides/jsx)
-   [SSR Guide](https://exodra.org/docs/guides/ssr)
-   [Router API](https://exodra.org/docs/api/router)

Per-package READMEs: [core](./packages/core/README.md) · [router](./packages/router/README.md) · [ssr](./packages/ssr/README.md) · [jsx](./packages/jsx/README.md)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT © Andrei Baikov
