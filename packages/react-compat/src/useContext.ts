import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import type { TExoReactContext } from './types/TExoReactContext';

export function useContext<TValue>(context: TExoReactContext<TValue>): TValue {
    const slot = EXO_REACT_RENDER.slot;
    if (slot === null) {
        throw new Error('useContext() was called outside the body of a function component.');
    }
    for (let up = slot.parentComponent; up !== null; up = up.parentComponent) {
        if (up.type === context.Provider || up.type === context) {
            (up.consumers ??= new Set()).add(slot);
            return (up.props as { value: TValue }).value;
        }
    }
    return context.defaultValue;
}
