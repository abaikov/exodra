import type { TExoNode } from '@exodra/core';
import { assertDetachedExoElement } from './asserts/assertDetachedExoElement';
import { assertInPlaceExoElement } from './asserts/assertInPlaceExoElement';
import { assertUnadoptedExoElement } from './asserts/assertUnadoptedExoElement';
import { assertOncePlacedExoElement } from './asserts/assertOncePlacedExoElement';
import type { TExoDomSchemaBase } from '../dom/types/TExoDomSchemaBase';
import type { TExoDomMark } from '../dom/types/TExoDomMark';
import type { TExoDomChild } from '../dom/types/TExoDomChild';
import type { TExoForeignHooks } from './types/TExoForeignHooks';

/** A `WeakSet`: an entry here must not be the reason a finished element stays alive. */
const ADOPTED = new WeakSet<Element>();

/**
 * An element this renderer did not make, given the half a child needs.
 *
 * THE CALLER'S ONE RULE: the element stays a DIRECT child of the parent it was put in, from `mount`
 * until `unmount` returns. Removal and placement climb past a wrapper, but an element moved out of
 * that parent is beyond the climb. Limits, refusals and costs: `packages/dom/README.md`.
 */
export function exoForeignNode(
    c: { readonly schema: TExoDomSchemaBase },
    element: Element,
    hooks?: TExoForeignHooks
): TExoNode<TExoDomMark> {
    if (ADOPTED.has(element)) {
        assertUnadoptedExoElement(element);
    }
    if (element.parentNode !== null) {
        assertDetachedExoElement(element);
    }
    ADOPTED.add(element);
    // FROM THE COMPOSITION'S FACTORY, NOT A LITERAL: this child's leading fields must share OFFSETS
    // with every other's — the shared dispose walk reads `effectStops`/`disposers`.
    const nodeDom = c.schema.createChild(c.schema, element);
    const onMount = hooks === undefined ? undefined : hooks.onMount;
    const onUnmount = hooks === undefined ? undefined : hooks.onUnmount;
    const disposeSelf = nodeDom.unmount;
    let placedIn: Node | null = null;
    nodeDom.mount = function (): void {
        if (placedIn !== null) assertOncePlacedExoElement(element);
        const parent = element.parentNode;
        if (onMount !== undefined) {
            onMount();
            if (element.parentNode !== parent) assertInPlaceExoElement(element);
        }
        placedIn = parent;
    };
    nodeDom.unmount = function (this: TExoDomChild): void {
        placedIn = null;
        try {
            // In a `finally`: a hook that throws must not skip the default disposal.
            if (onUnmount !== undefined) onUnmount();
        } finally {
            disposeSelf.call(this);
        }
    };
    return nodeDom as unknown as TExoNode<TExoDomMark>;
}
