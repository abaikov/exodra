import { EXO_ID_COUNTER } from './constants/EXO_ID_COUNTER';
import type { TExoContextToken } from './types/TExoContextToken';

export function nextExoId(c: {
    inject<TValue>(key: TExoContextToken<TValue>): TValue | undefined;
}): string {
    const counter = c.inject(EXO_ID_COUNTER);
    if (counter === undefined) {
        throw new Error(
            typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
                ? 'nextExoId: nothing above this component called provideExoIds. Call ' +
                  'provideExoIds(c, prefix) in the createInitialState of the root, on the server ' +
                  'and in the browser, so both count from the same start.'
                : 'EXO0104'
        );
    }
    return `${counter.prefix}-${(counter.next++).toString(36)}`;
}
