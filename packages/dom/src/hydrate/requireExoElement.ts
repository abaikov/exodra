// Hydration creates nothing, so carrying on would wire the NEXT element as this instance — data on
// the wrong line rather than an error.
// `what` must be a CONSTANT string at the call site, never a template literal built per row: this
// runs once per adopted instance and must not allocate on the path that does not throw.
export function requireExoElement(found: Element | null, what: string): Element {
    if (found === null) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `createExoSchema(hydrate): the server's markup has no element for ${what}` +
                  ' — it was rendered from a different schema, a different wiring, or different ' +
                  'data'
                : 'EXO0032'
        );
    }
    return found;
}
