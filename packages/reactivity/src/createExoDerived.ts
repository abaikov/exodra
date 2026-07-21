import type { TExoBindable } from './types/TExoBindable';

// A read-only bindable computed from a source bindable. getValue() returns the
// mapped current value; subscribers are notified (with the freshly mapped value)
// whenever the source emits. Use it to project one reactive value into another
// without manually wiring subscribe()/getValue() each time.
export function createExoDerived<TSource, TValue>(
    source: TExoBindable<TSource, unknown>,
    map: (value: TSource) => TValue
): TExoBindable<TValue, TValue> {
    return {
        getValue() {
            return map(source.getValue());
        },
        subscribe(update) {
            return source.subscribe(() => update(map(source.getValue())));
        },
    };
}
