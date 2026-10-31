// Its own scheme or authority — `https://…`, `mailto:…`, `//host/x`. An absolute destination is
// used as the href verbatim, having no base to resolve against.
export function isAbsoluteUrl(url: string): boolean {
    return /^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//');
}
