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

export function matchRoutes(
    routes: readonly TExoRoute[],
    pathname: string
): TExoRouteMatch | undefined {
    const normalizedPathname = normalizePathname(pathname);
    const pathSegments = splitPath(normalizedPathname);

    for (const compiledRoute of compileRoutes(routes)) {
        const params = matchSegments(compiledRoute.segments, pathSegments, compiledRoute.route);
        if (!params) {
            continue;
        }

        return {
            route: compiledRoute.route,
            params,
            pathname: normalizedPathname,
        };
    }

    return undefined;
}

function compileRoutes(
    routes: readonly TExoRoute[],
    parentPath = '/'
): TCompiledRoute[] {
    const compiledRoutes: TCompiledRoute[] = [];

    for (const route of routes) {
        const fullPath = joinPaths(parentPath, route.path);
        compiledRoutes.push({
            route,
            fullPath,
            segments: splitPath(fullPath),
        });

        if (route.children) {
            compiledRoutes.push(...compileRoutes(route.children, fullPath));
        }
    }

    return compiledRoutes;
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
                // [...params] - store as array in the named param
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
