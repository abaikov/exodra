import type { TExoNode } from '@exodra/core';
import type { TExoStrChildList } from '../types/TExoStrChildList';
import type { TExoStrMark } from '../../schema/types/TExoStrMark';
import type { TExoStrNode } from '../EXO_STR_NODE_VOCABULARY';
import { mountExoStrInstance } from '../mountExoStrInstance';

const NOBODY: readonly TExoNode<TExoStrMark>[] = [];

/**
 * THE PORT'S VALUE IS REWRITTEN AFTER EVERY COMMAND, by joining the order. A request is one pass,
 * so the joins are bounded by the number of commands the wire makes and not by anything reactive;
 * `list` accumulates with `+=` for the same reason in the other direction — it never revisits.
 */
export function createExoStrChildList(
    values: string[],
    at: number,
    order: string[]
): TExoStrChildList {
    const flush = (): void => {
        let html = '';
        for (let i = 0; i < order.length; i++) html += order[i];
        values[at] = html;
    };

    return {
        get size(): number {
            return order.length;
        },

        at(i: number): TExoNode<TExoStrMark> | undefined {
            return order[i] as unknown as TExoNode<TExoStrMark> | undefined;
        },

        insert(child: TExoNode<TExoStrMark>, i?: number): void {
            const to = i === undefined || i > order.length ? order.length : i;
            const markup =
                typeof child === 'string'
                    ? (child as string)
                    : mountExoStrInstance(child as unknown as TExoStrNode);
            order.splice(to, 0, markup);
            flush();
        },

        // `insert` with no mount to skip: nothing was ever mounted.
        attach(child: TExoNode<TExoStrMark>, i?: number): void {
            this.insert(child, i);
        },

        move(from: number, to: number): void {
            const child = order[from];
            if (child === undefined) return;
            order.splice(from, 1);
            order.splice(to > order.length ? order.length : to, 0, child);
            flush();
        },

        remove(i: number): void {
            if (order[i] === undefined) return;
            order.splice(i, 1);
            flush();
        },

        removeAll(): void {
            if (order.length === 0) return;
            order.length = 0;
            flush();
        },

        detach(i: number): TExoNode<TExoStrMark> | undefined {
            const child = order[i];
            if (child === undefined) return undefined;
            order.splice(i, 1);
            flush();
            return child as unknown as TExoNode<TExoStrMark>;
        },

        detachAll(): readonly TExoNode<TExoStrMark>[] {
            if (order.length === 0) return NOBODY;
            const taken = order.slice() as unknown as readonly TExoNode<TExoStrMark>[];
            order.length = 0;
            flush();
            return taken;
        },
    };
}
