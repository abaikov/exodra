import { EXO_ID_COUNTER } from './constants/EXO_ID_COUNTER';
import type { TExoContextToken } from './types/TExoContextToken';
import type { TExoIdCounter } from './types/TExoIdCounter';

export function provideExoIds(
    c: { provide<TValue>(key: TExoContextToken<TValue>, value: TValue): void },
    prefix: string
): TExoIdCounter {
    const counter: TExoIdCounter = { prefix, next: 0 };
    c.provide(EXO_ID_COUNTER, counter);
    return counter;
}
