---
sidebar_position: 2
title: Router API
---

# Router API Reference

The `@exodra/router` package provides routing built on Exodra's reactivity. The
router's `location` and `match` are bindables, so you derive reactive UI from
them with `derive()`.

Exports include: `createRouter`, `createBrowserHistory`, `createMemoryHistory`,
`Link`, `Outlet`, `Route`, `Routes`, `RouterProvider`, `createRoutesFromChildren`,
`useRouter`, `routerContextKey`, `lazy`, `preloadRoute`, `matchRoutes`,
`parsePath`, and the query helpers (`query`, `parseSearch`, `stringifySearch`,
`createSearch`, `mergeQuery`, `readSearch`).

## createRouter()

Creates a router instance. **`routes` is the first positional argument**, and
options are a second optional argument.

```typescript
function createRouter(
  routes: readonly TExoRoute[],
  options?: {
    history?: TExoHistory;
    beforeEach?: TExoRouteGuard;
    afterEach?: (to: TExoRouteMatch, from?: TExoRouteMatch) => void;
  }
): TExoRouter;

type TExoRoute = {
  id?: string;
  path: string;
  component: TExoRouteComponent;
  children?: readonly TExoRoute[];
  beforeEnter?: TExoRouteGuard;
  beforeLeave?: TExoRouteGuard;
};
```

There is **no** `mode`, `base`, or `options.routes` — the base path is configured
on the history (`basePath`), and there is no hash mode toggle.

### Example

```javascript
import { createRouter, createBrowserHistory } from '@exodra/router';
import Home from './pages/home';
import About from './pages/about';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserDetail },
];

const router = createRouter(routes, {
  history: createBrowserHistory(),
  beforeEach: (to, from) => {
    // return true to allow, false to block, or a string path to redirect.
    return true;
  },
});
```

If you omit `history`, the router uses an in-memory history.

## History

```typescript
function createBrowserHistory(options?: { window?: Window; basePath?: string }): TExoHistory;
function createMemoryHistory(initialPathOrOptions?: string | { initialPath?: string; basePath?: string }): TExoHistory;
```

- `createBrowserHistory()` drives the browser URL via the History API and
  `popstate`.
- `createMemoryHistory('/start')` is for SSR and tests — seed it with the
  initial path.

```javascript
import { createRouter, createMemoryHistory } from '@exodra/router';

// On the server, seed the location from the request URL.
const router = createRouter(routes, { history: createMemoryHistory(url) });
```

## Router instance

A `TExoRouter` exposes reactive state and navigation methods:

| Member | Description |
| --- | --- |
| `routes` | The route table. |
| `location` | A bindable of the current `{ pathname, search, hash, href }`. |
| `match` | A bindable of the current `TExoRouteMatch \| undefined`. |
| `navigationState` | A bindable of `'idle' \| 'loading' \| 'submitting'`. |
| `getLocation()` | Current location value. |
| `getMatch()` | Current match value. |
| `navigate(to, options?)` | Navigate; returns `Promise<TExoLocation>`. |
| `setPathname(pathname, options?)` | Navigate keeping the current search/hash. |
| `setSearch(search, options?)` | Replace the search string/object. |
| `setQuery(query, options?)` | Replace the query from an object. |
| `patchQuery(query, options?)` | Merge a query patch into the URL. |
| `bindQuery(key, options?)` | Two-way `bindable` for a single query parameter. |
| `getQuery(options?)` | Parse the current search string. |
| `createHref(to)` | Resolve a path to an href (applies base path). |
| `dispose()` | Tear down the router. |

### navigate()

```typescript
router.navigate(to: string, options?: { replace?: boolean }): Promise<TExoLocation>;
```

```javascript
await router.navigate('/users/123');
await router.navigate('/login', { replace: true });
```

### Reacting to location

`location` and `match` are bindables — derive UI from them:

```jsx
import { derive } from '@exodra/reactivity';

const cls = derive(router.location, loc =>
  loc.pathname === '/' ? 'nav__link nav__link--active' : 'nav__link'
);

<a static={{ href: '/' }} bindable={{ class: cls }} />;
```

### bindQuery()

