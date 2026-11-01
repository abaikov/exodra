# @exodra/vite-plugin

Vite plugin for Exodra applications. It:

- compiles `.tsx` / `.jsx` through [`babel-preset-exodra`](../babel-preset-exodra):
  each `exoJsx(...)` schema declaration becomes a module-level
  `createExoNamedSchema()` call;
- generates the route table for `@exodra/router` from `src/pages`;
- serves file-based API endpoints from `src/api` in the dev server;
- falls back to `/index.html` for dev-server requests without a file extension.

A project that writes schemas with `createExoSchema` needs no JSX transform, and
can still use the plugin for routing and API endpoints.

Full documentation: [exodra.org/docs/tooling/vite-plugin](https://exodra.org/docs/tooling/vite-plugin)

## Installation

```bash
npm install --save-dev @exodra/vite-plugin
```

## Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
    plugins: [
        exodra({
            pagesDir: 'src/pages',
            apiDir: 'src/api',
        }),
    ],
});
```

| Option | Default | What it does |
| --- | --- | --- |
| `pagesDir` | `'src/pages'` | directory scanned for page files |
| `apiDir` | `'src/api'` | directory for API endpoints |
| `schemaSource` | `'@exodra/core'` | where the compiled JSX imports `createExoNamedSchema` from; forwarded to `babel-preset-exodra` |

## File-based routing

```
src/pages/
├── index.tsx             → /
├── about.tsx             → /about
├── _shared.tsx           → ignored (starts with `_`)
├── blog/
│   ├── index.tsx         → /blog
│   ├── [id].tsx          → /blog/:id
│   └── [...slug].tsx     → /blog/* (catch-all, at least one segment)
└── shop/
    ├── [[...path]].tsx   → /shop (optional catch-all)
    └── checkout.tsx      → /shop/checkout
```

The table is exposed as the virtual module `virtual:exodra-routes`. Each entry is
`{ path, component: exoLazy(() => import(file)) }` (plus `catchAll` /
`optionalCatchAll`), and a page file's **default export** is its machine. A page
receives its match as the params of its wire:
`createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(pageSchema)` and
`pageBuilder.wire((c, match) => ...)`.

```ts no-check
// main.ts
import { EXO_PORT_CHILDREN, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import { createExoBrowserHistory, createExoRouter, exoOutlet, provideExoRouter } from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

const router = createExoRouter(routes, { history: createExoBrowserHistory() });
const Routed = exoOutlet('main');

const AppPorts = exoPorts({ body: EXO_PORT_CHILDREN });

const appSchema = createExoSchema(AppPorts, (b) => {
    b.el('div', { class: 'app' }, (d) => {
        d.childrenPort(AppPorts.body);
    });
});
const appBuilder = createExoMachineBuilder<TExoDomNode>(appSchema);
appBuilder.createInitialState((c) => {
    provideExoRouter(c, router);
    c.one(AppPorts.body, Routed);
});
const App = appBuilder.done();

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
backend.render(App, document.getElementById('app') as HTMLElement);
```

Declare the virtual module for TypeScript:

```typescript no-check
// env.d.ts
/// <reference types="vite/client" />

declare module 'virtual:exodra-routes' {
    export const routes: import('@exodra/router').TExoRoute[];
}
```

Limits:

- **The table is flat**: one entry per page file and no `children`. A layout is a
  route with `children` whose page places an `ExoOutlet`; write that table by hand
  (see [`@exodra/router`](../router)).
- **The table is built once, when the dev server starts.** Restart the dev server
  after adding, removing or renaming a page file.
- `_`-prefixed files (including `_layout.tsx`) produce no route and are not
  treated as layouts or error boundaries.

## API routes

A request to `/api/<name>` loads `<apiDir>/<name>.ts` through Vite's SSR loader
and calls the export named after the HTTP method (`GET`, `POST`, ...), falling back
to the default export; with neither, it answers `405`.

```typescript
// src/api/users.ts
declare function fetchUsers(): Promise<unknown[]>;

export async function GET(request: Request): Promise<Response> {
    const users = await fetchUsers();
    return new Response(JSON.stringify(users), {
        headers: { 'Content-Type': 'application/json' },
    });
}
```

Limits:

- **The request body is not forwarded.** The `Request` is built from the URL,
  method and headers only, so `await request.json()` has nothing to read.
- **An error thrown by a handler is not a 500**: the request falls through to the
  next middleware, the same as a missing file.
- API routes exist only in the dev server.

## Hot module replacement

The plugin adds no HMR handling, so a changed component triggers Vite's full page
reload.

## SSR

The plugin has no SSR option. Server rendering lives in `@exodra/string` and
`@exodra/ssr`; what Vite needs is its own setting:

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import exodra from '@exodra/vite-plugin';

export default defineConfig({
    plugins: [exodra()],
    ssr: {
        noExternal: ['@exodra/core', '@exodra/string'],
    },
});
```

## The `./client` subpath

`@exodra/vite-plugin/client` exports `transformExodraJsx`, the JSX transform without
the plugin, for a build script, a test transformer or another bundler. It wraps
`babel-preset-exodra`'s runner and adapts the source map to Rollup's type.

```javascript
import { transformExodraJsx } from '@exodra/vite-plugin/client';
```

## License

MIT
