# Exodra

**Modern Web Framework with Next.js-like File-Based Routing and Fine-Grained Reactivity**

[![npm](https://img.shields.io/npm/v/@exodra/core)](https://www.npmjs.com/package/@exodra/core)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue)](https://www.typescriptlang.org/)

🌐 **Website & docs: [exodra.org](https://exodra.org)**

Exodra is a lightweight, performant web framework that combines the developer experience of Next.js with fine-grained reactivity. Build modern web applications with file-based routing, SSR support, and a powerful component system.

## 🚀 Quick Start

```bash
# Create new project with file-based routing
npm create exodra@latest my-app
cd my-app

# Start development server
npm run dev
```

Your app structure:
```
src/
├── pages/
│   ├── index.tsx         → /
│   ├── about.tsx         → /about
│   ├── blog/
│   │   ├── [id].tsx      → /blog/:id
│   │   └── [...slug].tsx → /blog/* (catch-all)
│   └── _layout.tsx       → Shared layout
└── main.tsx
```

## ✨ Features

### 📁 **Next.js-like File-Based Routing**
- **Automatic route generation** from `pages/` directory
- **Dynamic routes** with `[param].tsx` and `[...catch-all].tsx`
- **Layouts** with `_layout.tsx` files
- **Error boundaries** with `_error.tsx`
- **Optional catch-all** with `[[...params]].tsx`

### ⚡ **Fine-Grained Reactivity**
- **No Virtual DOM** - Direct DOM updates
- **Reactive primitives** - `bindable()` and `derive()`
- **Efficient list rendering** with `list()`
- **Automatic memory management** with WeakMap-based core

### 🚀 **Modern Developer Experience**
- **TypeScript-first** with full type inference
- **JSX/TSX support** out of the box
- **Hot Module Replacement** with Vite
- **Zero-config setup** with sensible defaults

### 🌐 **Production Ready**
- **SSR & Hydration** for SEO and performance
- **Code splitting** with lazy loading
- **Route guards** for authentication
- **API routes** support

## 📚 Examples

### Basic Component with Reactivity

A bindable is a small reactive cell. Read it with `getValue()`, write it with
`setValue()` — there is no `.value` property. Pass the bindable object straight
into a `bindable={{ ... }}` bucket and Exodra wires up the DOM update for you.

```tsx
import { bindable, derive } from '@exodra/reactivity';

function Counter() {
  const count = bindable(0);
  const label = derive(count, c => `Count: ${c}`);

  return (
    <div static={{ class: 'counter' }}>
      <span bindable={{ textContent: label }} />
      <button
        static={{ class: 'btn' }}
        handlers={{ onClick: () => count.setValue(count.getValue() + 1) }}
      >
        Increment
      </button>
    </div>
  );
}
```

### Three Typed Buckets

Exodra never uses flat, React-style props. Every attribute is sorted into a
typed bucket at author time, which is what lets the runtime skip all per-update
type checks.

```tsx
// Each prop lives in exactly one bucket
function Box() {
  const visible = bindable(true);
  const hidden = derive(visible, v => !v);

  return (
    <div
      static={{ id: 'container', class: 'box' }}     // never changes
      bindable={{ hidden }}                            // reactive bindables
      handlers={{ onClick: () => console.log('click') }} // event handlers
    >
      Static and dynamic content stay separated
    </div>
  );
}
```

### List Rendering with `list()`

`list()` creates a reactive list. Mutate it with `push`, `insert`, `remove`,
`move`, `set`, or `reset`, then drop it into the `bindableList={{ children }}`
bucket. It is not an array — there is no `.map()` on a list itself.

```tsx
import { bindable, derive, list } from '@exodra/reactivity';
import type { TExoSchema } from '@exodra/core';

function TodoList() {
  const items: { id: number; text: string }[] = [
    { id: 1, text: 'Learn Exodra' },
    { id: 2, text: 'Build app' },
  ];

  // Build the reactive children list up front, then mutate it over time.
  const children = list<TExoSchema>(
    items.map(todo => {
      const done = bindable(false);
      const cls = derive(done, d => (d ? 'todo todo--done' : 'todo'));
      return (
        <li bindable={{ class: cls }}>
          <input
            static={{ type: 'checkbox' }}
            bindable={{ checked: done }}
            handlers={{ onChange: () => done.setValue(!done.getValue()) }}
          />
          <span static={{ class: 'todo__text' }}>{todo.text}</span>
        </li>
      );
    })
  );

  return <ul bindableList={{ children }} />;
}
```

## 📦 Packages

All `@exodra/*` packages are published at version `0.1.0`.

| Package | Description |
|---------|-------------|
| **[@exodra/core](./packages/core)** | Component system, `h()`/`text()`, schema walking, context |
| **[@exodra/reactivity](./packages/reactivity)** | `bindable`, `derive`, `list`, and persistence/hydration |
| **[@exodra/dom](./packages/dom)** | DOM `mount`/`hydrate` with WeakMap-based tracking |
| **[@exodra/jsx](./packages/jsx)** | JSX `Fragment`, `mergeAttrs`, and the typed JSX namespace |
| **[@exodra/babel-plugin-jsx](./packages/babel-plugin-jsx)** | Babel plugin that compiles Exodra JSX to `h()` calls |
| **[@exodra/string](./packages/string)** | `renderToString` for server-side string rendering |
| **[@exodra/ssr](./packages/ssr)** | SSR primitives: `Head`, `State`, `useSsr`, hydration scripts |
| **[@exodra/router](./packages/router)** | Client-side router, `Link`/`Outlet`/`Routes`, history adapters |
| **[@exodra/forms](./packages/forms)** | Form binding helpers: `bindText`, `bindSelect`, `bindChecked`, `bindNumber` |
| **[@exodra/profiler](./packages/profiler)** | Runtime profiling utilities and metrics |
| **[@exodra/react](./packages/react)** | Render React components inside Exodra as islands |
| **[@exodra/introspect](./packages/introspect)** | `exo-introspect` CLI for analyzing apps, schemas, and routes |
| **[@exodra/vite-plugin](./packages/vite-plugin-exodra)** | Vite integration for Exodra projects |
| **[create-exodra](./packages/create-exodra)** | `npm create exodra` project scaffolding CLI |

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
npm install @exodra/core @exodra/dom @exodra/router @exodra/reactivity @exodra/jsx
npm install -D @exodra/babel-plugin-jsx @exodra/vite-plugin vite typescript
```

### Babel Configuration

Exodra JSX is compiled by `@exodra/babel-plugin-jsx`. The native TypeScript JSX
transform and `@babel/plugin-transform-react-jsx` are incompatible — always use
the Exodra plugin.

```javascript
// .babelrc
{
  "plugins": [
    ["@exodra/babel-plugin-jsx", {
      "hoistStatic": true
    }]
  ]
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "jsx": "preserve",
    "jsxImportSource": "@exodra/jsx",
    "moduleResolution": "node",
    "strict": true
  }
}
```

## 📊 Performance

Exodra is fast by design:
- **Three-props architecture** — the static/reactive/event split is decided at compile time, so there is no per-prop runtime type dispatch
- **No Virtual DOM** — reactive bindings write to the DOM directly, no diffing
- **Compile-time optimization** — static subtrees are hoisted and clone-cached
- **WeakMap-based core** — teardown is driven by GC, so most code needs no manual disposal

### Benchmarks

From the project's own suite (`npm run bench`) — **initial render of a large tree**, render time and retained heap (approximate, hardware/version dependent):

| Framework | Median (render) | Retained heap |
|-----------|-----------------|---------------|
| **Exodra** | **~1 ms** | ~0.18 MB |
| Solid     | ~2–3 ms  | ~0.14 MB |
| Svelte    | ~4 ms    | ~0.42 MB |
| React     | ~5 ms    | ~0.54 MB |

Exodra is **top-tier** here — as fast as the fastest (neck-and-neck with Solid, ahead of Svelte/React) and **without** a memory premium. Credit where due: **Solid's footprint is slightly smaller** (~0.14 vs ~0.18 MB). We won't claim a permanent "fastest" crown from our own harness — run it yourself. For fine-grained updates (a single signal write, one list op) Exodra and Solid both finish **well under a millisecond** — below timer resolution, so those are ties, not wins.

> Methodology: headless Chromium (Playwright) over a Vite build, N iterations per case, median reported; heap via forced GC + precise `performance.memory`. Exodra's **own** harness — not an independent third party. Reproduce with `npm run bench`. Full results: [exodra.org/docs/benchmarks](https://exodra.org/docs/benchmarks).

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

# Run benchmarks
npm run bench
```

## 📖 Documentation

Full documentation, guides, and API reference live at **[exodra.org](https://exodra.org)**:

- [Getting Started](https://exodra.org/docs/getting-started)
- [Core Concepts](https://exodra.org/docs/core/concepts)
- [JSX Guide](https://exodra.org/docs/guides/jsx)
- [SSR Guide](https://exodra.org/docs/guides/ssr)
- [Reactivity API](https://exodra.org/docs/api/reactivity)
- [Router API](https://exodra.org/docs/api/router)

Per-package READMEs: [core](./packages/core/README.md) · [reactivity](./packages/reactivity/README.md) · [router](./packages/router/README.md) · [ssr](./packages/ssr/README.md) · [jsx](./packages/jsx/README.md)

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 📄 License

MIT © Andrei Baikov
