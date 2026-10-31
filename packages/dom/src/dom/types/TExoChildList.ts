import type { TExoNode } from '@exodra/core';
import type { TExoDomMark } from './TExoDomMark';

// A child list is a STRETCH of its parent bounded by an end anchor, not the whole element, so no
// command here is `appendChild` on the parent. `order` is the instance's state: move a node behind
// these commands and the next diff reconciles against fiction.
export type TExoChildList = {
    readonly size: number;
    at(i: number): TExoNode<TExoDomMark> | undefined;
    // `i >= size` appends at the END ANCHOR, not the parent's last child. Runs `mount()`.
    insert(child: TExoNode<TExoDomMark>, i?: number): void;
    move(from: number, to: number): void;
    // Runs the child's `unmount` first — where a recycling node source takes its element back.
    remove(i: number): void;
    // EVERY child told BEFORE any of them is taken out: a widget asked to tear down may read its
    // neighbours, and `remove` in a loop shows the last ones a list that is already half gone.
    removeAll(): void;
    // The PLACEMENT half of the pair: the node leaves and the child is NEVER TOLD — no `unmount`,
    // no disposal, no striking-off, no element offered to a pile — so subscriptions stay live and an
    // `exoForeignNode` moved this way is refused by its next `insert`.
    detach(i: number): TExoNode<TExoDomMark> | undefined;
    // `detach` at every index, and where `TExoDomSchema.ownsElement` says the port owns its element it
    // is ONE DOM call that takes everything in there, including nodes somebody appended by hand.
    // Hands back a COPY: `order`'s identity is published to the child list in front. There is
    // deliberately no `attachAll` — see README.
    detachAll(): readonly TExoNode<TExoDomMark>[];
    // `insert` minus `mount`. It does ACQUIRE an element for a child that has none yet, which is
    // construction and not a notification.
    attach(child: TExoNode<TExoDomMark>, i?: number): void;
};
