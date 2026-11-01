# @exodra/router

Routing for Exodra. The router is a plain service: it matches URLs against a
route table, runs guards, navigates, and calls `onChange` subscribers after every
commit. A page is a machine, and a route boundary (`ExoOutlet`) is a machine whose
one child is the page the URL selects.

Full documentation: [exodra.org/docs/api/router](https://exodra.org/docs/api/router)

## Installation

```bash
npm install @exodra/router @exodra/core @exodra/context
```

## A routed page, end to end

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoMachineNode } from '@exodra/core';
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

const UserPagePorts = exoPorts({ name: EXO_PORT_TEXT });

const userPageSchema = createExoSchema(UserPagePorts, (b) => {
    b.el('h1', null, (h) => {
        h.textPort(UserPagePorts.name);
    });
});
const userPageBuilder = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(userPageSchema);
userPageBuilder.wire((c, match) => {
    c.text(UserPagePorts.name, match.params.id);
});
const UserPage = userPageBuilder.done();

const ROUTES: readonly TExoRoute[] = [{ path: '/users/:id', component: UserPage }];

const router = createExoRouter(ROUTES, { history: createExoBrowserHistory() });

const AppPorts = exoPorts({ nav: EXO_PORT_CHILDREN, page: EXO_PORT_CHILDREN });

const appSchema = createExoSchema(AppPorts, (b) => {
    b.el('div', { class: 'app' }, (d) => {
        d.el('nav', null, (n) => {
            n.childrenPort(AppPorts.nav);
        });
        d.el('main', null, (m) => {
            m.childrenPort(AppPorts.page);
        });
    });
});
const appBuilder = createExoMachineBuilder<TExoDomNode>(appSchema);
appBuilder.createInitialState((c) => {
    provideExoRouter(c, router);
    c.one(AppPorts.nav, ExoLink, { to: '/users/1', label: 'First user' });
    c.one(AppPorts.page, ExoOutlet);
});
const App = appBuilder.done();

