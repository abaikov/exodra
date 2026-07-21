# @exodra/router

Routing for Exodra applications, with optional Next.js-style file-based routing via `@exodra/vite-plugin`.

## Installation

```bash
npm install @exodra/router @exodra/core @exodra/reactivity
```

## Overview

`@exodra/router` provides a routing system with:

- **File-based Routing** - Generated from your file structure (via `@exodra/vite-plugin`)
- **Dynamic Routes** - Parameters, catch-all, optional catch-all
- **Route Guards** - `beforeEach` / `beforeEnter` / `beforeLeave`
- **Lazy Loading** - Code splitting with `lazy()`
- **Reactive Location** - `router.location` is a bindable you can `derive()` from
- **Query Helpers** - Parse / stringify / validate query strings

## Quick Start

`createRouter(routes, options?)` takes the routes array as the first positional
argument. Pass a history implementation in `options.history` (browser or memory).

```typescript
import {
  createRouter,
  createBrowserHistory,
  RouterProvider,
  Outlet,
} from '@exodra/router';
import { h } from '@exodra/core';
import { mount } from '@exodra/dom';

const router = createRouter(
  [
    { path: '/', component: HomePage },
    { path: '/about', component: AboutPage },
    { path: '/blog/:id', component: BlogPost },
  ],
  { history: createBrowserHistory() }
);

mount(
  h(RouterProvider, {
    static: {
      router,
      children: h(Outlet),
    },
  }),
  document.getElementById('root')!
);
```

For tests or non-browser environments, use `createMemoryHistory()`:

```typescript
import { createRouter, createMemoryHistory } from '@exodra/router';

const router = createRouter(routes, {
  history: createMemoryHistory('/about'),
});
```

## File-based Routing

With `@exodra/vite-plugin`, routes are generated from your file structure:

```
src/pages/
├── index.tsx          → /
├── about.tsx          → /about
├── _layout.tsx        → Shared layout
├── _error.tsx         → Error boundary
├── blog/
│   ├── index.tsx      → /blog
│   ├── [id].tsx       → /blog/:id
│   └── [...slug].tsx  → /blog/* (catch-all)
└── docs/
    └── [[...path]].tsx → /docs (optional catch-all)
```

### Special Files

- `_layout.tsx` - Wraps all pages in directory
- `_error.tsx` - Error boundary for pages
- `index.tsx` - Directory index route

### Dynamic Routes

- `[param].tsx` - Single parameter `/blog/123`
- `[...params].tsx` - Catch-all `/blog/2024/12/post`
- `[[...params]].tsx` - Optional catch-all (matches `/docs` and `/docs/intro`)

## Components

> Exodra components take typed prop buckets, not flat React-style props.
> Static props (including `children`) go in `static`, event handlers go in
> `handlers`, reactive values go in `bindables`. There are no flat attributes.

### RouterProvider

Provides routing context to your app. The router and children both live in `static`:

```typescript
h(RouterProvider, {
  static: {
    router,
    children: h(Outlet), // Renders matched route
  },
});
```

`RouterProvider` can also create its own router from `routes` (and optional
`history`) if you don't pass one:

```typescript
h(RouterProvider, {
  static: {
    routes,
    history: createBrowserHistory(),
    children: h(Outlet),
  },
});
```

### Outlet

Renders the matched route component:

```typescript
function Layout() {
  return h('div', {
    static: {
      children: [
        h('nav', { static: { children: '...' } }),
        h(Outlet), // Child routes render here
        h('footer', { static: { children: '...' } }),
      ],
    },
  });
}
```

### Link

Navigation component. The destination prop is `to` (not `href`), and lives in
`static` along with `children`. There is no `activeClass` prop — derive active
state yourself from `router.location` (see below).

```typescript
h(Link, {
  static: {
    to: '/about',
    children: 'About',
  },
});
```

### Routes / Route

`Routes` provides a router and renders an `Outlet`; `Route` is a declarative
config marker consumed by `createRoutesFromChildren`. Route props go in `static`:

```typescript
h(Routes, {
  static: {
    children: [
      h(Route, { static: { path: '/', component: HomePage } }),
      h(Route, { static: { path: '/about', component: AboutPage } }),
    ],
  },
});
```

## Hooks

### useRouter

`useRouter(context)` is the only router hook. It returns the router instance,
from which you read the current match, location, and query.

```typescript
function Component(context) {
  const router = useRouter(context);

  return h('button', {
    static: { children: 'Go' },
    handlers: {
      onClick: () => {
        router.navigate('/dashboard');
      },
    },
  });
}
```

### Reading the current match / params

There is no `useParams`. Read the current match via the router instance:

```typescript
function BlogPost(context) {
  const router = useRouter(context);
  const match = router.getMatch(); // TExoRouteMatch | undefined
  const id = match?.params.id;
  return h('div', { static: { children: `Post ID: ${id}` } });
}
```

A route renderer also receives the match directly:

```typescript
const route = {
  path: '/blog/:id',
  component: (match) =>
    h('div', { static: { children: `Post ID: ${match.params.id}` } }),
};
```

### Reading the location reactively

There is no `useLocation`. `router.location` is a bindable — read it once with
`router.getLocation()`, or `derive()` from it for reactive updates (including
browser back/forward):

```typescript
import { derive } from '@exodra/reactivity';

const activeClass = derive(router.location, (loc) =>
  loc.pathname === '/about' ? 'nav__link--active' : 'nav__link'
);
```

### Reading the query

There is no `useQuery`. Use `router.getQuery(options?)`, or the standalone
`parseSearch` / `readSearch` helpers:

