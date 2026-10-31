---
sidebar_position: 2
title: Router API
---

# Router API Reference

`@exodra/router` is a renderer-neutral core plus the handful of pieces that draw
a route.

| Half | What it is |
| --- | --- |
| **The renderer-neutral half** — `createExoRouter`, the histories, `matchExoRoutes`, `parseExoPath`, the guards, `exoLazy` / `fetchExoRouteChunk`, and the query helpers | A plain service: it knows about URLs, route tables and matches, calls `onChange` subscribers after every commit, and knows nothing about how anything is drawn. |
| **The components** — `ExoOutlet`, `exoOutlet`, `ExoLink`, `provideExoRouter`, `injectExoRouter`, `preloadExoPage` | A page is a machine, a route boundary is a machine whose one child is the page the URL selects, and the router reaches components through `provide` / `inject`. |

Matching, chaining, guards and `handle` read `path`, `children`, `catchAll` and
`handle`, and never read `component` — so a route's component is carried, not
interpreted.

## How the names are spelt

Two name shapes, and the shape tells you the layer:

| Shape | What it is | Examples |
| --- | --- | --- |
| `ExoThing` | A **value you pass**, never a call — a ready-made machine | `ExoOutlet`, `ExoLink` |
| `exoThing(…)` | A **factory you call** (at module level) that returns one | `exoOutlet('main')`, `exoLazy(() => import(…))` |

And two pairs of words that are not interchangeable:

- **Route** vs **page.** A *route* is a table entry — a path, its children, its
  guards, and a `component` this half of the package never looks inside. A *page*
  is that component once it is a real machine the renderer can draw.
  So `matchExoRoutes`, `collectExoRouteGuards` and `fetchExoRouteChunk` are about
  the table; `isExoPageMachine` and `preloadExoPage` are about the thing that gets
  drawn.
- **Query** vs **search.** A *query* is the parsed record (`{ page: 2 }`);
  *search* is only the raw `?page=2` text, spelt that way because
  `Location.search` is. Everything that parses, builds, merges or validates one
  says *query*.

Exports: `createExoRouter`, `createExoBrowserHistory`, `createExoMemoryHistory`,
`matchExoRoutes`, `matchExoRouteChain`, `parseExoPath`, `collectExoRouteGuards`,
`executeExoGuards`, `exoLazy`, `isExoLazyLoader`, `loadExoLazyMachine`,
`fetchExoRouteChunk`, `resolveExoRouteMachine`, the query helpers (`exoQuery`,
`parseExoQuery`, `stringifyExoQuery`, `mergeExoQuery`,
`ExoQueryValidationError`), the components (`ExoOutlet`, `exoOutlet`, `ExoLink`,
`shouldIgnoreExoLinkClick`, `provideExoRouter`, `injectExoRouter`, `EXO_ROUTER`,
`preloadExoPage`, `isExoPageMachine`), and the package's types.

---

# The renderer-neutral half

