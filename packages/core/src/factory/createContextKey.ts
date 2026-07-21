import type { TExoContextKey } from '../types/TExoContextKey';

export function createContextKey<TValue>(name?: string): TExoContextKey<TValue> {
    return {
        id: Symbol(name),
        name,
    };
}
