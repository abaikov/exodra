import { parseExoPath } from './parseExoPath';

export function normalizeExoBasePath(basePath?: string): string {
    if (!basePath || basePath === '/') {
        return '';
    }

    const normalized = parseExoPath(basePath).pathname;
    return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}
