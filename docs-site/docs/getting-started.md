---
sidebar_position: 1
title: Getting Started
---

# Getting Started with Exodra

## Installation

### Create a New Project

The fastest way to get started is with create-exodra:

```bash
npm create exodra@latest my-app
cd my-app
npm run dev
```

You'll be prompted for a few choices:
- **TypeScript** (or JavaScript)
- **ESLint**
- **Tailwind CSS**
- **`src/` directory**
- **Server-side rendering (SSR)**
- **App Router**
- **Custom import alias**

Each prompt has a matching flag (for example `--typescript`, `--tailwind`,
`--eslint`, `--src-dir`, `--ssr`, `--app`, `--import-alias <alias>`) so you can
skip the questions in CI or scripts.

### Manual Setup

You can also add Exodra to an existing project:

```bash
npm install @exodra/core @exodra/dom @exodra/reactivity
npm install -D @exodra/babel-plugin-jsx
```

Then configure Babel to use the JSX plugin (see JSX Guide for details).

## Project Structure

A typical Exodra project looks like this:

```
my-app/
├── src/
│   ├── components/
│   ├── pages/
│   ├── app.tsx
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Your First Component

Create a simple counter component with Exodra JSX. A `bindable` is a reactive
cell: read it with `getValue()`, write it with `setValue()`. There is no
`.value` property. To show a derived string in the DOM, build a `derive()` and
pass it straight into the `bindable` bucket.

```tsx
import { bindable, derive } from '@exodra/reactivity';

export function Counter() {
  const count = bindable(0);
  const label = derive(count, c => String(c));

  return (
    <div static={{ class: 'counter' }}>
      <button
        static={{ class: 'btn' }}
        handlers={{ onClick: () => count.setValue(count.getValue() - 1) }}
      >
        -
      </button>

      <span bindable={{ textContent: label }} />

      <button
        static={{ class: 'btn' }}
        handlers={{ onClick: () => count.setValue(count.getValue() + 1) }}
      >
        +
      </button>
    </div>
  );
}
```

Every prop goes in a typed bucket: `static` for values that never change,
`bindable` for reactive bindables, and `handlers` for events. Flat React-style
props such as `<button onClick={...}>` are a compile error in Exodra.

## Building a Todo App

Here's a small todo app showing reactive lists. `list()` builds a reactive list
that you mutate with `push`, `insert`, `remove`, `move`, `set`, or `reset` — it
is not an array, so there is no `.map()` on the list. Build the children up front
and pass the list directly into the `bindableList` bucket.

```tsx
import { bindable, derive, list } from '@exodra/reactivity';
import type { TExoSchema } from '@exodra/core';

export function TodoApp() {
  const input = bindable('');
  const todos = list<TExoSchema>([]);

  const makeTodo = (text: string): TExoSchema => {
    const done = bindable(false);
    const style = derive(done, d =>
      d ? 'text-decoration: line-through' : 'text-decoration: none'
    );
    return (
      <li>
        <input
          static={{ type: 'checkbox' }}
          bindable={{ checked: done }}
          handlers={{ onChange: () => done.setValue(!done.getValue()) }}
        />
        <span static={{ class: 'todo__text' }} bindable={{ style }}>
          {text}
        </span>
      </li>
    );
  };

  const addTodo = () => {
    const text = input.getValue().trim();
    if (!text) return;
    todos.push(makeTodo(text));
    input.setValue('');
  };

  return (
    <div static={{ class: 'todo-app' }}>
      <div static={{ class: 'input-group' }}>
        <input
          static={{ type: 'text', placeholder: 'Add todo...' }}
          bindable={{ value: input }}
          handlers={{
            onInput: (e: Event) =>
              input.setValue((e.target as HTMLInputElement).value),
            onKeyDown: (e: KeyboardEvent) => {
              if (e.key === 'Enter') addTodo();
            },
          }}
        />
        <button static={{ class: 'btn' }} handlers={{ onClick: addTodo }}>
          Add
        </button>
      </div>

      <ul bindableList={{ children: todos }} />
    </div>
  );
}
```

## Development Server

Start the development server:

```bash
npm run dev
```

Your app will be available at `http://localhost:5173`

### Hot Module Replacement

Exodra supports HMR out of the box - changes are reflected instantly without losing application state.

## Build for Production

```bash
npm run build
```

The optimized bundle will be in the `dist/` folder.