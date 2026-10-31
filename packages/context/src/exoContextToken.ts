import type { TExoContextToken } from './types/TExoContextToken';

/**
 * There is NO DEFAULT: one would make "nobody provided this" indistinguishable from "somebody
 * provided exactly the default". CONTEXTS ARE NOT REACTIVE — put a source in one and bind it.
 */
export function exoContextToken<TValue>(name = ''): TExoContextToken<TValue> {
    return { name } as TExoContextToken<TValue>;
}
