import type { TExoNode } from '@exodra/core';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';

/**
 * The placement door of a ONE-SHOT pass, name for name with `@exodra/dom`'s `TExoChildList`, so one
 * component reconciles on both. `build` hands back a live instance and `insert` prints it and ends
 * it, so after the insert there is no disposal and no identity: every command is an operation on
 * an array of strings, and `remove` is a splice rather than a teardown because the instance it
 * would tear down died when it was printed.
 *
 * NOTHING HERE REFUSES. A request has no second pass, so a `move` or a `remove` can only come from
 * a reconciler whose caller got its own bookkeeping wrong — and answering with the right string is
 * a better answer than a crash in the middle of a response.
 */
export type TExoStrChildList = {
    readonly size: number;
    at(i: number): TExoNode<TExoStrMark> | undefined;
    insert(child: TExoNode<TExoStrMark>, i?: number): void;
    move(from: number, to: number): void;
    remove(i: number): void;
    removeAll(): void;
    detach(i: number): TExoNode<TExoStrMark> | undefined;
    detachAll(): readonly TExoNode<TExoStrMark>[];
    attach(child: TExoNode<TExoStrMark>, i?: number): void;
};
