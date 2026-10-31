import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import type { TExoReactElement } from './types/TExoReactElement';

export function createPortal(
    children: unknown,
    container: Element,
    key?: string | null
): TExoReactElement {
    return {
        $$typeof: EXO_REACT_SYMBOLS.element,
        type: EXO_REACT_SYMBOLS.portal,
        props: { children, container },
        key: key ?? null,
        ref: null,
        host: null,
    };
}
