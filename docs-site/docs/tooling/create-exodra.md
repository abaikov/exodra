---
title: create-exodra
---

# create-exodra

`create-exodra` scaffolds a new Exodra application. The CLI asks at a prompt
(Next.js style): run it and answer a few questions, or pass flags to skip the
prompts. It also installs an `exodra` binary for generating components, pages,
and API routes inside an existing project.

## Quick start

```bash
# Using npm
npm create exodra@latest my-app

# Or directly
npx create-exodra my-app
```

If you omit a project name you'll be prompted for one. Without flags, the CLI
prompts for TypeScript, ESLint, Tailwind CSS, a `src/` directory, SSR, App
Router, and the import alias.

After scaffolding:

```bash
cd my-app
npm install
npm run dev
```

## CLI usage

```bash
npx create-exodra [project-name] [options]
```

Any option you don't pass is asked interactively. Passing a flag skips that
prompt.

### Options

- `--ts`, `--typescript` — use TypeScript
- `--js`, `--javascript` — use JavaScript
- `--tailwind` — set up Tailwind CSS
- `--eslint` — set up ESLint
- `--src-dir` — use a `src/` directory
- `--ssr` — scaffold a server-side-rendered app
- `--app` — use the App Router (`@exodra/router`)
- `--import-alias <alias>` — import alias to use (default `@/*`)
- `--use-npm` / `--use-yarn` / `--use-pnpm` / `--use-bun` — choose the package
  manager

### Examples

```bash
# TypeScript app with the App Router and Tailwind, no prompts
npx create-exodra my-app --typescript --app --tailwind

# JavaScript app, no App Router
npx create-exodra simple-app --javascript

# Server-side-rendered app
npx create-exodra my-ssr-app --ssr
```

## What gets generated

**The default (Vite) scaffold declares its schemas with `exoJsx`**, which
`@exodra/vite-plugin` compiles away; the `--ssr` scaffold and everything the `exodra`
CLI generates use `exoPorts` with `createExoSchema` and contain no JSX. Either way a
component is one value: a schema that declares the shape once when the module
loads, and a machine whose `wire` fills its ports per instance. See
[JSX](../guides/jsx.md) for the `exoJsx` dialect.

