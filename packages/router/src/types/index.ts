import type {
    TExoChildrenPort,
    TExoMachine,
    TExoMachineNode,
    TExoNode,
    TExoWiring,
} from '@exodra/core';
import type { TExoIdCounter } from '@exodra/context';

// An ordinary object, unlike `parseExoQuery`'s null-prototype record: these keys come from the
// route table, not the URL. So `hasOwnProperty` works here and does not on `router.getQuery()`.
export type TExoRouteParams = Record<string, string>;

export type TExoLocation = {
    pathname: string;
    search: string;
    hash: string;
    href: string;
    // Lives in the History API, NOT the URL: it survives back/forward, and a copied link, a
    // bookmark or a new tab all arrive with it undefined. What a reload keeps is the browser's call.
    state?: unknown;
};

export type TExoRouteMatch = {
    route: TExoRoute;
    params: TExoRouteParams;
    pathname: string;
    // A mirror of `route.handle`; the whole branch is `router.getMatches()`.
    handle?: unknown;
};

export type TExoLazyRouteLoader = () => Promise<TExoRouteMachine>;

export type TExoRouteMachine = TExoLazyRouteLoader | TExoPageMachine;

// `never` is the TOP of the family here, not the bottom — `TExoMachine` is contravariant in its
// connector — so a route table need not be generic over a backend. The cost: a DOM-only page
// typechecks in a table an SSR build also uses. `TExoPageRoute` is the opt-in that restores it.
export type TExoPageMachine = TExoMachine<never>;

export type TExoPageRoute<TWiring> = {
    id?: string;
    path: string;
    component: TExoMachine<TWiring>;
    children?: readonly TExoPageRoute<TWiring>[];
    beforeEnter?: TExoRouteGuard;
    beforeLeave?: TExoRouteGuard;
    catchAll?: string;
    optionalCatchAll?: string;
    handle?: unknown;
};

export type TExoLinkParams = {
    readonly to: string;
    readonly label?: string;
    readonly replace?: boolean;
    readonly state?: unknown;
    // Anything but `_self` is left to the browser.
    readonly target?: string;
    // Present at all means the browser keeps the click.
    readonly download?: string;
    // Runs before the navigation decision — `preventDefault()` here calls the click off.
    readonly onClick?: (event: MouseEvent) => void;
    readonly currentWhen?: 'exact' | 'prefix';
};

export type TExoLinkState = {
    readonly router: TExoRouter;
    href: string;
    pathname: string | null;
};

export type TExoProvideWiring = Pick<TExoWiring, 'provide'>;

export type TExoInjectWiring = Pick<TExoWiring, 'inject'>;

export type TExoOutletChildList = {
    insert(child: TExoNode, i?: number): void;
    remove(i: number): void;
};

export interface TExoOutletWiring extends TExoMachineNode {
    build(machine: TExoPageMachine, index?: number, params?: TExoRouteMatch): TExoNode;
    childList(port: TExoChildrenPort): TExoOutletChildList;
}

export type TExoOutletState = {
    readonly router: TExoRouter;
    readonly depth: number;
    readonly node: TExoOutletWiring;
    readonly childList: TExoOutletChildList;
    readonly parentState: TExoOutletState | null;
    readonly nestedOutletStates: TExoOutletState[];
    readonly showRoute: (node: TExoOutletWiring) => void;
    match: TExoRouteMatch | undefined;
    pageMachine: TExoPageMachine | null;
    pageNode: TExoNode | null;
    lazyRouteLoader: TExoLazyRouteLoader | null;
    connected: boolean;
    readonly ids: TExoIdCounter | null;
};

export type TExoRouteGuardResult = boolean | string | Promise<boolean | string>;

export type TExoRouteGuard = (match: TExoRouteMatch, from?: TExoRouteMatch) => TExoRouteGuardResult;

export type TExoRoute = {
    // Carried, never read. Not surfaced on a match either, so a page cannot reach it.
    id?: string;
    path: string;
    component: TExoRouteMachine;
    children?: readonly TExoRoute[];
    beforeEnter?: TExoRouteGuard;
    beforeLeave?: TExoRouteGuard;
    catchAll?: string; // Parameter name for [...params]
    optionalCatchAll?: string; // Parameter name for [[...params]]
    // Arbitrary static metadata, surfaced on every match.
    handle?: unknown;
};

