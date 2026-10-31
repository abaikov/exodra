import { addExoBasePath } from './addExoBasePath';
import { parseExoPath } from './parseExoPath';

// SHARED because two histories disagreeing about hrefs would put one URL in an `ExoLink`'s markup
// and send `navigate` to another — visible only under a base path, and only in one of the two.
export function resolveExoHref(to: string, basePath: string): string {
    return addExoBasePath(parseExoPath(to).href, basePath);
}
