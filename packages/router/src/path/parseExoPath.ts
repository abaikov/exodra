import type { TExoLocation } from '../types';
import { normalizeExoPathname } from './normalizeExoPathname';

// Hash is cut FIRST: a `?` after a `#` is part of the fragment, not the query.
export function parseExoPath(path: string): TExoLocation {
    const hashIndex = path.indexOf('#');
    const pathWithoutHash = hashIndex === -1 ? path : path.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : path.slice(hashIndex);
    const searchIndex = pathWithoutHash.indexOf('?');
    const rawPathname =
        searchIndex === -1 ? pathWithoutHash : pathWithoutHash.slice(0, searchIndex);
    const search = searchIndex === -1 ? '' : pathWithoutHash.slice(searchIndex);
    const pathname = normalizeExoPathname(rawPathname || '/');

    return {
        pathname,
        search,
        hash,
        href: `${pathname}${search}${hash}`,
    };
}
