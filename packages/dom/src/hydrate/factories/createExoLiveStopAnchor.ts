// A hydration has to be TOLD where a port ends, or its first insertion appends to the parent and
// lands after the footer instead of inside the port.
// A FUNCTION and not the node, because what it captured may not be a static: the next child list's
// first row can leave, and `insertBefore` against a node that is no longer a child THROWS. One
// `parentNode` compare per insertion degrades that to the append it would otherwise have been.
export function createExoLiveStopAnchor(
    parent: Node,
    after: Node | null
): (() => Node | null) | null {
    if (after === null) return null;
    // Its own `Node`-typed constant so the closure needs no narrowing to survive.
    const stop: Node = after;
    return (): Node | null => (stop.parentNode === parent ? stop : null);
}
