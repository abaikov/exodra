import { EXO_REACT_RENDER } from './constants/EXO_REACT_RENDER';
import { readExoReactHook } from './render/readExoReactHook';
import { scheduleExoReactUpdate } from './render/scheduleExoReactUpdate';

type TExoReactReducerCell<TState, TAction> = {
    value: TState;
    reducer: (state: TState, action: TAction) => TState;
    readonly dispatch: (action: TAction) => void;
};

export function useReducer<TState, TAction, TArgument = TState>(
    reducer: (state: TState, action: TAction) => TState,
    argument: TArgument,
    init?: (argument: TArgument) => TState
): [TState, (action: TAction) => void] {
    const cell = readExoReactHook((slot) => {
        const made: TExoReactReducerCell<TState, TAction> = {
            value: init === undefined ? (argument as unknown as TState) : init(argument),
            reducer,
            dispatch: (action: TAction): void => {
                if (EXO_REACT_RENDER.transition) {
                    scheduleExoReactUpdate(slot, () => {
                        made.value = made.reducer(made.value, action);
                    });
                    return;
                }
                const next = made.reducer(made.value, action);
                if (Object.is(next, made.value)) return;
                made.value = next;
                scheduleExoReactUpdate(slot);
            },
        };
        return made;
    });
    cell.reducer = reducer;
    return [cell.value, cell.dispatch];
}
