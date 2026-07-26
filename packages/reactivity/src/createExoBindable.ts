import type { TExoWritableBindable } from '@exodra/reactivity-types';
import {
    __DEV__,
    beginFlush,
    endFlush,
    warnWriteDuringFlush,
} from './dev-flush-guard';

export function createExoBindable<TValue, TEvent = TValue>(
    initialValue: TValue,
    createEvent: (value: TValue, previousValue: TValue) => TEvent = value =>
        value as unknown as TEvent
): TExoWritableBindable<TValue, TEvent> {
    const subscribers = new Set<(event: TEvent) => void>();
    let value = initialValue;

    return {
        getValue() {
            return value;
        },
        setValue(nextValue, event?) {
            if (__DEV__) warnWriteDuringFlush('bindable.setValue');
            const previousValue = value;
            // Dedupe no-op state writes: if the value is unchanged and the caller
            // did not supply an explicit event, there is nothing to propagate —
            // skip notifying subscribers (and the DOM writes / computed recalcs
            // downstream). An explicit event still fires (event-channel use).
            if (nextValue === previousValue && event === undefined) {
                return;
            }
            value = nextValue;

            // Only create event if we have subscribers
            if (subscribers.size > 0) {
                const evt = event ?? createEvent(nextValue, previousValue);
                if (__DEV__) beginFlush('bindable.setValue');
                try {
                    // Use for..of instead of forEach
                    for (const update of subscribers) {
                        update(evt);
                    }
                } finally {
                    if (__DEV__) endFlush();
                }
            }
        },
        subscribe(update) {
            subscribers.add(update);
            return () => {
                subscribers.delete(update);
            };
        },
    };
}