import { useReducer } from './useReducer';

function applyStateAction<TState>(
    state: TState,
    action: TState | ((state: TState) => TState)
): TState {
    return typeof action === 'function' ? (action as (state: TState) => TState)(state) : action;
}

export function useState<TState>(
    initial: TState | (() => TState)
): [TState, (action: TState | ((state: TState) => TState)) => void] {
    return useReducer<TState, TState | ((state: TState) => TState), TState | (() => TState)>(
        applyStateAction,
        initial,
        (value) => (typeof value === 'function' ? (value as () => TState)() : value)
    );
}