The router is read with getters and followed with `onChange`; a component that
follows it subscribes from a machine effect
([Following the router](#following-the-router)).

## createExoRouter()

Creates a router instance. **`routes` is the first positional argument**, and
options are a second optional argument.

```typescript signature
function createExoRouter(
  routes: readonly TExoRoute[],
  options?: {
    history?: TExoHistory;
    beforeEach?: TExoRouteGuard;
    afterEach?: (to: TExoRouteMatch | undefined, from?: TExoRouteMatch) => void;
  }
): TExoRouter;

type TExoRoute = {
  id?: string;
  path: string;
  component: TExoRouteMachine;
  children?: readonly TExoRoute[];
  beforeEnter?: TExoRouteGuard;
  beforeLeave?: TExoRouteGuard;
  catchAll?: string;          // parameter name for [...params]
  optionalCatchAll?: string;  // parameter name for [[...params]]
  handle?: unknown;
};
```

There is **no** `mode`, `base`, or `options.routes` — the base path is configured
on the history (`basePath`), and there is no hash mode toggle.

### Example

```javascript
import { createExoRouter, createExoBrowserHistory } from '@exodra/router';
import Home from './pages/home';
import About from './pages/about';

const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
  { path: '/users/:id', component: UserDetail },
];

const router = createExoRouter(routes, {
  history: createExoBrowserHistory(),
  beforeEach: (to, from) => {
    // return true to allow, false to block, or a string path to redirect.
    return true;
  },
});
```

If you omit `history`, the router uses an in-memory history.

## History

```typescript signature
function createExoBrowserHistory(options?: { window?: Window; basePath?: string }): TExoHistory;
function createExoMemoryHistory(initialPathOrOptions?: string | { initialPath?: string; basePath?: string }): TExoHistory;
```

- `createExoBrowserHistory()` drives the browser URL via the History API and
  `popstate`.
- `createExoMemoryHistory('/start')` is for SSR and tests — seed it with the
  initial path.

```javascript
import { createExoRouter, createExoMemoryHistory } from '@exodra/router';

// On the server, seed the location from the request URL.
const router = createExoRouter(routes, { history: createExoMemoryHistory(url) });
```

## Router instance

A `TExoRouter` is a plain service — getters, navigation methods and one
subscription:

| Member | Description |
| --- | --- |
| `routes` | The route table. |
| `getLocation()` | The current `{ pathname, search, hash, href, state? }`. |
| `getMatch()` | The current leaf match, or `undefined` when nothing matched. |
| `getMatches()` | The full matched branch, root → leaf. An entry a navigation did not change is the **same object** as before. |
| `getNavigationState()` | `'idle' \| 'loading'` — `'loading'` only while an async guard decides. |
| `getQuery(options?)` | The current query, parsed from `location.search`. |
| `navigate(to, options?)` | Navigate; returns `Promise<TExoLocation>`. |
| `setPathname(pathname, options?)` | Navigate keeping the current search/hash. |
| `setSearch(search, options?)` | Replace the whole `?…` string. Handed an object instead, it does exactly what `setQuery` does. |
| `setQuery(query, options?)` | Replace the whole query from a record. |
| `patchQuery(query, options?)` | Merge a query patch into the URL (`undefined` clears a key). |
| `onChange(update)` | Call `update` after every commit and every navigation-state change; returns `off`. |
| `createHref(to)` | Resolve a path to an href (applies base path). |
| `dispose()` | Tear down the router — and its history. |

Every navigation method returns `Promise<TExoLocation>`.

### navigate()

```typescript signature
router.navigate(
  to: string,
  options?: { replace?: boolean; state?: unknown }
): Promise<TExoLocation>;
```

```javascript
await router.navigate('/users/123');
await router.navigate('/login', { replace: true });
await router.navigate('/checkout', { state: { from: 'cart' } }); // see "Location state"
```

`navigate()` runs the guards **before** it writes history, so a refused
navigation writes nothing, needs no rollback and does not fire `afterEach`. A
change the router did not write — back/forward, or someone else's
`history.push` — is put back with `history.replace` when it is refused, silently:
no guard runs again and `afterEach` does not fire.

Only the **latest** navigation may commit: an older one whose guard answers late
does nothing. A branch with no guard, or only synchronous guards, commits
**synchronously inside** `navigate()`. The returned promise resolves after a
redirect chain has landed, with the location it landed on.

### Route `handle` and the match chain

Attach arbitrary static metadata to a route with `handle` — the equivalent of
React Router's route `handle`. It surfaces on **every** entry of the matched
branch, so `getMatches()` (root → leaf) is your breadcrumb / title / layout-flag
source. `getMatch()` returns just the leaf.

```javascript
const routes = [
  { path: '/', component: Root, handle: { crumb: 'Home' }, children: [
    { path: 'users', component: Users, handle: { crumb: 'Users' }, children: [
      { path: ':id', component: User, handle: { crumb: 'Profile' } },
    ]},
  ]},
];

const crumbs = router.getMatches().map(m => ({ label: m.handle.crumb, href: m.pathname }));
// at /users/42 → [{Home, /}, {Users, /users}, {Profile, /users/42}]
```

Each entry also carries its own resolved `pathname` (params substituted) and only
the params named in **its own** full path, root through itself; the leaf carries
all of them. `handle` is typed `unknown` — cast it to your own metadata shape at
the read site.

### Which route wins

Matching ranks the routes; it does not take the first one declared. Position by
position, a **static** segment beats a `:param`, a `:param` beats a pattern that
has **ended** there, and an ended pattern beats a `*` **catch-all**. Between equal
patterns the **deeper** route wins — so an index child (`path: ''`) is reached
inside its layout — and after that, declaration order. `/users/new` beats
`/users/:id` whichever is declared first.

### Location state

Carry per-navigation data that should **not** live in the URL — a "came from"
hint, a scroll target, a small object you don't want to serialize into query
params. It's stored in the History API, so it survives back/forward, and is read
back on `location.state`:

```javascript
await router.navigate('/checkout', { state: { from: 'cart' } });
router.getLocation().state; // { from: 'cart' }
```

> Location `state` is lost on a hard reload and is not shareable (not in the
> URL). If you need state that survives reloads or is linkable, use query params
> (`setQuery` / `patchQuery`) instead. `state` is typed `unknown`.

### Following the router

A component that follows the URL subscribes with `onChange` from a machine
**effect**. `onChange` returns its `off`, which is what an effect returns, so
`disconnectExoNode` / `connectExoNode` switch the subscription off and on and
teardown ends it:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoMachineNode, TExoTextPort } from '@exodra/core';
import { injectExoRouter } from '@exodra/router';

const WHERE_SCHEMA = createExoSchema((b) => {
    let path!: TExoTextPort;
    b.el('p', null, (p) => {
        path = p.textPort();
    });
    return { path };
});
const mWhere = createExoMachineBuilder<TExoMachineNode>(WHERE_SCHEMA);
const showPath = mWhere.transition((c) => {
    c.text(WHERE_SCHEMA.ports.path, injectExoRouter(c).getLocation().pathname);
});
mWhere.wire((c) => showPath(c));
mWhere.effect((c) => {
    showPath(c);
    return injectExoRouter(c).onChange(() => showPath(c));
});
const WHERE = mWhere.done();
```

`onChange` runs after every commit and every navigation-state change, and only
after every route boundary has redrawn. A subscriber added while a notification is
running is first called on the next one. For the current link in a nav bar, use
`ExoLink`'s `currentWhen` instead of writing this by hand.

### Navigation state

`getNavigationState()` is `'idle'` or `'loading'`. It is `'loading'` only while an
**asynchronous** guard decides; a branch with no guard or only synchronous guards
never leaves `'idle'`, and a refused navigation returns to `'idle'` as well as a
committed one. Each change notifies `onChange`.

## Lazy routes

`exoLazy()` wraps a dynamic import into a loader the router resolves on match;
`fetchExoRouteChunk()` makes that chunk arrive ahead of time. `isExoLazyLoader`,
`loadExoLazyMachine` and `resolveExoRouteMachine` are the same machinery,
exported for a renderer that resolves a route's component itself.

```javascript
import { exoLazy, fetchExoRouteChunk } from '@exodra/router';

const routes = [
  { path: '/settings', component: exoLazy(() => import('./pages/settings')) },
];

// Start the download early — on hover, on idle, on a hunch about what is next.
fetchExoRouteChunk(routes[0].component);
```

To *render* a lazy route rather than merely fetch it, use
[`preloadExoPage`](#lazy-pages-preloadexopage) instead. The two differ in what
they leave behind, which is why one is spelt **route** and the other **page**:

| | `fetchExoRouteChunk(component)` | `preloadExoPage(loader)` |
| --- | --- | --- |
| Takes | a route's `component` — a page already here is a no-op | the loader itself |
| Checks the module is a page | no | yes, and rejects if it is not |
| Leaves behind | the in-flight *promise*, which no synchronous render can read | the resolved *component*, where the outlet looks for it |
| Makes a lazy route server-renderable | no | yes |

## Guards

`beforeEach` (router-wide) and `beforeEnter` / `beforeLeave` (per route) each
return `true` to allow, `false` to block, or a string path to redirect — and may
return a promise of any of those. A guard that throws or rejects counts as
`false`. `collectExoRouteGuards` and `executeExoGuards` are exported for a
renderer that runs the chain itself; `executeExoGuards` stays synchronous until a
guard returns a promise, and returns a `TExoRouteGuardResult`.

## Query helpers

A **query** is the parsed record; **search** is only the raw `?page=2` string.
None of these read a URL by themselves — hand them
`router.getLocation().search`, or use `router.getQuery()`, which does that for
you.

| Helper | Description |
| --- | --- |
| `parseExoQuery(search, options?)` | A `?…` string in, a query record out (optionally typed and validated by a schema). The leading `?` is optional; a repeated key becomes an array. **The record has a NULL PROTOTYPE** — see below. |
| `stringifyExoQuery(query)` | A query record in, a `?…` string out. Empty gives `''`, not `'?'`; `undefined` / `null` drop their key. |
| `mergeExoQuery(current, patch)` | Lay a patch over a parsed query. |
| `exoQuery` | Typed field builders (`exoQuery.string()`, `exoQuery.number()`, `exoQuery.boolean()`, `exoQuery.array()`, `exoQuery.optional()`) for schema parsing. |
| `ExoQueryValidationError` | Thrown when a schema field rejects a value. |

### The parsed record has a null prototype, and that is deliberate

`parseExoQuery` builds its record with `Object.create(null)`, so it inherits nothing. Read a key,
spread it, `Object.entries` it, hand it to `stringifyExoQuery` — all unchanged. What stops working is
anything reached through `Object.prototype`:

```ts
import { parseExoQuery } from '@exodra/router';

const query = parseExoQuery('?page=2');

// `query.hasOwnProperty('page')` throws: the record inherits nothing, so there is no such method.
const present = 'page' in query;
const alsoPresent = Object.prototype.hasOwnProperty.call(query, 'page');
// `Object.hasOwn(query, 'page')` is the modern spelling and needs an ES2022 lib; this package
// targets ES2020, which is why the call above is written the long way.
```

**Why.** A URL supplies the KEYS as well as the values, and an ordinary `{}` already answers to
twelve of them. `?__proto__=x` invoked the prototype setter and the parameter vanished — no own key,
nothing in `Object.entries`, and the record silently reparented. `?constructor=1` was worse in a
quieter way: the assignment created a real own property whose value contained the `Object`
constructor **function**, and that survived every check downstream to reach the caller as a query
value. Neither wrote into anything shared, so neither was prototype pollution — they were a dropped
parameter and a returned object nobody chose the shape of.

`Object.create(null)` closes all twelve at once, at the accumulator, which is why the fix is one line
per accumulator rather than a list of names to keep up to date.

Route **params** are a different case and stay an ordinary object: their keys come from the route
table the application wrote (`:id`, a catch-all), and the URL supplies only values.

```javascript
import { parseExoQuery, stringifyExoQuery, exoQuery } from '@exodra/router';

parseExoQuery('?page=2', { parseNumbers: true }); // { page: 2 }
stringifyExoQuery({ page: 2, tags: ['a', 'b'] }); // '?page=2&tags=a&tags=b'

// Typed schema parsing:
const result = parseExoQuery('?page=3', {
  schema: { page: exoQuery.number({ default: 1 }) },
}); // { page: 3 }
```

Earlier versions also exported `readExoSearch` and `createExoSearch`, aliases of
exactly these two functions. They are gone: two exported names for one function
is a guess at the autocomplete, and `read` suggested a difference (reading the
live URL?) that never existed. Rename `readExoSearch` → `parseExoQuery` and
`createExoSearch` → `stringifyExoQuery`; the signatures are unchanged.

---

# The components

Three things make a routed page, and none of them is a JSX element:

- **A page is a machine**, and the match that selected it arrives as the
  **params of its wire**: `createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(SCHEMA)`,
  then `mPage.wire((c, match) => …)`.
- **A route boundary is a machine.** `ExoOutlet` (a `<div>`) or `exoOutlet(tag, attrs)`,
  placed with `c.one(port, ExoOutlet)`; its one child is the page the URL selects.
- **The router travels in the context.** `provideExoRouter(c, router)` above,
  `injectExoRouter(c)` below — boundaries and links do the injecting themselves.

A routed page renders on the server (`ExoStrBackend`), in the browser
(`ExoDomBackend`), and hydrates: `withExoHydration` adopts the server's markup by
identity, nested layouts included. A boundary opens a child list for its page, so the
DOM backend that renders one is composed with
[`withExoChildList`](./dom.md#withexochildlist); without it the first outlet throws
[EXO0109](../errors.md#exo0109).

The route table itself is **data**, not markup: a plain array of objects. A
schema is a tag with numbered ports, built once at module load, and there is
nowhere in it to put a component reference or a guard function — which is exactly
what a route entry is made of.

```ts no-check  // `./pages` stands for your own page components
import type { TExoRoute } from '@exodra/router';
import { ABOUT_PAGE, HOME_PAGE, USER_PAGE } from './pages';

const ROUTES: readonly TExoRoute[] = [
  { path: '/', component: HOME_PAGE },
  { path: '/about', component: ABOUT_PAGE, handle: { crumb: 'About' } },
  { path: '/users/:id', component: USER_PAGE },
];
```

## A routed page, end to end

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachineNode, TExoTextPort } from '@exodra/core';
import { ExoDomBackend, withExoChildList, withExoCompiler } from '@exodra/dom';
import type { TExoDomNode } from '@exodra/dom';
import {
  ExoLink,
  ExoOutlet,
  createExoBrowserHistory,
  createExoRouter,
  provideExoRouter,
} from '@exodra/router';
import type { TExoRoute, TExoRouteMatch } from '@exodra/router';

const USER_PAGE_SCHEMA = createExoSchema(b => {
  let name!: TExoTextPort;
  b.el('h1', null, h => {
    name = h.textPort();
  });
  return { name };
});
const mUserPage = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(USER_PAGE_SCHEMA);
mUserPage.wire((c, match) => {
  c.text(USER_PAGE_SCHEMA.ports.name, match.params.id);
});
const USER_PAGE = mUserPage.done();

const ROUTES: readonly TExoRoute[] = [{ path: '/users/:id', component: USER_PAGE }];

const router = createExoRouter(ROUTES, { history: createExoBrowserHistory() });

const APP_SCHEMA = createExoSchema(b => {
  let nav!: TExoChildrenPort;
  let page!: TExoChildrenPort;
  b.el('div', { class: 'app' }, d => {
    d.el('nav', null, n => {
      nav = n.childrenPort();
    });
    d.el('main', null, m => {
      page = m.childrenPort();
    });
  });
  return { nav, page };
});
const mApp = createExoMachineBuilder<TExoDomNode>(APP_SCHEMA);
mApp.createInitialState(c => {
  provideExoRouter(c, router);
  c.one(APP_SCHEMA.ports.nav, ExoLink, { to: '/users/1', label: 'First user' });
  c.one(APP_SCHEMA.ports.page, ExoOutlet);
});
const APP = mApp.done();

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
backend.render(APP, document.getElementById('root') as HTMLElement);
```

`TExoDomNode` types the app against the browser. A machine that has to run on the
server too names only what it uses — for placing a boundary, an interface with
`one(port: TExoChildrenPort, machine: TExoMachine<never>): void` over
`TExoMachineNode` (see [Nested routes](#nested-routes)).

## provideExoRouter()

```typescript signature
function provideExoRouter(connector: TExoProvideWiring, router: TExoRouter): void;
```

Puts the router where every boundary and every link below can find it. It is a
**call inside a machine**, not a component: `provide` is a method on the exonode,
and a component on this core is exactly one element — so a provider component
would have to invent a wrapper node to carry a value that needs no node.

It does **not** create a router and does **not** dispose one. An initial state
runs once per instance on *both* backends, so a router created inside one would be
created twice on a page that is rendered and then hydrated. `createExoRouter()`
and `router.dispose()` belong beside the mount that owns them.

`injectExoRouter(c)` is the other side — `useRouter` asked of an exonode. It
**throws** when nothing above provided a router, because a boundary with no
router shows nothing and a link with no router cannot resolve an href, and both of
those otherwise fail much later with nothing pointing at the missing
`provideExoRouter`.

## ExoOutlet and exoOutlet()

Two spellings of one route boundary — a machine **value** you pass, and a
**factory** you call to get one around another tag. `ExoOutlet` *is*
`exoOutlet('div')`.

```typescript signature
const ExoOutlet: TExoMachine<TExoOutletWiring, { page: TExoChildrenPort }>;
function exoOutlet(tag?: string, attrs?: Readonly<Record<string, unknown>> | null):
  TExoMachine<TExoOutletWiring, { page: TExoChildrenPort }>;
```

| Form | Use it when |
| --- | --- |
| `c.one(port, ExoOutlet)` | You just want a boundary; it is a `<div>`. |
| `c.one(port, ROUTED)`, with `const ROUTED = exoOutlet('main')` at module level | The boundary should be the tag the layout was going to write anyway — the node then costs nothing. |
| `c.childList(port).insert(c.build(ExoOutlet))` | The boundary goes into a child list the layout already manages. |

`exoOutlet()` builds a schema, so **call it at module level** — per render it
would rebuild and re-plan a shape that has not changed.

### Nested routes

A layout is a route with `children`, and its page places its own `ExoOutlet`:

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode } from '@exodra/core';
import { ExoOutlet } from '@exodra/router';

interface TNestingNode extends TExoMachineNode {
  one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const LAYOUT_SCHEMA = createExoSchema(b => {
  let page!: TExoChildrenPort;
  b.el('section', { class: 'layout' }, s => {
    page = s.childrenPort();
  });
  return { page };
});
const mLayout = createExoMachineBuilder<TNestingNode>(LAYOUT_SCHEMA);
mLayout.createInitialState(c => {
  c.one(LAYOUT_SCHEMA.ports.page, ExoOutlet);
});
const LAYOUT = mLayout.done();
```

Depth is automatic: the nested boundary finds its parent boundary through the
context and draws the next entry of the matched branch. Two outlets in one page
both stand for the same depth and draw the same page.

Only the **outermost** boundary listens to the router. Nested ones are reached
top-down, through their parent, after the parent's level is settled — so on a
navigation across two layouts the arriving page is built once, inside the
arriving layout, and never into the layout that is leaving.

### When a page is rebuilt

- **A different route component** at a depth: the old page is removed (its
  teardown runs) and the new one is built.
- **The same component, a different match** — `/users/1` → `/users/2`: a page
  **with a wire** is **re-wired in place** — same DOM nodes, same listeners. A
  page **without a wire** is rebuilt.
- **The same match**: that level is kept, and the boundary goes on to the levels
  below it. Entries of `getMatches()` a navigation did not change are the same
  objects, so a query-only change keeps every page.

A page's wire may only **write ports**. Placing children (`childList`, `one`,
`list`) in a wire throws `EXO0103` when the wire is re-run. Place children in
`createInitialState`, which can read its match with
`injectExoRouter(c).getMatches()[index]` — `index` is the boundary depth it was
built at.

## ExoLink

A machine around a real `<a href>` the router takes over on a plain left click.
Its values are the **params of its wire**, `TExoLinkParams`:

```typescript
type TExoLinkParams = {
  readonly to: string;         // resolved through router.createHref
  readonly label?: string;     // the anchor's text
  readonly replace?: boolean;  // replace the history entry instead of pushing
  readonly state?: unknown;    // per-entry location state
  readonly target?: string;    // anything but _self is left to the browser
  readonly download?: string;
  readonly onClick?: (event: MouseEvent) => void;  // preventDefault() calls the click off
  readonly currentWhen?: 'exact' | 'prefix';       // writes aria-current="page"
};
```

```ts
import { createExoMachineBuilder, createExoSchema } from '@exodra/core';
import type { TExoChildrenPort } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { ExoLink } from '@exodra/router';

const NAV_SCHEMA = createExoSchema(b => {
  let items!: TExoChildrenPort;
  b.el('nav', null, n => {
    items = n.childrenPort();
  });
  return { items };
});
const mNav = createExoMachineBuilder<TExoDomNode>(NAV_SCHEMA);
mNav.createInitialState(c => {
  const items = c.childList(NAV_SCHEMA.ports.items);
  items.insert(c.build(ExoLink, 0, { to: '/', label: 'Home', currentWhen: 'exact' }));
  items.insert(c.build(ExoLink, 1, { to: '/about', label: 'About', currentWhen: 'prefix' }));
});
const NAV = mNav.done();
```

`ExoLink` injects the router itself, and it renders on the **server** too — the
string backend prints the same anchor the browser draws.

**`currentWhen`** writes `aria-current="page"` while the location is current for
the link: `'exact'` when the pathname equals `to`, `'prefix'` also for any path
below it. Only a link with `currentWhen` subscribes to the router.

The interesting half is the clicks it does **not** take — a middle click, a
⌘/Ctrl/Shift/Alt click, a `download`, a `target` other than `_self`, another
origin, or a click something upstream already called off. That policy is exported
on its own as `shouldIgnoreExoLinkClick(event, href, target?, download?)` for a
hand-written anchor that wants to behave identically. A destination that carries
its own scheme or authority (`https://…`, `mailto:…`, `//host/x`) is used as the
href verbatim; everything else goes through `router.createHref`.

There is **no** `activeClass` param — `currentWhen` writes `aria-current`, and
`a[aria-current="page"]` is the selector.

## Lazy pages: preloadExoPage()

```typescript signature
function preloadExoPage(loader: TExoLazyRouteLoader): Promise<void>;
```

A render is one synchronous call on all three backends, so a route whose
component is still a `() => import(…)` prints **nothing**: the boundary is an
empty region and the browser fills it once the chunk lands. `preloadExoPage` fetches
the chunk **and remembers the resolved component**, so a synchronous render
afterwards can print it — which is what makes a lazy route server-renderable.

```ts no-check  // `./shell` and `./pages/dashboard` stand for your own modules
import { ExoStrBackend } from '@exodra/string';
import { createExoMemoryHistory, createExoRouter, exoLazy, preloadExoPage } from '@exodra/router';
import { SHELL } from './shell';

const DASHBOARD = exoLazy(() => import('./pages/dashboard'));

const router = createExoRouter([{ path: '/dashboard', component: DASHBOARD }], {
  history: createExoMemoryHistory('/dashboard'),   // seeded from the request URL
});

await preloadExoPage(DASHBOARD);                        // before the server render
const html = new ExoStrBackend().render(SHELL);         // the dashboard is in the markup
```

`fetchExoRouteChunk` is **not** this: it only makes the chunk arrive, which stops
a second fetch but hands a synchronous render nothing it can read
([the full comparison](#lazy-routes)).
A loader that resolves to something that is not a page is refused by
`preloadExoPage`, where the caller is awaiting and can see it — rather than inside a
subscriber an hour later, with no call stack pointing at the table.

`isExoPageMachine(component)` is the test underneath: a page is a machine — an
object carrying `declaration` and `handlers`, which `createExoMachineBuilder(…).done()`
returns — and a loader or a plain function is not one.

## Context tokens

`EXO_ROUTER` is the token `provideExoRouter` and `injectExoRouter` use, exported
for a component that wants `c.inject(EXO_ROUTER)` without the throw.

## Names this router does not have

> There is **no** `useRoute`, `useParams`, `useLocation`, or `useQuery`. A page
> receives its match as the params of its wire; anything else reads
> `router.getMatch()` (its `.params` holds path params) and `router.getQuery()`.

> Nonexistent APIs: `createBrowserRouter`, `createMemoryRouter`,
> `RouterView`, `useRoute`, `useParams`, `useLocation`, `useQuery`,
> `router.beforeEach()` (it's the `beforeEach` **option**), and the
> `activeClass` param.
