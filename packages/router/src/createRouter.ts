import { bindable, derive } from '@exodra/reactivity';
import type { TExoWritableBindable } from '@exodra/reactivity';
import { createMemoryHistory } from './history';
import { matchRoutes, parsePath } from './path';
import { mergeQuery, parseSearch, stringifySearch } from './query';
import { collectRouteGuards, executeGuards } from './guards';
import type {
    TExoBindQueryOptions,
    TExoLocation,
    TExoNavigateOptions,
    TExoQueryInput,
    TExoQueryParseOptions,
    TExoRoute,
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
    const match = bindable<TExoRouteMatch | undefined>(
        matchRoutes(routes, initialLocation.pathname)
    );
    const navigationState = bindable<TExoNavigationState>('idle');
    
    const syncFromHistory = async () => {
        const nextLocation = history.getLocation();
        const nextMatch = matchRoutes(routes, nextLocation.pathname);
        const currentMatch = match.getValue();
        
        if (await canNavigate(nextMatch, currentMatch)) {
            location.setValue(nextLocation);
            match.setValue(nextMatch);
            options.afterEach?.(nextMatch!, currentMatch);
        }
    };
    
    const canNavigate = async (
        to: TExoRouteMatch | undefined,
        from: TExoRouteMatch | undefined
    ): Promise<boolean> => {
        if (!to) return true;
        
        const guards = [];
        
        if (options.beforeEach) {
            guards.push(options.beforeEach);
        }
        
        if (from?.route.beforeLeave) {
            guards.push(...collectRouteGuards(from.route, 'beforeLeave'));
        }
        
        if (to.route.beforeEnter) {
            guards.push(...collectRouteGuards(to.route, 'beforeEnter'));
        }
        
        if (guards.length === 0) return true;
        
        navigationState.setValue('loading');
        const result = await executeGuards(guards, to, from);
        navigationState.setValue('idle');
        
        if (typeof result === 'string') {
            history.replace(result);
            return false;
        }
        
        return result;
    };
    
    const unsubscribe = history.subscribe(syncFromHistory);
    const navigate = (to: string, options: TExoNavigateOptions = {}) =>
        commitNavigation(location, () => {
            if (options.replace) {
                history.replace(to);
            } else {
                history.push(to);
            }
        });
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
        navigationState,
        getLocation() {
            return location.getValue();
        },
        getMatch() {
            return match.getValue();
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
                subscribe: read.subscribe,
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

function commitNavigation(
    location: TExoRouter['location'],
    commit: () => void
): Promise<TExoLocation> {
    return new Promise((resolve, reject) => {
        const unsubscribe = location.subscribe(() => {
            unsubscribe();
            resolve(location.getValue());
        });

        try {
            commit();
        } catch (error) {
            unsubscribe();
            reject(error);
        }
    });
}

function normalizeSearch(search: string): string {
    if (!search) {
        return '';
    }

    return search.startsWith('?') ? search : `?${search}`;
}
