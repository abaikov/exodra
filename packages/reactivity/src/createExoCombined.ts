import type { TExoBindable } from '@exodra/reactivity-types';

/** The value each source carries, as a tuple matching the sources. */
type TExoSourceValues<TSources extends readonly TExoBindable<unknown, unknown>[]> = {
    [TIndex in keyof TSources]: TSources[TIndex] extends TExoBindable<
        infer TValue,
        unknown
    >
        ? TValue
        : never;
};

/**
 * A read-only bindable computed from SEVERAL sources.
 *
 * `createExoDerived` covers one source; real state is usually a handful of
 * independent signals, and the alternative — folding them into one object
 * signal — is worse than it looks: every write then notifies every consumer,
 * including the ones that only care about a field that did not change.
 *
 * ```ts
 * const visible = combine([showExternal, onlyErrors], (external, errors) =>
 *     external && !errors
 * );
 * ```
 *
 * Like `derive`, the value is computed ON READ rather than cached eagerly, so a
 * source that nobody reads costs nothing.
 *
 * A recomputed value EQUAL to the last one does not notify. Two filters can
 * easily produce the same result, and a consumer is documented to be allowed to
 * ignore the event and re-read `getValue()` — so a no-change notification is
 * pure work: a DOM write that changes nothing, a re-render that renders the
 * same. (`createExoBindable` already drops no-op writes for the same reason.)
 */
export function createExoCombined<
    const TSources extends readonly TExoBindable<unknown, unknown>[],
    TValue,
>(
    sources: TSources,
    compute: (...values: TExoSourceValues<TSources>) => TValue
): TExoBindable<TValue, TValue> {
    const read = (): TValue =>
        compute(
            ...(sources.map(source => source.getValue()) as TExoSourceValues<TSources>)
        );

    const subscribers = new Set<(value: TValue) => void>();
    // Only meaningful while something is subscribed: with no subscribers there
    // is nothing to compare against, and holding a stale value would make the
    // FIRST notification after a re-subscribe compare against history.
    let last: TValue;
    let hasLast = false;
    let unsubscribeSources: Array<() => void> = [];

    const onSourceChanged = (): void => {
        const next = read();
        if (hasLast && Object.is(next, last)) return;
        last = next;
        hasLast = true;
        for (const notify of subscribers) notify(next);
    };

    return {
        getValue: read,
        onChange(update) {
            if (subscribers.size === 0) {
                last = read();
                hasLast = true;
                unsubscribeSources = sources.map(source =>
                    source.onChange(onSourceChanged)
                );
            }
            subscribers.add(update);

            let active = true;
            return () => {
                // Idempotent: calling an unsubscribe twice must not tear down a
                // subscription that belongs to someone else.
                if (!active) return;
                active = false;
                subscribers.delete(update);
                if (subscribers.size === 0) {
                    for (const off of unsubscribeSources) off();
                    unsubscribeSources = [];
                    hasLast = false;
                }
            };
        },
    };
}
