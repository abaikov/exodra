import { createExoMemoryHistory } from '../history/createExoMemoryHistory';
import { matchExoRouteChain } from '../matching/matchExoRoutes';
import { sameMatch } from '../matching/sameMatch';
import { parseExoPath } from '../path/parseExoPath';
import { mergeExoQuery, parseExoQuery, stringifyExoQuery } from '../components/exoQuery';
import { collectExoRouteGuards } from '../guards/collectExoRouteGuards';
import { executeExoGuards } from '../guards/executeExoGuards';
import { EXO_ROUTER_OUTLETS } from './constants/EXO_ROUTER_OUTLETS';
import type {
    TExoLocation,
    TExoNavigateOptions,
    TExoNavigationState,
    TExoQueryInput,
    TExoQueryParseOptions,
    TExoRoute,
    TExoRouteGuard,
    TExoRouteGuardResult,
    TExoRouteMatch,
    TExoRouter,
    TExoRouterOptions,
} from '../types';

type TSubscriber = {
    readonly update: () => void;
    readonly since: number;
};

export function createExoRouter(
    routes: readonly TExoRoute[],
    options: TExoRouterOptions = {}
): TExoRouter {
    const history = options.history ?? createExoMemoryHistory();
    let location = history.getLocation();
    let matches = matchExoRouteChain(routes, location.pathname);
    let navigationState: TExoNavigationState = 'idle';
    let navigation = 0;
    let notification = 0;
    let writing = false;
    const outlets = new Set<() => void>();
    const subscribers = new Set<TSubscriber>();

    const notify = (): void => {
        notification++;
        for (const update of outlets) update();
        for (const subscriber of subscribers) {
            if (subscriber.since !== notification) subscriber.update();
        }
    };

    const leafOf = (chain: readonly TExoRouteMatch[]): TExoRouteMatch | undefined =>
        chain[chain.length - 1];

    const commit = (nextLocation: TExoLocation, nextMatches: readonly TExoRouteMatch[]): void => {
        const from = leafOf(matches);
        const kept = nextMatches.slice();
        const shared = Math.min(kept.length, matches.length);
        for (let i = 0; i < shared; i++) {
            if (sameMatch(matches[i], kept[i])) kept[i] = matches[i];
        }
        location = nextLocation;
        matches = kept;
        navigationState = 'idle';
        notify();
        // `to` is genuinely `undefined` when nothing matched: a 404 is what an analytics hook most wants.
        options.afterEach?.(leafOf(kept), from);
    };

    const settleIdle = (): void => {
        if (navigationState === 'idle') return;
        navigationState = 'idle';
        notify();
    };

    const guardsFor = (nextMatches: readonly TExoRouteMatch[]): TExoRouteGuard[] => {
        const guards: TExoRouteGuard[] = [];
        if (options.beforeEach) guards.push(options.beforeEach);
        for (let i = matches.length - 1; i >= 0; i--) {
            guards.push(...collectExoRouteGuards(matches[i].route, 'beforeLeave'));
        }
        for (const entered of nextMatches) {
            guards.push(...collectExoRouteGuards(entered.route, 'beforeEnter'));
        }
        return guards;
    };

    // NOTHING MATCHED, SO NO GUARD RUNS — not `beforeEach`, and not the `beforeLeave` chain of the
    // branch being left. README: "Nothing matched, so no guard runs".
    const decide = (nextMatches: readonly TExoRouteMatch[]): TExoRouteGuardResult => {
        const to = leafOf(nextMatches);
        if (to === undefined) return true;
        const guards = guardsFor(nextMatches);
        if (guards.length === 0) return true;
        return executeExoGuards(guards, to, leafOf(matches));
    };

    // Only the latest navigation may act once its guards answer; an older one finds `navigation`
    // moved on and does nothing.
    const whenDecided = <T>(
        id: number,
        decision: TExoRouteGuardResult,
        act: (result: boolean | string) => T
    ): T | Promise<T | void> => {
        if (typeof decision !== 'object') return act(decision);
        navigationState = 'loading';
        notify();
        return decision.then((result) => {
            if (id !== navigation) return;
            return act(result);
        });
    };

    const write = (to: string, replace: boolean | undefined, state: unknown): void => {
        writing = true;
        try {
            if (replace) history.replace(to, state);
            else history.push(to, state);
        } finally {
            writing = false;
        }
    };

    const navigate = (
        to: string,
        navigateOptions: TExoNavigateOptions = {}
    ): Promise<TExoLocation> => {
        const id = ++navigation;
        const nextMatches = matchExoRouteChain(routes, parseExoPath(to).pathname);
        const outcome = whenDecided(
            id,
            decide(nextMatches),
            (result): Promise<TExoLocation> | void => {
                if (result === true) {
                    write(to, navigateOptions.replace, navigateOptions.state);
                    commit(history.getLocation(), nextMatches);
                } else if (typeof result === 'string') {
                    return navigate(result, { replace: navigateOptions.replace });
                } else {
                    settleIdle();
                }
            }
        );
        return Promise.resolve(outcome).then(() => location);
    };

    // A change the router did not write: back/forward, or someone else's push. The URL already
    // moved, so a refusal has to put it back.
    const followHistory = (): void => {
        if (writing) return;
        const id = ++navigation;
        const nextLocation = history.getLocation();
        const nextMatches = matchExoRouteChain(routes, nextLocation.pathname);
        const shown = location;
        void whenDecided(id, decide(nextMatches), (result) => {
            if (result === true) {
                commit(nextLocation, nextMatches);
            } else if (typeof result === 'string') {
                void navigate(result, { replace: true });
            } else {
                if (nextLocation.href !== shown.href) write(shown.href, true, shown.state);
                settleIdle();
            }
        });
    };

    const unsubscribe = history.onChange(followHistory);

    const getQuery = ((queryOptions?: TExoQueryParseOptions) => {
        return parseExoQuery(location.search, queryOptions);
    }) as TExoRouter['getQuery'];

    const patchQuery = (query: TExoQueryInput, navigateOptions: TExoNavigateOptions = {}) =>
        navigate(
            `${location.pathname}${stringifyExoQuery(
                mergeExoQuery(parseExoQuery(location.search), query)
            )}${location.hash}`,
            navigateOptions
        );

    const router: TExoRouter = {
        routes,
        getLocation() {
            return location;
        },
        getMatch() {
            return leafOf(matches);
        },
        getMatches() {
            return matches;
        },
        getNavigationState() {
            return navigationState;
        },
        getQuery,
        createHref(to) {
            return history.createHref(to);
        },
        navigate,
        setPathname(pathname, navigateOptions: TExoNavigateOptions = {}) {
            const nextLocation = parseExoPath(`${pathname}${location.search}${location.hash}`);
            return navigate(nextLocation.href, navigateOptions);
        },
        setSearch(search, navigateOptions: TExoNavigateOptions = {}) {
            const nextSearch =
                typeof search === 'string' ? ensureSearchPrefix(search) : stringifyExoQuery(search);
            return navigate(`${location.pathname}${nextSearch}${location.hash}`, navigateOptions);
        },
        setQuery(query, navigateOptions: TExoNavigateOptions = {}) {
            return navigate(
                `${location.pathname}${stringifyExoQuery(query)}${location.hash}`,
                navigateOptions
            );
        },
        patchQuery,
        onChange(update) {
            const subscriber: TSubscriber = { update, since: notification };
            subscribers.add(subscriber);
            return () => {
                subscribers.delete(subscriber);
            };
        },
        // IT DISPOSES THE HISTORY TOO, SO A HISTORY MUST NOT SERVE TWO ROUTERS: both histories here
        // end `dispose` by clearing their whole subscriber set, so the second router goes deaf.
        dispose() {
            unsubscribe();
            history.dispose?.();
            outlets.clear();
            subscribers.clear();
        },
    };
    EXO_ROUTER_OUTLETS.set(router, outlets);
    return router;
}

// Named for its direction: `query.ts` has a private `normalizeSearch` that takes the `?` OFF.
function ensureSearchPrefix(search: string): string {
    if (!search) {
        return '';
    }

    return search.startsWith('?') ? search : `?${search}`;
}
