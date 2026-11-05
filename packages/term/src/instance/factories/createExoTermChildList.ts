import type { TExoNode } from '@exodra/core';
import { disposeExoTermChild } from '../disposeExoTermChild';
import type { TExoTermChild, TExoTermRegion } from '../types/TExoTermChild';
import type { TExoTermChildList } from '../types/TExoTermChildList';
import type { TExoTermMark } from '../../rendering/types/TExoTermMark';

// A text tree has no document to insert into: a region's `children` array IS the placement, so
// every command here is an array operation and there is no anchor, no parent and no walk.
export function createExoTermChildList(region: TExoTermRegion): TExoTermChildList {
    const order = region.children;
    return {
        get size(): number {
            return order.length;
        },

        at(i: number): TExoNode<TExoTermMark> | undefined {
            return order[i] as unknown as TExoNode<TExoTermMark> | undefined;
        },

        insert(child: TExoNode<TExoTermMark>, i?: number): void {
            const placed = child as unknown as TExoTermChild;
            const from = placed.placedIn;
            if (from !== null) from.splice(from.indexOf(placed), 1);
            const to = i === undefined || i > order.length ? order.length : i;
            order.splice(to, 0, placed);
            placed.placedIn = order;
        },

        remove(i: number): void {
            const child = order[i];
            if (child === undefined) return;
            order.splice(i, 1);
            child.placedIn = null;
            disposeExoTermChild(child);
        },

        removeAll(): void {
            const taken = order.slice();
            order.length = 0;
            for (let i = 0; i < taken.length; i++) {
                taken[i].placedIn = null;
                disposeExoTermChild(taken[i]);
            }
        },

        detach(i: number): TExoNode<TExoTermMark> | undefined {
            const child = order[i];
            if (child === undefined) return undefined;
            order.splice(i, 1);
            child.placedIn = null;
            return child as unknown as TExoNode<TExoTermMark>;
        },

        detachAll(): readonly TExoNode<TExoTermMark>[] {
            const taken = order.slice();
            order.length = 0;
            for (let i = 0; i < taken.length; i++) taken[i].placedIn = null;
            return taken as unknown as readonly TExoNode<TExoTermMark>[];
        },

        move(from: number, to: number): void {
            const child = order[from];
            if (child === undefined) return;
            order.splice(from, 1);
            order.splice(to > order.length ? order.length : to, 0, child);
        },
    };
}
