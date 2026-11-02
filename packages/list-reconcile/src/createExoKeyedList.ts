import { reconcileExoOrder } from './reconcileExoOrder';
import type { TExoKeyedList } from './types/TExoKeyedList';
import type { TExoPlacedChildren } from './types/TExoPlacedChildren';

/** A surviving key keeps its row; `update` runs on it only when the object under the key changed. */
export function createExoKeyedList<TItem, TKey, TNode>(
    kids: TExoPlacedChildren<TNode>,
    keyOf: (item: TItem) => TKey,
    build: (item: TItem) => TNode,
    update: (node: TNode, item: TItem) => void
): TExoKeyedList<TItem> {
    let shown: TKey[] = [];
    let itemOf = new Map<TKey, TItem>();
    return {
        reconcile(want: readonly TItem[]): void {
            const keys: TKey[] = new Array<TKey>(want.length);
            for (let k = 0; k < want.length; k++) keys[k] = keyOf(want[k]);
            shown = reconcileExoOrder(kids, shown, keys, want, build);
            const previous = itemOf;
            itemOf = new Map<TKey, TItem>();
            for (let k = 0; k < want.length; k++) {
                const item = want[k];
                const before = previous.get(keys[k]);
                if (before !== undefined && before !== item) update(kids.at(k) as TNode, item);
                itemOf.set(keys[k], item);
            }
        },
    };
}
