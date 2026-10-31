const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

// Several of these strings are asserted verbatim by the test suite. It lives in `dom/` and not
// `hydrate/` because the edge from the compiler's two parse-verification passes was the only thing
// pointing from `dom/` into `hydrate/`, which made "hydration is a leaf" unenforceable; those two
// passes are gone with the parse, and the package barrel still exports it from here. `undefined` is
// accepted alongside `null` because an index past the end of a child list is how callers reach for
// a node that is not there.
export const describeExoNode = (n: Node | null | undefined): string => {
    if (n == null) return 'nothing';
    if (n.nodeType === ELEMENT_NODE) return `<${(n as Element).tagName.toLowerCase()}>`;
    if (n.nodeType === TEXT_NODE) {
        return `text ${JSON.stringify((n as Text).data.slice(0, 30))}`;
    }
    if (n.nodeType === COMMENT_NODE) {
        return `comment <!--${(n as Comment).data.slice(0, 30)}-->`;
    }
    return `node of type ${n.nodeType}`;
};
