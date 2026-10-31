/** REFUSAL: a void element has no end tag, so children inside it are reparented as SIBLINGS when a
 * browser reads the page back — `@exodra/string` prints the closing tag and the re-parse splits the
 * element in two, which makes the two backends serve different pages. */
export function assertExoVoidContent(tag: string): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `createExoSchema(dom): <${tag}> is a void element and cannot have children` +
              ' — the serialiser prints no end tag, so anything inside is reparented ' +
              'as a SIBLING when a browser reads the page back. Move the children to a ' +
              'container element.'
            : 'EXO0038'
    );
}
