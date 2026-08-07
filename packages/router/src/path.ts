import type {
    TExoLocation,
    TExoRoute,
    TExoRouteMatch,
    TExoRouteParams,
} from './types';

type TCompiledRoute = {
    route: TExoRoute;
    fullPath: string;
    segments: readonly string[];
    // Parent pointer (one field, not an array) so the matched branch can be walked
    // ONLY when a chain is requested — matchRoutes (the common leaf lookup) never
    // touches it and pays nothing.
    parent?: TCompiledRoute;
};

export function parsePath(path: string): TExoLocation {
    const hashIndex = path.indexOf('#');
    const pathWithoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
    const searchIndex = pathWithoutHash.indexOf('?');
    const rawPathname =
        searchIndex === -1
            ? pathWithoutHash
            : pathWithoutHash.slice(0, searchIndex);
    const search = searchIndex === -1 ? '' : pathWithoutHash.slice(searchIndex);
    const pathname = normalizePathname(rawPathname || '/');

    return {
        pathname,
        search,
        hash,
        href: `${pathname}${search}${hash}`,
    };
}

export function joinPaths(parentPath: string, childPath: string): string {
    if (childPath.startsWith('/')) {
        return normalizePathname(childPath);
    }

    const parent = parentPath === '/' ? '' : parentPath;
    return normalizePathname(`${parent}/${childPath}`);
}

export function normalizePathname(pathname: string): string {
    const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const normalized = withLeadingSlash.replace(/\/{2,}/g, '/');

    if (normalized.length > 1 && normalized.endsWith('/')) {
        return normalized.slice(0, -1);
    }

    return normalized;
}

// Cheap leaf lookup: returns ONLY the matched leaf, no branch, no per-ancestor
// pathname resolution. This is the hot path (called on every navigation), so it
// allocates just the single match object.
export function matchRoutes(
    routes: readonly TExoRoute[],
    pathname: string
): TExoRouteMatch | undefined {
    const normalizedPathname = normalizePathname(pathname);
    const pathSegments = splitPath(normalizedPathname);

    for (const compiledRoute of compileRouteTable(routes)) {
        const params = matchSegments(compiledRoute.segments, pathSegments, compiledRoute.route);
        if (!params) {
            continue;
        }
        return {
            route: compiledRoute.route,
            params,
            pathname: normalizedPathname,
            handle: compiledRoute.route.handle,
        };
    }

    return undefined;
}

// The full matched branch, root → leaf. Empty when nothing matches. Each entry
// carries its own resolved `pathname` (params substituted into that ancestor's
// pattern), the shared leaf `params`, and `handle` mirrored from its route — so
// a view can render breadcrumbs / a layout chain straight off this array. Only
// build this when you actually need the chain (it's lazy in the router).
export function matchRouteChain(
    routes: readonly TExoRoute[],
    pathname: string
): readonly TExoRouteMatch[] {
    const normalizedPathname = normalizePathname(pathname);
    const pathSegments = splitPath(normalizedPathname);

    for (const compiledRoute of compileRouteTable(routes)) {
        const params = matchSegments(compiledRoute.segments, pathSegments, compiledRoute.route);
        if (!params) {
            continue;
        }

        // Walk parent pointers → ancestors root → leaf (array built once, only
        // for the matched route, only when a chain is requested).
        const branch: TCompiledRoute[] = [];
        for (
            let node: TCompiledRoute | undefined = compiledRoute;
            node;
            node = node.parent
        ) {
            branch.push(node);
        }
        branch.reverse();

        return branch.map((node, index) => ({
            route: node.route,
            params,
            // Leaf keeps the exact matched pathname; ancestors resolve their own
            // pattern with the shared params (handy for breadcrumb links).
            pathname:
                index === branch.length - 1
                    ? normalizedPathname
                    : resolvePath(node.fullPath, params),
            handle: node.route.handle,
        }));
    }

    return [];
}

// Compiling a route table is PURE — it depends only on the table, which is
// configuration and does not change. It used to run on every navigation (both
// matchers call it first), rebuilding one object plus a split path array per
// route each time. Cached by table identity so the work happens once per router.
const compiledCache = new WeakMap<readonly TExoRoute[], TCompiledRoute[]>();

function compileRouteTable(routes: readonly TExoRoute[]): TCompiledRoute[] {
    let compiled = compiledCache.get(routes);
    if (!compiled) {
        compiled = compileRoutes(routes);
        compiledCache.set(routes, compiled);
    }
    return compiled;
}

function compileRoutes(
    routes: readonly TExoRoute[],
    parentPath = '/',
    parent?: TCompiledRoute
): TCompiledRoute[] {
    const compiledRoutes: TCompiledRoute[] = [];

    for (const route of routes) {
        const fullPath = joinPaths(parentPath, route.path);
        const compiled: TCompiledRoute = {
            route,
            fullPath,
            segments: splitPath(fullPath),
            parent,
        };
        compiledRoutes.push(compiled);

        if (route.children) {
            compiledRoutes.push(...compileRoutes(route.children, fullPath, compiled));
        }
    }

    return compiledRoutes;
}

// Substitute matched params into a route pattern for a per-ancestor pathname.
// Handles `:name` dynamic segments; a `*` catch-all segment is left as-is (rare
// on an ancestor crumb, and its param name is route-local).
function resolvePath(fullPath: string, params: TExoRouteParams): string {
    const resolved = fullPath
        .split('/')
        .map(segment =>
            segment.startsWith(':') ? params[segment.slice(1)] ?? segment : segment
        )
        .join('/');
    return normalizePathname(resolved);
}

function splitPath(pathname: string): readonly string[] {
    const normalizedPathname = normalizePathname(pathname);
    if (normalizedPathname === '/') {
        return [];
    }

    return normalizedPathname.slice(1).split('/');
}

function matchSegments(
    routeSegments: readonly string[],
    pathSegments: readonly string[],
    route?: TExoRoute
): TExoRouteParams | undefined {
    const params: TExoRouteParams = {};

    for (let index = 0; index < routeSegments.length; index++) {
        const routeSegment = routeSegments[index];
        const pathSegment = pathSegments[index];

        if (routeSegment === '*') {
            // Handle catch-all and optional catch-all
            const remainingPath = pathSegments.slice(index).join('/');
            
            if (route?.catchAll) {
                // [...params] - REQUIRED catch-all: must consume at least one
                // segment, otherwise it is indistinguishable from the optional
                // form (`/files/*` with catchAll must NOT match `/files`).
                if (index >= pathSegments.length) {
                    return undefined;
                }
                params[route.catchAll] = remainingPath;
            } else if (route?.optionalCatchAll) {
                // [[...params]] - store as array in the named param
                params[route.optionalCatchAll] = remainingPath;
            } else {
                // Default wildcard behavior
                params['*'] = remainingPath;
            }
            return params;
        }

        if (pathSegment === undefined) {
            // Check if this is an optional catch-all at the end
            if (route?.optionalCatchAll && index === routeSegments.length - 1 && routeSegment === '*') {
                params[route.optionalCatchAll] = '';
                return params;
            }
            return undefined;
        }

        if (routeSegment.startsWith(':')) {
            params[routeSegment.slice(1)] = decodeSegment(pathSegment);
            continue;
        }

        if (routeSegment !== pathSegment) {
            return undefined;
        }
    }

    return routeSegments.length === pathSegments.length ? params : undefined;
}

function decodeSegment(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
