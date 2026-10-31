/**
 * `&` FIRST — the only replacement that would otherwise eat the ampersands the later ones just
 * introduced. A `"` deliberately stays a `"`: over-escaping is safe but produces different bytes,
 * and different bytes is the whole failure mode of a render a client is about to hydrate.
 */
export function escapeExoText(value: string): string {
    if (!/[&<>\u00A0]/.test(value)) return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
