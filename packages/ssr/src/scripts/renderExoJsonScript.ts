import { escapeExoAttributeValue } from '@exodra/core';

function attribute(name: string, value: string | undefined): string {
    if (value === undefined) return '';
    return ` ${name}="${escapeExoAttributeValue(value)}"`;
}

// The ONE emitter of a `<script type="application/json">` payload here — both state channels use
// it. `id`/`nonce` are developer config, escaped anyway: a stray quote must not break out.
export function renderExoJsonScript(json: string, options: { id: string; nonce?: string }): string {
    let attributes = attribute('id', options.id);
    attributes += attribute('type', 'application/json');
    attributes += attribute('nonce', options.nonce);
    return `<script${attributes}>${escapeExoJsonForScript(json)}</script>`;
}

// `<`/`>` cover the only thing an HTML parser looks for inside a script — the closing `</script`.
// `&` so the payload cannot be read as an entity if the element's type ever changes; U+2028/9
// because a consumer that `eval`s or inlines it would see a break inside a string literal.
export function escapeExoJsonForScript(json: string): string {
    return json
        .replace(/</g, '\\u003C')
        .replace(/>/g, '\\u003E')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}
