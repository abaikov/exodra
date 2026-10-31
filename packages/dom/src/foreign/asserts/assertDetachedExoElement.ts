// A PARENT is the evidence, and it is a HEURISTIC rather than a proof of ownership. What that
// admits, and why the PARENT's tag is the one named first: ../../README.md § The foreign door's
// four refusals.
export function assertDetachedExoElement(element: Element): never {
    throw new Error(
        typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
            ? `exoForeignNode(<${element.tagName.toLowerCase()}>): this element is already in ` +
              `a tree — its parent is ${
                  element.parentNode !== null && element.parentNode.nodeType === 1
                      ? `<${(element.parentNode as Element).tagName.toLowerCase()}>`
                      : 'a node'
              } — so something else owns it. Hand in an element nobody has ` +
              'placed yet, or call element.remove() first.' +
              ' The first list that placed it would silently take it out of there. A foreign ' +
              'child must be an element nobody has placed yet: create it (or let the foreign ' +
              'renderer create it) and hand it in detached. If you really mean to take over ' +
              'markup that is already on the page, calling element.remove() first is what writes ' +
              'the theft down where it happens.'
            : 'EXO0053'
    );
}
