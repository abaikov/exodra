/**
 * THE PLACEMENT DOOR, AND NOTHING ELSE. Every command here is one a backend's child list already
 * answers — `@exodra/dom`'s `TExoChildList` and `@exodra/term`'s `TExoTermChildList` both satisfy
 * it — so one reconciler serves both and names no document, no element and no `insertBefore`.
 *
 * `TNode` is the backend's own node type, left open: this package never looks inside one.
 */
export type TExoPlacedChildren<TNode> = {
    readonly size: number;
    at(i: number): TNode | undefined;
    /** Places the child AND mounts it. */
    insert(child: TNode, i?: number): void;
    /** Keeps the instance: nothing is mounted or unmounted, because it never left the tree. */
    move(from: number, to: number): void;
    /** DISPOSES the child it takes out — subscriptions end, effects stop, hooks run. */
    remove(i: number): void;
    /** Every child told while the list is still whole, then all of them out. */
    removeAll(): void;
};
