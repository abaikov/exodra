import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import type { TExoReactElement } from './types/TExoReactElement';

export function isValidElement(value: unknown): value is TExoReactElement {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as { $$typeof?: unknown }).$$typeof === EXO_REACT_SYMBOLS.element
    );
}
