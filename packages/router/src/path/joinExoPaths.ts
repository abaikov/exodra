import { normalizeExoPathname } from './normalizeExoPathname';

// A child path beginning with `/` is ABSOLUTE and ignores its parent — that is how a nested
// route escapes its branch.
export function joinExoPaths(parentPath: string, childPath: string): string {
    if (childPath.startsWith('/')) {
        return normalizeExoPathname(childPath);
    }

    const parent = parentPath === '/' ? '' : parentPath;
    return normalizeExoPathname(`${parent}/${childPath}`);
}
