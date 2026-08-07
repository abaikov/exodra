import { spaceAttribute } from '@exodra/string';

/**
 * The ONE way this package emits a `<script type="application/json">` payload.
 *
 * Both state channels use it — the SSR context's `<State>` script and the
 * persistor's serialized signals — because they have identical requirements and
 * used to solve them differently: two escapers with two different holes, and one
 * of them interpolated `id`/`nonce` into attributes unescaped.
 *
 * `id`/`nonce` are developer config rather than user data, but they are escaped
 * anyway: a stray quote must not be able to break out of the attribute.
 */
export function renderJsonScript(
    json: string,
    options: { id: string; nonce?: string }
): string {
    let attributes = spaceAttribute('id', options.id);
    attributes += spaceAttribute('type', 'application/json');
    attributes += spaceAttribute('nonce', options.nonce);
    return `<script${attributes}>${escapeJsonForScript(json)}</script>`;
}

/**
 * Make a JSON payload safe to sit inside a `<script>` element.
 *
 * `<` and `>` cover the only thing an HTML parser looks for inside a script —
 * the closing `</script`. `&` is escaped so the payload cannot be mistaken for
 * an entity if the element's type is ever changed, and U+2028/U+2029 because a
 * consumer that `eval`s or inlines the payload would otherwise see a line break
 * in the middle of a string literal.
 */
export function escapeJsonForScript(json: string): string {
    return json
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
