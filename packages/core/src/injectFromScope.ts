import type { TExoScope } from './types/TExoScope';

/**
 * Resolve a context key by walking a provide()/inject() scope chain child→parent,
 * returning `fallback` when no ancestor provided it. Every renderer's `inject()`
 * shares this walk so the lookup rule (nearest provider wins, a provided
 * `undefined` still counts as provided) is defined in exactly one place.
 */
export function injectFromScope<TValue>(
    scope: TExoScope | undefined,
    key: symbol,
    fallback?: TValue
): TValue | undefined {
    for (let current = scope; current; current = current.parent) {
        const values = current.values;
        if (values !== undefined && values.has(key)) {
            return values.get(key) as TValue;
        }
    }
    return fallback;
}
