import { parseExoPath } from './parseExoPath';

export function addExoBasePath(path: string, basePath: string): string {
    if (!basePath) {
        return path;
    }

    const location = parseExoPath(path);
    return `${basePath}${location.href === '/' ? '' : location.href}`;
}