A standard (non-SSR) app uses Vite with `@exodra/vite-plugin` and depends on
`@exodra/core` and `@exodra/dom` — plus `@exodra/router`
when the App Router is enabled, which also gets `src/pages`, a generated route
table from `virtual:exodra-routes`, and a `main` that provides the router inside
a machine (`provideExoRouter(c, router)`), places the boundary with
`c.one(port, ExoOutlet)` and inserts the nav's `ExoLink`s into `c.childList(port)`. The outlet
and the nav both open a child list, so that `main` renders through
`withExoChildList(withExoCompiler(new ExoDomBackend()))`; a backend without
[`withExoChildList`](../api/dom.md#withexochildlist) refuses with
[EXO0109](../errors.md#exo0109). Without the App Router, `main` opens no child list and composes
`withExoCompiler` alone.

An SSR app (`--ssr`) instead depends on `@exodra/string` alongside `@exodra/core`
and `@exodra/dom`, with an Express dev/prod server. **One** component module is
shared by both halves: `new ExoStrBackend().render(App)` prints it on the server,
and a `@exodra/dom` backend composed with `withExoHydration` adopts exactly
those nodes on the client through `backend.hydrate(App, root)`, so only listeners
and subscriptions are added. See the
[SSR guide](../guides/ssr.md).

## The `exodra` CLI

The package also installs an `exodra` binary for scaffolding inside an existing
project:

```bash
npx exodra component Button      # create a component (alias: c)
npx exodra page Home             # create a page (alias: p)
npx exodra api hello             # create an API route (alias: a)
npx exodra config                # create exodra.config.js
```

Common options for `component` / `page`: `-d, --dir <path>`,
`-t, --typescript`, and `--naming <PascalCase|kebab-case|snake_case>`.

A page is a machine **default-exported** from its module (the route table
imports it that way), and it takes no props — the match that selected it arrives
as the params of its wire, whose `params` and `pathname` are what a page
needs. The outlet mounts a machine and nothing else. A component is a named machine
export, filled from its parent with `c.one(port, Name)` or repeated with
`c.list(port, Name, rows)`, each row armed with its own entry of `rows` as its params. With `-t` the files carry type annotations; without
it they are the same code with the types dropped.

```tsx
// src/pages/Home.tsx, from `npx exodra page Home -t`
import {
  EXO_PORT_TEXT,
  composeExoMachine,
  createExoMachine,
  createExoSchema,
  exoPorts,
  withExoWire,
} from '@exodra/core';

// A page takes no props — the match that selected it arrives as the params of its wire,
// `withExoWire(m, (c, match) => …)`, whose `params` and `pathname` are what a page needs. It is
// default-exported because the route table imports it that way.
const PagePorts = exoPorts({ heading: EXO_PORT_TEXT });

const pageSchema = createExoSchema(PagePorts, b => {
  b.el('div', { class: 'page' }, d => {
    d.el('h1', null, h => {
      h.textPort(PagePorts.heading);
    });
    d.el('p', null, p => p.text('Welcome to the Home page.'));
  });
});
const pageBase = createExoMachine(pageSchema);
export default composeExoMachine(pageBase, m =>
  withExoWire(m, c => {
    c.text(PagePorts.heading, 'Home');
  })
);
```

`api` emits a module with `GET` and `POST` handlers: request/response code that
touches no renderer.

## Writing Exodra components

State lives in the machine. The `createInitialState` option runs once per instance and returns
it; one function is the one place that turns that state into port writes; the
wire and the handlers call it. A port written with `c.text` / `c.attr`
holds that value until the next write — there is no source attached to it.

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

const CounterPorts = exoPorts({ text: EXO_PORT_TEXT, click: EXO_PORT_EVENT });

const counterSchema = createExoSchema(CounterPorts, b => {
  b.el('div', { class: 'counter' }, div => {
    div.el('span', null, span => {
      span.textPort(CounterPorts.text);
    });
    div.el('button', { class: 'btn', type: 'button' }, btn => {
      btn.eventPort(CounterPorts.click, 'click');
      btn.text('+1');
    });
  });
});
const counterBaseMachine = createExoMachine(counterSchema, {
  createInitialState: (_c: TExoDomNode) => ({ count: 0 }),
});
function showCount(c: TExoMachineNodeOf<typeof counterBaseMachine>): void {
  c.text(CounterPorts.text, `Count: ${c.state.count}`);
}
const counterMachine = composeExoMachine(
  counterBaseMachine,
  m => withExoWire(m, c => showCount(c)),
  m =>
    withExoHandlers(m, on => {
      on(CounterPorts.click, c => {
        c.state.count++;
        showCount(c);
      });
    })
);

backend.render(counterMachine, document.getElementById('app') as HTMLElement);
```

Data that lives **outside** the instance — a store several components follow — is
read the same way, from an effect that draws first and then subscribes:

```ts no-check
function showTotal(c: TExoMachineNodeOf<typeof counterBaseMachine>): void {
  c.text(CounterPorts.text, `Total: ${store.getValue()}`);
}
const totalMachine = withExoEffects(counterBaseMachine, effect => {
  effect(c => {
    showTotal(c);
    return store.onChange(() => showTotal(c));
  });
});
```

The [Components guide](../guides/components.md) covers the machine and the
connector in full; the [JSX guide](../guides/jsx.md) covers the compiled dialect
that produces the same pair from markup.

## Links

- npm: [create-exodra](https://www.npmjs.com/package/create-exodra)
- GitHub:
  [packages/create-exodra](https://github.com/abaikov/exodra/tree/master/packages/create-exodra)
