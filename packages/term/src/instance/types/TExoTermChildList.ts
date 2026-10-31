import type { TExoNode } from '@exodra/core';
import type { TExoTermMark } from '../../rendering/types/TExoTermMark';

// The imperative half of a children port, matching `@exodra/dom`'s `TExoChildList` name for name:
// one program places rows on either backend, and a reconciler written against this runs on both.
// `order` is the region's own array — move a child behind these commands and the next read is fiction.
export type TExoTermChildList = {
    readonly size: number;
    at(i: number): TExoNode<TExoTermMark> | undefined;
    insert(child: TExoNode<TExoTermMark>, i?: number): void;
    // Disposes the child: its subscriptions end and its effects stop.
    remove(i: number): void;
    // EVERY CHILD TOLD WHILE THE LIST IS STILL WHOLE, then all of them out — `remove` in a loop
    // shows the last ones a list that is already half gone.
    removeAll(): void;
    // The PLACEMENT half of the pair: the child leaves the region and is NEVER TOLD, so its
    // subscriptions stay live and it can be inserted somewhere else as the same instance.
    detach(i: number): TExoNode<TExoTermMark> | undefined;
    detachAll(): readonly TExoNode<TExoTermMark>[];
    move(from: number, to: number): void;
};
