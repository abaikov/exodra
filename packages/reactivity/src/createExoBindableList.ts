import type { TExoListOp } from '@exodra/reactivity-types';
import type { TExoWritableBindableList } from '@exodra/reactivity-types';

export function createExoBindableList<TItem>(
    initialItems: readonly TItem[]
): TExoWritableBindableList<TItem> {
    const subscribers = new Set<(event: TExoListOp<TItem>) => void>();
    // Avoid copying if already an array
    let items = Array.isArray(initialItems) ? initialItems as TItem[] : [...initialItems];

    const emit = (event: TExoListOp<TItem>) => {
        // Only emit if we have subscribers
        if (subscribers.size > 0) {
            for (const update of subscribers) {
                update(event);
            }
        }
    };

    return {
        snapshot() {
            // Return readonly view to prevent external mutations
            return items.slice();
        },
        subscribeOps(update) {
            subscribers.add(update);
            return () => {
                subscribers.delete(update);
            };
        },
        insert(index, item) {
            const clampedIndex = Math.max(0, Math.min(index, items.length));
            items.splice(clampedIndex, 0, item);
            emit({ type: 'insert', index: clampedIndex, item });
        },
        push(item) {
            const index = items.length;
            items.push(item);
            emit({ type: 'insert', index, item });
        },
        remove(index, count = 1) {
            const clampedIndex = Math.max(0, Math.min(index, items.length));
            const clampedCount = Math.max(
                0,
                Math.min(count, items.length - clampedIndex)
            );
            items.splice(clampedIndex, clampedCount);
            emit({ type: 'remove', index: clampedIndex, count: clampedCount });
        },
        move(from, to, count = 1) {
            if (count <= 0 || from < 0 || from >= items.length) {
                return;
            }

            const clampedCount = Math.min(count, items.length - from);
            const movedItems = items.splice(from, clampedCount);
            const clampedTo = Math.max(0, Math.min(to, items.length));

            // Avoid spread for better performance
            for (let i = 0; i < movedItems.length; i++) {
                items.splice(clampedTo + i, 0, movedItems[i]);
            }
            emit({
                type: 'move',
                from,
                to: clampedTo,
                count: clampedCount,
            });
        },
        set(index, item) {
            if (index < 0 || index >= items.length) {
                return;
            }

            items[index] = item;
            emit({ type: 'set', index, item });
        },
        reset(nextItems) {
            // Avoid unnecessary copies
            items = Array.isArray(nextItems) ? nextItems as TItem[] : [...nextItems];
            emit({ type: 'reset', items: items.slice() });
        },
    };
}
