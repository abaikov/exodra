/**
 * The serialisation algorithm skips children and end tag alike, so `<br></br>` is markup the
 * browser re-parses into two `<br>`s, no longer matching what the DOM backend produced.
 */
export const EXO_VOID_ELEMENTS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);
