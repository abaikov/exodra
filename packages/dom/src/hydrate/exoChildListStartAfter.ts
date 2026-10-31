// For `<h3/>{a}<hr/>{b}<footer/>` at the `<hr>`: no table can hold this landing, so it is answered
// by ORDER — adoption is EAGER, so by the time `b` adopts, `a` knows the first element it did NOT
// take. Why that makes document-order filling a requirement: ../../README.md § Adoption between
// child lists.
export function exoChildListStartAfter(
    // By children-port index: the element each child list's markup ended at, once it has adopted.
    ends: readonly (Element | null | undefined)[],
    prev: number,
    // How many static ELEMENTS stand between the two child lists — one for a lone separator.
    skip: number,
    port: number
): Element | null {
    const end = ends[prev];
    if (end === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? `TExoHydrateNode: children port ${port} cannot be adopted yet — the child ` +
                  `list in front of it (children port ${prev}, with a static element between ` +
                  'them) has not been filled. Fill the children ports of one element in ' +
                  'DOCUMENT ORDER, and fill every one of them (an empty list is a fill).' +
                  " Adoption is eager and reads the server's own nodes, so a child list standing " +
                  'behind another one only learns where its markup begins once the one in front ' +
                  'has claimed its rows. A client render and the server accept any order — only ' +
                  'adoption cannot.'
                : 'EXO0031'
        );
    }
    let at: Element | null = end;
    for (let i = 0; i < skip; i++) {
        if (at === null) return null;
        at = at.nextElementSibling;
    }
    return at;
}