const backend = withExoChildList(withExoCompiler(new ExoDomBackend()));
backend.render(App, document.getElementById('root') as HTMLElement);
```

- The page receives the match that selected it as the **params of its wire**.
- `provideExoRouter(c, router)` puts the router in the context; outlets and links
  find it there.
- A boundary opens a child list for its page, so the DOM backend is composed with
  `withExoChildList`; without it the first outlet throws `EXO0109`.
- The same tree renders on the server with `ExoStrBackend` (nested layouts
  included) and hydrates with `withExoHydration`.

## Routes

The route table is a plain array:

```ts no-check
type TExoRoute = {
    id?: string;               // carried, not read by the router
    path: string;              // '/users/:id', '' for an index child
    component: TExoRouteMachine; // a page machine, or an exoLazy() loader
    children?: readonly TExoRoute[];
    beforeEnter?: TExoRouteGuard;
    beforeLeave?: TExoRouteGuard;
    catchAll?: string;         // parameter name for a required catch-all
    optionalCatchAll?: string; // parameter name for an optional catch-all
    handle?: unknown;          // metadata, surfaced on every entry of the matched branch
};
```

**Which route wins.** Position by position, a static segment beats a `:param`, a
`:param` beats a pattern that has ended there, and an ended pattern beats a
catch-all. Between equal patterns the deeper route wins (so an index child
`path: ''` is reached inside its layout), then declaration order. `/users/new`
beats `/users/:id` whichever is declared first.

**Params.** Each entry of `router.getMatches()` carries the params of its own path
(root through itself); the leaf carries all of them. A required catch-all must
consume at least one segment: `/files/*` does not match `/files`. A `:param` is
percent-decoded; a catch-all value is not (`my%20report.pdf`), so an encoded `/`
inside one segment stays distinguishable.

## Reading the match, the location and the query

There are no hooks. A page reads its match from its wire params; anything else
asks the exonode for the router with `injectExoRouter(c)`, which throws when
nothing above provided one.

A wire may only write ports. Placing children (`childList`, `one`, `list`) in a
wire throws `EXO0103` when the wire is re-run, so children go in
`createInitialState`, which reads its match as
`injectExoRouter(c).getMatches()[index]` (`index` is the boundary depth):

```ts
import { EXO_PORT_CHILDREN, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoDomNode } from '@exodra/dom';
import { ExoLink, injectExoRouter } from '@exodra/router';

const OrgPorts = exoPorts({ tabs: EXO_PORT_CHILDREN });

const orgSchema = createExoSchema(OrgPorts, (b) => {
    b.el('section', null, (s) => {
        s.el('nav', null, (n) => {
            n.childrenPort(OrgPorts.tabs);
        });
    });
});
const orgBuilder = createExoMachineBuilder<TExoDomNode>(orgSchema);
orgBuilder.createInitialState((c, index) => {
    const match = injectExoRouter(c).getMatches()[index];
    const tabs = c.childList(OrgPorts.tabs);
    tabs.insert(c.build(ExoLink, 0, { to: match.pathname + '/repos', label: 'Repositories' }));
    tabs.insert(c.build(ExoLink, 1, { to: match.pathname + '/people', label: 'People' }));
});
export const OrgPage = orgBuilder.done();
```

A component that follows the URL subscribes from an **effect**; `onChange` returns
the unsubscribe, which is what an effect returns:

```ts
import { EXO_PORT_TEXT, createExoMachineBuilder, createExoSchema, exoPorts } from '@exodra/core';
import type { TExoMachineBuilderNode, TExoMachineNode } from '@exodra/core';
import { injectExoRouter } from '@exodra/router';

const WherePorts = exoPorts({ path: EXO_PORT_TEXT });

const whereSchema = createExoSchema(WherePorts, (b) => {
    b.el('p', null, (p) => {
        p.textPort(WherePorts.path);
    });
});
const whereBuilder = createExoMachineBuilder<TExoMachineNode>(whereSchema);

function showPath(c: TExoMachineBuilderNode<typeof whereBuilder>): void {
    c.text(WherePorts.path, injectExoRouter(c).getLocation().pathname);
}

whereBuilder.wire((c) => showPath(c));
whereBuilder.effect((c) => {
    showPath(c);
    return injectExoRouter(c).onChange(() => showPath(c));
});
export const Where = whereBuilder.done();
```

`onChange` runs after every commit and every navigation-state change, after every
route boundary has redrawn. A subscriber added during a notification is first
called on the next one.

## Route boundaries

| Form | Use it when |
| --- | --- |
| `c.one(port, ExoOutlet)` | a boundary in a `<div>` |
| `c.one(port, Routed)` with `const Routed = exoOutlet('main')` | the boundary should be your own tag; call `exoOutlet(tag, attrs?)` at module level |
| `c.childList(port).insert(c.build(ExoOutlet))` | the boundary goes into a child list you manage |

A layout is a route with `children` whose page places its own outlet. Depth is
found through the context, so the nested outlet draws the next entry of the
matched branch:

```ts
import {
    EXO_PORT_CHILDREN,
    EXO_PORT_TEXT,
    createExoMachineBuilder,
    createExoSchema,
    exoPorts,
} from '@exodra/core';
import type { TExoChildrenPort, TExoMachine, TExoMachineNode } from '@exodra/core';
import { ExoOutlet } from '@exodra/router';
import type { TExoRoute, TExoRouteMatch } from '@exodra/router';

interface TNestingNode extends TExoMachineNode {
    one(port: TExoChildrenPort, machine: TExoMachine<never>): void;
}

const UsersLayoutPorts = exoPorts({ page: EXO_PORT_CHILDREN });

const usersLayoutSchema = createExoSchema(UsersLayoutPorts, (b) => {
    b.el('section', { class: 'users' }, (s) => {
        s.el('h2', null, (h) => h.text('Users'));
        s.childrenPort(UsersLayoutPorts.page);
    });
});
const usersLayoutBuilder = createExoMachineBuilder<TNestingNode>(usersLayoutSchema);
usersLayoutBuilder.createInitialState((c) => {
    c.one(UsersLayoutPorts.page, ExoOutlet);
});
const UsersLayout = usersLayoutBuilder.done();

const UserPorts = exoPorts({ name: EXO_PORT_TEXT });

const userSchema = createExoSchema(UserPorts, (b) => {
    b.el('h1', null, (h) => {
        h.textPort(UserPorts.name);
    });
});
const userBuilder = createExoMachineBuilder<TExoMachineNode, TExoRouteMatch>(userSchema);
userBuilder.wire((c, match) => {
    c.text(UserPorts.name, match.params.id);
});
const User = userBuilder.done();

const userListSchema = createExoSchema(exoPorts({}), (b) => {
    b.el('p', null, (p) => p.text('Pick a user'));
});
const UserList = createExoMachineBuilder<TExoMachineNode>(userListSchema).done();

export const ROUTES: readonly TExoRoute[] = [
    {
        path: '/users',
        component: UsersLayout,
        children: [
            { path: '', component: UserList },
            { path: ':id', component: User },
        ],
    },
];
```

`TNestingNode` names only what the layout calls, so the same machine runs on the
DOM and the server backends.

On a navigation, each level is compared with what the URL now selects:

- **a different route component**: the old page is removed (its teardown runs)
  and the new one is built;
- **the same component, a different match** (`/users/1` to `/users/2`): a page
  with a wire is re-wired in place, keeping its nodes, listeners and focus; a page
  without a wire is rebuilt;
- **the same match**: the level is kept. Entries a navigation did not change are
  the same objects in `getMatches()`, so a query-only change keeps every page.

Only the outermost boundary subscribes to the router; nested ones are updated
from their parent, so an arriving page is built once, inside the arriving layout.

## Links

`ExoLink` is a real `<a href>` that the router takes over on a plain left click.
Its params are `TExoLinkParams`:

```ts no-check
type TExoLinkParams = {
    readonly to: string;                             // resolved through router.createHref
    readonly label?: string;                         // the anchor's text
    readonly replace?: boolean;                      // replace the history entry
    readonly state?: unknown;                        // history entry state
    readonly target?: string;                        // anything but _self is left to the browser
    readonly download?: string;
    readonly onClick?: (event: MouseEvent) => void;  // runs first; preventDefault() cancels
    readonly currentWhen?: 'exact' | 'prefix';       // writes aria-current="page"
};
```

Place one with `c.one(port, ExoLink, params)` or `c.build(ExoLink, i, params)`.
`currentWhen` writes `aria-current="page"` while the pathname equals `to`
(`'exact'`) or is below it (`'prefix'`); only such a link subscribes to the router.
Style it with `a[aria-current="page"]`.

The router leaves these clicks to the browser: one already `defaultPrevented`, a
non-primary button, a modifier key (Cmd/Ctrl/Shift/Alt), a `download`, a `target`
other than `_self`, and another origin. The same policy is exported as
`shouldIgnoreExoLinkClick(event, href, target?, download?)` for hand-written
anchors. A destination with its own scheme or authority (`https://...`,
`mailto:...`, `//host/x`) is used as the href verbatim; everything else goes through
`router.createHref`, which applies the history's base path.

## Guards

`beforeEach` (router option), `beforeLeave` and `beforeEnter` (per route) return
`true` to allow, `false` to block, or a path string to redirect, or a promise of
one of those.

```ts
import { createExoBrowserHistory, createExoRouter } from '@exodra/router';
import type { TExoPageMachine } from '@exodra/router';

declare const AdminPage: TExoPageMachine;
declare function getUser(): Promise<{ isAdmin: boolean }>;

const router = createExoRouter(
    [
        {
            path: '/admin',
            component: AdminPage,
            beforeEnter: async () => ((await getUser()).isAdmin ? true : '/login'),
        },
    ],
    {
        history: createExoBrowserHistory(),
        beforeEach: () => true,
        afterEach: (to, from) => {},
    }
);
```

- **Order:** `beforeEach`, then `beforeLeave` across the branch being left (leaf
  to root), then `beforeEnter` across the branch being entered (root to leaf).
  The first result that is not `true` stops the chain.
- **A refused navigation writes nothing.** `navigate()` runs guards before it
  writes history and does not fire `afterEach`. A back/forward change that is
  refused is put back with `history.replace`, without running guards again.
- **A guard that throws or rejects counts as `false`** and is logged with
  `console.error`; `navigate()` resolves with the location still shown.
- **Only the latest navigation commits.** A branch with no guards or only
  synchronous ones commits synchronously inside `navigate()`. A redirect is a
  navigation of its own; the promise resolves where the chain landed.
- **A path that matches no route commits without running any guard**, including
  the `beforeLeave` of the page being left. `afterEach` still fires, with `to`
  undefined.
- `getNavigationState()` is `'loading'` only while an asynchronous guard decides.

## Navigation

```ts
import type { TExoRouter } from '@exodra/router';

declare const router: TExoRouter;

void router.navigate('/products');
void router.navigate('/login', { replace: true });
void router.navigate('/checkout', { state: { from: 'cart' } });
void router.setPathname('/new-path');
void router.setSearch('?page=2');
void router.setQuery({ page: 2 });
void router.patchQuery({ page: 3, sort: undefined });
```

Every method returns `Promise<TExoLocation>`. History entry `state` survives
back/forward but is not in the URL, so a shared link arrives without it.

**Lifetime.** `provideExoRouter` neither creates nor disposes a router: create it
beside the mount that owns it and call `router.dispose()` with that mount's
teardown. `dispose()` disposes the history too, so a history must not serve two
routers.

## Lazy pages

```ts no-check
import { createExoBrowserHistory, createExoRouter, exoLazy, preloadExoPage } from '@exodra/router';

const Dashboard = exoLazy(() => import('./pages/dashboard'));

const router = createExoRouter([{ path: '/dashboard', component: Dashboard }], {
    history: createExoBrowserHistory(),
});

await preloadExoPage(Dashboard);
```

A render is synchronous, so a boundary that meets an unresolved loader starts the
load, shows an empty slot, and draws the page when it lands.
`preloadExoPage(loader)` fetches the chunk, checks it is a page, and remembers the
component, so the next render (for example a server render) prints it.
`fetchExoRouteChunk(component)` only makes the chunk arrive and stores nothing a
render can read. A failed load is logged with `console.error`; the boundary does
not retry on its own and starts a fresh load the next time it redraws.

## Query helpers

A **query** is the parsed record; **search** is the raw `?page=2` string. None of
the helpers read the URL themselves: use `router.getQuery()` or pass
`router.getLocation().search`.

```ts
import { exoQuery, mergeExoQuery, parseExoQuery, stringifyExoQuery } from '@exodra/router';

const parsed = parseExoQuery('?page=2&active=true', {
    schema: {
        page: exoQuery.number({ default: 1 }),
        active: exoQuery.boolean({ default: false }),
    },
});

const search = stringifyExoQuery({ page: 2, tags: ['a', 'b'] });
const merged = mergeExoQuery({ page: '1' }, { sort: 'asc' });
const present = 'page' in parseExoQuery('?page=2');
```

- The leading `?` is optional and a repeated key becomes an array. Without a
  schema, values stay strings unless `parseNumbers`, `parseBooleans` or
  `parseValue` say otherwise; with one, a bad value throws `ExoQueryValidationError`.
- `stringifyExoQuery` returns `''` (not `'?'`) for an empty record, repeats the key
  for an array, and drops `undefined` and `null`, which is how `patchQuery` clears
  a key.
- **The parsed record has a null prototype**, so URL keys such as `__proto__` or
  `constructor` are ordinary keys. Use `key in query` or
  `Object.prototype.hasOwnProperty.call(query, key)`, not `query.hasOwnProperty`.
  `match.params` is an ordinary object.

## TypeScript

`TExoPageMachine` is `TExoMachine<never>`, which every machine satisfies, so a
route table needs no backend type. To require every page to speak one surface,
annotate the table with `TExoPageRoute<TWiring>` instead of `TExoRoute`.

## With @exodra/vite-plugin

The plugin generates a flat table from `src/pages` (`index.tsx`, `[id].tsx`,
`[...slug].tsx`, `[[...path]].tsx`; files starting with `_` are skipped) as the
virtual module `virtual:exodra-routes`, each entry an `exoLazy` loader of the
file's default export:

```ts no-check
import { createExoBrowserHistory, createExoRouter } from '@exodra/router';
import { routes } from 'virtual:exodra-routes';

const router = createExoRouter(routes, { history: createExoBrowserHistory() });
```

The generated table has no `children`; a layout is written by hand as a route with
`children`, as above.

## API reference

Router and history:

- `createExoRouter(routes, options?): TExoRouter` — `options`: `{ history?, beforeEach?, afterEach? }`; without `history` it uses a memory history
- `createExoBrowserHistory(options?: { window?, basePath? }): TExoHistory`
- `createExoMemoryHistory(initialPathOrOptions?: string | { initialPath?, basePath? }): TExoHistory`

`TExoRouter` members: `routes`, `getLocation()`, `getMatch()`, `getMatches()`,
`getNavigationState()`, `getQuery(options?)`, `navigate(to, { replace?, state? })`,
`setPathname(pathname, options?)`, `setSearch(search | query, options?)`,
`setQuery(query, options?)`, `patchQuery(query, options?)`, `onChange(update): off`,
`createHref(to)`, `dispose()`.

Components:

- `ExoOutlet` — the route boundary machine, in a `<div>`
- `exoOutlet(tag?, attrs?)` — the boundary around another tag; call at module level
- `ExoLink` — the anchor machine; wire params `TExoLinkParams`
- `shouldIgnoreExoLinkClick(event, href, target?, download?): boolean`
- `provideExoRouter(c, router): void`, `injectExoRouter(c): TExoRouter` (throws when none was provided), `EXO_ROUTER` (the context token)
- `preloadExoPage(loader): Promise<void>`, `isExoPageMachine(component): boolean`

Lazy loading:

- `exoLazy(loader): TExoLazyRouteLoader` — wrap `() => import('./page')`; the page is the module's default export, or the resolved value itself
- `fetchExoRouteChunk(component): Promise<void>`
- `isExoLazyLoader(component): component is TExoLazyRouteLoader`
- `loadExoLazyMachine(loader): Promise<TExoRouteMachine>`, `resolveExoRouteMachine(component): Promise<TExoRouteMachine>`

Matching and paths:

- `matchExoRoutes(routes, pathname): TExoRouteMatch | undefined`
- `matchExoRouteChain(routes, pathname): readonly TExoRouteMatch[]`
- `parseExoPath(path): TExoLocation`

Guards:

- `collectExoRouteGuards(route, 'beforeEnter' | 'beforeLeave'): TExoRouteGuard[]`
- `executeExoGuards(guards, to, from?): TExoRouteGuardResult` — synchronous until a guard returns a promise

Query:

- `parseExoQuery(search, options?)`, `stringifyExoQuery(query)`, `mergeExoQuery(current, patch)`, `exoQuery` (`string`, `number`, `boolean`, `array`, `optional`), `ExoQueryValidationError`

Types: `TExoRouter`, `TExoRoute`, `TExoPageRoute`, `TExoPageMachine`,
`TExoRouteMachine`, `TExoLazyRouteLoader`, `TExoRouteMatch`, `TExoRouteParams`,
`TExoLocation`, `TExoHistory`, `TExoBrowserHistoryOptions`,
`TExoMemoryHistoryOptions`, `TExoRouterOptions`, `TExoNavigateOptions`,
`TExoNavigationState`, `TExoRouteGuard`, `TExoRouteGuardResult`, `TExoLinkParams`,
`TExoLinkState`, `TExoOutletWiring`, `TExoOutletChildList`, `TExoOutletState`,
`TExoProvideWiring`, `TExoInjectWiring`, and the query types `TExoQueryPrimitive`,
`TExoQueryValue`, `TExoQueryInput`, `TExoQueryRecord`, `TExoParsedQueryPrimitive`,
`TExoParsedQueryValue`, `TExoParsedQueryRecord`, `TExoRawQueryValue`,
`TExoQueryValidationIssue`, `TExoQueryField`, `TExoQuerySchema`, `TExoInferredQuery`,
`TExoQueryValueParser`, `TExoQueryParseOptions`.

## Further reading

- [Router API](https://exodra.org/docs/api/router)
- [SSR & hydration](https://exodra.org/docs/guides/ssr)
- [Vite plugin](https://exodra.org/docs/tooling/vite-plugin)

## License

MIT
