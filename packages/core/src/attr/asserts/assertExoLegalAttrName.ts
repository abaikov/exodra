/**
 * A name is written into the markup VERBATIM and cannot be escaped, so `data-x" onclick="alert(1)`
 * closes the value, opens a second attribute, and both backends serve a working `onclick`.
 *
 * An ALLOWLIST and not a blocklist, because the same string is also parsed as markup by
 * `compileExoDomSchema`. `$` is in the tail because the babel plugin turns a JSXIdentifier straight
 * into this string. It THROWS rather than dropping: a port that emitted nothing would still hold
 * the port number both backends index their schemas by, moving every later value to the wrong element.
 */
const LEGAL_ATTR_NAME = /^[A-Za-z_][A-Za-z0-9_.:$-]*$/;

export function assertExoLegalAttrName(name: string, declaredBy: string): void {
    if (name === 'className') {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: write "class", not "className". React spells it that way because ` +
                  '`class` is a reserved word in a JSX property position; here an attribute name ' +
                  'is a plain string or object key, so nothing stops you writing the name the ' +
                  'markup actually carries. Accepting both would make one attribute answer to two ' +
                  'spellings for no gain.'
                : 'EXO0020'
        );
    }
    if (!LEGAL_ATTR_NAME.test(name)) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `${declaredBy}: ${JSON.stringify(
                      name
                  )} is not a legal attribute name. A name is ` +
                  'written into the markup VERBATIM — it cannot be escaped, because an escaped ' +
                  'name is a different attribute — so a name carrying a quote, a space, "=", ' +
                  '"<" or ">" does not produce an oddly-named attribute, it produces MARKUP: a ' +
                  'port named [data-x" onclick="alert(1)] ships a working onclick from the ' +
                  'server AND in the browser, since both backends print the same bytes. Legal ' +
                  "is a letter or '_', then letters, digits, '_', '.', ':', '$' or '-' " +
                  '(data-id, aria-label, class, viewBox, xlink:href)' +
                  '. If this name came from data, that is the bug — build it ' +
                  'from a fixed prefix and a value you have checked.'
                : `EXO0021 ${JSON.stringify(name)}`
        );
    }
}
