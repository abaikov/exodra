import type { TExoDomChild } from './types/TExoDomChild';

// N `unmount`s and ONE DOM call, and the `ownsElement` condition is not negotiable. Why, and why
// every `unmount` runs with the list still in the document: ../../README.md § Clearing a child list
// that owns its element.
export function clearOwnedExoChildList(order: readonly TExoDomChild[], parent: Element): void {
    // Read once, before the first `unmount`: an override is user code and may touch the array.
    const had = order.length;
    for (let i = 0; i < had; i++) {
        const child = order[i];
        child.unmount();
    }
    parent.textContent = '';
}
