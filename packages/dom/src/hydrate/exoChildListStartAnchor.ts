// Adoption is handed the child list's first element INCLUSIVE; a reconciler needs the node in
// front of it, EXCLUSIVE, because an empty child list has no first child to name.
// `previousSibling` and NOT `previousElementSibling`: the consumer walks the parent's children one
// NODE at a time (`resolve-drifted-child-list`), and an anchor it can only reach by skipping over
// is one it walks past, leaving the scan unbounded.
// Must be read BEFORE the pass: the element handed in may be removed by it.
export function exoChildListStartAnchor(from: Element | null): Node | null {
    return from === null ? null : from.previousSibling;
}
