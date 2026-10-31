/**
 * `&` FIRST — every other replacement introduces one. `<` and `>` are escaped although only the
 * quote can end a value, because Chromium serialises `setAttribute('x', 'a<b>')` as
 * `x="a&lt;b&gt;"` and this core's contract is that the two backends agree character for character.
 * U+00A0 is written as an ESCAPE SEQUENCE so whitespace normalisation cannot turn it into a space.
 */
export function escapeExoAttributeValue(value: string): string {
    if (!/[&"<>\u00A0]/.test(value)) return value;
    return value
        .replace(/&/g, '&amp;')
        .replace(/\u00A0/g, '&nbsp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
