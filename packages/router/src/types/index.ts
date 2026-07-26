import type { TExoSchema } from '@exodra/core';
import type { TExoBindable, TExoWritableBindable } from '@exodra/reactivity';

export type TExoRouteParams = Record<string, string>;

export type TExoLocation = {
    pathname: string;
    search: string;
    hash: string;
    href: string;
    // Per-history-entry state, set via `navigate(to, { state })` / `<Link state>`.
    // Lives in the History API (survives back/forward), NOT in the URL — so it is
    // not shareable and is lost on a hard reload. For shareable/reloadable state
    // use query params (`setQuery` / `bindQuery`). `undefined` when none was set.
    state?: unknown;
};

export type TExoRouteMatch = {
    route: TExoRoute;
    params: TExoRouteParams;
    pathname: string;
    // Convenience mirror of `route.handle` — arbitrary per-route metadata
    // (breadcrumbs, titles, layout flags). Read the whole matched branch
    // (root → leaf) via `router.getMatches()`.
    handle?: unknown;
};

export type TExoRouteRenderer = (
    match: TExoRouteMatch
) => TExoSchema | readonly TExoSchema[];

export type TExoLazyRouteLoader = () => Promise<TExoRouteComponent>;

export type TExoRouteComponent =
    | TExoSchema
    | readonly TExoSchema[]
    | TExoRouteRenderer
    | TExoLazyRouteLoader;

export type TExoRouteGuardResult = boolean | string | Promise<boolean | string>;

export type TExoRouteGuard = (
    match: TExoRouteMatch,
    from?: TExoRouteMatch
) => TExoRouteGuardResult;

export type TExoRoute = {
    id?: string;
    path: string;
    component: TExoRouteComponent;
    children?: readonly TExoRoute[];
    beforeEnter?: TExoRouteGuard;
    beforeLeave?: TExoRouteGuard;
    // Next.js-like features
    layout?: TExoRouteComponent;
    error?: TExoRouteComponent;
    catchAll?: string; // Parameter name for [...params]
    optionalCatchAll?: string; // Parameter name for [[...params]]
    // Arbitrary static metadata attached to the route (React Router's `handle`).
    // Surfaced on every match — read the matched branch via `router.getMatches()`
    // for breadcrumbs / titles / per-route layout flags.
    handle?: unknown;
};

export type TExoNavigateOptions = {
    replace?: boolean;
    // Attach state to this history entry (read back on `location.state`).
    state?: unknown;
};

export type TExoQueryPrimitive = string | number | boolean | null | undefined;

export type TExoQueryValue =
    | TExoQueryPrimitive
    | readonly TExoQueryPrimitive[];

export type TExoQueryInput = Record<string, TExoQueryValue>;

export type TExoQueryRecord = Record<string, string | readonly string[]>;

export type TExoQueryParsedPrimitive = string | number | boolean;

export type TExoQueryParsedValue =
    | TExoQueryParsedPrimitive
    | readonly TExoQueryParsedPrimitive[]
    | undefined;

export type TExoQueryParsedRecord = Record<string, TExoQueryParsedValue>;

export type TExoQueryRawValue = string | readonly string[] | undefined;

export type TExoQueryValidationIssue = {
    key: string;
    message: string;
    value: unknown;
};

export type TExoQueryField<TValue> = {
    parse(value: TExoQueryRawValue, key: string): TValue;
    validate?(value: TValue, key: string): string | boolean | void;
};

export type TExoQuerySchema = Record<string, TExoQueryField<unknown>>;

export type TExoInferQuerySchema<TSchema extends TExoQuerySchema> = {
    [TKey in keyof TSchema]: TSchema[TKey] extends TExoQueryField<infer TValue>
        ? TValue
        : never;
};

export type TExoQueryValueParser = (
    value: string,
    key: string
) => TExoQueryParsedPrimitive;

export type TExoQueryParseOptions<
    TSchema extends TExoQuerySchema | undefined = undefined
> = {
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
    subscribe(update: () => void): () => void;
    dispose?(): void;
};

export type TExoNavigationState = 'idle' | 'loading' | 'submitting';

export type TExoRouterOptions = {
    history?: TExoHistory;
    beforeEach?: TExoRouteGuard;
    afterEach?: (to: TExoRouteMatch, from?: TExoRouteMatch) => void;
};

export type TExoRouter = {
    readonly routes: readonly TExoRoute[];
    readonly location: TExoWritableBindable<TExoLocation>;
    readonly match: TExoWritableBindable<TExoRouteMatch | undefined>;
    // The full matched branch, root → leaf. Each entry carries its own
    // `route`/`handle`/resolved `pathname`; use it for breadcrumbs and layout
    // chains. LAZY (a derive off `location`) — reading/subscribing it is what
    // builds the chain; otherwise it costs nothing. Empty when nothing matched.
    readonly matches: TExoBindable<
        readonly TExoRouteMatch[],
        readonly TExoRouteMatch[]
    >;
    readonly navigationState: TExoWritableBindable<TExoNavigationState>;
    getLocation(): TExoLocation;
    getMatch(): TExoRouteMatch | undefined;
    getMatches(): readonly TExoRouteMatch[];
    getNavigationState(): TExoNavigationState;
    getQuery<TSchema extends TExoQuerySchema>(
        options: TExoQueryParseOptions<TSchema> & { schema: TSchema }
    ): TExoInferQuerySchema<TSchema>;
    getQuery<TQuery extends TExoQueryParsedRecord = TExoQueryRecord>(
        options?: TExoQueryParseOptions
    ): TQuery;
    createHref(to: string): string;
    navigate(to: string, options?: TExoNavigateOptions): Promise<TExoLocation>;
    setPathname(
        pathname: string,
        options?: TExoNavigateOptions
    ): Promise<TExoLocation>;
    setSearch(
        search: string | TExoQueryInput,
        options?: TExoNavigateOptions
    ): Promise<TExoLocation>;
    setQuery(
        query: TExoQueryInput,
        options?: TExoNavigateOptions
    ): Promise<TExoLocation>;
    patchQuery(
        query: TExoQueryInput,
        options?: TExoNavigateOptions
    ): Promise<TExoLocation>;
    // Two-way reactive binding for a single query parameter: getValue() reads the
    // current value (or the default), subscribe() fires on any URL change
    // (including back/forward), and setValue() patches just that key into the URL
    // (clearing back to the default removes it).
    bindQuery(
        key: string,
        options?: TExoBindQueryOptions
    ): TExoWritableBindable<string>;
    dispose(): void;
};

export type TExoBindQueryOptions = {
    // Value reported (and treated as "cleared") when the key is absent.
    default?: string;
    // Use history.replace instead of push when writing (e.g. for text inputs).
    replace?: boolean;
};

export type TExoBrowserHistoryOptions = {
    window?: Window;
    basePath?: string;
};

export type TExoMemoryHistoryOptions = {
    initialPath?: string;
    basePath?: string;
};
