import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';

export function memo<TType>(
    type: TType,
    compare?: (previous: unknown, next: unknown) => boolean
): TType {
    return { $$typeof: EXO_REACT_SYMBOLS.memo, type, compare: compare ?? null } as unknown as TType;
}