export type TExoNavigateOptions = {
    replace?: boolean;
    state?: unknown;
};

export type TExoQueryPrimitive = string | number | boolean | null | undefined;

export type TExoQueryValue = TExoQueryPrimitive | readonly TExoQueryPrimitive[];

export type TExoQueryInput = Record<string, TExoQueryValue>;

export type TExoQueryRecord = Record<string, string | readonly string[]>;

export type TExoParsedQueryPrimitive = string | number | boolean;

export type TExoParsedQueryValue =
    | TExoParsedQueryPrimitive
    | readonly TExoParsedQueryPrimitive[]
    | undefined;

// A NULL-PROTOTYPE object at runtime, which the type cannot say: `query.hasOwnProperty(key)` and
// `query instanceof Object` are unavailable — use `Object.hasOwn(query, key)` or `key in query`.
export type TExoParsedQueryRecord = Record<string, TExoParsedQueryValue>;

export type TExoRawQueryValue = string | readonly string[] | undefined;

export type TExoQueryValidationIssue = {
    key: string;
    message: string;
    value: unknown;
};

export type TExoQueryField<TValue> = {
    parse(value: TExoRawQueryValue, key: string): TValue;
    validate?(value: TValue, key: string): string | boolean | void;
};

export type TExoQuerySchema = Record<string, TExoQueryField<unknown>>;

export type TExoInferredQuery<TSchema extends TExoQuerySchema> = {
    [TKey in keyof TSchema]: TSchema[TKey] extends TExoQueryField<infer TValue> ? TValue : never;
};

export type TExoQueryValueParser = (value: string, key: string) => TExoParsedQueryPrimitive;

export type TExoQueryParseOptions<TSchema extends TExoQuerySchema | undefined = undefined> = {
    parseNumbers?: boolean;
    parseBooleans?: boolean;
    parseValue?: TExoQueryValueParser;
    schema?: TSchema;
};

export type TExoHistory = {
    getLocation(): TExoLocation;
    createHref(to: string): string;
    push(to: string, state?: unknown): void;
    replace(to: string, state?: unknown): void;
    onChange(update: () => void): () => void;
    dispose?(): void;
};

// `'loading'` only while an ASYNC guard decides; a branch with no guard, or sync ones, never leaves idle.
export type TExoNavigationState = 'idle' | 'loading';

export type TExoRouterOptions = {
    history?: TExoHistory;
    beforeEach?: TExoRouteGuard;
    // Runs after a navigation COMMITS, including one that matched nothing — `to` is `undefined`
    // there, so a 404 still reaches an analytics hook. Guards are the opposite: none of them run
    // for an unmatched destination.
    afterEach?: (to: TExoRouteMatch | undefined, from?: TExoRouteMatch) => void;
};

export type TExoRouter = {
    readonly routes: readonly TExoRoute[];
    getLocation(): TExoLocation;
    getMatch(): TExoRouteMatch | undefined;
    // An entry the last commit did not change is the SAME object, so a boundary compares with ===.
    getMatches(): readonly TExoRouteMatch[];
    getNavigationState(): TExoNavigationState;
    getQuery<TSchema extends TExoQuerySchema>(
        options: TExoQueryParseOptions<TSchema> & { schema: TSchema }
    ): TExoInferredQuery<TSchema>;
    getQuery<TQuery extends TExoParsedQueryRecord = TExoQueryRecord>(
        options?: TExoQueryParseOptions
    ): TQuery;
    createHref(to: string): string;
    navigate(to: string, options?: TExoNavigateOptions): Promise<TExoLocation>;
    setPathname(pathname: string, options?: TExoNavigateOptions): Promise<TExoLocation>;
    setSearch(
        search: string | TExoQueryInput,
        options?: TExoNavigateOptions
    ): Promise<TExoLocation>;
    setQuery(query: TExoQueryInput, options?: TExoNavigateOptions): Promise<TExoLocation>;
    patchQuery(query: TExoQueryInput, options?: TExoNavigateOptions): Promise<TExoLocation>;
    // Runs after every route boundary has redrawn; a subscriber added during a run waits for the next.
    onChange(update: () => void): () => void;
    dispose(): void;
};

export type TExoBrowserHistoryOptions = {
    window?: Window;
    basePath?: string;
};

export type TExoMemoryHistoryOptions = {
    initialPath?: string;
    basePath?: string;
};
