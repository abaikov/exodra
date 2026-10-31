// Both matchers live here, and that is deliberate: they are the leaf and the branch of ONE
// lookup over one compiled table.
import type { TExoRoute, TExoRouteMatch, TExoRouteParams } from '../types';
import { normalizeExoPathname } from '../path/normalizeExoPathname';
import { joinExoPaths } from '../path/joinExoPaths';

type TCompiledRoute = {
    route: TExoRoute;
    fullPath: string;
    segments: readonly string[];
    ranks: readonly number[];
    depth: number;
    order: number;
    // A parent POINTER, not an array, so the leaf lookup never touches it and pays nothing.
    parent?: TCompiledRoute;
};

type TFound = {
    compiled: TCompiledRoute;
    params: TExoRouteParams;
    pathname: string;
};

const STATIC_RANK = 4;
const PARAM_RANK = 3;
const EXHAUSTED_RANK = 2;
const CATCH_ALL_RANK = 1;

const NO_PARAMS: TExoRouteParams = Object.freeze({}) as TExoRouteParams;

export function matchExoRoutes(
    routes: readonly TExoRoute[],
    pathname: string
): TExoRouteMatch | undefined {
    const found = findRoute(routes, pathname);
    if (found === undefined) return undefined;
    return {
        route: found.compiled.route,
        params: found.params,
        pathname: found.pathname,
        handle: found.compiled.route.handle,
    };
}

// The full matched branch, root → leaf. Each entry carries the params named in ITS OWN full path,
// so a layout above `:id` keeps an identical match while only the id moves.
export function matchExoRouteChain(
    routes: readonly TExoRoute[],
    pathname: string
): readonly TExoRouteMatch[] {
    const found = findRoute(routes, pathname);
    if (found === undefined) return [];

    const branch: TCompiledRoute[] = [];
    for (let node: TCompiledRoute | undefined = found.compiled; node; node = node.parent) {
        branch.push(node);
    }
    branch.reverse();

    const leaf = branch.length - 1;
    const chain: TExoRouteMatch[] = new Array(branch.length);
    for (let index = 0; index < branch.length; index++) {
        const node = branch[index];
        const params = index === leaf ? found.params : paramsOf(node, found.params);
        chain[index] = {
            route: node.route,
            params,
            pathname: index === leaf ? found.pathname : resolvePath(node.fullPath, params),
            handle: node.route.handle,
        };
    }
    return chain;
}

function findRoute(routes: readonly TExoRoute[], pathname: string): TFound | undefined {
    const normalizedPathname = normalizeExoPathname(pathname);
    const pathSegments = splitPath(normalizedPathname);
    const table = compileRouteTable(routes);

    for (let i = 0; i < table.length; i++) {
        const compiled = table[i];
        const params = matchSegments(compiled, pathSegments);
        if (params !== undefined) return { compiled, params, pathname: normalizedPathname };
    }
    return undefined;
}

const compiledCache = new WeakMap<readonly TExoRoute[], TCompiledRoute[]>();

function compileRouteTable(routes: readonly TExoRoute[]): TCompiledRoute[] {
    let compiled = compiledCache.get(routes);
    if (!compiled) {
        compiled = compileRoutes(routes, '/', undefined, 0, []);
        compiled.sort(byRank);
        compiledCache.set(routes, compiled);
    }
    return compiled;
}

function compileRoutes(
    routes: readonly TExoRoute[],
    parentPath: string,
    parent: TCompiledRoute | undefined,
    depth: number,
    into: TCompiledRoute[]
): TCompiledRoute[] {
    for (const route of routes) {
        const fullPath = joinExoPaths(parentPath, route.path);
        const segments = splitPath(fullPath);
        const compiled: TCompiledRoute = {
            route,
            fullPath,
            segments,
            ranks: segments.map(rankOf),
            depth,
            order: into.length,
            parent,
        };
        into.push(compiled);

        if (route.children) compileRoutes(route.children, fullPath, compiled, depth + 1, into);
    }
    return into;
}

// Static beats `:param` beats a pattern that has ENDED beats `*`, position by position; an equal
// pattern goes to the deeper route, so an index child wins over the layout it shares a path with.
function byRank(a: TCompiledRoute, b: TCompiledRoute): number {
    const length = Math.max(a.ranks.length, b.ranks.length);
    for (let i = 0; i < length; i++) {
        const rankA = i < a.ranks.length ? a.ranks[i] : EXHAUSTED_RANK;
        const rankB = i < b.ranks.length ? b.ranks[i] : EXHAUSTED_RANK;
        if (rankA !== rankB) return rankB - rankA;
    }
    if (a.depth !== b.depth) return b.depth - a.depth;
    return a.order - b.order;
}

function rankOf(segment: string): number {
    if (segment === '*') return CATCH_ALL_RANK;
    if (segment.startsWith(':')) return PARAM_RANK;
    return STATIC_RANK;
}

function paramsOf(node: TCompiledRoute, leafParams: TExoRouteParams): TExoRouteParams {
    let params: TExoRouteParams | null = null;
    for (const segment of node.segments) {
        const name = segment.startsWith(':')
            ? segment.slice(1)
            : segment === '*'
            ? catchAllName(node.route)
            : null;
        if (name === null || leafParams[name] === undefined) continue;
        if (params === null) params = {};
        params[name] = leafParams[name];
    }
    return params ?? NO_PARAMS;
}

function catchAllName(route: TExoRoute): string {
    return route.catchAll ?? route.optionalCatchAll ?? '*';
}

// A `*` catch-all segment is left as-is: its param name is route-local.
function resolvePath(fullPath: string, params: TExoRouteParams): string {
    const resolved = fullPath
        .split('/')
        .map((segment) => (segment.startsWith(':') ? params[segment.slice(1)] ?? segment : segment))
        .join('/');
    return normalizeExoPathname(resolved);
}

function splitPath(pathname: string): readonly string[] {
    const normalizedPathname = normalizeExoPathname(pathname);
    if (normalizedPathname === '/') {
        return [];
    }

    return normalizedPathname.slice(1).split('/');
}

function matchSegments(
    compiled: TCompiledRoute,
    pathSegments: readonly string[]
): TExoRouteParams | undefined {
    const routeSegments = compiled.segments;
    const route = compiled.route;
    let params: TExoRouteParams | null = null;

    for (let index = 0; index < routeSegments.length; index++) {
        const routeSegment = routeSegments[index];
        const pathSegment = pathSegments[index];

        if (routeSegment === '*') {
            // A catch-all is NOT percent-decoded and a `:param` is — the value spans separators,
            // so decoding would collapse an encoded `%2F` into a real one. README: "Dynamic
            // Routes".
            const remainingPath = pathSegments.slice(index).join('/');
            if (params === null) params = {};

            if (route.catchAll) {
                // A REQUIRED catch-all must consume at least one segment, or it would be
                // indistinguishable from the optional form.
                if (index >= pathSegments.length) {
                    return undefined;
                }
                params[route.catchAll] = remainingPath;
            } else if (route.optionalCatchAll) {
                params[route.optionalCatchAll] = remainingPath;
            } else {
                params['*'] = remainingPath;
            }
            return params;
        }

        if (pathSegment === undefined) {
            return undefined;
        }

        if (routeSegment.startsWith(':')) {
            if (params === null) params = {};
            params[routeSegment.slice(1)] = decodeSegment(pathSegment);
            continue;
        }

        if (routeSegment !== pathSegment) {
            return undefined;
        }
    }

    if (routeSegments.length !== pathSegments.length) return undefined;
    return params ?? {};
}

function decodeSegment(value: string): string {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}
