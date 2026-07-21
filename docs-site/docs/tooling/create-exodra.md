---
title: create-exodra
---

# create-exodra

`create-exodra` scaffolds a new Exodra application. The CLI is prompt-driven
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
- `--ssr` — scaffold a server-side-rendered app (`@exodra/ssr`)
- `--no-jsx` — author views with `h()` calls instead of JSX (SSR scaffold)
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

# SSR app authored with h() calls instead of JSX
npx create-exodra my-ssr-app --ssr --no-jsx
```

## What gets generated

A standard (non-SSR) app uses Vite with the Exodra Babel JSX plugin and depends
on `@exodra/core`, `@exodra/jsx`, `@exodra/dom`, and `@exodra/reactivity` (plus
`@exodra/router` when the App Router is enabled). JSX is compiled by
[`@exodra/babel-plugin-jsx`](./babel-plugin.md) — TypeScript's native JSX
transform and the React JSX transform are not used.

An SSR app (`--ssr`) instead depends on `@exodra/ssr` and `@exodra/string`,
with an Express dev/prod server that renders on the server and hydrates on the
client via `@exodra/dom`'s `hydrate`. See the [SSR guide](../guides/ssr.md).

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

## Writing Exodra components

Exodra JSX uses **typed prop buckets**, not flat React-style props. Regular
attributes go in `static`, reactive values in `bindable`, and event handlers in
`handlers`. Reactive state comes from `bindable()` in `@exodra/reactivity` and
is read/written with `getValue()` / `setValue()` (there is no `.value`).

```tsx
import { mount } from '@exodra/dom';
import { bindable, derive } from '@exodra/reactivity';

function Counter() {
  const count = bindable(0);
  const label = derive(count, (c) => `Count: ${c}`);

  return (
    <div static={{ class: 'counter' }}>
      <span bindable={{ textContent: label }} />
      <button
        static={{ class: 'btn' }}
        handlers={{ onClick: () => count.setValue(count.getValue() + 1) }}
      >
        +1
      </button>
    </div>
  );
}

mount(<Counter />, document.getElementById('app')!);
```

Components are plain functions; you can also define them with `defineComponent`
from `@exodra/core`, and drop down to raw `h()` / `text()` calls (the form used
by the `--no-jsx` SSR scaffold) when you don't want the JSX transform. See the
[JSX guide](../guides/jsx.md) for the full bucket rules.

## Links

- npm: [create-exodra](https://www.npmjs.com/package/create-exodra)
- GitHub:
  [packages/create-exodra](https://github.com/abaikov/exodra/tree/master/packages/create-exodra)
