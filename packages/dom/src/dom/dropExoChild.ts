import type { TExoDomChild } from './types/TExoDomChild';

/**
 * A child leaves a list: tell it, take its node out, and forget where it was. `unmount()` runs
 * while the node is still attached, which is what a subscriber being ended is entitled to assume.
 *
 * The removal climbs instead of testing `parentNode === parent`: an extension or a page translator
 * reparents nodes under wrappers, and the plain test then quietly leaves the child in the document
 * forever. A `Range` over a contiguous run was built, measured and deleted — see
 * packages/dom/README.md § Children, child lists and port writers.
 */
export function dropExoChild(child: TExoDomChild, parent: Node): void {
    child.unmount();
    let out: Node | null = child.node;
    while (out !== null && out.parentNode !== parent) out = out.parentNode;
    if (out !== null) parent.removeChild(out);
}