Two-way binding for a single query parameter. `getValue()` reads the current
value (or default), `subscribe()` fires on any URL change (including
back/forward), and `setValue()` patches just that key into the URL.

```javascript
const project = router.bindQuery('project', { default: '' });

project.getValue();            // current ?project= value, or ''
project.setValue('alpha');     // → ?project=alpha
project.subscribe(value => console.log('filter:', value));
```

## Components

### RouterProvider

Provides a router to descendants through context. Pass an existing `router`, or
`routes` (+ optional `history`) for it to create one.

```jsx
import { RouterProvider } from '@exodra/router';

<RouterProvider static={{ router }}>
  <App />
</RouterProvider>;
```

### Routes

Convenience component that creates/provides a router and renders an `Outlet`.

```jsx
import { Routes, Route } from '@exodra/router';

<Routes>
  <Route static={{ path: '/', component: Home }} />
  <Route static={{ path: '/about', component: About }} />
</Routes>;
```

### Route

A declarative route definition consumed by `Routes` /
`createRoutesFromChildren`. It renders nothing itself — its props (`path`,
`component`, `id`, `children`) describe a route.

```jsx
<Route static={{ path: '/users/:id', component: UserDetail }} />;
```

### Outlet

Renders the currently matched child route. Optional `as` (host tag, default
`div`), `fallback` (no-match content), and `suspense` (shown while a lazy route
loads).

```jsx
import { Outlet } from '@exodra/router';

<Outlet static={{ as: 'main', fallback: <NotFound /> }} />;
```

### Link

Router-aware navigation anchor. The target is the `to` prop (in `static`).

```jsx
import { Link } from '@exodra/router';

<Link static={{ to: '/', children: 'Home' }} />
<Link static={{ to: '/about', replace: true, children: 'About' }} />
```

There is **no** `activeClass` prop — derive an active class from
`router.location` (see [Reacting to location](#reacting-to-location)).

## useRouter()

Hook that returns the router from context (throws if no router was provided).
Components receive a context object as their argument.

```javascript
import { useRouter } from '@exodra/router';
import { defineComponent, h, text } from '@exodra/core';

const LoginButton = defineComponent(context => {
  const router = useRouter(context);
  return h('button', {
    static: { children: text('Log in') },
    handlers: { onClick: () => router.navigate('/dashboard') },
  });
});
```

> There is **no** `useRoute`, `useParams`, `useLocation`, or `useQuery`. Read the
> current match with `router.getMatch()` (its `.params` holds path params), and
> the query with `router.getQuery()` or `router.bindQuery()`.

## Lazy routes

`lazy()` wraps a dynamic import into a loader the router resolves on match;
`preloadRoute()` warms it ahead of time.

```javascript
import { lazy, preloadRoute } from '@exodra/router';

const routes = [
  { path: '/settings', component: lazy(() => import('./pages/settings')) },
];

// Optionally preload before navigation.
preloadRoute(routes[0].component);
```

## Query helpers

| Helper | Description |
| --- | --- |
| `parseSearch(search, options?)` | Parse a search string into an object (optionally typed by a schema). |
| `stringifySearch(query)` | Serialize a query object to a `?…` string. |
| `createSearch(query)` | Alias of `stringifySearch`. |
| `mergeQuery(current, patch)` | Merge a patch over a parsed query. |
| `readSearch(search, options?)` | Alias of `parseSearch`. |
| `query` | Typed field builders (`query.string()`, `query.number()`, `query.boolean()`, `query.array()`, `query.optional()`) for schema parsing. |

```javascript
import { parseSearch, stringifySearch, query } from '@exodra/router';

parseSearch('?page=2', { parseNumbers: true }); // { page: 2 }
stringifySearch({ page: 2, tags: ['a', 'b'] });  // '?page=2&tags=a&tags=b'

// Typed schema parsing:
const result = parseSearch('?page=3', {
  schema: { page: query.number({ default: 1 }) },
}); // { page: 3 }
```

> Removed/nonexistent APIs: `createBrowserRouter`, `createMemoryRouter`,
> `RouterView`, `useRoute`, `useParams`, `useLocation`, `useQuery`,
> `router.beforeEach()` (it's the `beforeEach` **option**), `setQuery` as a
> distinct concept from the instance method above, and the `activeClass` prop.
