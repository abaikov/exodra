// One leading slash, no repeated slashes, no trailing slash except at the root.
export function normalizeExoPathname(pathname: string): string {
    const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
    const normalized = withLeadingSlash.replace(/\/{2,}/g, '/');

    if (normalized.length > 1 && normalized.endsWith('/')) {
        return normalized.slice(0, -1);
    }

    return normalized;
}
