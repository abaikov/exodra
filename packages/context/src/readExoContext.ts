import type { TExoContextFrame } from './types/TExoContextFrame';
import type { TExoContextToken } from './types/TExoContextToken';

/**
 * A `provide` of literal `undefined` is indistinguishable from no provide at all: a sentinel per
 * link to tell the two apart would cost every lookup in the process.
 */
export function readExoContext<TValue>(
    frame: TExoContextFrame | null,
    key: TExoContextToken<TValue>
): TValue | undefined {
    let at = frame;
    while (at !== null) {
        if (at.key === (key as TExoContextToken<unknown>)) return at.value as TValue;
        at = at.outer;
    }
    return undefined;
}
