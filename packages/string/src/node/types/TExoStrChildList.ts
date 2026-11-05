import type { TExoNode } from '@exodra/core';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';

/**
 * The positional view of a children port, name for name with `@exodra/dom`'s `TExoChildList`, so one
 * component reconciles on both. It holds the port's nodes; their markup is taken when the parent's
 * is, and `remove` destroys the node it takes out.
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
