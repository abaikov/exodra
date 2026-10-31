/** REFUSAL: a child list standing BEHIND another one with no static between them has no end a walk
 * can find, and a reconciler is not told a count when it opens — so the first row of the list behind
 * is indistinguishable from a surplus of the one in front. Every other shape adopts. */
export function assertExoPluginChildList(): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? 'createExoSchema(hydrate): this children port cannot be reconciled on a ' +
              'server-rendered page — another children port stands behind it with no static ' +
              'element between them, so where its rows end cannot be read off the markup. Put a ' +
              'static element between the two child lists, adopt with c.list(port, component, ' +
              'count), which is told how many rows to take, or render this component on the ' +
              'client instead of hydrating it.'
            : 'EXO0035'
    );
}
