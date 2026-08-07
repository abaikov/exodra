import { bindable, derive } from '@exodra/reactivity';
import type { TExoWritableBindable } from '@exodra/reactivity';
import { createMemoryHistory } from './history';
import { matchRouteChain, matchRoutes, parsePath } from './path';
import { mergeQuery, parseSearch, stringifySearch } from './query';
import { collectRouteGuards, executeGuards } from './guards';
import type {
    TExoBindQueryOptions,
    TExoNavigateOptions,
    TExoQueryInput,
    TExoQueryParseOptions,
    TExoRoute,
    TExoRouteGuard,
    TExoRouteMatch,
    TExoRouter,
    TExoRouterOptions,
    TExoNavigationState,
} from './types';

export function createRouter(
    routes: readonly TExoRoute[],
    options: TExoRouterOptions = {}
): TExoRouter {
    const history = options.history ?? createMemoryHistory();
    const initialLocation = history.getLocation();
    const location = bindable(initialLocation);
    // `match` is the cheap leaf (recomputed on every navigation). `matches` is the
    // full branch — LAZY: a derive off `location`, so the chain (with per-ancestor
    // pathname resolution) is only ever built when a view actually reads/subscribes
    // it (breadcrumbs). Apps that never use it pay nothing.
    const match = bindable<TExoRouteMatch | undefined>(
        matchRoutes(routes, initialLocation.pathname)
    );
    const matches = derive(location, loc => matchRouteChain(routes, loc.pathname));
    const navigationState = bindable<TExoNavigationState>('idle');

    // The current in-flight (or settled) history sync. `navigate()` awaits this so
    // its promise reflects the ACTUAL outcome (commit / reject / redirect) instead
    // of hanging forever when a guard blocks the navigation.
    let pendingSync: Promise<void> = Promise.resolve();

    const runSync = async () => {
        const nextLocation = history.getLocation();
        const nextMatch = matchRoutes(routes, nextLocation.pathname);
        const currentMatch = match.getValue();
        const prevLocation = location.getValue();

        const result = await canNavigate(nextMatch, currentMatch);
        if (result === true) {
            location.setValue(nextLocation);
            match.setValue(nextMatch);
            options.afterEach?.(nextMatch!, currentMatch);
        } else if (typeof result === 'string') {
            // Guard requested a redirect. Replacing re-enters runSync for the new
            // URL (which runs its own guards); do NOT roll back to prevLocation.
            history.replace(result);
        } else if (nextLocation.href !== prevLocation.href) {
            // Guard rejected. `history.push`/popstate already moved the URL, so
            // roll it back to the last committed location — otherwise the address
            // bar shows a route the app never navigated to.
            history.replace(prevLocation.href);
        }
    };

    // Sync wrapper (the actual history subscriber): captures the in-flight promise
    // synchronously so `navigate()` — which pushes to history and returns right
    // after — can await the outcome of the sync it just triggered.
    const syncFromHistory = () => {
        pendingSync = runSync();
        return pendingSync;
    };

    const canNavigate = async (
        to: TExoRouteMatch | undefined,
        from: TExoRouteMatch | undefined
    ): Promise<boolean | string> => {
        if (!to) return true;

        const guards: TExoRouteGuard[] = [];

        if (options.beforeEach) {
            guards.push(options.beforeEach);
        }

        // beforeLeave guards across the WHOLE branch being left, deepest first
        // (leaf → root), so a layout's beforeLeave runs, not just the leaf's.
        if (from) {
            const fromChain = matchRouteChain(routes, from.pathname);
            for (let i = fromChain.length - 1; i >= 0; i--) {
                guards.push(...collectRouteGuards(fromChain[i].route, 'beforeLeave'));
            }
        }

        // beforeEnter guards across the WHOLE branch being entered, root → leaf,
        // so an ancestor/layout guard (e.g. requireAuth on `/admin`) runs even
        // when the matched leaf itself declares no beforeEnter.
        const toChain = matchRouteChain(routes, to.pathname);
        for (const entered of toChain) {
            guards.push(...collectRouteGuards(entered.route, 'beforeEnter'));
        }

        if (guards.length === 0) return true;

        navigationState.setValue('loading');
        const result = await executeGuards(guards, to, from);
        navigationState.setValue('idle');

        return result;
    };

    const unsubscribe = history.onChange(syncFromHistory);
    const navigate = (to: string, options: TExoNavigateOptions = {}) => {
        if (options.replace) {
            history.replace(to, options.state);
        } else {
            history.push(to, options.state);
        }
        // `history` notifies synchronously, so `pendingSync` is now the sync for
        // this navigation. Resolve with the committed location once it settles.
        return pendingSync.then(() => location.getValue());
    };
    const getQuery = ((options?: TExoQueryParseOptions) => {
        return parseSearch(location.getValue().search, options);
    }) as TExoRouter['getQuery'];
    const patchQueryImpl = (
        query: TExoQueryInput,
        options: TExoNavigateOptions = {}
    ) => {
        const currentLocation = location.getValue();
        return navigate(
            `${currentLocation.pathname}${stringifySearch(
                mergeQuery(parseSearch(currentLocation.search), query)
            )}${currentLocation.hash}`,
            options
        );
    };

    return {
        routes,
        location,
        match,
        matches,
        navigationState,
        getLocation() {
            return location.getValue();
        },
        getMatch() {
            return match.getValue();
        },
        getMatches() {
            return matches.getValue();
        },
        getNavigationState() {
            return navigationState.getValue();
        },
        getQuery,
        createHref(to) {
            return history.createHref(to);
        },
        navigate,
        setPathname(pathname, options: TExoNavigateOptions = {}) {
            const currentLocation = location.getValue();
            const nextLocation = parsePath(
                `${pathname}${currentLocation.search}${currentLocation.hash}`
            );

            return navigate(nextLocation.href, options);
        },
        setSearch(search, options: TExoNavigateOptions = {}) {
            const currentLocation = location.getValue();
            const nextSearch =
                typeof search === 'string'
                    ? normalizeSearch(search)
                    : stringifySearch(search);

            return navigate(
                `${currentLocation.pathname}${nextSearch}${currentLocation.hash}`,
                options
            );
        },
        setQuery(query, options: TExoNavigateOptions = {}) {
            const currentLocation = location.getValue();
            return navigate(
                `${currentLocation.pathname}${stringifySearch(query)}${currentLocation.hash}`,
                options
            );
        },
        patchQuery: patchQueryImpl,
        bindQuery(
            key: string,
            options: TExoBindQueryOptions = {}
        ): TExoWritableBindable<string> {
            const fallback = options.default ?? '';
            // Reactive read side: re-derived from `location`, so it updates on
            // our own setValue AND on browser back/forward.
            const read = derive(location, current => {
                const raw = parseSearch(current.search)[key];
                const value = Array.isArray(raw) ? raw[0] : raw;
                return typeof value === 'string' ? value : fallback;
            });
            return {
                getValue: read.getValue,
                onChange: read.onChange,
                setValue(next: string) {
                    // Clearing back to the default drops the key from the URL.
                    const patch =
                        next === '' || next === fallback
                            ? { [key]: undefined }
                            : { [key]: next };
                    void patchQueryImpl(patch, { replace: options.replace });
                },
            };
        },
        dispose() {
            unsubscribe();
            history.dispose?.();
        },
    };
}

function normalizeSearch(search: string): string {
    if (!search) {
        return '';
    }

    return search.startsWith('?') ? search : `?${search}`;
}
