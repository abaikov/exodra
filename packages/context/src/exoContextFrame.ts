import type { TExoContextFrame } from './types/TExoContextFrame';
import type { TExoContextToken } from './types/TExoContextToken';

/**
 * ONE function for the three backends, so the link they build is ONE hidden class. Three literals a
 * package apart would be three shapes on the one loop that reads them.
 */
export function exoContextFrame<TValue>(
    outer: TExoContextFrame | null,
    key: TExoContextToken<TValue>,
    value: TValue
): TExoContextFrame {
    return { key: key as TExoContextToken<unknown>, value, outer };
}
