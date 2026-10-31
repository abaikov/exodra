import { EXO_REACT_SYMBOLS } from './constants/EXO_REACT_SYMBOLS';
import { useContext } from './useContext';
import type { TExoReactContext } from './types/TExoReactContext';

type TExoReactThenable<TValue> = PromiseLike<TValue> & {
    status?: 'pending' | 'fulfilled' | 'rejected';
    value?: TValue;
    reason?: unknown;
};

export function use<TValue>(resource: PromiseLike<TValue> | TExoReactContext<TValue>): TValue {
    if ((resource as { $$typeof?: symbol }).$$typeof === EXO_REACT_SYMBOLS.context) {
        return useContext(resource as TExoReactContext<TValue>);
    }
    const thenable = resource as TExoReactThenable<TValue>;
    if (thenable.status === 'fulfilled') return thenable.value as TValue;
    if (thenable.status === 'rejected') throw thenable.reason;
    if (thenable.status === undefined) {
        thenable.status = 'pending';
        thenable.then(
            (value) => {
                thenable.status = 'fulfilled';
                thenable.value = value;
            },
            (reason: unknown) => {
                thenable.status = 'rejected';
                thenable.reason = reason;
            }
        );
    }
    throw thenable;
}
