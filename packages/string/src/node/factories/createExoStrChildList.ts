import type { TExoNode } from '@exodra/core';
import type { TExoStrChildList } from '../types/TExoStrChildList';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';
import { disposeExoStrTree } from '../disposeExoStrTree';
import { placeExoStrChild } from '../placeExoStrChild';

const NOBODY: readonly TExoNode<TExoStrMark>[] = [];

const release = (child: TExoStrNode | string): void => {
    if (typeof child === 'string') return;
    child.placedIn = null;
    disposeExoStrTree(child);
};

export function createExoStrChildList(order: (TExoStrNode | string)[]): TExoStrChildList {
    return {
        get size(): number {
            return order.length;
        },

        at(i: number): TExoNode<TExoStrMark> | undefined {
            return order[i] as unknown as TExoNode<TExoStrMark> | undefined;
        },

        insert(child: TExoNode<TExoStrMark>, i?: number): void {
            placeExoStrChild(order, child as unknown as TExoStrNode | string, i);
        },

        attach(child: TExoNode<TExoStrMark>, i?: number): void {
            placeExoStrChild(order, child as unknown as TExoStrNode | string, i);
        },

        move(from: number, to: number): void {
            const child = order[from];
            if (child === undefined) return;
            order.splice(from, 1);
            order.splice(to > order.length ? order.length : to, 0, child);
        },

        remove(i: number): void {
            const child = order[i];
            if (child === undefined) return;
            order.splice(i, 1);
            release(child);
        },

        removeAll(): void {
            const taken = order.splice(0, order.length);
            for (let i = 0; i < taken.length; i++) release(taken[i]);
        },

        detach(i: number): TExoNode<TExoStrMark> | undefined {
            const child = order[i];
            if (child === undefined) return undefined;
            order.splice(i, 1);
            if (typeof child !== 'string') child.placedIn = null;
            return child as unknown as TExoNode<TExoStrMark>;
        },

        detachAll(): readonly TExoNode<TExoStrMark>[] {
            if (order.length === 0) return NOBODY;
            const taken = order.splice(0, order.length);
            for (let i = 0; i < taken.length; i++) {
                const child = taken[i];
                if (typeof child !== 'string') child.placedIn = null;
            }
            return taken as unknown as readonly TExoNode<TExoStrMark>[];
        },
    };
}
