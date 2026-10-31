/**
 * `el('div', { id: 'a' }, d => d.port('id'))` prints `<div id="a" id="b">` from the server, where a
 * parser keeps the FIRST, and prototype markup that parses to one attribute the setter overwrites.
 * Refused rather than resolved: "the port wins" is an artefact of fill order and stops being true
 * the moment a wire skips the port. The comparison is between MARKUP SPELLINGS, not raw names.
 */
export function assertExoUniqueAttr(
    tag: string,
    statics: readonly string[],
    ported: readonly string[],
    name: string,
    declaredBy: string
): void {
    const markup = name.toLowerCase();

    for (let i = 0; i < statics.length; i += 2) {
        if (statics[i].toLowerCase() === markup) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${declaredBy}: <${tag}> already has a STATIC attribute spelled ` +
                      `"${markup}", so the port ${JSON.stringify(name)} would be the second ` +
                      'attribute of that name in one tag. There is no such element: the server ' +
                      'would print both and a browser would keep the first, while the DOM ' +
                      "backend's setter would overwrite the static — the same schema, two " +
                      'different pages, and a hydration mismatch between them. Keep the port ' +
                      'and give the default value to the wire, or drop the port and keep the ' +
                      'static.'
                    : `EXO0022 "${tag}" "${markup}"`
            );
        }
    }

    for (let i = 0; i < ported.length; i++) {
        if (ported[i].toLowerCase() === markup) {
            throw new Error(
                typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                    ? `${declaredBy}: <${tag}> already has a port spelled "${markup}", so ` +
                      `${JSON.stringify(name)} would be the second attribute of that name in ` +
                      'one tag. The server prints both and a browser keeps the first; the DOM ' +
                      'backend has one attribute that both setters write, so the LAST fill ' +
                      'wins. Two different pages from one schema. Use one port and decide the ' +
                      'value in the wire.'
                    : `EXO0023 "${tag}" "${markup}"`
            );
        }
    }
}
