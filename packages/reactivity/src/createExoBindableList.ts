import type { TExoListOp } from '@exodra/reactivity-types';
import type { TExoWritableBindableList } from '@exodra/reactivity-types';
export function createExoBindableList<TItem>(
    initialItems: readonly TItem[]
): TExoWritableBindableList<TItem> {
    const subscribers = new Set<(event: TExoListOp<TItem>) => void>();
    // COPY the caller's array. The ops below splice `items` in place, so aliasing
    // the argument would mutate an array the caller still owns (a `push()` here
    // would silently grow their array too).
    let items = [...initialItems];

    const emit = (event: TExoListOp<TItem>) => {
        // Only emit if we have subscribers
        if (subscribers.size > 0) {
            for (const update of subscribers) {
                update(event);
            }
        }
    };

    return {
        getValue() {
            // The SAME array every read, as TExoBindableList documents ("a stable
            // array the ops describe deltas into"). Copying here instead would
            // allocate O(n) on every read — including once per op for a consumer
            // that re-reads — and would break any consumer that holds the value
            // and follows the ops. Consumers that intend to MUTATE what they read
            // (the DOM reconciler keeps its own list) copy on their side.
            return items;
        },
        onChange(update) {
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

            // ONE batched insert, not `count` of them: every splice shifts the
            // tail, so inserting item-by-item is O(count·n) where a single insert
            // is O(n). Spread is chunked only because `splice(i, 0, ...huge)` can
            // overflow the argument stack — the common count of 1 takes one call.
            const CHUNK = 8192;
            if (movedItems.length <= CHUNK) {
                items.splice(clampedTo, 0, ...movedItems);
            } else {
                for (let i = 0; i < movedItems.length; i += CHUNK) {
                    items.splice(
                        clampedTo + i,
                        0,
                        ...movedItems.slice(i, i + CHUNK)
                    );
                }
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
            // Copy for the same reason as the constructor: the ops mutate `items`.
            items = [...nextItems];
            // Carries the live array, not a snapshot of it — no consumer reads
            // this payload (they re-read getValue()), so a defensive copy here
            // was pure allocation on every reset.
            emit({ type: 'reset', items });
        },
    };
}
