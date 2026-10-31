import { readExoReactHook } from './render/readExoReactHook';
import { scheduleExoReactUpdate } from './render/scheduleExoReactUpdate';
import type { TExoReactSlot } from './types/TExoReactSlot';

type TExoReactOptimisticCell<TState, TAction> = {
    base: TState;
    value: TState;
    update: (state: TState, action: TAction) => TState;
    readonly add: (action: TAction) => void;
};

export function useOptimistic<TState, TAction = TState>(
    state: TState,
    update?: (state: TState, action: TAction) => TState
): [TState, (action: TAction) => void] {
    const reduce = update ?? ((_state: TState, action: TAction) => action as unknown as TState);
    const cell = readExoReactHook((slot: TExoReactSlot) => {
        const made: TExoReactOptimisticCell<TState, TAction> = {
            base: state,
            value: state,
            update: reduce,
            add: (action) => {
                made.value = made.update(made.value, action);
                scheduleExoReactUpdate(slot);
            },
        };
        return made;
    });
    cell.update = reduce;
    if (!Object.is(cell.base, state)) {
        cell.base = state;
        cell.value = state;
    }
    return [cell.value, cell.add];
}
