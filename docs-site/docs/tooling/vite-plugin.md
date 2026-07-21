---
title: Vite Plugin
---

# Vite Plugin

`@exodra/vite-plugin` wires Exodra into Vite: it compiles Exodra JSX with the
[Babel plugin](./babel-plugin.md), adds Hot Module Replacement for components,
and generates file-based routes and API endpoints from your directory
structure.

## Installation

```bash
npm install --save-dev @exodra/vite-plugin
```

## Configuration

Add the plugin to your Vite config. It runs with `enforce: 'pre'` so it owns the
JSX pipeline before Vite's esbuild, and it sets esbuild's `jsx: 'preserve'` so
no foreign JSX runtime is injected.

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
  plugins: [
    exodra({
      pagesDir: 'src/pages',  // Default: src/pages
      apiDir: 'src/api',      // Default: src/api
      ssr: false,             // Default: false
      alias: '@',             // Default: @
    }),
  ],
});
```

### Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `pagesDir` | string | `'src/pages'` | Directory for page components. |
| `apiDir` | string | `'src/api'` | Directory for API routes. |
| `ssr` | boolean | `false` | Enable SSR support. |
| `alias` | string | `'@'` | Import alias. |

## JSX transform

The plugin transforms every `.tsx` / `.jsx` file (outside `node_modules`)
through `@exodra/babel-plugin-jsx`, compiling Exodra JSX to `h()` calls. Because
it runs before esbuild, the output is plain JS by the time Vite sees it. See the
[Babel Plugin](./babel-plugin.md) page for the bucket rules.

## File-based routing

Routes are generated automatically from your `pagesDir`:

```
src/pages/
├── index.tsx             → /
├── about.tsx             → /about
├── _layout.tsx           → Layout wrapper
├── _error.tsx            → Error boundary
├── blog/
│   ├── index.tsx         → /blog
│   ├── [id].tsx          → /blog/:id
│   ├── [...slug].tsx     → /blog/* (catch-all)
│   └── _layout.tsx       → Blog layout
├── shop/
│   ├── [[...path]].tsx   → /shop (optional catch-all)
│   └── checkout.tsx      → /shop/checkout
└── admin/
    ├── _layout.tsx       → Admin layout
    └── dashboard.tsx     → /admin/dashboard
```

### Special files

- `_layout.tsx` — wraps all pages in the directory (inherited by nested dirs).
- `_error.tsx` — error boundary for the directory.
- `index.tsx` — default route for a directory.

### Dynamic routes

- `[param].tsx` — single dynamic segment (`:param`).
- `[...params].tsx` — catch-all route.
- `[[...params]].tsx` — optional catch-all route.

### Using generated routes

Import the routes from the `virtual:exodra-routes` module (route components are
lazily imported):

```tsx
// main.tsx
import { mount } from '@exodra/dom';
import {
  createRouter,
  createBrowserHistory,
  RouterProvider,
  Outlet,
} from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

const router = createRouter(routes, { history: createBrowserHistory() });

mount(
  <RouterProvider static={{ router }}>
    <Outlet />
  </RouterProvider>,
  document.getElementById('app')!,
);
```

For TypeScript, declare the virtual module:

```typescript
// env.d.ts
/// <reference types="vite/client" />

declare module 'virtual:exodra-routes' {
  import type { TExoRoute } from '@exodra/router';
  export const routes: TExoRoute[];
}
```

## API routes

Files in `apiDir` become API endpoints. Export functions named after the HTTP
method; they are served during development at `/api/<file>`:

```typescript
// src/api/users.ts
export async function GET(request: Request) {
  const users = await fetchUsers();
  return new Response(JSON.stringify(users), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  const data = await request.json();
  const user = await createUser(data);
  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

If no matching method (or `default`) export is found, the request returns
`405 Method not allowed`.

## Hot Module Replacement

The plugin adds HMR glue to components and emits custom events when files
change:

- `exodra:component-update` — a component was updated (with `preserveState`).
- `exodra:route-update` — the route manifest changed.

For HMR to work, ensure components are default exports and Vite HMR is enabled.

## SSR

Enable `ssr: true` and mark Exodra packages as non-external for the SSR build:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [exodra({ ssr: true })],
  ssr: {
    noExternal: ['@exodra/core', '@exodra/ssr'],
  },
});
```

See the [SSR guide](../guides/ssr.md) for server rendering and hydration.

## Links

- npm:
  [@exodra/vite-plugin](https://www.npmjs.com/package/@exodra/vite-plugin)
- GitHub:
  [packages/vite-plugin-exodra](https://github.com/abaikov/exodra/tree/master/packages/vite-plugin-exodra)
