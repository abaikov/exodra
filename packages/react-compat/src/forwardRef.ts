import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';

export function forwardRef<TProps, TRef>(
    render: (props: TProps, ref: TRef) => unknown
): (props: TProps & { ref?: TRef }) => unknown {
    return { $$typeof: EXO_REACT_SYMBOLS.forwardRef, render } as unknown as (
        props: TProps & { ref?: TRef }
    ) => unknown;
}