```typescript
import { parseSearch } from '@exodra/router';

const query = router.getQuery(); // parsed from the current location
const q = parseSearch(router.getLocation().search).q;
```

## Route Guards

Guards run as `beforeEach` (createRouter option), or per-route `beforeEnter` /
`beforeLeave`. Returning a string redirects; returning `false` blocks; `true`
allows.

```typescript
const router = createRouter(
  [
    {
      path: '/admin',
      component: AdminPanel,
      beforeEnter: async (match) => {
        const user = await getUser();
        if (!user.isAdmin) {
          return '/login'; // Redirect
        }
        return true; // Allow
      },
    },
  ],
  {
    history: createBrowserHistory(),
    beforeEach: (to, from) => true, // global guard
    afterEach: (to, from) => {
      /* analytics, etc. */
    },
  }
);
```

## Programmatic Navigation

```typescript
const router = useRouter(context);

// Navigate to a path (returns a Promise that resolves with the new location)
router.navigate('/products');

// Replace the current entry
router.navigate('/login', { replace: true });

// Update only the pathname
router.setPathname('/new-path');

// Replace the search string / query object
router.setSearch({ page: 2 });
router.setSearch('?page=2');

// Merge a patch into the existing query
router.patchQuery({ page: 2 });
```

## Lazy Loading

Wrap a dynamic import with `lazy()`; the router resolves it on match. Use
`preloadRoute(component)` to warm a chunk ahead of time.

```typescript
import { lazy, preloadRoute } from '@exodra/router';

const dashboard = lazy(() => import('./Dashboard'));

const router = createRouter(
  [{ path: '/dashboard', component: dashboard }],
  { history: createBrowserHistory() }
);

// Optionally preload the chunk before navigating
void preloadRoute(dashboard);
```

## Query Helpers

```typescript
import {
  query,
  parseSearch,
  stringifySearch,
  readSearch,
  createSearch,
  mergeQuery,
} from '@exodra/router';

// Validate/coerce with a schema
const parsed = parseSearch('?page=2&active=true', {
  schema: {
    page: query.number({ default: 1 }),
    active: query.boolean({ default: false }),
  },
});

const search = stringifySearch({ page: 2, tags: ['a', 'b'] }); // '?page=2&tags=a&tags=b'
const merged = mergeQuery({ page: '1' }, { sort: 'asc' });
```

## TypeScript Support

```typescript
import type { TExoRoute, TExoRouter } from '@exodra/router';

const routes: TExoRoute[] = [
  { path: '/', component: Home },
  { path: '/about', component: About },
];
```

## With Vite Plugin

Use `@exodra/vite-plugin` for automatic route generation:

```typescript
// vite.config.ts
import exodra from '@exodra/vite-plugin';

export default {
  plugins: [
    exodra({
      pagesDir: 'src/pages',
    }),
  ],
};

// main.tsx
import { createRouter, createBrowserHistory } from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

const router = createRouter(routes, { history: createBrowserHistory() });
```

## API Reference

### Router & History

- `createRouter(routes, options?)` - Create a router; `options = { history?, beforeEach?, afterEach? }`
- `createBrowserHistory(options?)` - Browser history (uses the History API)
- `createMemoryHistory(initialPathOrOptions?)` - In-memory history (tests / SSR)

### Components

- `RouterProvider` - Provides routing context
- `Outlet` - Renders the matched route
- `Routes` - Provides a router and renders an `Outlet`
- `Route` - Declarative route config marker
- `Link` - Navigation anchor (prop `to`, children in `static.children`)
- `createRoutesFromChildren` - Build a routes array from `Route` children

### Hook & Context

- `useRouter(context)` - Returns the router instance
- `routerContextKey` - Context key the router is provided under

### Router Instance

- `router.location` - Bindable of the current location (`derive()` from it)
- `router.match` / `router.getMatch()` - Current route match
- `router.navigationState` / `router.getNavigationState()`
- `router.getLocation()` - Current location snapshot
- `router.getQuery(options?)` - Parsed query
- `router.navigate(to, { replace? })`
- `router.setPathname(pathname, options?)`
- `router.setSearch(search, options?)` / `router.setQuery(query, options?)` / `router.patchQuery(query, options?)`
- `router.bindQuery(key, options?)` - Two-way bindable for one query parameter
- `router.createHref(to)` / `router.dispose()`

### Lazy Loading

- `lazy(loader)` - Wrap a dynamic import as a route loader
- `preloadRoute(component)` - Preload a lazy route's chunk
- `isLazyLoader`, `loadLazyComponent`, `resolveRouteComponent`

### Matching & Paths

- `matchRoutes(routes, pathname)` - Match a pathname against routes
- `parsePath(path)` - Parse a path into `{ pathname, search, hash, href }`

### Query Helpers

- `query` - Field builders (`query.string`, `query.number`, `query.boolean`, `query.array`, `query.optional`)
- `parseSearch`, `readSearch`, `stringifySearch`, `createSearch`, `mergeQuery`
- `ExoQueryValidationError`

### Guards

- `collectRouteGuards`, `executeGuard`, `executeGuards`

### Route Configuration (`TExoRoute`)

- `path` - Route path pattern
- `component` - Schema, renderer `(match) => schema`, or `lazy()` loader
- `children` - Nested routes
- `beforeEnter` / `beforeLeave` - Route guards
- `layout` / `error` - Layout and error components
- `catchAll` / `optionalCatchAll` - Catch-all parameter names

### Types

- `TExoRouter`, `TExoRoute`, `TExoRouteMatch`, `TExoLocation`, `TExoRouterOptions`, and more

## License

MIT

---

📖 Full documentation: **[exodra.org](https://exodra.org)**
