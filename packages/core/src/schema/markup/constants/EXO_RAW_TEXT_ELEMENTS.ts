/**
 * The HTML serialiser's list, not a taste. `noscript` is here because a browser with scripting
 * enabled treats it as raw text too.
 */
export const EXO_RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set([
    'script',
    'style',
    'xmp',
    'iframe',
    'noembed',
    'noframes',
    'noscript',
    'plaintext',
]);
