import { parseExoPath } from './parseExoPath';

export function stripExoBasePath(path: string, basePath: string): string {
    if (!basePath) {
        return path;
    }

    const location = parseExoPath(path);
    if (location.pathname === basePath) {
        return `/${location.search}${location.hash}`;
    }

    if (location.pathname.startsWith(`${basePath}/`)) {
        return `${location.pathname.slice(basePath.length)}${location.search}${location.hash}`;
    }

    return location.href;
}
