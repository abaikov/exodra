/**
 * A tag name reaches the markup VERBATIM on every backend and cannot be escaped, so a name carrying
 * `>` produces markup rather than an oddly-named element. Narrower than HTML's own custom-element
 * rule on purpose: ASCII letters, digits and `-` only.
 */

const LEGAL_TAG_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;

export function assertExoLegalTagName(tag: string, declaredBy: string): void {
    if (LEGAL_TAG_NAME.test(tag)) return;
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `${declaredBy}: ${JSON.stringify(tag)} is not a legal element name` +
              ' — a tag is written into the markup VERBATIM on every backend and cannot be ' +
              'escaped, since an escaped tag is not a tag. So a name carrying ">", a space or ' +
              'a quote does not make an oddly-named element, it makes MARKUP: ' +
              '[div><img src=x onerror=alert(1)] ships a working handler from the server AND ' +
              'in the browser. Legal is a letter, then letters, digits or "-" (div, svg, ' +
              'feGaussianBlur, my-widget). If this name came from data, that is the bug — ' +
              'check it against the elements you mean to allow before it reaches el().'
            : `EXO0013 ${JSON.stringify(tag)}`
    );
}
