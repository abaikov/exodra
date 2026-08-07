/**
 * HTML void elements: no closing tag and no content. Emitting `<br></br>` is
 * invalid — the parser reinterprets `</br>` as a second `<br>` — so every path
 * that produces HTML must consult this table.
 *
 * It lives in core because it is shared across the runtime/compile-time split:
 * the string renderer walks it at render time, and the JSX plugin's SSR emitter
 * bakes it into compiled templates. One table means the two cannot drift into
 * emitting different HTML for the same element.
 */
export const VOID_ELEMENTS: ReadonlySet<string> = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
]);
